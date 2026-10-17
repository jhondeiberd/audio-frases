// ---- save ----
// Edge/Chrome: lets the user pick the folder and name; other browsers get a normal download
$('save').addEventListener('click', async () => {
  const name = S.fileName + '.' + S.ext;
  if (window.showSaveFilePicker) {
    try {
      const h = await showSaveFilePicker({ suggestedName: name, types: [{ description: t(S.ext === 'mp3' ? 'save.mp3' : 'save.wav'), accept: { [S.audioBlob.type || 'audio/mpeg']: ['.' + S.ext] } }] });
      const w = await h.createWritable(); await w.write(S.audioBlob); await w.close();
      $('saveHint').textContent = t('save.ok', { f: h.name }); return;
    } catch (e) {
      if (e && e.name === 'AbortError') { $('saveHint').textContent = t('save.cancel'); return; }
    }
  }
  const url = URL.createObjectURL(S.audioBlob), a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  $('saveHint').textContent = t('save.dl', { f: name });
});
