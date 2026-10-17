// ---- drop zones ----
// drop zone text: loaded file name or the default hint (repainted when the language changes)
function paintFileNames() {
  $('namePdf').textContent = S.rows.length && S.pdfName ? t('pdf.info', { name: S.pdfName, n: S.rows.length, h: S.rows.filter(r => r.hl).length }) : t('drop.pdf.s');
  $('nameAudio').textContent = S.buf && S.audioName ? t('audio.info', { name: S.audioName, d: fmt(S.buf.duration) }) : t('drop.audio.s');
}
function wireDrop(zone, input, handler) {
  input.addEventListener('change', () => input.files[0] && handler(input.files[0]));
  ['dragenter', 'dragover'].forEach(ev => zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.remove('over'); }));
  zone.addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if (f) handler(f); });
}
