// ---- Microsoft voice (free): Edge neural voices, served by the site's own /api/tts (Vercel function) ----
const MS_ENDPOINTS = [
  { key: 'site', tts: '/api/tts', ping: '/api/tts' }
];
let msEp = null;   // last endpoint that answered successfully
const msOrder = () => msEp ? [msEp, ...MS_ENDPOINTS.filter(e => e !== msEp)] : MS_ENDPOINTS;
// [id, name, country, gender]; the visible label is built in the interface language
const MS_VOICES = {
  es: [['es-CO-SalomeNeural', 'Salomé', 'CO', 'f'], ['es-MX-DaliaNeural', 'Dalia', 'MX', 'f'], ['es-ES-ElviraNeural', 'Elvira', 'ES', 'f'], ['es-CO-GonzaloNeural', 'Gonzalo', 'CO', 'm'], ['es-MX-JorgeNeural', 'Jorge', 'MX', 'm'], ['es-ES-AlvaroNeural', 'Álvaro', 'ES', 'm']],
  en: [['en-US-GuyNeural', 'Guy', 'US', 'm'], ['en-US-DavisNeural', 'Davis', 'US', 'm'], ['en-US-JennyNeural', 'Jenny', 'US', 'f'], ['en-US-AriaNeural', 'Aria', 'US', 'f'], ['en-GB-RyanNeural', 'Ryan', 'GB', 'm']],
  fr: [['fr-FR-DeniseNeural', 'Denise', '', 'f'], ['fr-FR-HenriNeural', 'Henri', '', 'm']],
  pt: [['pt-BR-FranciscaNeural', 'Francisca', '', 'f'], ['pt-BR-AntonioNeural', 'Antônio', '', 'm']],
  de: [['de-DE-KatjaNeural', 'Katja', '', 'f'], ['de-DE-ConradNeural', 'Conrad', '', 'm']],
  it: [['it-IT-ElsaNeural', 'Elsa', '', 'f'], ['it-IT-DiegoNeural', 'Diego', '', 'm']]
};
const msLabel = ([, nm, c, g]) => [nm, c && t('country.' + c), t('gender.' + g)].filter(Boolean).join(' · ');
function fillMsVoices() {
  [0, 1].forEach(k => {
    const sel = $('msS' + k), prev = sel.value || store.get('msS' + k, ''), list = MS_VOICES[$('lc' + k).value] || [];
    sel.innerHTML = '';
    list.forEach(v => { const o = document.createElement('option'); o.value = v[0]; o.textContent = msLabel(v); sel.appendChild(o); });
    if (list.some(([id]) => id === prev)) sel.value = prev;
  });
}

// Tries each endpoint in order. If one does not exist (404/405) or does not answer, it moves on to the next;
// if one exists but fails (403, 429, 502...), the failure is remembered to explain it if none of them works.
async function msRequest(kind, init) {
  let failure = null, limited = false;
  for (const ep of msOrder()) {
    try {
      const r = await fetch(kind === 'ping' ? ep.ping : ep.tts, init);
      if (r.ok) { msEp = ep; return { r, ep }; }
      if (r.status !== 404 && r.status !== 405 && !failure) { failure = await msFailure(r); limited = r.status === 429; }
    } catch (e) { /* no connection to this endpoint: try the next one */ }
  }
  const err = new Error(failure ? t('err.ms.failed', { x: failure }) : t('err.ms.notfound')); err.rateLimited = limited; throw err;
}
// the server answers with short text; the visible message is built from the HTTP status so it appears in the interface language
async function msFailure(r) {
  if (r.status === 403 || r.status === 429 || r.status === 400) return t('err.ms.' + r.status);
  const d = (await r.text()).slice(0, 160).trim(); return d || t('err.ms.other', { s: r.status });
}
const msSynth = async (text, voice) => (await msRequest('tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, voice }) })).r.arrayBuffer();
// Several phrases with the same voice in one call (a single Microsoft connection for the whole group).
// If Microsoft throttles (429) we wait and retry; clips already done stay cached in S.clips.
const MS_BATCH = 8;
async function msSynthMany(texts, voice, onWait) {
  for (let a = 0; ; a++) {
    try {
      const j = await (await msRequest('tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texts, voice }) })).r.json();
      return j.clips.map(b64 => { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; });
    } catch (e) {
      if (a >= 2 || !e.rateLimited) throw e;
      onWait && onWait(a + 1); await new Promise(r => setTimeout(r, 5000 * (a + 1)));
    }
  }
}
async function msFill(list, ctx, sr, prog) {
  const byVoice = new Map(); list.forEach(it => { const v = it[1].voice; (byVoice.get(v) || byVoice.set(v, []).get(v)).push(it); });
  const batches = []; byVoice.forEach(arr => { for (let i = 0; i < arr.length; i += MS_BATCH) batches.push(arr.slice(i, i + MS_BATCH)); });
  let done = 0;
  for (const b of batches) {
    const bufs = await msSynthMany(b.map(x => x[1].text), b[0][1].voice, n => setStatus(t('st.ms.wait', { s: 5 * n })));
    for (let i = 0; i < b.length; i++) {
      const buf = await ctx.decodeAudioData(bufs[i]), d = buf.getChannelData(0);
      S.clips.set(b[i][0], trimSilence(buf.numberOfChannels > 1 ? Float32Array.from(d, (v, k) => (v + buf.getChannelData(1)[k]) / 2) : d.slice(), sr));
    }
    done += b.length; prog.value = 15 * done / Math.max(1, list.length); setStatus(t('st.voices.done', { d: done, n: list.length }));
  }
}
$('msTest').addEventListener('click', async () => {
  const msg = $('msMsg'); msg.textContent = t('ms.testing');
  try { const { ep } = await msRequest('ping', {}); msg.textContent = t('ms.active', { ep: t('ms.ep.' + ep.key) }); }
  catch (e) { msg.textContent = '✗ ' + e.message; }
});
// the active synthesis engine (ElevenLabs or Microsoft) used to build the audio
const synthModel = () => prov() === 'ms' ? 'ms' : $('elModel').value;
const voiceId = l => prov() === 'ms' ? $('msS' + l).value : $('elV' + l).value.trim();
const synth = (t, v) => prov() === 'ms' ? msSynth(t, v) : elSynth(t, v);
// preview a voice and remember the choice
let prevSrc = null;
async function previewVoice(k) {
  const msg = $('msMsg'), first = S.sel.size ? S.rows[[...S.sel].sort((a, b) => a - b)[0]] : S.rows[0];
  const text = (first && first.t[k]) || t('ms.sample.default');
  msg.textContent = t('ms.sampling');
  try {
    const buf = await getCtx().decodeAudioData(await msSynth(text, $('msS' + k).value));
    try { prevSrc && prevSrc.stop(); } catch (e) {}
    const src = getCtx().createBufferSource(); src.buffer = buf; src.connect(getCtx().destination); src.start(); prevSrc = src;
    msg.textContent = t('ms.playing', { x: text.slice(0, 40) + (text.length > 40 ? '…' : '') });
  } catch (e) { msg.textContent = e.message; }
}
[0, 1].forEach(k => {
  $('msP' + k).addEventListener('click', () => previewVoice(k));
  $('msS' + k).addEventListener('change', () => { store.set('msS' + k, $('msS' + k).value); $('msMsg').textContent = t('ms.changed'); });
});
// service status: checked when the panel is shown (at most every 4 s)
let msChecked = 0;
async function checkMs(force) {
  if (!force && Date.now() - msChecked < 4000) return; msChecked = Date.now();
  try { const { ep } = await msRequest('ping', {}); $('msMsg').textContent = t('ms.active', { ep: t('ms.ep.' + ep.key) }); }
  catch (e) { $('msMsg').textContent = '✗ ' + e.message; }
}
$('provider').addEventListener('change', () => { if (prov() === 'ms') checkMs(true); });
