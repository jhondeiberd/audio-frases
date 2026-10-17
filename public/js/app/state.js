/* Shared state and UI helpers */
const $ = id => document.getElementById(id);
const S = { rows: [], buf: null, chans: null, sr: 0, x16: null, seg: null, skip: 0, pairs: [], sel: new Set(), out: null, mp3: null, base: 'audio', pdfName: '', pdfBase: 'frases', clips: new Map() };
let actx = null, curSrc = null;
const getCtx = () => (actx ||= new (window.AudioContext || window.webkitAudioContext)());
const fmt = t => { t = Math.max(0, Math.round(t)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
const tick = () => new Promise(r => setTimeout(r, 0));
// Toast notice: always visible even when the page is scrolled. It closes on its own or with the ✕ button.
let toastTimer = null;
function toast(msg, kind) {
  let box = document.getElementById('toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.setAttribute('role', 'alert'); document.body.appendChild(box); }
  box.replaceChildren();
  const card = document.createElement('div'); card.className = 'toast ' + (kind || 'err');
  const sp = document.createElement('span'); sp.textContent = msg;
  const x = document.createElement('button'); x.type = 'button'; x.setAttribute('aria-label', t('toast.close')); x.textContent = '✕'; x.onclick = () => box.replaceChildren();
  card.append(sp, x); box.appendChild(card);
  clearTimeout(toastTimer); toastTimer = setTimeout(() => box.replaceChildren(), 10000);
}
const setStatus = (m, err) => {
  if (err) { $('status').textContent = ''; $('status').className = 'status'; toast(m, 'err'); return; }   // errors are shown as a toast
  $('status').textContent = m; $('status').className = 'status';
};
