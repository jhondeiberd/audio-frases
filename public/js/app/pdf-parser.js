// ---- PDF ----
async function handlePdf(file) {
  S.rows = []; S.sel = new Set(); S.pairs = []; renderRows();
  setStatus(t('st.pdf.read'));
  try {
    if (!window.pdfjsLib) throw new Error(t('err.pdf.lib'));
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const rows = []; let hdr = null;
    for (let p = 1; p <= pdf.numPages; p++) { const r = await parsePage(await pdf.getPage(p)); rows.push(...r.rows); hdr = hdr || r.hdr; }
    if (!rows.length) throw new Error(t('err.pdf.none'));
    rows.forEach(r => r.rep = rowRepDefault());
    S.rows = rows; S.pdfName = file.name; S.pdfBase = file.name.replace(/\.[^.]+$/, '') || 'frases';
    if (hdr) [0, 1].forEach(k => { if (hdr[k]) { $('name' + k).value = hdr[k]; store.set('name' + k, hdr[k]); autoLang(k); } });
    paintCfg();
    $('dropPdf').classList.add('ok'); paintFileNames();
    S.sel = new Set(rows.filter(r => r.hl).map((r, i) => rows.indexOf(r)));
    if (!S.sel.size) { rows.forEach((r, i) => S.sel.add(i)); setStatus(t('st.nohl')); } else setStatus('');
    afterLoad();
  } catch (e) { console.error(e); setStatus(e.message || t('err.pdf.read'), true); }
}
function headName(s) {
  const t = s.trim(); if (/^ingl[eé]s$|^english$/i.test(t)) return langName('en'); if (/^espa[nñ]ol$|^spanish$/i.test(t)) return langName('es');
  if (/^franc[eé]s$|^french$/i.test(t)) return langName('fr'); if (/^portugu[eé]s$|^portuguese$/i.test(t)) return langName('pt'); if (/^alem[aá]n$|^german$/i.test(t)) return langName('de'); if (/^italiano$|^italian$/i.test(t)) return langName('it');
  return t.length > 20 || /^n$|^#$|^no\.?$/i.test(t) ? null : t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}
async function parsePage(page) {
  const scale = 2, vp = page.getViewport({ scale });
  const cv = document.createElement('canvas'); cv.width = Math.ceil(vp.width); cv.height = Math.ceil(vp.height);
  const cx = cv.getContext('2d', { willReadFrequently: true });
  cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height);
  await page.render({ canvasContext: cx, viewport: vp }).promise;
  const px = cx.getImageData(0, 0, cv.width, cv.height).data;
  const tc = await page.getTextContent();
  const items = tc.items.filter(i => i.str && i.str.trim()).map(i => ({ s: i.str.trim(), x: i.transform[4], y: i.transform[5], w: i.width, h: Math.abs(i.transform[3]) || i.height || 10 }));
  if (!items.length) return { rows: [] };
  const minX = Math.min(...items.map(i => i.x)), pageW = page.view[2] - page.view[0];
  const nums = items.filter(i => /^\d{1,3}$/.test(i.s) && i.x < minX + pageW * 0.12).sort((a, b) => b.y - a.y);
  if (!nums.length) return { rows: [] };
  const rows = [];
  // Joins neighbouring text items into columns (items closer than 14 pt belong to the same column).
  const groupCols = band => { const cols = []; band.forEach(it => { const c = cols[cols.length - 1]; if (c && it.x - c.x1 < 14) { c.s += ' ' + it.s; c.x1 = it.x + it.w; c.items.push(it); } else cols.push({ s: it.s, x0: it.x, x1: it.x + it.w, items: [it] }); }); return cols; };
  const sp = nums.length > 1 ? (nums[0].y - nums[nums.length - 1].y) / (nums.length - 1) : 14;
  // First pass: the text band of each numbered row.
  const bands = nums.map((nm, k) => {
    const hi = k === 0 ? nm.y + sp / 2 : (nums[k - 1].y + nm.y) / 2, lo = k === nums.length - 1 ? nm.y - sp / 2 - 4 : (nm.y + nums[k + 1].y) / 2;
    return items.filter(i => i !== nm && i.y <= hi && i.y > lo && !nums.includes(i)).sort((a, b) => a.x - b.x);
  });
  // Where the second column starts on this page (median over the rows that split cleanly). A long first-column
  // line that ends close to it would otherwise be glued to the second column.
  const starts = bands.map(b => groupCols(b)).filter(c => c.length >= 2).map(c => c[1].x0).sort((a, b) => a - b);
  const x2 = starts.length ? starts[starts.length >> 1] : null;
  nums.forEach((nm, k) => {
    const band = bands[k];
    const cols = x2 == null ? groupCols(band) : [...groupCols(band.filter(i => i.x < x2 - 4)), ...groupCols(band.filter(i => i.x >= x2 - 4))];
    const hl = cols.map(c => {
      const y = c.items[0].y, h = c.items[0].h;
      const [ax, ay] = vp.convertToViewportPoint(c.x0, y), [bx] = vp.convertToViewportPoint(c.x1, y);
      const x0 = Math.max(0, Math.floor(ax)), x1 = Math.min(cv.width - 1, Math.ceil(bx)), y0 = Math.max(0, Math.floor(ay - h * scale * 0.85)), y1 = Math.min(cv.height - 1, Math.ceil(ay + h * scale * 0.25));
      let tot = 0, col = 0;
      for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) { const o = (yy * cv.width + xx) * 4, r = px[o], g = px[o + 1], b = px[o + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b); tot++; if (mx - mn > 60 && mx > 140) col++; }
      return tot ? col / tot > 0.25 : false;
    });
    rows.push({ n: +nm.s, t: [cols[0] ? cols[0].s : '', cols[1] ? cols[1].s : ''], hl: hl.some(Boolean), x0: [cols[0] ? cols[0].x0 : null, cols[1] ? cols[1].x0 : null] });
  });
  // table header (for example "ENGLISH | SPANISH"): gives the name of each language
  const med = k => { const v = rows.map(r => r.x0[k]).filter(v => v != null).sort((a, b) => a - b); return v.length ? v[v.length >> 1] : null; };
  const hy = nums[0].y + sp / 2, hdrItems = items.filter(i => i.y > hy && i.y < hy + sp * 1.6 && !/^\d+$/.test(i.s));
  const pick = k => { const x = med(k); if (x == null) return null; const c = hdrItems.filter(i => Math.abs(i.x - x) < 20).sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0]; return c ? headName(c.s) : null; };
  const h0 = pick(0), h1 = pick(1);
  return { rows, hdr: h0 && h1 && h0 !== h1 ? [h0, h1] : null };
}
