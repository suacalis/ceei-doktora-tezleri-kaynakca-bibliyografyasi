# ÇEEİ Tez Kaynakçası

Türkiye'de Çalışma Ekonomisi ve Endüstri İlişkileri (ÇEEİ) ile yakın disiplinlerde hazırlanmış **1.003 doktora tezinin** kaynakçalarından derlenen **191.151 kaynağın** APA 7 biçiminde aranabilir dizini. Site tamamen statiktir: sunucu tarafı kod yoktur ve arama tarayıcıda yapılır.

## Özellikler

- **Tam metin arama:** yazar, başlık ya da tüm alanlar üzerinde; Türkçe karakterlerden ve büyük/küçük harften bağımsız. `"tırnaklı ifade"` bütün olarak aranır, `-sözcük` dışlanır.
- **Filtreler:** kaynak türü, yayın yılı aralığı, en az atıf sayısı, atıf yapan üniversite, atıf yapan tezin danışmanı ve atıf yapan tezin dili.
- **Baskıları birleştir:** aynı eserin farklı baskı ve yazım kayıtlarını tek satırda toplar ve toplam atfı gösterir (171.624 eser). Varyantlar tek tıkla açılır.
- **APA 7 görünümü:** kitap, tez ve rapor başlıkları ile dergi adı ve cilt italik yazılır. Her kayıt tek tıkla kopyalanabilir.
- **Dışa aktarım:** sonuçlar CSV ya da RIS (Zotero, Mendeley, EndNote) olarak indirilebilir; görünen liste APA metni olarak kopyalanabilir.
- **Tezler sekmesi:** 1.003 tezin sıralanabilir ve aranabilir tablosu. Bir üniversiteye ya da danışmana tıklayınca o üniversitenin ya da danışmanın tezlerinde atıf alan kaynaklar listelenir.
- **Paylaşılabilir adresler:** arama ve filtreler sayfa adresine yazılır (örnek: `?q=sendika&min=5&grup=1`).
- Açık/koyu tema ve telefon uyumlu görünüm.

## Klasör yapısı

```
index.html            arayüz
assets/app.js         arayüz mantığı
assets/engine.js      arama motoru
assets/style.css      stil
data/meta.js          sözlükler (tür, üniversite, danışman) ve eser grupları
data/kaynak_00..07.js kaynak kayıtları (8 parça, ~5,5 MB)
data/tezler.js        tez kayıtları
build/build_data.py   CSV → JSON dönüştürücü
build/tr_adlar.py     Türkçe karakter ve ad düzeltme yardımcıları
.nojekyll             GitHub Pages'in Jekyll işlemesini kapatır
```
## Sınırlılıklar

- *Atıf*, bir kaynağın bir tezin kaynakçasında yer almasıdır; metin içi atıf sıklığı sayılmamıştır.
- Kayıtlar tez PDF'lerinden otomatik ayrıştırıldığı için karakter bozulmaları, birleşmiş kayıtlar ve yanlış tür atamaları görülebilir.
- Üniversite ve danışman filtreleri, her kaynak için kayıtlı **en sık atıf yapan üç** üniversite ve danışmana dayanır.
