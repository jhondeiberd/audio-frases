// ---- Voz Microsoft (gratis): voces neuronales de Edge ----
// Orden de intento: 1) el servicio del propio sitio (/api/tts, función de Vercel)
//                   2) el programa local opcional de la carpeta voz-local (útil al probar sin «vercel dev»)
const MS_ENDPOINTS = [
  { key: 'site', tts: '/api/tts', ping: '/api/tts' },
  { key: 'local', tts: 'http://127.0.0.1:8765/tts', ping: 'http://127.0.0.1:8765/ping' }
];
let msEp = null;   // último punto de conexión que respondió bien
const msOrder = () => msEp ? [msEp, ...MS_ENDPOINTS.filter(e => e !== msEp)] : MS_ENDPOINTS;
// [id, nombre, país, género]; el texto visible se arma con el idioma de la interfaz
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

// Prueba cada punto de conexión por orden. Si uno no existe (404/405) o no responde, pasa al siguiente;
// si existe pero falla (403, 429, 502…), lo recuerda para explicarlo si ninguno funciona.
async function msRequest(kind, init) {
  let failure = null, limited = false;
  for (const ep of msOrder()) {
    try {
      const r = await fetch(kind === 'ping' ? ep.ping : ep.tts, init);
      if (r.ok) { msEp = ep; return { r, ep }; }
      if (r.status !== 404 && r.status !== 405 && !failure) { failure = await msFailure(r); limited = r.status === 429; }
    } catch (e) { /* sin conexión con este punto: probar el siguiente */ }
  }
  const err = new Error(failure ? t('err.ms.failed', { x: failure }) : t('err.ms.notfound')); err.rateLimited = limited; throw err;
}
// el servidor responde con texto corto; el mensaje visible se arma según el código HTTP para que salga en el idioma de la interfaz
async function msFailure(r) {
  if (r.status === 403 || r.status === 429 || r.status === 400) return t('err.ms.' + r.status);
  const d = (await r.text()).slice(0, 160).trim(); return d || t('err.ms.other', { s: r.status });
}
const msSynth = async (text, voice) => (await msRequest('tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, voice }) })).r.arrayBuffer();
// Varias frases con la misma voz en una sola llamada (una conexión a Microsoft para todo el grupo).
// Si Microsoft limita el uso (429) se espera y se reintenta; los clips ya hechos quedan guardados en S.clips.
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
// el motor de síntesis activo (ElevenLabs o Microsoft) para construir el audio
const synthModel = () => prov() === 'ms' ? 'ms' : $('elModel').value;
const voiceId = l => prov() === 'ms' ? $('msS' + l).value : $('elV' + l).value.trim();
const synth = (t, v) => prov() === 'ms' ? msSynth(t, v) : elSynth(t, v);
// probar una voz y recordar la elección
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
// estado del servicio: se comprueba al mostrar el panel (como máximo cada 4 s)
let msChecked = 0;
async function checkMs(force) {
  if (!force && Date.now() - msChecked < 4000) return; msChecked = Date.now();
  try { const { ep } = await msRequest('ping', {}); $('msMsg').textContent = t('ms.active', { ep: t('ms.ep.' + ep.key) }); }
  catch (e) { $('msMsg').textContent = '✗ ' + e.message; }
}
$('provider').addEventListener('change', () => { if (prov() === 'ms') checkMs(true); });
