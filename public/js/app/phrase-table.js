function repair() {
  S.pairs = S.seg ? Core.pair(S.seg.groups, S.rows.length, S.skip) : [];
  const cnt = {}; S.pairs.forEach(p => cnt[p[0].voice] = (cnt[p[0].voice] || 0) + 1);
  S.firstVoice = +Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
  renderRows(); renderDiag(); estimate();
}
$('skip').addEventListener('input', () => { S.skip = Math.max(0, parseInt($('skip').value) || 0); if (S.seg) repair(); });

function badPair(i) {
  const p = S.pairs[i]; if (!p) return true;
  if (S.seg.mode !== 'voices') return false;
  return p[0].voice === p[1].voice || p[0].voice !== S.firstVoice;
}
function renderDiag() {
  const g = S.seg.groups, n = S.rows.length, el = $('diag'); el.innerHTML = '';
  const mk = (t, w) => { const d = document.createElement('div'); d.className = 'note' + (w ? ' warn' : ''); d.textContent = t; el.appendChild(d); };
  const bad = S.pairs.filter((_, i) => badPair(i)).length, have = S.pairs.length;
  const sc = (S.align.find(o => o.s === S.skip) || { score: 0 }).score, extra = g.length - S.skip - 2 * have;
  const method = t(S.seg.mode === 'voices' ? 'diag.mode.voice' : 'diag.mode.silence');
  if (sc < 0.4) mk(t('diag.noconfirm'), true);
  else if (have < n) mk(t('diag.missing', { m: method, n: n - have }), true);
  else if (bad) mk(t('diag.bad', { n: bad }), true);
  else mk(t('diag.ok', { n, m: method }) + (S.skip ? t('diag.skipped', { n: S.skip }) : '') + (extra > 0 ? t('diag.extra', { n: extra }) : ''));
}
// note under the "Phrases" heading: alignment diagnosis (with audio) or the "no audio" notice
function paintDiag() {
  const el = $('diag'); el.innerHTML = '';
  if (!S.rows.length || S.loadingAudio) return;
  if (S.seg) { renderDiag(); return; }
  if (!S.x16) { const n = document.createElement('div'); n.className = 'note'; n.textContent = t('diag.noaudio'); el.appendChild(n); }
}
function renderRows() {
  const tb = $('rows'); tb.innerHTML = '';
  const has = S.rows.length > 0; updatePanels();
  ['selHl', 'selAll', 'selNone'].forEach(id => $(id).disabled = !has);
  if (!has) { tb.innerHTML = ''; const er = document.createElement('tr'), ec = document.createElement('td'); ec.colSpan = 5; ec.className = 'empty'; ec.textContent = t('rows.empty'); er.appendChild(ec); tb.appendChild(er); $('count').textContent = ''; $('diag').innerHTML = ''; updateGo(); return; }
  const frag = document.createDocumentFragment();
  S.rows.forEach((r, i) => {
    const tr = document.createElement('tr'); tr.className = (r.hl ? 'hl ' : '') + (S.sel.has(i) ? '' : 'off') + (S.seg && badPair(i) ? ' bad' : ''); tr.dataset.i = i;
    const td = (cls, html) => { const c = document.createElement('td'); if (cls) c.className = cls; if (html) c.appendChild(html); return c; };
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = S.sel.has(i); cb.dataset.i = i; cb.setAttribute('aria-label', t('row.include', { n: r.n }));
    tr.appendChild(td('c', cb));
    const n = td('n'); n.textContent = r.n; tr.appendChild(n);
    [0, 1].forEach(k => { const c = td('t'); const sp = document.createElement('span'); sp.textContent = r.t[k]; c.appendChild(sp); tr.appendChild(c); });
    const pl = td('pl');
    [0, 1].forEach(k => { const b = document.createElement('button'); b.type = 'button'; b.className = 'play'; b.dataset.i = i; b.dataset.k = k; b.textContent = '▶'; b.title = t('row.play', { l: t(k ? 'lang.2' : 'lang.1') }); b.disabled = textMode() ? !canSpeak() : !S.pairs[i]; pl.appendChild(b); pl.appendChild(document.createTextNode(' ')); });
    tr.appendChild(pl); frag.appendChild(tr);
  });
  tb.appendChild(frag); updateCount(); updateGo(); paintDiag();
}
$('rows').addEventListener('change', e => { const cb = e.target.closest('input[type=checkbox]'); if (!cb) return; const i = +cb.dataset.i; cb.checked ? S.sel.add(i) : S.sel.delete(i); cb.closest('tr').classList.toggle('off', !cb.checked); updateCount(); updateGo(); estimate(); });
$('rows').addEventListener('click', e => { const b = e.target.closest('.play'); if (!b || b.disabled) return; if (textMode()) { speakOne(S.rows[+b.dataset.i].t[+b.dataset.k], +b.dataset.k); return; } const p = S.pairs[+b.dataset.i]; if (p) playClip(p[+b.dataset.k].a, p[+b.dataset.k].b); });
const setSel = f => { S.sel = new Set(S.rows.map((r, i) => i).filter(i => f(S.rows[i]))); renderRows(); estimate(); };
$('selHl').onclick = () => setSel(r => r.hl); $('selAll').onclick = () => setSel(() => true); $('selNone').onclick = () => setSel(() => false);
function updateCount() { $('count').textContent = t('count', { n: S.sel.size, m: S.rows.length }); }
function updateGo() {
  const reps = cfg.reps[0] + cfg.reps[1] > 0, any = S.sel.size > 0; let ok;
  if (!textMode()) ok = !!S.seg && any && reps;
  else if (!S.rows.length) ok = false;
  else if (prov() === 'ms') ok = any && reps;
  else if (prov() === 'eleven') ok = any && reps && !!$('elKey').value.trim() && [0, 1].every(l => !cfg.reps[l] || !!$('elV' + l).value.trim());
  else ok = any && reps && canSpeak() && !speaking;
  $('go').disabled = !ok;
}

function playClip(a, b) {
  const c = getCtx(); c.resume(); stopClip();
  const s = c.createBufferSource(); s.buffer = S.buf; s.connect(c.destination);
  const st = Math.max(0, a - 0.12); s.start(0, st, (b - a) + 0.5); curSrc = s;
}
function stopClip() { try { curSrc && curSrc.stop(); } catch (e) {} curSrc = null; }
