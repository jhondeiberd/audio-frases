// idioma de la voz, voces y preferencias; conexión de zonas de carga
wireDrop($('dropPdf'), $('filePdf'), handlePdf);
wireDrop($('dropAudio'), $('fileAudio'), handleAudio);
[0, 1].forEach(k => { const sel = $('lc' + k); LANGS.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = langName(c); sel.appendChild(o); }); sel.value = langOf($('name' + k).value) || (k ? 'en' : 'es'); sel.addEventListener('change', () => { fillBrowserVoices(); estimate(); }); $('name' + k).addEventListener('input', () => autoLang(k)); });
['elKey', 'elModel', 'elV0', 'elV1', 'provider', 'brRate'].forEach(id => { const v = store.get(id, ''); if (v) $(id).value = v; $(id).addEventListener('input', () => { store.set(id, $(id).value); if (id === 'brRate') $('brRateV').textContent = (+$('brRate').value).toFixed(2).replace(/0$/, '') + '×'; estimate(); }); $(id).addEventListener('change', () => { store.set(id, $(id).value); estimate(); }); });
if (!$('provider').value) $('provider').selectedIndex = 0;   // preferencia guardada de una versión anterior que ya no existe
$('brRateV').textContent = (+$('brRate').value).toFixed(2).replace(/0$/, '') + '×';
if (!ELEVEN) $('provider').value = 'browser';
if (canSpeak()) { speechSynthesis.onvoiceschanged = fillBrowserVoices; }
fillBrowserVoices(); updatePanels();
paintCfg();

// versión de la aplicación (viene de version.js, que también actualiza scripts/release.js)
$('appVer').textContent = 'v' + APP_VERSION.version;
// idioma de la interfaz y tema (preferencia guardada; si no hay, el del navegador / sistema)
setLang(detectLang(), true); translateDefaultNames(); fillMsVoices(); paintFileNames(); paintCfg(); updatePanels(); paintTheme();
