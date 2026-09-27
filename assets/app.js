(() => {
'use strict';
const $ = s => document.querySelector(s);
const TUR_RENK = ['--t0', '--t1', '--t2', '--t3', '--t4', '--t5', '--t6', '--t7'];
const fmt = n => Number(n).toLocaleString('tr-TR');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let META = null, TEZ = null, UNI_IDX = {}, DAN_IDX = {};
let shown = [], total = 0, offset = 0, ready = false;
const PAGE = 50;

/* ---------- tema ---------- */
const root = document.documentElement;
try { const t = localStorage.getItem('ceei-kaynakca-tema'); if (t) root.dataset.theme = t; } catch (e) {}
$('#themeBtn').onclick = () => {
  const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme = dark ? 'light' : 'dark';
  try { localStorage.setItem('ceei-kaynakca-tema', root.dataset.theme); } catch (e) {}
};
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), 1800); }
async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast('Panoya kopyalandı'); }
  catch (e) { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); toast('Panoya kopyalandı'); }
}
function download(name, text, type) {
  const blob = new Blob(['﻿' + text], { type }); const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

/* ---------- sekmeler ---------- */
function showTab(name) {
  document.querySelectorAll('.tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === name));
  ['kaynaklar', 'tezler', 'hakkinda'].forEach(t => { $('#p-' + t).hidden = t !== name; });
  if (name === 'tezler') renderTez();
}
document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => { showTab(b.dataset.tab); history.replaceState(null, '', urlFromState(b.dataset.tab)); });

/* ---------- durum <-> adres ---------- */
function readState() {
  return {
    text: $('#q').value.trim(), alan: $('#alan').value,
    tur: [...document.querySelectorAll('#turChips .chip[aria-pressed="true"]')].map(c => +c.dataset.t),
    y1: +$('#y1').value || 0, y2: +$('#y2').value || 0, min: +$('#min').value || 1,
    uni: UNI_IDX[$('#uni').value] ?? -1, dan: DAN_IDX[$('#dan').value] ?? -1,
    dil: $('#dil').value, grup: $('#grup').checked, sira: $('#sira').value,
  };
}
function urlFromState(tab) {
  const s = readState(), p = new URLSearchParams();
  if (s.text) p.set('q', s.text); if (s.alan !== 'tum') p.set('alan', s.alan);
  if (s.tur.length) p.set('tur', s.tur.join(',')); if (s.y1) p.set('y1', s.y1); if (s.y2) p.set('y2', s.y2);
  if (s.min > 1) p.set('min', s.min); if (s.uni >= 0) p.set('uni', s.uni); if (s.dan >= 0) p.set('dan', s.dan);
  if (s.dil) p.set('dil', s.dil); if (s.grup) p.set('grup', 1); if (s.sira !== 'atif') p.set('sira', s.sira);
  const q = p.toString(); return location.pathname + (q ? '?' + q : '') + '#' + (tab || currentTab());
}
function currentTab() { return document.querySelector('.tabs button[aria-selected="true"]').dataset.tab; }
function applyUrl() {
  const p = new URLSearchParams(location.search);
  $('#q').value = p.get('q') || ''; $('#alan').value = p.get('alan') || 'tum';
  const turs = (p.get('tur') || '').split(',').filter(Boolean).map(Number);
  document.querySelectorAll('#turChips .chip').forEach(c => c.setAttribute('aria-pressed', turs.includes(+c.dataset.t)));
  $('#y1').value = p.get('y1') || ''; $('#y2').value = p.get('y2') || ''; $('#min').value = p.get('min') || '1';
  const u = p.get('uni'), d = p.get('dan');
  $('#uni').value = u != null && META.uni[u] ? uniLabel(+u) : ''; $('#dan').value = d != null && META.dan[d] ? danLabel(+d) : '';
  $('#dil').value = p.get('dil') || ''; $('#grup').checked = p.get('grup') === '1'; $('#sira').value = p.get('sira') || 'atif';
  const tab = (location.hash || '#kaynaklar').slice(1); showTab(['kaynaklar', 'tezler', 'hakkinda'].includes(tab) ? tab : 'kaynaklar');
}
const uniLabel = i => `${META.uni[i]}${META.uni_tez[i] ? ` (${META.uni_tez[i]} tez)` : ''}`;
const danLabel = i => `${META.dan[i]}${META.dan_tez[i] ? ` (${META.dan_tez[i]} tez)` : ''}`;

/* ---------- veri yükleme (<script> etiketleriyle; file:// ve GitHub Pages'te çalışır) ---------- */
const E = window.CEEIEngine;
function loadScript(src) {
  return new Promise((res, rej) => {
    const el = document.createElement('script'); el.src = src; el.async = true;
    el.onload = res; el.onerror = () => rej(new Error(src + ' dosyası yüklenemedi'));
    document.head.appendChild(el);
  });
}
function showError(msg) {
  $('#count').innerHTML = `<span class="err"><b>Veri yüklenemedi.</b> ${esc(msg)}<br>
    Kontrol edin: <code>data/</code> klasörü <code>index.html</code> ile aynı yerde mi ve içinde <code>meta.js</code>, <code>kaynak_00.js … kaynak_07.js</code>, <code>tezler.js</code> dosyaları var mı?
    GitHub'a web arayüzünden yüklediyseniz klasörleri sürükleyip bırakarak yükleyin; dosyaları tek tek seçmek klasör yapısını bozar.</span>`;
  $('#loadBar').style.width = '0';
}
async function loadAll() {
  try {
    await loadScript('data/meta.js');
    if (!window.CEEI_META) throw new Error('data/meta.js okunamadı');
    META = window.CEEI_META; E.setMeta(META); setupMeta(); applyUrl();
    $('#count').textContent = 'Veri yükleniyor… %0';
    for (let i = 0; i < META.parca; i++) {
      await loadScript(`data/kaynak_${String(i).padStart(2, '0')}.js`);
      const part = window.CEEI_PARCA && window.CEEI_PARCA[i];
      if (!part) throw new Error(`data/kaynak_${String(i).padStart(2, '0')}.js okunamadı`);
      await E.addRows(part); window.CEEI_PARCA[i] = null;        // belleği boşalt
      $('#loadBar').style.width = (E.loaded / META.kaynak * 100) + '%';
      search(0, true);
    }
    ready = true; search(0); setTimeout(() => { $('#loadBar').style.width = '0'; }, 600);
  } catch (e) { console.error(e); showError(e.message); }
}

function setupMeta() {
  $('#sub').textContent = `${fmt(META.tez)} lisansüstü tezin kaynakçalarından ${fmt(META.kaynak)} kaynak · APA 7`;
  const tc = $('#turChips');
  tc.innerHTML = META.turler.map((t, i) => `<button type="button" class="chip" data-t="${i}" aria-pressed="false"><i style="background:var(${TUR_RENK[i]})"></i>${esc(t)} <b data-f="${i}"></b></button>`).join('');
  tc.querySelectorAll('.chip').forEach(c => c.onclick = () => { c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') !== 'true'); search(0); });
  const uo = META.uni.map((u, i) => [i, META.uni_tez[i] || 0]).sort((a, b) => b[1] - a[1] || META.uni[a[0]].localeCompare(META.uni[b[0]], 'tr'));
  $('#uniList').innerHTML = uo.map(([i]) => `<option value="${esc(uniLabel(i))}">`).join('');
  uo.forEach(([i]) => { UNI_IDX[uniLabel(i)] = i; UNI_IDX[META.uni[i]] = i; });
  const dor = META.dan.map((d, i) => [i, META.dan_tez[i] || 0]).sort((a, b) => b[1] - a[1] || META.dan[a[0]].localeCompare(META.dan[b[0]], 'tr'));
  $('#danList').innerHTML = dor.map(([i]) => `<option value="${esc(danLabel(i))}">`).join('');
  dor.forEach(([i]) => { DAN_IDX[danLabel(i)] = i; DAN_IDX[META.dan[i]] = i; });
  // hakkında
  $('#aTez').textContent = fmt(META.tez); $('#aKay').textContent = fmt(META.kaynak); $('#aTarih').textContent = META.olusturma;
  $('#aStats').innerHTML = [[META.tez, 'lisansüstü tez'], [META.kaynak, 'tekil kaynak kaydı'], [META.eser_sayisi, 'eser (baskılar birleştirilmiş)'], [META.atif, 'atıf (kaynakça girdisi)']]
    .map(([v, t]) => `<div><b>${fmt(v)}</b><span>${t}</span></div>`).join('');
}

/* ---------- arama ---------- */
function search(off, quiet) {
  if (!META) return;
  offset = off;
  const q = { ...readState(), offset: off, limit: PAGE };
  const res = E.search(q);
  renderResults({ ...res, loaded: E.loaded, all: META.kaynak });
  if (off === 0 && !quiet) history.replaceState(null, '', urlFromState());
}
let deb;
$('#searchForm').onsubmit = e => { e.preventDefault(); search(0); };
$('#q').addEventListener('input', () => { clearTimeout(deb); deb = setTimeout(() => search(0), 250); });
['#alan', '#min', '#dil', '#grup', '#sira'].forEach(s => $(s).addEventListener('change', () => search(0)));
['#y1', '#y2'].forEach(s => $(s).addEventListener('change', () => search(0)));
['#uni', '#dan'].forEach(s => $(s).addEventListener('change', () => {
  const idx = s === '#uni' ? UNI_IDX : DAN_IDX; if ($(s).value && !(($(s).value) in idx)) { toast('Listeden bir ad seçin'); return; } search(0);
}));
['#uni', '#dan'].forEach(s => $(s).addEventListener('input', () => { if (!$(s).value) search(0); }));
$('#clearBtn').onclick = () => {
  ['#y1', '#y2', '#uni', '#dan'].forEach(s => $(s).value = ''); $('#min').value = '1'; $('#dil').value = ''; $('#grup').checked = false;
  document.querySelectorAll('#turChips .chip').forEach(c => c.setAttribute('aria-pressed', 'false')); search(0);
};
$('#moreBtn').onclick = () => search(offset + PAGE);

/* ---------- APA görüntüleme ---------- */
function tokRegex() {
  const text = $('#q').value; const toks = [];
  const re = /(-?)"([^"]+)"|(-?)(\S+)/g; let m;
  while ((m = re.exec(text))) { if (m[1] || m[3]) continue; const t = (m[2] || m[4]).replace(/[^\p{L}\p{N} ]/gu, '').trim(); if (t.length > 1) toks.push(t); }
  if (!toks.length) return null;
  const cls = { c: '[cç]', g: '[gğ]', i: '[iıİI]', ı: '[iıİI]', o: '[oö]', s: '[sş]', u: '[uü]', ç: '[cç]', ğ: '[gğ]', ö: '[oö]', ş: '[sş]', ü: '[uü]' };
  const pat = toks.map(t => [...t.toLocaleLowerCase('tr')].map(ch => cls[ch] || ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('')).join('|');
  try { return new RegExp('(' + pat + ')', 'giu'); } catch (e) { return null; }
}
function mark(s, rx) { s = esc(s); return rx ? s.replace(rx, '<mark>$1</mark>') : s; }
function apaHTML(r, rx) {
  const [, auth, yil, bas, kalan, tur] = r;
  const italTitle = [1, 3, 4, 5, 6].includes(tur);
  const end = s => /[.?!…]$/.test(s) ? s : s + '.';
  let title = end(bas || ''); title = italTitle ? `<i>${mark(title, rx)}</i>` : mark(title, rx);
  let rest = kalan || '';
  if (tur === 0 && rest) {                // makale: dergi adı ve cilt italik
    const m = rest.match(/^([^,(]+?)(,\s*(?:Cilt\s*:?\s*)?\d+)?(?=\s*[,(.]|$)/);
    if (m) rest = `<i>${mark(m[1] + (m[2] || ''), rx)}</i>${mark(rest.slice(m[0].length), rx)}`; else rest = mark(rest, rx);
  } else rest = mark(rest, rx);
  const y = `(${esc(yil || 't.y.')}).`;
  if (!auth) return `${title} ${y} ${rest}`;
  return `${mark(auth, rx)} ${y} ${title} ${rest}`;
}
const apaText = r => { const [, auth, yil, bas, kalan] = r; const t = /[.?!…]$/.test(bas) ? bas : bas + '.'; return auth ? `${auth} (${yil || 't.y.'}). ${t} ${kalan}`.trim() : `${t} (${yil || 't.y.'}). ${kalan}`.trim(); };
function pairs(a, names) { const o = []; for (let j = 0; j < a.length; j += 2) o.push([a[j], a[j + 1], names[a[j]]]); return o; }

function renderResults(m) {
  total = m.total;
  const state = readState();
  document.querySelectorAll('#turChips b[data-f]').forEach(b => { b.textContent = fmt(m.facets[+b.dataset.f]); });
  const loading = m.loaded < m.all ? ` · veri yükleniyor (%${Math.round(m.loaded / m.all * 100)})` : '';
  $('#count').innerHTML = m.total ? `<b>${fmt(m.total)}</b> ${state.grup ? 'eser' : 'kaynak'} bulundu${loading}` : `Sonuç bulunamadı${loading}`;
  const rx = tokRegex(); const maxA = Math.log(1 + 110);
  const html = m.rows.map((r, k) => {
    const grp = state.grup && r[16] >= 0 ? META.eser[r[16]] : null;
    const atif = grp ? grp[0] : r[7];
    const unis = pairs(r[12], META.uni).map(([i, c, n]) => `<button type="button" class="tag" data-uni="${i}" title="Bu üniversitenin tezlerinde atıf alan kaynakları göster">${esc(n)} <b>${c}</b></button>`).join('');
    const dans = pairs(r[13], META.dan).map(([i, c, n]) => `<button type="button" class="tag" data-dan="${i}" title="Bu danışmanın tezlerinde atıf alan kaynakları göster">${esc(n)} <b>${c}</b></button>`).join('');
    const dil = [r[14] ? `Türkçe tez ${r[14]}` : '', r[15] ? `İngilizce tez ${r[15]}` : ''].filter(Boolean).join(' · ');
    return `<li data-i="${m.offset + k}">
      <div class="n">${m.offset + k + 1}</div>
      <div>
        <div class="apa">${apaHTML(r, rx)}</div>
        <div class="meta">
          <span class="tur"><i style="background:var(${TUR_RENK[r[5]]})"></i>${esc(META.turler[r[5]])}</span>
          <span><span class="atif">${fmt(atif)}</span> tezde atıf${grp ? ' (tüm varyantlar)' : ''}<span class="atif-bar" style="width:${Math.max(3, Math.log(1 + atif) / maxA * 60)}px"></span></span>
          <span>Atıf dönemi ${r[10] === r[11] ? r[10] : r[10] + '–' + r[11]}</span>
          ${dil ? `<span>${dil}</span>` : ''}
          ${r[16] >= 0 ? `<span>${META.eser[r[16]][1]} baskı/varyant</span>` : ''}
          <span class="row-acts">${r[16] >= 0 ? `<button type="button" data-var="${r[16]}">Varyantlar</button>` : ''}<button type="button" data-copy="${k}">APA'yı kopyala</button></span>
        </div>
        ${unis || dans ? `<div class="who">${unis}${dans}</div>` : ''}
        <div class="variants" id="v-${r[16]}-${m.offset + k}" hidden></div>
      </div></li>`;
  }).join('');
  if (m.offset === 0) { shown = m.rows.slice(); $('#results').innerHTML = html || `<li class="empty">Bu ölçütlerle eşleşen kayıt yok. Filtreleri gevşetmeyi ya da Türkçe karakter kullanmadan aramayı deneyin.</li>`; window.scrollTo({ top: Math.min(scrollY, $('#results').offsetTop - 120) }); }
  else { shown = shown.concat(m.rows); $('#results').insertAdjacentHTML('beforeend', html); }
  $('#moreBtn').hidden = m.offset + m.rows.length >= m.total;
}
$('#results').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.copy != null) { const li = b.closest('li'); copy(apaText(shown[+li.dataset.i])); }
  else if (b.dataset.uni != null) { $('#uni').value = uniLabel(+b.dataset.uni); search(0); toast(META.uni[+b.dataset.uni] + ' filtresi eklendi'); }
  else if (b.dataset.dan != null) { $('#dan').value = danLabel(+b.dataset.dan); search(0); toast(META.dan[+b.dataset.dan] + ' filtresi eklendi'); }
  else if (b.dataset.var != null) {
    const li = b.closest('li'); const box = li.querySelector('.variants');
    if (!box.hidden) { box.hidden = true; b.textContent = 'Varyantlar'; return; }
    box.hidden = false; b.textContent = 'Varyantları gizle';
    box.innerHTML = E.variants(+b.dataset.var).sort((a, c) => c[7] - a[7]).map(r => `<div>${apaHTML(r, null)}<span>${r[7]} tez</span></div>`).join('');
  }
});

/* ---------- dışa aktarım ---------- */
$('#copyAll').onclick = () => { if (!shown.length) return; copy(shown.map(apaText).sort((a, b) => a.localeCompare(b, 'tr')).join('\n')); };
$('#csvBtn').onclick = () => doExport({ format: 'csv', rows: E.exportRows(readState(), 200000) });
$('#risBtn').onclick = () => doExport({ format: 'ris', rows: E.exportRows(readState(), 50000) });
const csvq = s => '"' + String(s ?? '').replace(/"/g, '""') + '"';
function doExport(m) {
  if (m.format === 'csv') {
    const head = ['kaynak_id', 'apa7', 'tur', 'yayin_yili', 'atif_yapan_tez', 'universite_sayisi', 'danisman_sayisi', 'ilk_atif_yili', 'son_atif_yili', 'en_sik_universiteler', 'en_sik_danismanlar', 'turkce_tez', 'ingilizce_tez'];
    const lines = m.rows.map(r => [r[0], apaText(r), META.turler[r[5]], r[6] || '', r[7], r[8], r[9], r[10], r[11],
      pairs(r[12], META.uni).map(p => `${p[2]} (${p[1]})`).join('; '), pairs(r[13], META.dan).map(p => `${p[2]} (${p[1]})`).join('; '), r[14], r[15]].map(csvq).join(','));
    download('ceei_kaynakca.csv', head.join(',') + '\n' + lines.join('\n'), 'text/csv;charset=utf-8');
  } else {
    const TY = ['JOUR', 'BOOK', 'CHAP', 'THES', 'RPRT', 'LEGAL', 'ELEC', 'GEN'];
    const out = m.rows.map(r => {
      const L = [`TY  - ${TY[r[5]]}`];
      const au = (r[1] || '').match(/[^,&]+?,\s*(?:[A-ZÇĞİÖŞÜ]\.\s*-?\s*)+/g);
      (au || (r[1] ? [r[1]] : [])).forEach(a => L.push(`AU  - ${a.replace(/^[\s,&]+|[\s,]+$/g, '')}`));
      if (r[6]) L.push(`PY  - ${r[6]}`);
      L.push(`TI  - ${r[3]}`);
      if (r[5] === 0 && r[4]) L.push(`JO  - ${r[4].split(',')[0]}`);
      if (r[4]) L.push(`N1  - ${r[4]}`);
      L.push(`N1  - ${r[7]} tezin kaynakçasında (ÇEEİ tez kaynakçası)`);
      L.push('ER  - '); return L.join('\r\n');
    });
    download('ceei_kaynakca.ris', out.join('\r\n\r\n'), 'application/x-research-info-systems');
  }
  toast(`${fmt(m.rows.length)} kayıt indirildi`);
}

/* ---------- tezler ---------- */
let tSort = { k: 2, dir: -1 }, tLimit = 100, tRows = [];
const TCOLS = [['Tez no', 0, 1], ['Yazar', 1], ['Yıl', 2, 1], ['Üniversite', 3], ['Danışman', 4], ['Anabilim dalı', 5], ['Dil', 6], ['Kaynak', 7, 1], ['Kaynak türleri', 8]];
async function loadTez() {
  if (TEZ) return TEZ;
  if (!window.CEEI_TEZ) await loadScript('data/tezler.js');
  TEZ = window.CEEI_TEZ;
  const us = [...new Set(TEZ.map(t => t[3]).filter(i => i >= 0))].sort((a, b) => META.uni[a].localeCompare(META.uni[b], 'tr'));
  $('#tuni').insertAdjacentHTML('beforeend', us.map(i => `<option value="${i}">${esc(META.uni[i])}</option>`).join(''));
  return TEZ;
}
function tezKey(t, k) { if (k === 3) return META.uni[t[3]] || ''; if (k === 4) return t[4].map(i => META.dan[i]).join('; '); return t[k]; }
async function renderTez() {
  if (!META) return; await loadTez();
  const q = $('#tq').value.trim().toLocaleLowerCase('tr'), u = $('#tuni').value, y1 = +$('#tyil1').value || 0, y2 = +$('#tyil2').value || 9999, dl = $('#tdil').value;
  tRows = TEZ.filter(t => (!u || t[3] === +u) && t[2] >= y1 && t[2] <= y2 && (!dl || t[6] === dl) &&
    (!q || [t[1], META.uni[t[3]], t[4].map(i => META.dan[i]).join(' '), t[5], String(t[0])].join(' ').toLocaleLowerCase('tr').includes(q)));
  const k = tSort.k; tRows.sort((a, b) => { const va = tezKey(a, k), vb = tezKey(b, k); return (typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb), 'tr')) * tSort.dir; });
  $('#ttable thead').innerHTML = '<tr>' + TCOLS.map(([n, i]) => `<th data-k="${i}" scope="col">${n}${tSort.k === i ? `<span class="ar">${tSort.dir < 0 ? '▼' : '▲'}</span>` : ''}</th>`).join('') + '</tr>';
  $('#ttable tbody').innerHTML = tRows.slice(0, tLimit).map(t => {
    const s = t[8].reduce((a, b) => a + b, 0) || 1;
    const mix = t[8].map((v, i) => v ? `<i style="width:${v / s * 100}%;background:var(${TUR_RENK[i]})" title="${META.turler[i]}: ${v}"></i>` : '').join('');
    return `<tr><td class="n">${t[0]}</td><td>${esc(t[1])}</td><td class="n">${t[2]}</td>
      <td><button type="button" class="tag" data-tuni="${t[3]}" title="Bu üniversitenin tezlerinde atıf alan kaynaklar">${esc(META.uni[t[3]] || '–')}</button></td>
      <td>${t[4].map(i => `<button type="button" class="tag" data-tdan="${i}" title="Bu danışmanın tezlerinde atıf alan kaynaklar">${esc(META.dan[i])}</button>`).join(' ') || '–'}</td>
      <td>${esc(t[5])}</td><td>${t[6]}</td><td class="n">${fmt(t[7])}</td>
      <td><div class="mix" title="${t[8].map((v, i) => META.turler[i] + ': ' + v).join(' · ')}">${mix}</div></td></tr>`;
  }).join('');
  $('#tcount').innerHTML = `<b>${fmt(tRows.length)}</b> tez`;
  $('#tmore').hidden = tRows.length <= tLimit;
}
$('#ttable thead').addEventListener('click', e => { const th = e.target.closest('th'); if (!th) return; const k = +th.dataset.k; tSort = { k, dir: tSort.k === k ? -tSort.dir : ([0, 2, 7].includes(k) ? -1 : 1) }; renderTez(); });
$('#ttable tbody').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.tuni != null) { $('#uni').value = uniLabel(+b.dataset.tuni); $('#dan').value = ''; }
  else { $('#dan').value = danLabel(+b.dataset.tdan); $('#uni').value = ''; }
  $('#q').value = ''; $('#min').value = '1';            // o kurum/kişinin kaynaklarını baştan göster
  showTab('kaynaklar'); search(0); window.scrollTo({ top: 0 });
});
let tdeb; $('#tq').addEventListener('input', () => { clearTimeout(tdeb); tdeb = setTimeout(() => { tLimit = 100; renderTez(); }, 200); });
['#tuni', '#tyil1', '#tyil2', '#tdil'].forEach(s => $(s).addEventListener('change', () => { tLimit = 100; renderTez(); }));
$('#tmore').onclick = () => { tLimit += 200; renderTez(); };
$('#tcsv').onclick = () => {
  const head = ['tez_no', 'yazar', 'yil', 'universite', 'danisman', 'anabilim_dali', 'dil', 'kaynak_sayisi', ...META.turler];
  download('ceei_tezler.csv', head.join(',') + '\n' + tRows.map(t => [t[0], t[1], t[2], META.uni[t[3]], t[4].map(i => META.dan[i]).join('; '), t[5], t[6], t[7], ...t[8]].map(csvq).join(',')).join('\n'), 'text/csv;charset=utf-8');
};
addEventListener('popstate', () => { if (META) { applyUrl(); search(0); } });
loadAll();
})();
