/* Arama motoru (ana iş parçacığında çalışır; Web Worker gerektirmez).
   Kayıt biçimi (build_data.py):
   [0 id, 1 yazar, 2 yıl metni, 3 başlık, 4 kalan, 5 tür, 6 yayın yılı, 7 atıf, 8 üni sayısı, 9 danışman sayısı,
    10 ilk atıf yılı, 11 son atıf yılı, 12 [üni, sayı, ...], 13 [danışman, sayı, ...], 14 Türkçe tez, 15 İngilizce tez, 16 eser id] */
window.CEEIEngine = (() => {
  let META = null;
  const ROWS = [], NA = [], NT = [], NR = [];
  const MAP = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u' };
  function norm(s) {
    s = String(s || '').replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();
    s = s.replace(/[çğıöşüâîû]/g, c => MAP[c]);
    s = s.normalize('NFKD').replace(/[̀-ͯ]/g, '');
    return ' ' + s.replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
  }
  const squash = s => s.replace(/ /g, '');   // "Çalı şma" gibi bölünmüş sözcükler için

  // Bir parçayı dilimler hâlinde ekler; arayüz donmasın diye aralarda nefes alır
  async function addRows(part) {
    for (let i = 0; i < part.length; i += 4000) {
      const end = Math.min(part.length, i + 4000);
      for (let k = i; k < end; k++) {
        const r = part[k]; ROWS.push(r);
        const a = norm(r[1]), t = norm(r[3]);
        NA.push(a + '|' + squash(a)); NT.push(t + '|' + squash(t)); NR.push(norm(r[4]) + ' ' + norm(r[2]));
      }
      await new Promise(res => setTimeout(res, 0));
    }
  }
  function parseQuery(q) {
    const toks = [], neg = [];
    const re = /(-?)"([^"]+)"|(-?)(\S+)/g; let mm;
    while ((mm = re.exec(q || ''))) {
      const n = mm[1] || mm[3], raw = mm[2] || mm[4];
      const t = norm(raw).trim(); if (!t) continue;
      (n ? neg : toks).push(mm[2] ? ' ' + t + ' ' : t);
    }
    return { toks, neg };
  }
  function hit(i, tok, alan) {
    if (alan === 'yazar') return NA[i].includes(tok);
    if (alan === 'baslik') return NT[i].includes(tok);
    return NA[i].includes(tok) || NT[i].includes(tok) || NR[i].includes(tok);
  }
  const has = (arr, k) => { for (let j = 0; j < arr.length; j += 2) if (arr[j] === k) return true; return false; };
  function collect(q) {
    const { toks, neg } = parseQuery(q.text);
    const turs = q.tur && q.tur.length ? new Set(q.tur) : null;
    const y1 = q.y1 || 0, y2 = q.y2 || 0, min = q.min || 1;
    const facets = new Array(8).fill(0), ids = [], seen = new Set();
    for (let i = 0; i < ROWS.length; i++) {
      const r = ROWS[i];
      if (r[7] < min && !(q.grup && r[16] >= 0 && META.eser[r[16]][0] >= min)) continue;
      if ((y1 || y2) && (!r[6] || (y1 && r[6] < y1) || (y2 && r[6] > y2))) continue;
      if (q.dil === 'tr' && !r[14]) continue;
      if (q.dil === 'en' && !r[15]) continue;
      if (q.uni >= 0 && !has(r[12], q.uni)) continue;
      if (q.dan >= 0 && !has(r[13], q.dan)) continue;
      let ok = true;
      for (const t of toks) if (!hit(i, t, q.alan)) { ok = false; break; }
      if (!ok) continue;
      for (const t of neg) if (hit(i, t, 'tum')) { ok = false; break; }
      if (!ok) continue;
      if (q.grup && r[16] >= 0) { if (seen.has(r[16])) continue; seen.add(r[16]); }
      facets[r[5]]++;
      if (turs && !turs.has(r[5])) continue;
      ids.push(i);
    }
    const atif = i => (q.grup && ROWS[i][16] >= 0) ? META.eser[ROWS[i][16]][0] : ROWS[i][7];
    const key = q.sira || 'atif';
    if (key === 'atif') { if (q.grup) ids.sort((a, b) => atif(b) - atif(a)); }   // kayıtlar zaten atıfa göre sıralı
    else if (key === 'yeni') ids.sort((a, b) => (ROWS[b][6] || 0) - (ROWS[a][6] || 0) || atif(b) - atif(a));
    else if (key === 'eski') ids.sort((a, b) => (ROWS[a][6] || 9999) - (ROWS[b][6] || 9999) || atif(b) - atif(a));
    else if (key === 'yazar') ids.sort((a, b) => ROWS[a][1].localeCompare(ROWS[b][1], 'tr'));
    return { ids, facets };
  }
  return {
    setMeta(m) { META = m; },
    addRows,
    get loaded() { return ROWS.length; },
    search(q) {
      const { ids, facets } = collect(q);
      const off = q.offset || 0;
      return { total: ids.length, facets, rows: ids.slice(off, off + (q.limit || 50)).map(i => ROWS[i]), offset: off };
    },
    variants(eid) { return ROWS.filter(r => r[16] === eid); },
    exportRows(q, limit) { return collect(q).ids.slice(0, limit).map(i => ROWS[i]); },
  };
})();
