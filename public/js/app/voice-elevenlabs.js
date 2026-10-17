// ElevenLabs
async function elError(r) {
  let d = ''; try { const j = await r.json(); d = (j.detail && (j.detail.message || j.detail)) || j.message || ''; if (typeof d !== 'string') d = JSON.stringify(d); } catch (e) {}
  if (r.status === 401) return t('el.err.401');
  if (r.status === 402 || /quota|credit/i.test(d)) return t('el.err.402');
  if (r.status === 404 || /voice.*not.*found/i.test(d)) return t('el.err.404');
  if (r.status === 429) return t('el.err.429');
  return t('el.err.other', { s: r.status, d: d ? ': ' + d : '' });
}
async function elSynth(text, voice) {
  const key = $('elKey').value.trim(), model = $('elModel').value;
  for (let a = 0; a < 4; a++) {
    const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + encodeURIComponent(voice) + '?output_format=mp3_44100_128', { method: 'POST', headers: { 'xi-api-key': key, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' }, body: JSON.stringify({ text, model_id: model }) });
    if (r.ok) return await r.arrayBuffer();
    if (r.status === 429 && a < 3) { await new Promise(s => setTimeout(s, 1500 * (a + 1))); continue; }
    throw new Error(await elError(r));
  }
}
$('elLoad').addEventListener('click', async () => {
  const msg = $('elMsg'); msg.textContent = t('el.loading');
  try {
    const r = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': $('elKey').value.trim() } });
    if (!r.ok) throw new Error(await elError(r));
    const vs = (await r.json()).voices || [];
    [0, 1].forEach(k => {
      const sel = $('elS' + k); sel.innerHTML = ''; const o0 = document.createElement('option'); o0.value = ''; o0.textContent = t('el.choose'); sel.appendChild(o0);
      vs.forEach(v => { const o = document.createElement('option'); o.value = v.voice_id; o.textContent = v.name + (v.category ? ' · ' + v.category : ''); sel.appendChild(o); });
      const cur = $('elV' + k).value.trim(); if (cur && vs.some(v => v.voice_id === cur)) sel.value = cur;
    });
    msg.textContent = t('el.loaded', { n: vs.length });
  } catch (e) { msg.textContent = e instanceof TypeError ? t('el.conn') : e.message; }
});
[0, 1].forEach(k => $('elS' + k).addEventListener('change', () => { if ($('elS' + k).value) { $('elV' + k).value = $('elS' + k).value; store.set('elV' + k, $('elV' + k).value); estimate(); } }));
$('elForget').addEventListener('click', () => { $('elKey').value = ''; store.set('elKey', ''); $('elMsg').textContent = t('el.forgot'); estimate(); });
// Trims the silence around each phrase without eating soft sounds at the start (s, f, h, n, m...) or the tail.
// Very low threshold (-66 dB) and generous margins: better to keep a little silence than to lose a syllable.
function trimSilence(x, sr) {
  const th = 0.0005, lead = Math.round(sr * 0.12), tail = Math.round(sr * 0.15); let a = 0, b = x.length - 1;
  while (a < b && Math.abs(x[a]) < th) a++; while (b > a && Math.abs(x[b]) < th) b--;
  return x.slice(Math.max(0, a - lead), Math.min(x.length, b + tail));
}
async function buildFromEleven(c, prog) {
  const rows = [...S.sel].sort((a, b) => a - b).map(i => S.rows[i]), ctx = getCtx(), sr = ctx.sampleRate, model = synthModel();
  const keyOf = (l, r) => model + '|' + voiceId(l) + '|' + r.t[l];
  const jobs = new Map();
  rows.forEach(r => [0, 1].forEach(l => { if (c.reps[l] > 0) { const k = keyOf(l, r); if (!S.clips.has(k) && !jobs.has(k)) jobs.set(k, { text: r.t[l], voice: voiceId(l) }); } }));
  const list = [...jobs.entries()]; let done = 0, next = 0, failure = null;
  setStatus(t(prov() === 'ms' ? 'st.ask.ms' : 'st.ask.el'));
  const worker = async () => {
    while (!failure && next < list.length) {
      const [k, j] = list[next++];
      try {
        const ab = await synth(j.text, j.voice), buf = await ctx.decodeAudioData(ab), d = buf.getChannelData(0);
        S.clips.set(k, trimSilence(buf.numberOfChannels > 1 ? Float32Array.from(d, (v, i) => (v + buf.getChannelData(1)[i]) / 2) : d.slice(), sr));
      } catch (e) { failure = failure || e; }
      done++; prog.value = 15 * done / Math.max(1, list.length); setStatus(t('st.voices.done', { d: done, n: list.length }));
    }
  };
  if (prov() === 'ms') await msFill(list, ctx, sr, prog);   // Microsoft: groups of phrases per connection, waiting if it throttles
  else { await Promise.all([worker(), worker(), worker()]); if (failure) throw failure; }
  // timeline with every clip separated by silence; the assembler cuts the pieces from it
  const gap = new Float32Array(Math.round(sr * 1.2)), parts = [], range = new Map(); let cur = 0;
  const place = k => { if (range.has(k)) return; parts.push(gap); cur += gap.length; const d = S.clips.get(k); range.set(k, [cur / sr, (cur + d.length) / sr]); parts.push(d); cur += d.length; };
  rows.forEach(r => [0, 1].forEach(l => { if (c.reps[l] > 0) place(keyOf(l, r)); }));
  parts.push(gap);
  const line = new Float32Array(parts.reduce((s, a) => s + a.length, 0)); let o = 0; parts.forEach(a => { line.set(a, o); o += a.length; });
  const items = rows.map(r => [0, 1].map(l => c.reps[l] > 0 ? range.get(keyOf(l, r)) : [0, 0.01]));
  setStatus(t('st.assemble')); await tick();
  return { out: Core.assemble([line], sr, items, { ...c, padBefore: 0, padAfter: 0, gapRep: Math.max(0.2, c.gapRep - 0.12), gapLang: Math.max(0.2, c.gapLang - 0.12), gapPhrase: Math.max(0.2, c.gapPhrase - 0.12) }), sr };
}
