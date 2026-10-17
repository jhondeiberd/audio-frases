// ---- preferences (convenience only) ----
const store = { get(k, d) { try { const v = localStorage.getItem('af.' + k); return v === null ? d : v; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('af.' + k, v); } catch (e) {} } };
const cfg = { reps: [+store.get('r0', 1), +store.get('r1', 3)] };
function readCfg() {
  const n = id => Math.max(0, parseFloat($(id).value) || 0);
  return { reps: cfg.reps.slice(), order: $('order').value, gapLang: n('gapLang'), gapRep: n('gapRep'), gapPhrase: n('gapPhrase'), padBefore: 0.15, padAfter: 0.35 };
}
function paintCfg() {
  $('reps0').textContent = cfg.reps[0]; $('reps1').textContent = cfg.reps[1];
  $('th0').textContent = $('name0').value || t('lang.1c'); $('th1').textContent = $('name1').value || t('lang.2c');
  estimate();
}
['name0', 'name1'].forEach(id => { const v = store.get(id, ''); if (v) $(id).value = v; $(id).addEventListener('input', () => { store.set(id, $(id).value); paintCfg(); }); });
['order', 'gapLang', 'gapRep', 'gapPhrase'].forEach(id => { const v = store.get(id, ''); if (v) $(id).value = v; $(id).addEventListener('input', () => { store.set(id, $(id).value); estimate(); }); });
document.querySelectorAll('.stepper').forEach(st => st.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return; const i = +st.dataset.lang;
  cfg.reps[i] = Math.min(9, Math.max(0, cfg.reps[i] + +b.dataset.d)); store.set('r' + i, cfg.reps[i]); paintCfg();
}));
