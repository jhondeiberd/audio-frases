// ---- Audio ----
async function handleAudio(file) {
  S.buf = null; S.seg = null; S.x16 = null; S.loadingAudio = true; renderRows(); paintFileNames(); setStatus(t('st.audio.open')); await tick();
  try {
    const ab = await file.arrayBuffer();
    const buf = await getCtx().decodeAudioData(ab);
    S.buf = buf; S.sr = buf.sampleRate; S.chans = [buf.getChannelData(0)]; if (buf.numberOfChannels > 1) S.chans.push(buf.getChannelData(1));
    S.base = file.name.replace(/\.[^.]+$/, '') || 'audio';
    // mono 16 kHz copy for the analysis
    const oc = new OfflineAudioContext(1, Math.ceil(buf.duration * 16000), 16000), src = oc.createBufferSource();
    src.buffer = buf; src.connect(oc.destination); src.start();
    S.x16 = (await oc.startRendering()).getChannelData(0);
    S.audioName = file.name; S.loadingAudio = false; $('dropAudio').classList.add('ok'); paintFileNames();
    setStatus(''); afterLoad();
  } catch (e) { console.error(e); S.loadingAudio = false; paintFileNames(); renderRows(); setStatus(t('err.audio'), true); }
}

async function afterLoad() {
  if (!S.rows.length) { renderRows(); return; }
  if (!S.x16) { S.seg = null; S.pairs = []; S.skip = 0; renderRows(); estimate(); return; }
  setStatus(t('st.seg')); await tick(); await tick();
  S.seg = Core.segment(S.x16, 16000, S.rows.length);
  const def = Core.autoSkip(S.seg.groups, S.rows.length), al = Core.bestSkip(S.seg.groups, S.rows.map(r => r.t)), dflt = al.all.find(o => o.s === def);
  S.align = al.all; S.skip = (dflt && al.score - dflt.score < 0.1) ? def : al.skip;
  $('skip').value = S.skip;
  setStatus(''); repair();
}
