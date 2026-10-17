// ---- reproductor del resultado ----
let outSrc = null, outStart = 0, outOff = 0, raf = 0;
function paintTime(t) { const d = S.outBuf ? S.outBuf.duration : 0; $('time').textContent = fmt(t) + ' / ' + fmt(d); $('seek').value = d ? Math.round(1000 * t / d) : 0; }
function stopOut(keep) { cancelAnimationFrame(raf); try { outSrc && (outSrc.onended = null, outSrc.stop()); } catch (e) {} outSrc = null; if (!keep) { outOff = 0; } $('pp').textContent = '▶'; }
function playOut(from) {
  const c = getCtx(); c.resume(); stopOut(true); stopClip();
  outSrc = c.createBufferSource(); outSrc.buffer = S.outBuf; outSrc.connect(c.destination); outOff = from; outStart = c.currentTime - from; outSrc.start(0, from);
  outSrc.onended = () => { stopOut(); paintTime(0); };
  $('pp').textContent = '❚❚';
  const loop = () => { if (!outSrc) return; const t = c.currentTime - outStart; paintTime(Math.min(t, S.outBuf.duration)); raf = requestAnimationFrame(loop); }; loop();
}
$('pp').addEventListener('click', () => { if (!S.outBuf) return; if (outSrc) { outOff = getCtx().currentTime - outStart; stopOut(true); } else playOut(outOff); });
$('seek').addEventListener('input', () => { if (!S.outBuf) return; const t = S.outBuf.duration * $('seek').value / 1000; outOff = t; if (outSrc) playOut(t); else paintTime(t); });
