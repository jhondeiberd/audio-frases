// voice language, voices and preferences; wiring of the drop zones
wireDrop($('dropPdf'), $('filePdf'), handlePdf);
wireDrop($('dropAudio'), $('fileAudio'), handleAudio);
[0, 1].forEach(k => { const sel = $('lc' + k); LANGS.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = langName(c); sel.appendChild(o); }); sel.value = langOf($('name' + k).value) || (k ? 'en' : 'es'); sel.addEventListener('change', () => { fillBrowserVoices(); estimate(); }); $('name' + k).addEventListener('input', () => autoLang(k)); });
['elKey', 'elModel', 'elV0', 'elV1', 'provider', 'brRate'].forEach(id => { const v = store.get(id, ''); if (v) $(id).value = v; $(id).addEventListener('input', () => { store.set(id, $(id).value); if (id === 'brRate') $('brRateV').textContent = (+$('brRate').value).toFixed(2).replace(/0$/, '') + '×'; estimate(); }); $(id).addEventListener('change', () => { store.set(id, $(id).value); estimate(); }); });
if (!$('provider').value) $('provider').selectedIndex = 0;   // stored preference from an older version that no longer exists
$('brRateV').textContent = (+$('brRate').value).toFixed(2).replace(/0$/, '') + '×';
if (!ELEVEN) $('provider').value = 'browser';
if (canSpeak()) { speechSynthesis.onvoiceschanged = fillBrowserVoices; }
fillBrowserVoices(); updatePanels();
paintCfg();

// app version (comes from version.js, which scripts/release.js also updates)
$('appVer').textContent = 'v' + APP_VERSION.version;
// interface language and theme (saved preference; otherwise the browser / system one)
setLang(detectLang(), true); translateDefaultNames(); fillMsVoices(); paintFileNames(); paintCfg(); updatePanels(); paintTheme();
