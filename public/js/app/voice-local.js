// ---- voz local gratuita: voces neuronales de Microsoft vía servidor_voz.py (en tu equipo) ----
const LOCAL_URL = 'http://127.0.0.1:8765';   // IP directa: evita que localhost se resuelva a IPv6
const MS_VOICES = {
  es: [['es-CO-SalomeNeural', 'Salomé · Colombia · mujer'], ['es-MX-DaliaNeural', 'Dalia · México · mujer'], ['es-ES-ElviraNeural', 'Elvira · España · mujer'], ['es-CO-GonzaloNeural', 'Gonzalo · Colombia · hombre'], ['es-MX-JorgeNeural', 'Jorge · México · hombre'], ['es-ES-AlvaroNeural', 'Álvaro · España · hombre']],
  en: [['en-US-GuyNeural', 'Guy · EE. UU. · hombre'], ['en-US-DavisNeural', 'Davis · EE. UU. · hombre'], ['en-US-JennyNeural', 'Jenny · EE. UU. · mujer'], ['en-US-AriaNeural', 'Aria · EE. UU. · mujer'], ['en-GB-RyanNeural', 'Ryan · Reino Unido · hombre']],
  fr: [['fr-FR-DeniseNeural', 'Denise · mujer'], ['fr-FR-HenriNeural', 'Henri · hombre']],
  pt: [['pt-BR-FranciscaNeural', 'Francisca · mujer'], ['pt-BR-AntonioNeural', 'Antônio · hombre']],
  de: [['de-DE-KatjaNeural', 'Katja · mujer'], ['de-DE-ConradNeural', 'Conrad · hombre']],
  it: [['it-IT-ElsaNeural', 'Elsa · mujer'], ['it-IT-DiegoNeural', 'Diego · hombre']]
};
function fillMsVoices() {
  [0, 1].forEach(k => {
    const sel = $('msS' + k), prev = sel.value || store.get('msS' + k, ''), list = MS_VOICES[$('lc' + k).value] || [];
    sel.innerHTML = '';
    list.forEach(([id, nm]) => { const o = document.createElement('option'); o.value = id; o.textContent = nm; sel.appendChild(o); });
    if (list.some(([id]) => id === prev)) sel.value = prev;
  });
}
async function localSynth(text, voice) {
  let r;
  try { r = await fetch(LOCAL_URL + '/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, voice }) }); }
  catch (e) { throw new Error('No encuentro el programa de voz. Ábrelo con «python servidor_voz.py» (carpeta voz-local) y déjalo abierto.'); }
  if (!r.ok) throw new Error('El programa de voz respondió ' + r.status + ': ' + (await r.text()).slice(0, 160));
  return await r.arrayBuffer();
}
$('msTest').addEventListener('click', async () => {
  const msg = $('msMsg'); msg.textContent = 'Probando…';
  try { const r = await fetch(LOCAL_URL + '/ping'); msg.textContent = r.ok ? 'Conectado: el programa de voz está activo.' : 'Respondió ' + r.status; }
  catch (e) { msg.textContent = 'No conecta. Abre el programa (python servidor_voz.py) y vuelve a probar.'; }
});
// el motor de síntesis activo (ElevenLabs o local) para construir el audio
const synthModel = () => prov() === 'local' ? 'ms' : $('elModel').value;
const voiceId = l => prov() === 'local' ? $('msS' + l).value : $('elV' + l).value.trim();
const synth = (t, v) => prov() === 'local' ? localSynth(t, v) : elSynth(t, v);
// probar una voz y recordar la elección
let prevSrc = null;
async function previewVoice(k) {
  const msg = $('msMsg'), first = S.sel.size ? S.rows[[...S.sel].sort((a, b) => a - b)[0]] : S.rows[0];
  const text = (first && first.t[k]) || 'Hello, this is a voice test.';
  msg.textContent = 'Generando la muestra…';
  try {
    const buf = await getCtx().decodeAudioData(await localSynth(text, $('msS' + k).value));
    try { prevSrc && prevSrc.stop(); } catch (e) {}
    const src = getCtx().createBufferSource(); src.buffer = buf; src.connect(getCtx().destination); src.start(); prevSrc = src;
    msg.textContent = 'Reproduciendo: «' + text.slice(0, 40) + (text.length > 40 ? '…' : '') + '»';
  } catch (e) { msg.textContent = e.message; }
}
[0, 1].forEach(k => {
  $('msP' + k).addEventListener('click', () => previewVoice(k));
  $('msS' + k).addEventListener('change', () => { store.set('msS' + k, $('msS' + k).value); $('msMsg').textContent = 'Voz cambiada. Pulsa «Crear audio con voz Microsoft» para aplicarla al audio.'; });
});
