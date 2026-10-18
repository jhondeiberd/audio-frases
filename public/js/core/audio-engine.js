/* Audio engine: segmentation by silences, voice classification by pitch, pairing, assembly, ZIP */
const Core = (() => {
  // ---------- analysis ----------
  function frameDb(x, sr, hop) {
    const n = Math.floor(sr * hop), out = new Float32Array(Math.floor(x.length / n));
    for (let f = 0; f < out.length; f++) {
      let s = 0; const o = f * n;
      for (let i = 0; i < n; i++) { const v = x[o + i]; s += v * v; }
      out[f] = 10 * Math.log10(s / n + 1e-12);
    }
    return out;
  }

  // Speech pieces separated by silences >= minSil (s). Pieces shorter than minLen are discarded.
  function pieces(x, sr, { thr = -35, minSil = 0.25, minLen = 0.12, hop = 0.01 } = {}) {
    const db = frameDb(x, sr, hop), gapF = Math.round(minSil / hop);
    const runs = []; let start = -1, last = -1;
    for (let f = 0; f < db.length; f++) {
      if (db[f] > thr) { if (start < 0) start = f; last = f; }
      else if (start >= 0 && f - last >= gapF) { runs.push([start, last + 1]); start = -1; }
    }
    if (start >= 0) runs.push([start, last + 1]);
    return runs.map(([a, b]) => [a * hop, b * hop]).filter(([a, b]) => b - a >= minLen);
  }

  function median(a) { const s = a.slice().sort((p, q) => p - q); return s.length ? s[s.length >> 1] : 0; }

  // Median pitch (Hz) of a piece, by autocorrelation over the voiced stretches
  function pitch(x, sr, a, b) {
    const W = Math.round(sr * 0.04), H = Math.round(sr * 0.02);
    const lagMin = Math.floor(sr / 330), lagMax = Math.ceil(sr / 75);
    const f0 = [];
    const i0 = Math.floor(a * sr), i1 = Math.min(Math.floor(b * sr), x.length - W - lagMax - 1);
    for (let p = i0; p < i1; p += H) {
      let r0 = 0;
      for (let i = 0; i < W; i++) r0 += x[p + i] * x[p + i];
      if (Math.sqrt(r0 / W) < 0.015) continue;
      let best = 0, bl = 0;
      for (let l = lagMin; l <= lagMax; l++) {
        let r = 0;
        for (let i = 0; i < W; i++) r += x[p + i] * x[p + i + l];
        if (r > best) { best = r; bl = l; }
      }
      if (bl && best > 0.5 * r0) f0.push(sr / bl);
    }
    return { f0: f0.length ? median(f0) : 0, voiced: f0.length };
  }

  // 1-D 2-means. Returns null when the two voices do not separate clearly.
  function twoVoices(vals) {
    const v = vals.filter(t => t > 0).sort((p, q) => p - q);
    if (v.length < 6) return null;
    let lo = v[Math.floor(v.length * 0.15)], hi = v[Math.floor(v.length * 0.85)];
    for (let it = 0; it < 30; it++) {
      const mid = (lo + hi) / 2; let sl = 0, nl = 0, sh = 0, nh = 0;
      for (const t of v) { if (t < mid) { sl += t; nl++; } else { sh += t; nh++; } }
      if (!nl || !nh) return null;
      lo = sl / nl; hi = sh / nh;
    }
    const mid = (lo + hi) / 2, nl = v.filter(t => t < mid).length;
    const sep = (hi - lo) / mid, frac = Math.min(nl, v.length - nl) / v.length;
    if (sep < 0.25 || frac < 0.1) return null;
    return { lo, hi, mid, sep };
  }

  // Assigns a voice (0 low, 1 high) to each piece with Viterbi: the pitch of each piece is the evidence
  // (robust to outliers) and the preceding silence says whether an utterance change is likely.
  // Then it merges consecutive pieces of the same voice into utterances.
  function groupByVoice(pcs, f0s, voiced, vc) {
    const n = pcs.length, c = [vc.lo, vc.hi];
    const sd = [0, 1].map(k => {   // robust spread of each voice (MAD)
      const v = f0s.filter((t, i) => voiced[i] >= 8 && (k ? t >= vc.mid : t > 0 && t < vc.mid)).map(t => Math.abs(t - c[k])).sort((p, q) => p - q);
      return Math.max(10, 1.4826 * (v.length ? v[v.length >> 1] : 12));
    });
    const emit = (i, k) => {
      if (voiced[i] < 3 || !(f0s[i] > 0)) return 0;
      const z = (f0s[i] - c[k]) / sd[k], w = Math.min(1, voiced[i] / 20);
      return w * 2 * Math.log(1 + z * z / 3);
    };
    const pFlip = g => Math.min(0.999, Math.max(0.001, 1 / (1 + Math.exp(-10 * (g - 0.45)))));
    const cost = [[emit(0, 0)], [emit(0, 1)]], back = [[0], [0]];
    for (let i = 1; i < n; i++) {
      const pf = pFlip(pcs[i][0] - pcs[i - 1][1]), stay = -Math.log(1 - pf), flip = -Math.log(pf);
      for (let k = 0; k < 2; k++) {
        const s = cost[k][i - 1] + stay, f = cost[1 - k][i - 1] + flip;
        if (s <= f) { cost[k][i] = s + emit(i, k); back[k][i] = k; } else { cost[k][i] = f + emit(i, k); back[k][i] = 1 - k; }
      }
    }
    const lab = new Array(n); let k = cost[0][n - 1] <= cost[1][n - 1] ? 0 : 1;
    for (let i = n - 1; i >= 0; i--) { lab[i] = k; k = back[k][i]; }
    const groups = [];
    pcs.forEach(([a, b], i) => {
      const g = groups[groups.length - 1];
      if (g && g.voice === lab[i]) g.b = b; else groups.push({ a, b, voice: lab[i] });
    });
    return groups;
  }

  // Without two distinct voices: pick the (K-1) longest silences as boundaries.
  function groupByGaps(pcs, K) {
    if (pcs.length <= K) return pcs.map(([a, b]) => ({ a, b, voice: -1 }));
    const gaps = pcs.slice(1).map((p, i) => ({ i, g: p[0] - pcs[i][1] })).sort((p, q) => q.g - p.g).slice(0, K - 1).map(o => o.i).sort((p, q) => p - q);
    const out = []; let s = 0;
    for (const i of gaps) { out.push({ a: pcs[s][0], b: pcs[i][1], voice: -1 }); s = i + 1; }
    out.push({ a: pcs[s][0], b: pcs[pcs.length - 1][1], voice: -1 });
    return out;
  }

  // Segments the whole audio. nPhrases = number of phrases in the PDF (if known).
  function segment(x, sr, nPhrases, opts = {}) {
    const pcs = pieces(x, sr, opts);
    const info = pcs.map(([a, b]) => pitch(x, sr, a, b));
    const f0s = info.map(o => o.f0), voiced = info.map(o => o.voiced);
    const vc = twoVoices(f0s.filter((t, i) => voiced[i] >= 3));
    let groups, mode;
    if (vc) { groups = groupByVoice(pcs, f0s, voiced, vc); mode = 'voices'; }
    else {
      mode = 'silences';
      const first = pcs[0] && (pcs[0][1] - pcs[0][0]) < 1.2;
      groups = groupByGaps(pcs, nPhrases ? 2 * nPhrases + (first ? 1 : 0) : pcs.length);
    }
    return { groups, mode, voices: vc, pieces: pcs.length };
  }

  // Pairs utterances into phrases [first language, second language]. skip = leading utterances to omit (cover).
  function pair(groups, nPhrases, skip) {
    const g = groups.slice(skip);
    const pairs = [];
    for (let i = 0; i + 1 < g.length && pairs.length < nPhrases; i += 2) pairs.push([g[i], g[i + 1]]);
    return pairs;
  }
  function autoSkip(groups, nPhrases) {
    const extra = groups.length - 2 * nPhrases;
    return extra > 0 ? extra : 0;
  }

  // ---------- alignment with the PDF ----------
  function corr(a, b) {
    const n = a.length, ma = a.reduce((s, v) => s + v, 0) / n, mb = b.reduce((s, v) => s + v, 0) / n;
    let sab = 0, saa = 0, sbb = 0;
    for (let i = 0; i < n; i++) { const x = a[i] - ma, y = b[i] - mb; sab += x * y; saa += x * x; sbb += y * y; }
    return saa && sbb ? sab / Math.sqrt(saa * sbb) : 0;
  }
  // Chooses how many leading utterances to skip by comparing each utterance's duration with the length
  // of the PDF phrase text: with the right offset the correlation is high.
  function bestSkip(groups, texts, maxSkip = 6) {
    const N = texts.length, res = [];
    for (let s = 0; s <= Math.min(maxSkip, groups.length - 2); s++) {
      const d0 = [], c0 = [], d1 = [], c1 = [];
      for (let i = 0; i < N && s + 2 * i + 1 < groups.length; i++) {
        const A = groups[s + 2 * i], B = groups[s + 2 * i + 1];
        d0.push(A.b - A.a); c0.push(texts[i][0].length); d1.push(B.b - B.a); c1.push(texts[i][1].length);
      }
      res.push({ s, n: d0.length, score: d0.length < 3 ? -1 : (corr(d0, c0) + corr(d1, c1)) / 2 });
    }
    res.forEach(r => r.adj = r.score + 0.1 * r.n / N);
    res.sort((p, q) => q.adj - p.adj || p.s - q.s);
    return { skip: res[0].s, score: res[0].score, all: res };
  }

  // ---------- assembly ----------
  // chans: Float32Array[] (1 or 2 channels). Returns Float32Array[] with the same number of channels.
  function assemble(chans, sr, items, cfg) {
    const nch = chans.length, padB = cfg.padBefore, padA = cfg.padAfter, fade = Math.round(sr * 0.01);
    const sec = t => Math.round(t * sr);
    const chunks = []; let total = 0;
    const push = a => { chunks.push(a); total += a[0].length; };
    const silence = t => { const n = sec(t); if (n > 0) push(chans.map(() => new Float32Array(n))); };
    const clip = ([a, b]) => {
      const i0 = Math.max(0, sec(a - padB)), i1 = Math.min(chans[0].length, sec(b + padA));
      return chans.map(c => { const s = c.slice(i0, i1); const f = Math.min(fade, s.length >> 1);
        for (let i = 0; i < f; i++) { const g = i / f; s[i] *= g; s[s.length - 1 - i] *= g; } return s; });
    };
    // item = [clip of language 1, clip of language 2, rowReps]; the whole row (both languages) plays rowReps times
    items.forEach((it, k) => {
      const order = cfg.order === 'ba' ? [1, 0] : [0, 1], rowReps = Math.max(1, it[2] || 1);
      for (let q = 0; q < rowReps; q++) {
        order.forEach((li, oi) => {
          const reps = cfg.reps[li];
          for (let r = 0; r < reps; r++) {
            push(clip(it[li]));
            const lastRep = r === reps - 1;
            if (!lastRep) silence(cfg.gapRep);
          }
          if (reps > 0 && oi === 0 && cfg.reps[order[1]] > 0) silence(cfg.gapLang);
        });
        if (q < rowReps - 1) silence(cfg.gapPhrase);   // pause between repetitions of the same row
      }
      if (k < items.length - 1) silence(cfg.gapPhrase);
    });
    const out = chans.map(() => new Float32Array(total)); let o = 0;
    for (const ch of chunks) { ch.forEach((c, i) => out[i].set(c, o)); o += ch[0].length; }
    return out;
  }

  // ---------- ZIP (no compression) ----------
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function zip(files) { // files: [{name, data:Uint8Array}]
    const enc = new TextEncoder(), parts = [], central = []; let off = 0;
    const now = new Date(), dt = ((now.getFullYear() - 1980) << 9 | (now.getMonth() + 1) << 5 | now.getDate()) & 0xFFFF, tm = (now.getHours() << 11 | now.getMinutes() << 5 | (now.getSeconds() >> 1)) & 0xFFFF;
    for (const f of files) {
      const nm = enc.encode(f.name), crc = crc32(f.data), sz = f.data.length;
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
      lh.setUint16(10, tm, true); lh.setUint16(12, dt, true); lh.setUint32(14, crc, true); lh.setUint32(18, sz, true); lh.setUint32(22, sz, true);
      lh.setUint16(26, nm.length, true); lh.setUint16(28, 0, true);
      parts.push(new Uint8Array(lh.buffer), nm, f.data);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
      ch.setUint16(12, tm, true); ch.setUint16(14, dt, true); ch.setUint32(16, crc, true); ch.setUint32(20, sz, true); ch.setUint32(24, sz, true);
      ch.setUint16(28, nm.length, true); ch.setUint32(42, off, true);
      central.push(new Uint8Array(ch.buffer), nm);
      off += 30 + nm.length + sz;
    }
    const csz = central.reduce((s, a) => s + a.length, 0);
    const eo = new DataView(new ArrayBuffer(22));
    eo.setUint32(0, 0x06054b50, true); eo.setUint16(8, files.length, true); eo.setUint16(10, files.length, true); eo.setUint32(12, csz, true); eo.setUint32(16, off, true);
    return new Blob([...parts, ...central, new Uint8Array(eo.buffer)], { type: 'application/zip' });
  }

  return { frameDb, pieces, pitch, twoVoices, groupByVoice, groupByGaps, segment, pair, autoSkip, bestSkip, assemble, zip, crc32 };
})();
if (typeof module !== 'undefined') module.exports = Core;
