// ---- Idioma de la interfaz (ES / EN) ----
// Textos fijos del HTML: atributos data-i18n (texto), data-i18n-ph (placeholder), data-i18n-title, data-i18n-aria.
// Textos dinámicos del código: t('clave', { n: 3 }). Formas plurales: «{n|frase|frases}».
const I18N = {
  es: {
    'doc.title': 'Audio de frases',
    'lede': 'Sube la lista en PDF y, si lo tienes, su audio. Con audio, la página recorta las frases que quieras, repite cada idioma las veces que indiques y te entrega un MP3 nuevo. Sin audio, una voz natural lee las frases y la página arma el MP3. Todo se procesa en tu navegador; solo el texto de las frases se envía al servicio de voz que elijas.',
    'ver.title': 'Versión de la aplicación', 'ver.full': 'Versión {v} · {d}',
    'ui.lang': 'Idioma de la interfaz', 'ui.theme': 'Cambiar tema', 'theme.light': 'Tema claro', 'theme.dark': 'Tema oscuro',
    'h.files': 'Archivos', 'drop.pdf.t': 'Lista en PDF', 'drop.pdf.s': 'Arrastra el archivo o haz clic. Las frases subrayadas se detectan solas.',
    'drop.audio.t': 'Audio completo', 'drop.audio.opt': '(opcional)', 'drop.audio.s': 'MP3 con cada frase dicha en un idioma y luego en el otro. Sin audio, la voz sale del texto del PDF.',
    'pdf.info': '{name} · {n} {n|frase|frases}, {h} {h|subrayada|subrayadas}', 'audio.info': '{name} · {d}',
    'h.langs': 'Idiomas y repeticiones', 'langs.sub': 'Cuántas veces suena cada uno',
    'lang1.cap': 'Idioma 1 · columna izquierda', 'lang2.cap': 'Idioma 2 · columna derecha', 'f.name': 'Nombre', 'f.voiceLang': 'Idioma de la voz', 'f.reps': 'Repeticiones',
    'reps.less1': 'Menos repeticiones del idioma 1', 'reps.more1': 'Más repeticiones del idioma 1', 'reps.less2': 'Menos repeticiones del idioma 2', 'reps.more2': 'Más repeticiones del idioma 2',
    'f.order': 'Orden en cada frase', 'order.ab': 'Idioma 1, luego idioma 2', 'order.ba': 'Idioma 2, luego idioma 1',
    'f.gapLang': 'Pausa entre idiomas (s)', 'f.gapRep': 'Pausa entre repeticiones (s)', 'f.gapPhrase': 'Pausa entre frases (s)',
    'langs.hint': 'Con audio original, el idioma 1 es el que suena primero. Un idioma con 0 repeticiones no se incluye en el audio nuevo.',
    'h.phrases': 'Frases', 'sel.hl': 'Solo subrayadas', 'sel.all': 'Todas', 'sel.none': 'Ninguna',
    'skip.lbl': 'Voces del inicio que no son frases', 'skip.hint': 'Si el audio empieza con un título (por ejemplo «List 2») antes de la primera frase, esa parte se omite. La página lo detecta sola; cambia el número solo si al pulsar ▶ las frases no coinciden con su fila.',
    'th.listen': 'Oír', 'rows.empty': 'Las frases del PDF aparecerán aquí, con las subrayadas marcadas.', 'count': '{n} de {m} seleccionadas',
    'row.include': 'Incluir frase {n}', 'row.play': 'Oír {l}', 'lang.1': 'idioma 1', 'lang.2': 'idioma 2', 'lang.1c': 'Idioma 1', 'lang.2c': 'Idioma 2',
    'h.audio': 'Audio nuevo', 'prov.lbl': 'Voz', 'prov.ms': 'Voz Microsoft (gratis, crea un MP3)', 'prov.el': 'ElevenLabs (crea un MP3)', 'prov.br': 'Voz del navegador (solo escuchar)',
    'el.key': 'Clave de ElevenLabs', 'el.keyPh': 'Pega tu clave de API', 'el.model': 'Modelo', 'el.m1': 'Multilingual v2 (mejor calidad)', 'el.m2': 'Flash v2.5 (más rápido y barato)',
    'el.load': 'Cargar mis voces', 'el.forget': 'Olvidar la clave', 'el.idPh': 'o pega un ID de voz',
    'el.hint': 'La clave y las voces se guardan solo en este navegador y se envían únicamente a ElevenLabs. Cada frase gasta caracteres de tu plan; las repeticiones no gastan más porque cada frase se pide una sola vez.',
    'ms.try': '▶ Probar', 'ms.test': 'Probar conexión', 'ms.hint': 'Gratis. Cada frase se envía a Microsoft para convertirla en voz; no hace falta instalar nada.',
    'br.rate': 'Velocidad', 'voice.of': 'Voz de {n}', 'name.fallback1': 'idioma 1', 'name.fallback2': 'idioma 2',
    'go.make': 'Crear audio', 'go.el': 'Crear audio con ElevenLabs', 'go.ms': 'Crear audio con voz Microsoft', 'go.listen': 'Escuchar', 'stop': 'Detener',
    'player.pp': 'Reproducir o pausar', 'player.seek': 'Posición', 'save': 'Descargar MP3',
    'note.el': 'Sin audio: ElevenLabs lee cada frase y la página arma el MP3 con tus repeticiones y pausas.',
    'note.br': 'Sin audio: la página lee las frases con la voz de tu navegador. Solo se escucha, no se guarda un archivo.',
    'note.br2': 'Sin audio: la página lee las frases con la voz de tu navegador. Solo se escucha, no se guarda un archivo. Para crear un MP3 con voces de ElevenLabs usa la versión en tu hosting.',
    'note.ms': 'Sin audio: las voces neuronales de Microsoft leen cada frase y la página arma el MP3 con tus repeticiones y pausas.',
    'note.nospeech': 'Tu navegador no ofrece voz para leer texto. {x}', 'note.nospeech.x1': 'Elige ElevenLabs en «Voz».', 'note.nospeech.x2': 'Prueba con otro navegador o usa la versión en tu hosting.',
    'br.none': 'No hay voces de este idioma en el dispositivo',
    'lang.es': 'Español', 'lang.en': 'Inglés', 'lang.fr': 'Francés', 'lang.pt': 'Portugués', 'lang.de': 'Alemán', 'lang.it': 'Italiano',
    'gender.f': 'mujer', 'gender.m': 'hombre', 'country.CO': 'Colombia', 'country.MX': 'México', 'country.ES': 'España', 'country.US': 'EE. UU.', 'country.GB': 'Reino Unido',
    // estados y avisos
    'st.pdf.read': 'Leyendo el PDF…', 'err.pdf.lib': 'No se pudo cargar el lector de PDF.', 'err.pdf.none': 'No encontré frases numeradas en el PDF.', 'err.pdf.read': 'No pude leer ese PDF.',
    'st.nohl': 'No encontré frases subrayadas; dejé todas seleccionadas.',
    'st.audio.open': 'Abriendo el audio…', 'err.audio': 'No pude abrir ese audio. Prueba con un MP3 o WAV.', 'st.seg': 'Buscando dónde empieza y termina cada frase…',
    'diag.noaudio': 'Sin audio: la voz se generará a partir del texto del PDF. Marca las frases que quieras con las casillas.',
    'diag.mode.voice': 'dos voces distintas detectadas', 'diag.mode.silence': 'separadas por silencios',
    'diag.noconfirm': 'No pude confirmar que este audio sea de esta lista: la duración de cada frase no se parece a la longitud de su texto. Revisa con ▶ que cada fila suene bien, o prueba otro valor en «Voces del inicio que no son frases».',
    'diag.missing': 'Alineado con el PDF ({m}), pero al audio le faltan {n} {n|frase|frases} al final: las últimas filas no tienen audio y no se incluirán.',
    'diag.bad': 'Hay {n} {n|fila marcada|filas marcadas} con ! que no cuadran. Escúchalas con ▶ y ajusta «Voces del inicio que no son frases» si hace falta.',
    'diag.ok': 'Audio y PDF alineados: {n} frases, {m}.', 'diag.skipped': ' Se omitieron {n} {n|enunciado|enunciados} del inicio (portada del audio).', 'diag.extra': ' Sobran {n} {n|enunciado|enunciados} al final, se ignoran.',
    'est.phrases': '{n} {n|frase|frases}', 'est.chars': ' · unos {c} caracteres de ElevenLabs', 'est.dur': '{n} {n|frase|frases} · duración aprox. {d}',
    'st.assemble': 'Armando el audio…', 'st.encode': 'Codificando MP3…', 'st.done': 'Listo: {n} {n|frase|frases}, {d} de audio.', 'save.willname': 'Se descargará como {f}.',
    'err.create': 'No pude crear el audio: {e}', 'err.elconn': 'no pude conectar con ElevenLabs (revisa tu conexión).',
    'st.ask.ms': 'Pidiendo las voces a Microsoft…', 'st.ms.wait': 'Microsoft está limitando las peticiones; esperando {s} s para reintentar…', 'st.ask.el': 'Pidiendo las voces a ElevenLabs…', 'st.voices.done': 'Voces listas: {d} de {n}',
    'say.progress': 'Frase {i} de {n} · {l} {r}/{R}', 'say.stopped': 'Detenido.', 'say.end': 'Terminó la lista.',
    'save.ok': 'Guardado como {f}', 'save.cancel': 'Guardado cancelado.', 'save.dl': 'Descargando {f} (carpeta de descargas del navegador)', 'save.mp3': 'Audio MP3', 'save.wav': 'Audio WAV',
    'ms.ep.site': 'servicio del sitio', 'ms.ep.local': 'programa local', 'ms.active': '✓ Servicio de voz activo ({ep}).', 'ms.testing': 'Probando…', 'ms.sampling': 'Generando la muestra…', 'ms.playing': 'Reproduciendo: «{x}»',
    'ms.changed': 'Voz cambiada. Pulsa «Crear audio con voz Microsoft» para aplicarla al audio.', 'ms.sample.default': 'Hello, this is a voice test.',
    'err.ms.failed': 'El servicio de voz falló: {x}', 'err.ms.notfound': 'No encuentro el servicio de voz. En el sitio publicado debería estar activo; si pruebas en tu equipo, abre la página con «vercel dev» (http://localhost:3000), no con Live Server ni como archivo.',
    'err.ms.403': 'el servicio rechazó la petición (origen no permitido)', 'err.ms.429': 'demasiadas peticiones; espera un momento', 'err.ms.400': 'texto o voz no válidos', 'err.ms.other': 'respondió {s}',
    'el.err.401': 'ElevenLabs rechazó la clave. Revisa que esté completa y que tenga permiso de texto a voz.', 'el.err.402': 'Tu plan de ElevenLabs no tiene caracteres suficientes para esta lista.',
    'el.err.404': 'ElevenLabs no encontró esa voz. Pulsa «Cargar mis voces» y elige una de tu cuenta.', 'el.err.429': 'ElevenLabs recibió demasiadas peticiones. Espera un momento y vuelve a intentarlo.', 'el.err.other': 'ElevenLabs respondió {s}{d}',
    'el.loading': 'Cargando…', 'el.choose': 'Elige una voz…', 'el.loaded': '{n} {n|voz cargada|voces cargadas}.', 'el.conn': 'No pude conectar con ElevenLabs (revisa tu conexión).', 'el.forgot': 'Clave olvidada.',
    'toast.close': 'Cerrar aviso'
  },
  en: {
    'doc.title': 'Phrase Audio',
    'lede': 'Upload your phrase list as a PDF and, if you have it, its audio. With audio, the page cuts out the phrases you choose, repeats each language as many times as you set and gives you a new MP3. Without audio, a natural voice reads the phrases and the page builds the MP3. Everything is processed in your browser; only the phrase text is sent to the voice service you pick.',
    'ver.title': 'App version', 'ver.full': 'Version {v} · {d}',
    'ui.lang': 'Interface language', 'ui.theme': 'Toggle theme', 'theme.light': 'Light theme', 'theme.dark': 'Dark theme',
    'h.files': 'Files', 'drop.pdf.t': 'PDF list', 'drop.pdf.s': 'Drag the file here or click. Highlighted phrases are detected automatically.',
    'drop.audio.t': 'Full audio', 'drop.audio.opt': '(optional)', 'drop.audio.s': 'MP3 with each phrase said in one language and then the other. Without audio, the voice is generated from the PDF text.',
    'pdf.info': '{name} · {n} {n|phrase|phrases}, {h} highlighted', 'audio.info': '{name} · {d}',
    'h.langs': 'Languages and repetitions', 'langs.sub': 'How many times each one plays',
    'lang1.cap': 'Language 1 · left column', 'lang2.cap': 'Language 2 · right column', 'f.name': 'Name', 'f.voiceLang': 'Voice language', 'f.reps': 'Repetitions',
    'reps.less1': 'Fewer repetitions of language 1', 'reps.more1': 'More repetitions of language 1', 'reps.less2': 'Fewer repetitions of language 2', 'reps.more2': 'More repetitions of language 2',
    'f.order': 'Order within each phrase', 'order.ab': 'Language 1, then 2', 'order.ba': 'Language 2, then 1',
    'f.gapLang': 'Pause between languages (s)', 'f.gapRep': 'Pause between repetitions (s)', 'f.gapPhrase': 'Pause between phrases (s)',
    'langs.hint': 'With the original audio, language 1 is the one that plays first. A language set to 0 repetitions is left out of the new audio.',
    'h.phrases': 'Phrases', 'sel.hl': 'Highlighted only', 'sel.all': 'All', 'sel.none': 'None',
    'skip.lbl': 'Intro voices that are not phrases', 'skip.hint': 'If the audio starts with a title (for example “List 2”) before the first phrase, that part is skipped. The page detects it on its own; change the number only if the phrases you hear with ▶ do not match their row.',
    'th.listen': 'Listen', 'rows.empty': 'The phrases from the PDF will appear here, with the highlighted ones marked.', 'count': '{n} of {m} selected',
    'row.include': 'Include phrase {n}', 'row.play': 'Listen to {l}', 'lang.1': 'language 1', 'lang.2': 'language 2', 'lang.1c': 'Language 1', 'lang.2c': 'Language 2',
    'h.audio': 'New audio', 'prov.lbl': 'Voice', 'prov.ms': 'Microsoft voice (free, creates an MP3)', 'prov.el': 'ElevenLabs (creates an MP3)', 'prov.br': 'Browser voice (listen only)',
    'el.key': 'ElevenLabs key', 'el.keyPh': 'Paste your API key', 'el.model': 'Model', 'el.m1': 'Multilingual v2 (best quality)', 'el.m2': 'Flash v2.5 (faster and cheaper)',
    'el.load': 'Load my voices', 'el.forget': 'Forget the key', 'el.idPh': 'or paste a voice ID',
    'el.hint': 'The key and voices are stored only in this browser and are sent only to ElevenLabs. Each phrase uses characters from your plan; repetitions cost nothing extra because each phrase is requested only once.',
    'ms.try': '▶ Try', 'ms.test': 'Test connection', 'ms.hint': 'Free. Each phrase is sent to Microsoft to turn it into speech; nothing to install.',
    'br.rate': 'Speed', 'voice.of': '{n} voice', 'name.fallback1': 'language 1', 'name.fallback2': 'language 2',
    'go.make': 'Create audio', 'go.el': 'Create audio with ElevenLabs', 'go.ms': 'Create audio with Microsoft voice', 'go.listen': 'Listen', 'stop': 'Stop',
    'player.pp': 'Play or pause', 'player.seek': 'Position', 'save': 'Download MP3',
    'note.el': 'No audio: ElevenLabs reads each phrase and the page builds the MP3 with your repetitions and pauses.',
    'note.br': 'No audio: the page reads the phrases with your browser’s voice. You can only listen; no file is saved.',
    'note.br2': 'No audio: the page reads the phrases with your browser’s voice. You can only listen; no file is saved. To create an MP3 with ElevenLabs voices use the version on your hosting.',
    'note.ms': 'No audio: Microsoft neural voices read each phrase and the page builds the MP3 with your repetitions and pauses.',
    'note.nospeech': 'Your browser has no text-to-speech voice. {x}', 'note.nospeech.x1': 'Pick ElevenLabs under “Voice”.', 'note.nospeech.x2': 'Try another browser or use the version on your hosting.',
    'br.none': 'There are no voices for this language on the device',
    'lang.es': 'Spanish', 'lang.en': 'English', 'lang.fr': 'French', 'lang.pt': 'Portuguese', 'lang.de': 'German', 'lang.it': 'Italian',
    'gender.f': 'female', 'gender.m': 'male', 'country.CO': 'Colombia', 'country.MX': 'Mexico', 'country.ES': 'Spain', 'country.US': 'USA', 'country.GB': 'UK',
    'st.pdf.read': 'Reading the PDF…', 'err.pdf.lib': 'The PDF reader could not be loaded.', 'err.pdf.none': 'I could not find numbered phrases in the PDF.', 'err.pdf.read': 'I could not read that PDF.',
    'st.nohl': 'No highlighted phrases found; I left all of them selected.',
    'st.audio.open': 'Opening the audio…', 'err.audio': 'I could not open that audio. Try an MP3 or WAV.', 'st.seg': 'Finding where each phrase starts and ends…',
    'diag.noaudio': 'No audio: the voice will be generated from the PDF text. Tick the phrases you want.',
    'diag.mode.voice': 'two different voices detected', 'diag.mode.silence': 'separated by silences',
    'diag.noconfirm': 'I could not confirm that this audio belongs to this list: the length of each phrase does not match the length of its text. Check each row with ▶, or try another value under “Intro voices that are not phrases”.',
    'diag.missing': 'Aligned with the PDF ({m}), but the audio is missing {n} {n|phrase|phrases} at the end: the last rows have no audio and will not be included.',
    'diag.bad': '{n} {n|row is|rows are} marked with ! and do not match. Listen to {n|it|them} with ▶ and adjust “Intro voices that are not phrases” if needed.',
    'diag.ok': 'Audio and PDF aligned: {n} phrases, {m}.', 'diag.skipped': ' {n} intro {n|utterance was|utterances were} skipped (audio cover).', 'diag.extra': ' {n} extra {n|utterance|utterances} at the end, ignored.',
    'est.phrases': '{n} {n|phrase|phrases}', 'est.chars': ' · about {c} ElevenLabs characters', 'est.dur': '{n} {n|phrase|phrases} · approx. duration {d}',
    'st.assemble': 'Building the audio…', 'st.encode': 'Encoding MP3…', 'st.done': 'Done: {n} {n|phrase|phrases}, {d} of audio.', 'save.willname': 'It will be downloaded as {f}.',
    'err.create': 'I could not create the audio: {e}', 'err.elconn': 'I could not connect to ElevenLabs (check your connection).',
    'st.ask.ms': 'Requesting voices from Microsoft…', 'st.ms.wait': 'Microsoft is limiting requests; waiting {s} s before retrying…', 'st.ask.el': 'Requesting voices from ElevenLabs…', 'st.voices.done': 'Voices ready: {d} of {n}',
    'say.progress': 'Phrase {i} of {n} · {l} {r}/{R}', 'say.stopped': 'Stopped.', 'say.end': 'The list has finished.',
    'save.ok': 'Saved as {f}', 'save.cancel': 'Save cancelled.', 'save.dl': 'Downloading {f} (your browser’s downloads folder)', 'save.mp3': 'MP3 audio', 'save.wav': 'WAV audio',
    'ms.ep.site': 'site service', 'ms.ep.local': 'local program', 'ms.active': '✓ Voice service active ({ep}).', 'ms.testing': 'Testing…', 'ms.sampling': 'Generating the sample…', 'ms.playing': 'Playing: “{x}”',
    'ms.changed': 'Voice changed. Press “Create audio with Microsoft voice” to apply it to the audio.', 'ms.sample.default': 'Hello, this is a voice test.',
    'err.ms.failed': 'The voice service failed: {x}', 'err.ms.notfound': 'I cannot find the voice service. On the published site it should be active; if you are testing on your computer, open the page with “vercel dev” (http://localhost:3000), not with Live Server or as a file.',
    'err.ms.403': 'the service rejected the request (origin not allowed)', 'err.ms.429': 'too many requests; wait a moment', 'err.ms.400': 'invalid text or voice', 'err.ms.other': 'answered {s}',
    'el.err.401': 'ElevenLabs rejected the key. Check that it is complete and has text-to-speech permission.', 'el.err.402': 'Your ElevenLabs plan does not have enough characters for this list.',
    'el.err.404': 'ElevenLabs did not find that voice. Press “Load my voices” and pick one from your account.', 'el.err.429': 'ElevenLabs received too many requests. Wait a moment and try again.', 'el.err.other': 'ElevenLabs answered {s}{d}',
    'el.loading': 'Loading…', 'el.choose': 'Pick a voice…', 'el.loaded': '{n} {n|voice|voices} loaded.', 'el.conn': 'I could not connect to ElevenLabs (check your connection).', 'el.forgot': 'Key forgotten.',
    'toast.close': 'Close notice'
  }
};
let LANG = 'es';
const i18nFmt = (s, p) => s.replace(/\{(\w+)\|([^|}]*)\|([^}]*)\}/g, (_, k, a, b) => (+(p || {})[k] === 1 ? a : b)).replace(/\{(\w+)\}/g, (_, k) => (p && p[k] !== undefined ? p[k] : ''));
const t = (k, p) => { const s = (I18N[LANG] && I18N[LANG][k]) ?? I18N.es[k]; return s === undefined ? k : i18nFmt(s, p); };
const langName = c => t('lang.' + c);

// textos fijos del HTML
function applyStatic() {
  document.documentElement.lang = LANG; document.title = t('doc.title');
  document.querySelectorAll('[data-i18n]').forEach(e => { e.textContent = t(e.dataset.i18n); });
  document.querySelectorAll('[data-i18n-ph]').forEach(e => { e.placeholder = t(e.dataset.i18nPh); });
  document.querySelectorAll('[data-i18n-title]').forEach(e => { e.title = t(e.dataset.i18nTitle); });
  document.querySelectorAll('[data-i18n-aria]').forEach(e => { e.setAttribute('aria-label', t(e.dataset.i18nAria)); });
  document.querySelectorAll('#uiLang button').forEach(b => { const on = b.dataset.lang === LANG; b.setAttribute('aria-pressed', on); b.classList.toggle('on', on); });
  $('appVer').title = t('ver.full', { v: APP_VERSION.version, d: APP_VERSION.date }) + '\n' + APP_VERSION.notes;
}
// nombres de idioma por defecto («Español» ↔ «Spanish»): solo se traducen si el usuario no escribió otro nombre
function translateDefaultNames() {
  const known = new Set(['es', 'en'].flatMap(l => ['es', 'en', 'fr', 'pt', 'de', 'it'].map(c => I18N[l]['lang.' + c].toLowerCase())));
  [0, 1].forEach(k => { const el = $('name' + k), v = el.value.trim(); if (!v || known.has(v.toLowerCase())) { const c = langOf(v) || $('lc' + k).value; el.value = langName(c); store.set('name' + k, el.value); } });
}
function fillLangOptions() {
  [0, 1].forEach(k => { const sel = $('lc' + k), prev = sel.value; sel.innerHTML = ''; LANGS.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = langName(c); sel.appendChild(o); }); if (prev) sel.value = prev; });
}
function setLang(l, first) {
  LANG = l === 'en' ? 'en' : 'es'; store.set('lang', LANG);
  applyStatic(); fillLangOptions();
  if (!first) { translateDefaultNames(); fillMsVoices(); paintFileNames(); renderRows(); paintCfg(); updatePanels(); if (typeof checkMs === 'function' && voz() && S.rows.length && prov() === 'ms') checkMs(true); }
  if ($('themeBtn') && typeof paintTheme === 'function') paintTheme();
}
const detectLang = () => { const s = store.get('lang', ''); if (s === 'es' || s === 'en') return s; return /^en/i.test(navigator.language || '') ? 'en' : 'es'; };
document.querySelectorAll('#uiLang button').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));
