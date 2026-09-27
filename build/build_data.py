# -*- coding: utf-8 -*-
"""
tekil_kaynaklar.csv + tezler.csv  →  data/*.json  (arama motoru verisi)

Kullanım (depo kök klasöründe):
    python build/build_data.py --kaynak tekil_kaynaklar.csv --tez tezler.csv

Üretilen dosyalar:
    data/meta.js            sözlükler (tür, üniversite, danışman), sayılar, eser grupları
    data/kaynak_00.js …     kaynak kayıtları (parçalar hâlinde, ~25.000 kayıt/parça)
    data/tezler.js          tez kayıtları
Veri, <script> etiketiyle yüklenen .js dosyaları olarak yazılır; böylece site hem GitHub Pages'te
hem de index.html çift tıklanarak (file://) açıldığında çalışır.

Eser birleştirme mantığı makaledekiyle aynıdır (ilk yazar soyadı + başlığın ilk 28 karakteri;
kurumsal yazarlarda yıl da anahtara girer).
"""
import argparse, json, os, re, sys
import numpy as np, pandas as pd
sys.path.insert(0, os.path.dirname(__file__))
from tr_adlar import fold, alnum, split_adv, uni_tr, adv_tr

ap = argparse.ArgumentParser()
ap.add_argument('--kaynak', default='tekil_kaynaklar.csv')
ap.add_argument('--tez', default='tezler.csv')
ap.add_argument('--out', default='data')
ap.add_argument('--parca', type=int, default=25000)
a = ap.parse_args()
os.makedirs(a.out, exist_ok=True)

K = pd.read_csv(a.kaynak, encoding='utf-8-sig')
T = pd.read_csv(a.tez, encoding='utf-8-sig')
UNI_FIX = {'Uludag Universitesi': 'Bursa Uludag Universitesi'}
T['universite'] = T.universite.replace(UNI_FIX)

# ---------- APA kaydını parçalara ayır: yazar / yıl / başlık / kalan ----------
K = K[K.apa7.notna()].copy(); K['apa7'] = K.apa7.astype(str)
yr_re = re.compile(r'\((\d{4}[a-z]?|t\.y\.|n\.d\.)\)\.?\s*')
def parcala(s):
    s = re.sub(r'[\x00-\x1f]', '', re.sub(r'\s+', ' ', s)).strip()
    m = yr_re.search(s[:400])
    if not m: return '', '', s[:300], ''
    auth, yil, rest = s[:m.start()].strip(), m.group(1), s[m.end():]
    t = re.split(r'(?<=[a-zçğıöşü\)\?])\.\s|\?\s', rest, maxsplit=1)[0]
    kalan = rest[len(t):].lstrip('.? ').strip()
    if len(kalan) > 260: kalan = kalan[:259].rstrip() + '…'
    if len(t) > 300: t = t[:299].rstrip() + '…'
    return auth[:240], yil, t.rstrip('. '), kalan
P = K.apa7.map(parcala)
K['p_auth'] = [p[0] for p in P]; K['p_yil'] = [p[1] for p in P]; K['p_bas'] = [p[2] for p in P]; K['p_kalan'] = [p[3] for p in P]

# ---------- Eser anahtarı (makaledeki birleştirme) ----------
auth_re = re.compile(r"([A-ZÇĞİÖŞÜ][^,&()]{1,40}?),\s*((?:[A-ZÇĞİÖŞÜ][a-zçğıöşü]?\.?\s*-?\s*){1,4})(?=,|&|$|\s*\(|\.)")
BAD = {'baski','bask','cev','ed','eds','yay','istanbul','ankara','izmir','bursa','ss','s','vol','no','sayi','cilt','in','haz','der','ceviren'}
def ilk_yazar(s):
    for m in auth_re.finditer(str(s)):
        sur = re.sub(r'^(&|and|ve)\s+', '', m.group(1).strip(' .&')).strip()
        if len(alnum(sur)) < 2 or fold(sur) in BAD: continue
        return sur, True
    nm = str(s).split('(')[0].strip(' .,')
    return (nm[:60], False) if nm else ('', True)   # yazarsız kayıt: başlıkla birleştirilir (makaledeki kural)
ART = re.compile(r'^(the|a|an)(?=[a-z])')
yb = [re.split(r'(?<=[a-zçğıöşü\)\?])\.\s|\?\s', s[m.end():], maxsplit=1)[0][:250] if (m := yr_re.search(s[:400])) else s[:200] for s in K.apa7]
auth_str = [s[:m.start()].strip() if (m := yr_re.search(s[:400])) else s[:60] for s in K.apa7]
fa = [ilk_yazar(y if isinstance(y, str) else au) for y, au in zip(K.yazarlar, auth_str)]
K['first_key'] = [alnum(x[0]) for x in fa]; K['kisi'] = [x[1] for x in fa]
K['tkey'] = [ART.sub('', alnum(t))[:28] for t in yb]
K['eser_key'] = K.first_key + '|' + K.tkey + np.where(~K.kisi, '|' + K.yayin_yili.fillna(0).astype(int).astype(str), '')
K.loc[~K.kisi & K.yayin_yili.isna(), 'eser_key'] = 'id|' + K.kaynak_id.astype(str)
K.loc[K.tkey.str.len() < 8, 'eser_key'] = 'id|' + K.kaynak_id.astype(str)
grp = K.groupby('eser_key').agg(atif=('atif_yapan_tez', 'sum'), n=('kaynak_id', 'count'))
cok = grp[grp.n > 1].sort_values('atif', ascending=False)
eser_id = {k: i for i, k in enumerate(cok.index)}
K['eid'] = K.eser_key.map(eser_id).fillna(-1).astype(int)

# ---------- sözlükler ----------
TURLER = ['Makale', 'Kitap', 'Kitap bölümü', 'Tez', 'Rapor', 'Mevzuat', 'Web', 'Diğer']
cnt_re = re.compile(r'\s*(.+?)\s*\((\d+)\)\s*$')
def liste(s):
    if not isinstance(s, str): return []
    return [(m.group(1).strip(), int(m.group(2))) for p in s.split(';') if (m := cnt_re.match(p))]
uni_ad, dan_ad = {}, {}
def uidx(u):
    u = UNI_FIX.get(u, u)
    if u not in uni_ad: uni_ad[u] = len(uni_ad)
    return uni_ad[u]
def didx(d):
    if d not in dan_ad: dan_ad[d] = len(dan_ad)
    return dan_ad[d]
for u in T.universite.dropna().unique(): uidx(u)
for s in T.danisman.dropna():
    for d in split_adv(s): didx(d)
def dil(s):
    tr = en = 0
    for ad, c in liste(s):
        if ad.startswith('Turk'): tr += c
        elif ad.startswith('Ing'): en += c
    return tr, en

rows = []
for r in K.itertuples(index=False):
    ul = []
    for u, c in liste(r.en_sik_universiteler): ul += [uidx(u), c]
    dl = []
    for d, c in liste(r.en_sik_danismanlar):
        for x in split_adv(d): dl += [didx(x), c]
    tr, en = dil(r.diller)
    yy = int(r.yayin_yili) if pd.notna(r.yayin_yili) and 1500 <= r.yayin_yili <= 2030 else 0
    rows.append([int(r.kaynak_id), r.p_auth, r.p_yil, r.p_bas, r.p_kalan, TURLER.index(r.tur) if r.tur in TURLER else 7,
                 yy, int(r.atif_yapan_tez), int(r.universite_sayisi), int(r.danisman_sayisi), int(r.ilk_atif_yili), int(r.son_atif_yili),
                 ul, dl, tr, en, int(r.eid)])
rows.sort(key=lambda x: (-x[7], x[1].lower()))
n_parca = 0
for i in range(0, len(rows), a.parca):
    with open(f'{a.out}/kaynak_{n_parca:02d}.js', 'w', encoding='utf-8') as f:
        f.write(f'window.CEEI_PARCA=window.CEEI_PARCA||{{}};window.CEEI_PARCA[{n_parca}]=')
        json.dump(rows[i:i + a.parca], f, ensure_ascii=False, separators=(',', ':')); f.write(';')
    n_parca += 1

# ---------- tezler ----------
ABD_TR = {'Calisma': 'Çalışma', 'Endustri': 'Endüstri', 'Iliskileri': 'İlişkileri', 'Iliskiler': 'İlişkiler', 'Isletme': 'İşletme', 'Iktisat': 'İktisat',
          'Is': 'İş', 'Sagligi': 'Sağlığı', 'Guvenligi': 'Güvenliği', 'Ozel': 'Özel', 'Egitim': 'Eğitim', 'Yonetimi': 'Yönetimi', 'Yonetim': 'Yönetim',
          'Islam': 'İslam', 'Uluslararasi': 'Uluslararası', 'Ataturk': 'Atatürk', 'Ilkeleri': 'İlkeleri', 'Inkilap': 'İnkılap', 'Bolumu': 'Bölümü',
          'Politikalari': 'Politikaları', 'Gelistirme': 'Geliştirme', 'Bilim': 'Bilim', 'Dali': 'Dalı', 'Ana': 'Ana', 'Iletisim': 'İletişim',
          'Muhasebe': 'Muhasebe', 'Uretim': 'Üretim', 'Sosyal': 'Sosyal', 'Hizmet': 'Hizmet', 'Kamu': 'Kamu', 'Cografya': 'Coğrafya', 'Istatistik': 'İstatistik',
          'Iktisadi': 'İktisadi', 'Isletmesi': 'İşletmesi', 'Ogretim': 'Öğretim', 'Ogretimi': 'Öğretimi', 'Programi': 'Programı', 'Ekonometri': 'Ekonometri',
          'Kalkinma': 'Kalkınma', 'Kadin': 'Kadın', 'Calismalari': 'Çalışmaları', 'Gocu': 'Göçü', 'Goc': 'Göç', 'Psikoloji': 'Psikoloji',
          'Birligi': 'Birliği', 'Bankacilik': 'Bankacılık', 'Basin': 'Basın', 'Yayin': 'Yayın', 'Muhendisligi': 'Mühendisliği', 'Insan': 'İnsan',
          'Kaynaklari': 'Kaynakları', 'Tanitim': 'Tanıtım', 'Kazalarin': 'Kazaların', 'Cevresel': 'Çevresel', 'Arastirmasi': 'Araştırması', 'Mimarlik': 'Mimarlık',
          'Ortadogu': 'Ortadoğu', 'Politigi': 'Politiği', 'Saglik': 'Sağlık', 'Tasarim': 'Tasarım', 'Disiplinlerarasi': 'Disiplinlerarası',
          'Isletmeleri': 'İşletmeleri', 'Politikasi': 'Politikası', 'Egitimin': 'Eğitimin', 'Egitimi': 'Eğitimi', 'Endustriyel': 'Endüstriyel',
          'Iliskisi': 'İlişkisi', 'Iktisadi': 'İktisadi', 'Bilisim': 'Bilişim', 'Sistemleri': 'Sistemleri', 'Turizm': 'Turizm', 'Isgucu': 'İşgücü'}
def abd_tr(a):
    return ' '.join(ABD_TR.get(w, w) for w in str(a).split()) if isinstance(a, str) else ''

tcols = ['Makale', 'Kitap', 'Kitap bölümü', 'Tez', 'Rapor', 'Mevzuat', 'Web', 'Diğer']
tez = []
for r in T.itertuples(index=False):
    tez.append([int(r.tez_no), str(r.yazar).title(), int(r.yil), uidx(r.universite) if isinstance(r.universite, str) else -1,
                [didx(d) for d in split_adv(r.danisman)], abd_tr(r.anabilim_dali),
                'Türkçe' if r.dil == 'Turkce' else 'İngilizce', int(r.kaynak_sayisi), []])
for t, (_, r) in zip(tez, T.iterrows()): t[8] = [int(r[c]) for c in tcols]   # tür sayıları (sütun adlarında boşluk olduğu için iterrows)
with open(f'{a.out}/tezler.js', 'w', encoding='utf-8') as f:
    f.write('window.CEEI_TEZ='); json.dump(tez, f, ensure_ascii=False, separators=(',', ':')); f.write(';')

uni_list = [None] * len(uni_ad)
for u, i in uni_ad.items(): uni_list[i] = uni_tr(u)
dan_list = [None] * len(dan_ad)
for d, i in dan_ad.items(): dan_list[i] = adv_tr(d)
uni_tez = T.universite.map(uni_ad).value_counts().to_dict()
dan_tez = {}
for s in T.danisman.dropna():
    for d in split_adv(s): dan_tez[dan_ad[d]] = dan_tez.get(dan_ad[d], 0) + 1
meta = {'olusturma': pd.Timestamp.now().strftime('%Y-%m-%d'), 'kaynak': len(rows), 'atif': int(K.atif_yapan_tez.sum()),
        'tez': len(T), 'parca': n_parca, 'turler': TURLER, 'uni': uni_list, 'dan': dan_list,
        'uni_tez': {int(k): int(v) for k, v in uni_tez.items()}, 'dan_tez': {int(k): int(v) for k, v in dan_tez.items()},
        'eser': [[int(x.atif), int(x.n)] for x in cok.itertuples()],
        'eser_sayisi': int(K.loc[K.tkey.str.len() >= 8, 'eser_key'].nunique())}
with open(f'{a.out}/meta.js', 'w', encoding='utf-8') as f:
    f.write('window.CEEI_META='); json.dump(meta, f, ensure_ascii=False, separators=(',', ':')); f.write(';')
print(f"{len(rows):,} kaynak → {n_parca} parça | {len(T)} tez | {len(uni_list)} üniversite | {len(dan_list)} danışman | çok varyantlı eser: {len(cok):,} | eser: {meta['eser_sayisi']:,}")
