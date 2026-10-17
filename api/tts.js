/**
 * Servicio de voz (Vercel Serverless Function, Node).
 *   GET  /api/tts            -> { ok: true }               (comprobación de conexión)
 *   POST /api/tts            -> audio/mpeg                 (cuerpo JSON: { text, voice })
 *
 * Convierte un texto en voz con las voces neuronales de Microsoft Edge (librería msedge-tts).
 * Es un servicio no oficial y gratuito: puede dejar de funcionar si Microsoft cambia el protocolo.
 */
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

const VOICE_RE = /^[a-z]{2,3}-[A-Z]{2}-[A-Za-z]+Neural$/;   // p. ej. es-CO-SalomeNeural
const MAX_CHARS = 1000;                                       // una frase, no un libro
const TIMEOUT_MS = 20000;
const MAX_BATCH = 12, MAX_TOTAL = 6000;                         // frases por llamada y caracteres totales
const RATE_LIMIT = { windowMs: 60000, max: 240 };             // peticiones por IP y minuto (mejor esfuerzo)
const hits = new Map();

const escapeXml = s => s.replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));

function send(res, code, body, type) {
  res.statusCode = code;
  res.setHeader('Content-Type', type || 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(body);
}

// Solo acepta llamadas hechas desde la propia página (mismo sitio) o desde localhost en desarrollo.
function originAllowed(req) {
  const site = req.headers['sec-fetch-site'];
  if (site === 'same-origin') return true;
  const origin = req.headers.origin;
  if (!origin) return false;
  try {
    const o = new URL(origin);
    if (o.host === req.headers.host) return true;
    if (o.hostname === 'localhost' || o.hostname === '127.0.0.1') return true;
    return (process.env.TTS_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean).includes(o.origin);
  } catch (e) { return false; }
}

function limited(req) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const now = Date.now(), h = (hits.get(ip) || []).filter(t => now - t < RATE_LIMIT.windowMs);
  h.push(now); hits.set(ip, h);
  if (hits.size > 500) for (const [k, v] of hits) if (!v.some(t => now - t < RATE_LIMIT.windowMs)) hits.delete(k);
  return h.length > RATE_LIMIT.max;
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;   // Vercel ya lo interpretó
  let raw = req.body;
  if (raw === undefined) { raw = ''; for await (const c of req) { raw += c; if (raw.length > 20000) throw new Error('grande'); } }
  return JSON.parse(Buffer.isBuffer(raw) ? raw.toString('utf8') : String(raw || '{}'));
}

// Convierte una o varias frases con UNA sola conexión a Microsoft (menos conexiones = menos bloqueos por límite de uso).
// Si Microsoft responde 429/403, espera y reintenta con una conexión nueva, continuando donde se quedó.
const RETRY_DELAYS = [800, 2000, 4000];
const isThrottle = e => /\b(429|403)\b|too many/i.test(String(e && e.message ? e.message : e));
const sleep = ms => new Promise(r => setTimeout(r, ms));

function streamOne(tts, text) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Tiempo agotado esperando a Microsoft')), TIMEOUT_MS);
    const fin = (fn, v) => { clearTimeout(timer); fn(v); };
    try {
      const { audioStream } = tts.toStream(escapeXml(text)), chunks = [];
      audioStream.on('data', d => chunks.push(d));
      audioStream.on('error', e => fin(reject, e));
      audioStream.on('close', () => fin(resolve, Buffer.concat(chunks)));
    } catch (e) { fin(reject, e); }
  });
}
async function synthesizeMany(texts, voice) {
  const out = [];
  for (let attempt = 0; ; attempt++) {
    const tts = new MsEdgeTTS();
    try {
      await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
      while (out.length < texts.length) {
        const audio = await streamOne(tts, texts[out.length]);
        if (!audio.length) throw new Error('Microsoft returned no audio');
        out.push(audio);
      }
      return out;
    } catch (e) {
      if (attempt >= RETRY_DELAYS.length || !isThrottle(e)) throw e;
      await sleep(RETRY_DELAYS[attempt]);
    } finally { try { tts.close(); } catch (e) {} }
  }
}

module.exports = async (req, res) => {
  // La comprobación de conexión es pública (no revela nada) para poder abrir /api/tts en el navegador y verificar el servicio.
  if (req.method === 'GET') return send(res, 200, JSON.stringify({ ok: true }), 'application/json');
  if (!originAllowed(req)) return send(res, 403, 'Origen no permitido');
  if (req.method !== 'POST') return send(res, 405, 'Método no permitido');
  if (limited(req)) return send(res, 429, 'Demasiadas peticiones; espera un momento');

  // Cuerpo: { text, voice } -> audio/mpeg   |   { texts: [..], voice } -> JSON { clips: [base64 mp3, ...] }
  let texts, voice, batch;
  try {
    const b = await readBody(req); voice = String(b.voice || ''); batch = Array.isArray(b.texts);
    texts = (batch ? b.texts : [b.text]).map(x => String(x || '').trim());
  } catch (e) { return send(res, 400, 'Petición no válida'); }
  if (!texts.length || texts.length > MAX_BATCH || texts.some(x => !x || x.length > MAX_CHARS) || texts.join('').length > MAX_TOTAL || !VOICE_RE.test(voice)) return send(res, 400, 'Texto o voz no válidos');

  try {
    const audio = await synthesizeMany(texts, voice);
    if (batch) return send(res, 200, JSON.stringify({ clips: audio.map(a => a.toString('base64')) }), 'application/json');
    return send(res, 200, audio[0], 'audio/mpeg');
  } catch (e) {
    const msg = String(e && e.message ? e.message : e);
    return send(res, isThrottle(e) ? 429 : 502, msg);   // 429: Microsoft limita el uso; la página espera y reintenta
  }
};
