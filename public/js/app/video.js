// ---- Karaoke video (MP4) ----
// Every frame is drawn on a canvas, encoded with WebCodecs (H.264 + AAC when the browser can) and packed with mp4-muxer.
// The timing comes from the assembler's timeline (S.timeline), so the text is exactly in sync with the audio.
const VID = { fps: 30, lead: 1.8, tail: 1.6, fade: 0.18 };
const VID_C = { white: '#f4f7fa', dim: '#707ca0', acc: '#78f0ff', muted: '#96a2c4', track: '#262c4e' };
const VID_SANS = '"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', VID_MONO = '"IBM Plex Mono", ui-monospace, Consolas, monospace';
let vidBusy = false, vidCancelled = false;

function videoSupport() {
  if (!window.VideoEncoder || !window.AudioEncoder || !window.VideoFrame || !window.AudioData) return t('vid.nosupport');
  if (!window.Mp4Muxer) return t('vid.nolib');
  return '';
}
// Options of "reveal while it is spoken": nothing, or one of the two languages (by the names typed in step 2)
function fillVidHide() {
  const sel = $('vidHide'); if (!sel) return;
  const keep = sel.value || store.get('vidHide', '1'), names = [0, 1].map(i => $('name' + i).value || t('lang.' + (i + 1) + 'c'));
  sel.replaceChildren(...[['', t('vid.hide.none')], ['0', t('vid.hide.opt', { name: names[0] })], ['1', t('vid.hide.opt', { name: names[1] })]].map(([v, s]) => { const o = document.createElement('option'); o.value = v; o.textContent = s; return o; }));
  sel.value = keep;
}
// Called after each audio generation: the video button works only when there is a timeline and the browser can encode
function videoReady() {
  fillVidHide();
  const why = videoSupport(), ok = !why && S.timeline && S.timeline.length;
  $('saveVideo').disabled = !ok; $('vidHint').textContent = ok ? '' : (why || '');
}
['vidOrient', 'vidHide'].forEach(id => { const v = store.get(id, ''); if (v !== '' || id === 'vidHide') { try { $(id).value = v; } catch (e) {} } $(id).addEventListener('input', () => store.set(id, $(id).value)); });
fillVidHide();

const smooth = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };

// ---------- background (soft colour glow, drawn once) ----------
function vidBackground(W, H) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), M = Math.max(W, H);
  g.fillStyle = '#0b0e20'; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'lighter';
  const glow = (x, y, r, rgb, a) => { const k = g.createRadialGradient(x, y, 0, x, y, r); k.addColorStop(0, `rgba(${rgb},${a})`); k.addColorStop(0.45, `rgba(${rgb},${a * 0.45})`); k.addColorStop(1, `rgba(${rgb},0)`); g.fillStyle = k; g.fillRect(0, 0, W, H); };
  glow(W * 0.12, H * 0.02, M * 0.46, '70,52,190', 0.85); glow(W * 0.88, H * 0.98, M * 0.44, '18,150,170', 0.8); glow(W * 0.9, H * 0.02, M * 0.3, '120,40,150', 0.6);
  return c;
}

// ---------- layout: one block per row visit, with wrapped lines and per-word timing ----------
function vidBuild(g, tl, W, H, P, hide, names) {
  const blocks = [], idx = new Map();
  tl.forEach(e => { const key = e.k + ':' + e.q; let b = idx.get(key); if (!b) { b = { k: e.k, q: e.q, rowReps: e.rowReps, row: e.row, ev: [[], []], all: [] }; idx.set(key, b); blocks.push(b); } b.ev[e.li].push(e); b.all.push(e); });
  g.font = P.fTxt; const space = g.measureText(' ').width, lineH = P.fs * P.lh;
  blocks.forEach(b => {
    b.t0 = Math.min(...b.all.map(e => e.t0)); b.t1 = Math.max(...b.all.map(e => e.t1)); b.lang = [null, null];
    let total = 0;
    [0, 1].forEach(li => {
      const spoken = b.ev[li].length > 0; if (li === hide && !spoken) return;   // a hidden language that is never spoken stays hidden
      const text = String((b.row && b.row.t && b.row.t[li]) || '').trim(); if (!text) return;
      const words = text.split(/\s+/), lines = [[]];
      words.forEach(w => { const cur = lines[lines.length - 1]; if (cur.length && g.measureText(cur.concat(w).join(' ')).width > P.maxw) lines.push([w]); else cur.push(w); });
      const weights = words.map(w => w.length + 1.5), sum = weights.reduce((a, c) => a + c, 0); let acc = 0, n = 0; const out = [];
      lines.forEach((ln, r) => {
        const widths = ln.map(w => g.measureText(w).width), lw = widths.reduce((a, c) => a + c, 0) + space * (ln.length - 1); let x = (W - lw) / 2;
        ln.forEach((w, j) => { const f0 = acc / sum; acc += weights[n++]; out.push({ w, x, row: r, wd: widths[j], f0, f1: acc / sum }); x += widths[j] + space; });
      });
      b.lang[li] = { words: out, nlines: lines.length, h: P.lab * 1.9 + lines.length * lineH };
      total += b.lang[li].h + P.gap;
    });
    let y = H * 0.47 - (total - P.gap) / 2;
    [0, 1].forEach(li => { const L = b.lang[li]; if (!L) return; L.labY = y; L.textY = y + P.lab * 1.9; y += L.h + P.gap; });
  });
  return blocks;
}

function vidDrawBlock(g, b, now, P, hide, names) {
  const cur = b.all.slice().sort((a, c) => a.t0 - c.t0).find(e => e.t1 > now), active = cur ? cur.li : -1;
  [0, 1].forEach(li => {
    const L = b.lang[li]; if (!L) return;
    const evs = b.ev[li]; let ci = -1; for (let j = 0; j < evs.length; j++) if (evs[j].t0 <= now) ci = j;
    let mode = 'static', p = 0;                                           // static: never spoken (reference text)
    if (evs.length) { if (ci < 0) mode = 'pre'; else if (now < evs[ci].t1) { mode = 'play'; p = (now - evs[ci].t0) / (evs[ci].t1 - evs[ci].t0); } else mode = 'done'; }
    const isHidden = li === hide, firstRep = ci <= 0;
    // label with the repetition counter when the language repeats
    let lab = names[li].toUpperCase(); if (evs.length > 1 && ci >= 0) lab += '  ·  ' + (ci + 1) + '/' + evs.length;
    g.font = P.fLab; g.textAlign = 'center'; g.textBaseline = 'top'; g.fillStyle = li === active || mode === 'static' ? VID_C.muted : VID_C.dim;
    g.fillText(lab, g.canvas.width / 2, L.labY);
    g.font = P.fTxt; g.textAlign = 'left';
    const base = mode === 'static' ? VID_C.muted : (li === active ? VID_C.white : VID_C.dim);
    L.words.forEach(w => {
      const y = L.textY + w.row * P.fs * P.lh;
      if (mode === 'done') { g.fillStyle = VID_C.acc; g.fillText(w.w, w.x, y); return; }
      const hideBase = isHidden && mode !== 'static' && firstRep && (mode === 'pre' || mode === 'play');   // revealed only as it is spoken
      if (!hideBase) { g.fillStyle = base; g.fillText(w.w, w.x, y); }
      if (mode === 'play') {
        const wp = Math.max(0, Math.min(1, (p - w.f0) / (w.f1 - w.f0)));
        if (wp > 0) { g.save(); g.beginPath(); g.rect(w.x - 2, y - 4, w.wd * wp + 2, P.fs * P.lh); g.clip(); g.fillStyle = VID_C.acc; g.fillText(w.w, w.x, y); g.restore(); }
      }
    });
  });
}

function vidFrame(g, bg, blocks, win, now, W, H, P, hide, names, info) {
  g.globalAlpha = 1; g.drawImage(bg, 0, 0);
  g.fillStyle = VID_C.track; g.fillRect(0, 0, W, 4); g.fillStyle = VID_C.acc; g.fillRect(0, 0, W * Math.min(1, now / info.end), 4);
  // title card
  const ta = 1 - smooth((now - (VID.lead - 0.4)) / 0.4);
  if (ta > 0.01) {
    g.globalAlpha = ta; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; let fs = P.ttl; g.font = `700 ${fs}px ${VID_SANS}`;
    const wTitle = g.measureText(info.title).width; if (wTitle > W * 0.86) { fs = Math.floor(fs * W * 0.86 / wTitle); g.font = `700 ${fs}px ${VID_SANS}`; }
    g.fillStyle = VID_C.acc; g.fillText(info.title, W / 2, H * 0.47); g.font = P.fSub; g.fillStyle = VID_C.muted; g.fillText(info.sub, W / 2, H * 0.47 + P.sub * 1.9);
    g.globalAlpha = 1;
  }
  // header, counter and next-phrase hint follow the block that is on screen
  let cur = 0; blocks.forEach((b, i) => { if (now >= win[i].s) cur = i; });
  if (now >= VID.lead - 0.2) {
    const b = blocks[cur]; g.textBaseline = 'top'; g.font = P.fHdr; g.fillStyle = VID_C.muted;
    g.textAlign = 'left'; g.fillText(info.title.length > 26 ? info.title.slice(0, 25) + '…' : info.title, P.margin, P.margin * 0.7);
    g.textAlign = 'right'; g.fillText((b.k + 1) + ' / ' + info.n + (b.rowReps > 1 ? '  ·  ×' + (b.q + 1) + '/' + b.rowReps : ''), W - P.margin, P.margin * 0.7);
  }
  blocks.forEach((b, i) => {
    const w = win[i], aIn = smooth((now - (w.s - VID.fade)) / (VID.fade * 2)), aOut = i < blocks.length - 1 ? 1 - smooth((now - (w.e - VID.fade)) / (VID.fade * 2)) : 1 - smooth((now - (info.end - 0.7)) / 0.6), a = Math.min(aIn, aOut);
    if (a <= 0.01) return;
    g.save(); g.globalAlpha = a; g.translate(0, (1 - aIn) * 18); vidDrawBlock(g, b, now, P, hide, names);
    const nx = blocks[i + 1];
    if (nx && nx.row && nx.row.t) {
      const shown = hide === 1 ? 0 : (hide === 0 ? 1 : 0), k = Math.min(smooth((now - (b.t0 + 0.3)) / 0.5), 1 - smooth((now - (w.e - 0.25)) / 0.25)) * 0.8;
      if (k > 0.01) { g.globalAlpha = a * k; g.textAlign = 'center'; g.textBaseline = 'top'; g.font = P.fLab; g.fillStyle = VID_C.dim; g.fillText(t('vid.next'), W / 2, H - P.margin * 2.3); g.font = P.fNxt; g.fillStyle = VID_C.muted; g.fillText(String(nx.row.t[shown] || ''), W / 2, H - P.margin * 1.65); }
    }
    g.restore();
  });
  g.globalAlpha = 1;
}

// ---------- encoders ----------
async function vidPickVideo(W, H, bitrate) {
  for (const codec of ['avc1.640028', 'avc1.4d0028', 'avc1.42001f']) {
    const cfg = { codec, width: W, height: H, bitrate, framerate: VID.fps, avc: { format: 'avc' } };
    try { if ((await VideoEncoder.isConfigSupported(cfg)).supported) return { cfg, mux: 'avc', name: 'H.264' }; } catch (e) {}
  }
  const cfg = { codec: 'vp09.00.31.08', width: W, height: H, bitrate, framerate: VID.fps };
  try { if ((await VideoEncoder.isConfigSupported(cfg)).supported) return { cfg, mux: 'vp9', name: 'VP9' }; } catch (e) {}
  return null;
}
async function vidPickAudio(sr, nch) {
  for (const rate of [...new Set([sr, 48000, 44100])]) {
    const cfg = { codec: 'mp4a.40.2', sampleRate: rate, numberOfChannels: nch, bitrate: 128000 };
    try { if ((await AudioEncoder.isConfigSupported(cfg)).supported) return { cfg, mux: 'aac', rate, name: 'AAC' }; } catch (e) {}
  }
  const cfg = { codec: 'opus', sampleRate: 48000, numberOfChannels: nch, bitrate: 96000 };
  try { if ((await AudioEncoder.isConfigSupported(cfg)).supported) return { cfg, mux: 'opus', rate: 48000, name: 'Opus' }; } catch (e) {}
  return null;
}
async function vidResample(chans, sr, rate) {
  if (sr === rate) return chans;
  const len = Math.ceil(chans[0].length * rate / sr), oc = new OfflineAudioContext(chans.length, len, rate), b = oc.createBuffer(chans.length, chans[0].length, sr);
  chans.forEach((c, i) => b.copyToChannel(c, i));
  const s = oc.createBufferSource(); s.buffer = b; s.connect(oc.destination); s.start();
  const r = await oc.startRendering(); return chans.map((_, i) => r.getChannelData(i));
}
const vidWait = () => new Promise(r => setTimeout(r, 0));

async function makeVideo() {
  if (vidBusy) return;
  const why = videoSupport(); if (why) { toast(why); return; }
  if (!S.timeline || !S.timeline.length || !S.out) return;
  const portrait = $('vidOrient').value === 'port', W = portrait ? 720 : 1280, H = portrait ? 1280 : 720;
  const name = (S.fileName || 'audio') + '_karaoke.mp4';
  // Ask where to save first: the browser only allows the dialog right after the click, and the video takes a while
  let handle = null;
  if (window.showSaveFilePicker) {
    try { handle = await showSaveFilePicker({ suggestedName: name, types: [{ description: t('save.mp4'), accept: { 'video/mp4': ['.mp4'] } }] }); }
    catch (e) { if (e && e.name === 'AbortError') { $('vidHint').textContent = t('save.cancel'); return; } }
  }
  vidBusy = true; vidCancelled = false;
  $('saveVideo').disabled = true; $('vidRun').hidden = false; $('vprog').value = 0;
  const hint = m => { $('vidHint').textContent = m; };
  let venc = null, aenc = null;
  try {
    try { await document.fonts.load('600 50px "IBM Plex Sans"'); await document.fonts.load('500 17px "IBM Plex Mono"'); await document.fonts.load('700 100px "IBM Plex Sans"'); } catch (e) {}
    const hide = $('vidHide').value === '' ? -1 : +$('vidHide').value, names = [0, 1].map(i => $('name' + i).value || t('lang.' + (i + 1) + 'c'));
    const sr0 = S.outBuf.sampleRate, nch = S.out.length;
    // codecs
    const BR = portrait ? 1600000 : 1800000;
    const vp = await vidPickVideo(W, H, BR), ap = await vidPickAudio(sr0, nch);
    if (!vp || !ap) throw new Error(t('vid.nocodec'));
    // audio with the title-card silence in front, at a sample rate the encoder accepts
    const lead = Math.round(sr0 * VID.lead), padded = S.out.map(c => { const o = new Float32Array(lead + c.length); o.set(c, lead); return o; });
    const chans = await vidResample(padded, sr0, ap.rate), end = S.timeline[S.timeline.length - 1].t1 + VID.lead + VID.tail;
    const muxer = new Mp4Muxer.Muxer({ target: new Mp4Muxer.ArrayBufferTarget(), video: { codec: vp.mux, width: W, height: H, frameRate: VID.fps }, audio: { codec: ap.mux, numberOfChannels: nch, sampleRate: ap.rate }, fastStart: 'in-memory' });
    let fail = null;
    // ---- audio ----
    aenc = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: e => { fail = e; } }); aenc.configure(ap.cfg);
    const total = chans[0].length, step = 4096;
    for (let off = 0, k = 0; off < total && !fail && !vidCancelled; off += step, k++) {
      const n = Math.min(step, total - off), data = new Float32Array(n * nch); chans.forEach((c, i) => data.set(c.subarray(off, off + n), i * n));
      const ad = new AudioData({ format: 'f32-planar', sampleRate: ap.rate, numberOfFrames: n, numberOfChannels: nch, timestamp: Math.round(off / ap.rate * 1e6), data });
      aenc.encode(ad); ad.close();
      while (aenc.encodeQueueSize > 24) await vidWait();
      if (k % 64 === 0) { $('vprog').value = 5 * off / total; await vidWait(); }
    }
    await aenc.flush(); if (fail) throw fail; if (vidCancelled) throw new Error('cancelled');
    // ---- video ----
    const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
    const g = canvas.getContext('2d', { alpha: false }), bg = vidBackground(W, H);
    const P = portrait
      ? { fs: 54, lab: 21, hdr: 22, nxt: 30, ttl: 92, sub: 30, maxw: W * 0.86, lh: 1.3, gap: 40, margin: 40 }
      : { fs: 50, lab: 17, hdr: 19, nxt: 26, ttl: 112, sub: 28, maxw: W * 0.84, lh: 1.32, gap: 34, margin: 64 };
    P.fTxt = `600 ${P.fs}px ${VID_SANS}`; P.fLab = `500 ${P.lab}px ${VID_MONO}`; P.fHdr = `500 ${P.hdr}px ${VID_MONO}`; P.fNxt = `400 ${P.nxt}px ${VID_SANS}`; P.fSub = `400 ${P.sub}px ${VID_SANS}`;
    const tl = S.timeline.map(e => ({ ...e, t0: e.t0 + VID.lead, t1: e.t1 + VID.lead }));
    const blocks = vidBuild(g, tl, W, H, P, hide, names);
    const win = blocks.map((b, i) => ({ s: i === 0 ? VID.lead - 0.1 : (blocks[i - 1].t1 + b.t0) / 2, e: i < blocks.length - 1 ? (b.t1 + blocks[i + 1].t0) / 2 : end }));
    const rows = new Set(S.timeline.map(e => e.k)).size;
    const info = { end, n: rows, title: String(textMode() ? S.pdfBase : S.base).replace(/[_-]+/g, ' ').trim().toUpperCase() || 'KARAOKE', sub: names.join(' · ') + ' — ' + t('vid.phrases', { n: rows }) };
    venc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: e => { fail = e; } }); venc.configure(vp.cfg);
    const nFrames = Math.ceil(end * VID.fps), us = 1e6 / VID.fps;
    for (let f = 0; f < nFrames && !fail && !vidCancelled; f++) {
      vidFrame(g, bg, blocks, win, f / VID.fps, W, H, P, hide, names, info);
      const vf = new VideoFrame(canvas, { timestamp: Math.round(f * us), duration: Math.round(us) });
      venc.encode(vf, { keyFrame: f % (VID.fps * 2) === 0 }); vf.close();
      while (venc.encodeQueueSize > 8) await vidWait();
      if (f % 15 === 0) { $('vprog').value = 5 + 93 * f / nFrames; hint(t('vid.progress', { p: Math.round(5 + 93 * f / nFrames) })); await vidWait(); }
    }
    await venc.flush(); if (fail) throw fail; if (vidCancelled) throw new Error('cancelled');
    muxer.finalize();
    const blob = new Blob([muxer.target.buffer], { type: 'video/mp4' });
    $('vprog').value = 100;
    // save
    if (handle) { const w = await handle.createWritable(); await w.write(blob); await w.close(); hint(t('save.ok', { f: handle.name })); }
    else { const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 15000); hint(t('save.dl', { f: name })); }
    if (vp.mux !== 'avc' || ap.mux !== 'aac') toast(t('vid.fallback', { c: vp.name + ' + ' + ap.name }), 'ok');
    S.lastVideo = { codecs: vp.name + '+' + ap.name, size: blob.size, w: W, h: H, frames: nFrames, duration: end };
  } catch (e) {
    if (vidCancelled || (e && e.message === 'cancelled')) hint(t('vid.cancelled'));
    else { console.error(e); hint(''); toast(t('vid.err', { e: e.message || e }), 'err'); }
  } finally {
    try { venc && venc.state !== 'closed' && venc.close(); } catch (e) {} try { aenc && aenc.state !== 'closed' && aenc.close(); } catch (e) {}
    vidBusy = false; $('vidRun').hidden = true; videoReady();
  }
}
$('saveVideo').addEventListener('click', makeVideo);
$('vidCancel').addEventListener('click', () => { vidCancelled = true; });
