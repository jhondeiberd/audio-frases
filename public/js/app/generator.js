// ---- generate ----
function selectedItems() { return [...S.sel].sort((a, b) => a - b).map(i => S.pairs[i]).filter(Boolean).map(p => [[p[0].a, p[0].b], [p[1].a, p[1].b]]); }
function estimate() {
  updatePanels(); updateGo(); paintCfgLabelsOnly();
  if (textMode()) {
    if (!S.rows.length) { $('estimate').textContent = ''; return; }
    const c = readCfg(), n = S.sel.size; let ch = 0; S.sel.forEach(i => { const r = S.rows[i]; if (r) [0, 1].forEach(l => { if (c.reps[l]) ch += r.t[l].length; }); });
    $('estimate').textContent = n ? t('est.phrases', { n }) + (prov() === 'eleven' ? t('est.chars', { c: ch }) : '') : '';
    return;
  }
  if (!S.seg) { $('estimate').textContent = ''; return; }
  const c = readCfg(), items = selectedItems(); let total = 0;
  items.forEach((it, k) => { [0, 1].forEach(l => { const d = it[l][1] - it[l][0] + c.padBefore + c.padAfter; if (c.reps[l]) total += d * c.reps[l] + c.gapRep * (c.reps[l] - 1); }); if (c.reps[0] && c.reps[1]) total += c.gapLang; if (k < items.length - 1) total += c.gapPhrase; });
  $('estimate').textContent = items.length ? t('est.dur', { n: items.length, d: fmt(total) }) : '';
}
function paintCfgLabelsOnly() { $('th0').textContent = $('name0').value || t('lang.1c'); $('th1').textContent = $('name1').value || t('lang.2c'); }

$('go').addEventListener('click', async () => {
  if (textMode() && prov() === 'browser') { speakAll(); return; }
  const btn = $('go'); btn.disabled = true; $('result').hidden = true; stopOut();
  const prog = $('prog'); prog.hidden = false; prog.value = 0;
  try {
    const c = readCfg(); let out, sr;
    if (!textMode()) { setStatus(t('st.assemble')); await tick(); out = Core.assemble(S.chans, S.sr, selectedItems(), c); sr = S.sr; }
    else ({ out, sr } = await buildFromEleven(c, prog));
    S.out = out; prog.value = Math.max(prog.value, 15);
    const nch = out.length, len = out[0].length, enc = window.lamejs ? new lamejs.Mp3Encoder(nch, sr, 128) : null, parts = [];
    const toI16 = (f, a, b) => { const r = new Int16Array(b - a); for (let i = a; i < b; i++) { const v = Math.max(-1, Math.min(1, f[i])); r[i - a] = v < 0 ? v * 32768 : v * 32767; } return r; };
    let ext = 'mp3', bytes;
    if (enc) {
      setStatus(t('st.encode'));
      const B = 1152; let k = 0;
      for (let p = 0; p < len; p += B) {
        const l = toI16(out[0], p, Math.min(len, p + B)), buf = nch > 1 ? enc.encodeBuffer(l, toI16(out[1], p, Math.min(len, p + B))) : enc.encodeBuffer(l);
        if (buf.length) parts.push(new Uint8Array(buf));
        if (++k % 300 === 0) { prog.value = 15 + 80 * p / len; await tick(); }
      }
      const end = enc.flush(); if (end.length) parts.push(new Uint8Array(end));
      bytes = new Blob(parts, { type: 'audio/mpeg' });
    } else {   // no MP3 encoder available: fall back to WAV
      ext = 'wav'; const n = len * nch * 2, ab = new ArrayBuffer(44 + n), v = new DataView(ab), w = (o, s) => [...s].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
      w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, nch, true); v.setUint32(24, sr, true); v.setUint32(28, sr * nch * 2, true); v.setUint16(32, nch * 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n, true);
      let o = 44; for (let i = 0; i < len; i++) for (let ch = 0; ch < nch; ch++) { const s = Math.max(-1, Math.min(1, out[ch][i])); v.setInt16(o, s < 0 ? s * 32768 : s * 32767, true); o += 2; }
      bytes = new Blob([ab], { type: 'audio/wav' });
    }
    const code = nm => { const t = (nm || '').trim().toLowerCase(); const m = [[/^espa/, 'ES'], [/^ingl/, 'EN'], [/^fran/, 'FR'], [/^port/, 'PT'], [/^alem/, 'DE'], [/^ital/, 'IT'], [/^english/, 'EN'], [/^spanish/, 'ES'], [/^french/, 'FR']].find(([r]) => r.test(t)); return m ? m[1] : (t.replace(/[^a-z]/g, '').slice(0, 2).toUpperCase() || 'XX'); };
    const tag = [0, 1].map(i => code($('name' + i).value) + cfg.reps[i]).join('_');
    S.fileName = ((textMode() ? S.pdfBase : S.base) + '_selected').replace(/[^\w\-.\u00C0-\u024F]+/g, '_'); S.ext = ext; S.audioBlob = bytes;
    S.outBuf = getCtx().createBuffer(nch, len, sr); out.forEach((ch, i) => S.outBuf.copyToChannel(ch, i));
    prog.value = 100; await tick();
    $('result').hidden = false; $('seek').value = 0; paintTime(0);
    $('saveHint').textContent = t('save.willname', { f: S.fileName + '.' + ext });
    setStatus(t('st.done', { n: S.sel.size, d: fmt(len / sr) })); prog.hidden = true;
  } catch (e) { console.error(e); setStatus(t('err.create', { e: e instanceof TypeError && textMode() ? t('err.elconn') : (e.message || e) }), true); prog.hidden = true; }
  btn.disabled = false; updateGo();
});
