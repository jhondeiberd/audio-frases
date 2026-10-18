// ---- no audio: speech from the PDF text ----
const LANGS = ['es', 'en', 'fr', 'pt', 'de', 'it'];   // visible names come from i18n (langName)
const langOf = nm => { const t = (nm || '').trim().toLowerCase(); const m = [[/^espa|^spanish/, 'es'], [/^ingl|^english/, 'en'], [/^fran|^french/, 'fr'], [/^port/, 'pt'], [/^alem|^german/, 'de'], [/^ital/, 'it']].find(([r]) => r.test(t)); return m ? m[1] : null; };
function autoLang(k) { const c = langOf($('name' + k).value); if (c) $('lc' + k).value = c; fillBrowserVoices(); }
const textMode = () => !S.buf;   // no source audio: speech is generated from the PDF text
const prov = () => ELEVEN ? $('provider').value : 'browser';
const canSpeak = () => 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
let speaking = false, stopFlag = false;

function updatePanels() {
  const v = textMode() && S.rows.length > 0;
  $('voicePanel').hidden = !v; $('skipLbl').hidden = v; $('skipHint').hidden = v;
  $('provWrap').hidden = !ELEVEN; $('elBlock').hidden = !(v && prov() === 'eleven'); $('brBlock').hidden = !(v && prov() === 'browser'); $('msBlock').hidden = !(v && prov() === 'ms'); if (v && prov() === 'ms' && typeof checkMs === 'function') checkMs(false);
  $('go').textContent = t(!textMode() ? 'go.make' : (prov() === 'eleven' ? 'go.el' : prov() === 'ms' ? 'go.ms' : 'go.listen'));
  const n0 = $('name0').value || t('name.fallback1'), n1 = $('name1').value || t('name.fallback2');
  ['elL', 'brL', 'msL'].forEach(p => { $(p + '0').textContent = t('voice.of', { n: n0 }); $(p + '1').textContent = t('voice.of', { n: n1 }); });
  $('voiceNote').textContent = t(ELEVEN ? (prov() === 'eleven' ? 'note.el' : 'note.br') : 'note.br2');
  if (ELEVEN && prov() === 'ms') $('voiceNote').textContent = t('note.ms');
  if (v && !canSpeak() && prov() === 'browser') $('voiceNote').textContent = t('note.nospeech', { x: t(ELEVEN ? 'note.nospeech.x1' : 'note.nospeech.x2') });
}
const vscore = v => (/natural|neural|online/i.test(v.name) ? 3 : 0) + (/google/i.test(v.name) ? 2 : 0) + (v.localService ? 0 : 1);
const vlist = () => (canSpeak() ? speechSynthesis.getVoices() : []);
function fillBrowserVoices() {
  fillMsVoices();
  [0, 1].forEach(k => {
    const sel = $('brS' + k), lang = $('lc' + k).value, prev = sel.value;
    const vs = vlist().filter(v => v.lang.toLowerCase().startsWith(lang)).sort((a, b) => vscore(b) - vscore(a));
    sel.innerHTML = '';
    vs.forEach(v => { const o = document.createElement('option'); o.value = v.voiceURI; o.textContent = v.name + ' (' + v.lang + ')'; sel.appendChild(o); });
    if (!vs.length) { const o = document.createElement('option'); o.value = ''; o.textContent = t('br.none'); sel.appendChild(o); }
    if (prev && [...sel.options].some(o => o.value === prev)) sel.value = prev;
  });
}
function say(text, k) {
  return new Promise(res => {
    const u = new SpeechSynthesisUtterance(text), v = vlist().find(x => x.voiceURI === $('brS' + k).value);
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = $('lc' + k).value;
    u.rate = +$('brRate').value || 0.9; u.onend = u.onerror = () => res(); speechSynthesis.speak(u);
  });
}
async function wait(s) { const end = Date.now() + s * 1000; while (Date.now() < end && !stopFlag) await new Promise(r => setTimeout(r, 80)); }
async function speakOne(text, k) { if (!canSpeak() || speaking) return; speechSynthesis.cancel(); await say(text, k); }
async function speakAll() {
  speaking = true; stopFlag = false; $('stopSay').hidden = false; updateGo();
  const c = readCfg(), order = c.order === 'ba' ? [1, 0] : [0, 1], idx = [...S.sel].sort((a, b) => a - b), nm = l => $('name' + l).value || t('lang.' + (l + 1) + 'c');
  try {
    for (let n = 0; n < idx.length && !stopFlag; n++) {
      const r = S.rows[idx[n]], rowReps = Math.max(1, r.rep || 1);
      for (let q = 0; q < rowReps && !stopFlag; q++) {   // the whole row repeats rowReps times
        for (let oi = 0; oi < 2 && !stopFlag; oi++) {
          const l = order[oi];
          for (let rep = 0; rep < c.reps[l] && !stopFlag; rep++) {
            setStatus(t('say.progress', { i: n + 1, n: idx.length, l: nm(l), r: rep + 1, R: c.reps[l] }));
            await say(r.t[l], l); if (!stopFlag && rep < c.reps[l] - 1) await wait(c.gapRep);
          }
          if (oi === 0 && c.reps[l] > 0 && c.reps[order[1]] > 0 && !stopFlag) await wait(c.gapLang);
        }
        if (q < rowReps - 1 && !stopFlag) await wait(c.gapPhrase);
      }
      if (n < idx.length - 1 && !stopFlag) await wait(c.gapPhrase);
    }
  } finally { speaking = false; $('stopSay').hidden = true; try { speechSynthesis.cancel(); } catch (e) {} setStatus(t(stopFlag ? 'say.stopped' : 'say.end')); updateGo(); }
}
$('stopSay').addEventListener('click', () => { stopFlag = true; try { speechSynthesis.cancel(); } catch (e) {} });
