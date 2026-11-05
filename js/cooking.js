/* =========================================================
   SHREYA SWEETS & RESTAURANTS — cooking.js
   Scroll-driven cooking story painted on a fixed <canvas>
   behind the whole page. Scroll down = the dish cooks;
   scroll up = it rewinds.

   Chapters (each tied to a page section):
     0 Fire     – hero               flame ignites under the kadai
     1 Tadka    – signature (start)  ghee pours, whole spices sizzle
     2 Masala   – signature (middle) onion + tomato, gravy turns red, ladle stirs
     3 Paneer   – signature → story  paneer cubes, cream swirl, coriander
     4 Tandoor  – menu               naan sticks, blisters, is pulled & buttered
     5 Mithai   – sweets             milk → khoya, ghee, laddoos stack up
     6 Serve    – gallery → contact  bowls arrive on a brass thali, steam

   Settings: SITE.cooking in js/main.js  (enabled, scrim)
   Debug:    add ?cook=3.5 to the URL to freeze the scene at a chapter time.
   ========================================================= */

(function () {
  'use strict';

  const conf = (window.SITE && window.SITE.cooking) || { enabled: true };
  if (conf.enabled === false) return;
  if (window.__cooking3D) return; // the Three.js world (js/cooking3d.js) is running

  const canvas = document.getElementById('cookingCanvas');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const root = document.documentElement;
  root.classList.add('has-cooking');
  if (typeof conf.scrim === 'number') root.style.setProperty('--cook-scrim', conf.scrim);

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const debugT = (() => {
    const m = /[?&]cook=([\d.]+)/.exec(location.search);
    return m ? parseFloat(m[1]) : null;
  })();

  /* ---------- Math helpers ---------- */
  const PI = Math.PI, TAU = PI * 2;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);
  const mix = (c1, c2, k) => [lerp(c1[0], c2[0], k), lerp(c1[1], c2[1], k), lerp(c1[2], c2[2], k)];
  const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const shade = (c, f) => [c[0] * f, c[1] * f, c[2] * f];

  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const R = rng(20251105);
  const inDisk = () => { const a = R() * TAU, r = Math.sqrt(R()) * 0.86; return [Math.cos(a) * r, Math.sin(a) * r]; };
  const make = (n, fn) => Array.from({ length: n }, (_, i) => fn(i));

  /* ---------- Deterministic scene data ---------- */
  const DATA = {
    seeds: make(26, () => ({ p: inDisk(), d: R() * 0.22, x0: (R() - 0.5) * 160, rot: R() * TAU })),
    onions: make(12, () => ({ p: inDisk(), d: R() * 0.2, x0: (R() - 0.5) * 220, rot: R() * TAU, s: 0.7 + R() * 0.5 })),
    tomatoes: make(14, () => ({ p: inDisk(), d: R() * 0.2, x0: (R() - 0.5) * 220, rot: R() * TAU, s: 0.7 + R() * 0.5 })),
    paneer: make(11, (i) => ({ p: inDisk(), d: i * 0.032, x0: (R() - 0.5) * 200, rot: (R() - 0.5) * 0.6, s: 0.85 + R() * 0.3 })),
    leaves: make(22, () => ({ p: inDisk(), d: R() * 0.16, x0: (R() - 0.5) * 260, rot: R() * TAU, s: 0.7 + R() * 0.6 })),
    sparks: make(22, () => ({ p: inDisk(), ph: R(), sp: 0.8 + R() })),
    steam: make(7, (i) => ({ x: -0.7 + i * 0.23 + (R() - 0.5) * 0.1, ph: R() })),
    coals: make(34, () => ({ x: (R() - 0.5) * 250, y: 150 + R() * 45, r: 7 + R() * 10, ph: R() * TAU })),
    char: make(16, () => ({ x: (R() - 0.5) * 0.7, y: (R() - 0.5) * 0.8, r: 3 + R() * 7, a: R() })),
    bubbles: make(16, () => ({ p: inDisk(), ph: R(), sp: 0.6 + R() * 0.8, r: 4 + R() * 8 })),
    speck: make(9, () => ({ a: R() * TAU, r: R() * 0.75 })),
    embers: make(60, () => ({ x: R(), ph: R(), sp: 0.35 + R() * 0.9, s: 0.6 + R() * 2.2, w: R() * TAU })),
    stars: make(14, () => ({ x: (R() - 0.5) * 520, y: -120 - R() * 160, ph: R(), s: 4 + R() * 6 }))
  };

  /* ---------- Soft puff sprite for steam ---------- */
  const puff = document.createElement('canvas');
  puff.width = puff.height = 128;
  (function () {
    const p = puff.getContext('2d');
    const g = p.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,248,236,0.9)');
    g.addColorStop(0.45, 'rgba(255,244,228,0.35)');
    g.addColorStop(1, 'rgba(255,240,220,0)');
    p.fillStyle = g; p.fillRect(0, 0, 128, 128);
  })();

  /* ---------- Layout ---------- */
  let W = 0, H = 0, DPR = 1, S = 1, CX = 0, CY = 0, mobile = false, vignette = null;

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    mobile = W < 768;
    DPR = Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.6);
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    S = Math.min(W / (mobile ? 640 : 1300), H / 860);
    CX = W * (mobile ? 0.5 : 0.64);
    CY = H * (mobile ? 0.6 : 0.56);
    vignette = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.78);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.72)');
    computeAnchors();
    dirty = true;
  }

  /* ---------- Scroll → story time (anchored to sections) ---------- */
  let anchors = [[0, 0], [1, 1]];
  function computeAnchors() {
    const sy = window.scrollY, half = H * 0.5;
    const el = (id) => document.getElementById(id);
    const top = (id) => { const e = el(id); return e ? e.getBoundingClientRect().top + sy : null; };
    const hgt = (id) => { const e = el(id); return e ? e.offsetHeight : 0; };
    const sig = top('signature'), sigH = hgt('signature');
    const end = document.documentElement.scrollHeight - H + half;
    const list = [
      [half, 0.32],
      [sig, 1], [sig + sigH * 0.38, 2], [sig + sigH * 0.72, 3],
      [top('menu'), 4], [top('sweets'), 5], [top('gallery'), 6], [top('contact'), 7],
      [end, 7.8]
    ].filter((a) => a[0] != null && isFinite(a[0]));
    for (let i = 1; i < list.length; i++) if (list[i][0] <= list[i - 1][0]) list[i][0] = list[i - 1][0] + 1;
    anchors = list;
  }
  function scrollToT(pos) {
    const a = anchors;
    if (pos <= a[0][0]) return a[0][1];
    for (let i = 1; i < a.length; i++) {
      if (pos <= a[i][0]) return lerp(a[i - 1][1], a[i][1], (pos - a[i - 1][0]) / (a[i][0] - a[i - 1][0]));
    }
    return a[a.length - 1][1];
  }

  /* ---------- Drawing primitives ---------- */
  /* soft circular glow — fills the gradient's full square so there are no hard edges */
  function glow(x, y, r, c, a, additive) {
    if (a <= 0.003) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(c, a));
    g.addColorStop(0.5, rgba(c, a * 0.35));
    g.addColorStop(1, rgba(c, 0));
    if (additive) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; }
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    if (additive) ctx.restore();
  }

  function ell(x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU); }

  function tongue(x, y, h, w, sway, a) {
    const g = ctx.createLinearGradient(x, y, x, y - h);
    g.addColorStop(0, `rgba(80,140,255,${0.85 * a})`);
    g.addColorStop(0.28, `rgba(130,110,255,${0.45 * a})`);
    g.addColorStop(0.5, `rgba(255,150,40,${0.75 * a})`);
    g.addColorStop(1, 'rgba(255,210,90,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - w, y);
    ctx.quadraticCurveTo(x - w * 0.9, y - h * 0.55, x + sway, y - h);
    ctx.quadraticCurveTo(x + w * 0.9, y - h * 0.55, x + w, y);
    ctx.closePath(); ctx.fill();
  }

  function burner(y, heat, time, width = 150) {
    // grate
    ell(0, y, width, width * 0.17);
    ctx.fillStyle = '#120d0a'; ctx.fill();
    ctx.lineWidth = 5; ctx.strokeStyle = '#2c241f'; ctx.stroke();
    if (heat <= 0.01) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const n = mobile ? 12 : 18;
    for (let i = 0; i < n; i++) {
      const th = (i / (n - 1)) * PI;
      const x = Math.cos(th) * width * 0.86;
      const yy = y + Math.sin(th) * width * 0.12 - 4;
      const fl = 0.75 + 0.25 * Math.sin(time * 9 + i * 1.7) * Math.sin(time * 5.3 + i);
      tongue(x, yy, (46 + 34 * fl) * heat, 11, Math.sin(time * 6 + i) * 6, heat);
    }
    ctx.restore();
    glow(0, y, width * 1.4, [255, 110, 30], 0.35 * heat, true);
  }

  function steamPuffs(sources, baseY, spread, strength, time, rise = 330) {
    if (strength <= 0.01) return;
    const per = mobile ? 3 : 5;
    for (let i = 0; i < sources.length; i++) {
      const s = sources[i];
      for (let k = 0; k < per; k++) {
        const ph = (time * 0.22 + s.ph + k / per) % 1;
        const y = baseY - ph * rise;
        const x = s.x * spread + Math.sin(ph * 6 + i * 2) * 26 * ph;
        const size = 40 + ph * 140;
        ctx.globalAlpha = strength * 0.16 * Math.sin(ph * PI);
        ctx.drawImage(puff, x - size / 2, y - size / 2, size, size);
      }
    }
    ctx.globalAlpha = 1;
  }

  function stream(x, y0, y1, w, color, a, time) {
    if (a <= 0.01) return;
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, rgba(color, 0));
    g.addColorStop(0.15, rgba(color, 0.9 * a));
    g.addColorStop(1, rgba(color, 0.95 * a));
    ctx.fillStyle = g;
    ctx.beginPath();
    const steps = 14;
    for (let i = 0; i <= steps; i++) {
      const k = i / steps, y = lerp(y0, y1, k);
      const xx = x + Math.sin(time * 8 + k * 9) * 2.5 * k - w / 2 * (1 - k * 0.35);
      i ? ctx.lineTo(xx, y) : ctx.moveTo(xx, y);
    }
    for (let i = steps; i >= 0; i--) {
      const k = i / steps, y = lerp(y0, y1, k);
      ctx.lineTo(x + Math.sin(time * 8 + k * 9) * 2.5 * k + w / 2 * (1 - k * 0.35), y);
    }
    ctx.closePath(); ctx.fill();
    // highlight
    ctx.strokeStyle = `rgba(255,255,255,${0.35 * a})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x - w * 0.15, y0 + 20); ctx.lineTo(x - w * 0.1, y1); ctx.stroke();
    // splash rings
    for (let r = 0; r < 3; r++) {
      const ph = (time * 1.4 + r / 3) % 1;
      ctx.strokeStyle = rgba(mix(color, [255, 255, 255], 0.4), a * (1 - ph) * 0.7);
      ctx.lineWidth = 2;
      ell(x, y1, 8 + ph * 40, 2 + ph * 9); ctx.stroke();
    }
  }

  /* falling item → [x, y, landed(0..1 progress)] */
  function fall(item, t, start, dur, landX, landY) {
    const p = seg(t, start + item.d, start + item.d + dur);
    if (p <= 0) return null;
    const y0 = -460 - item.d * 300;
    return { x: lerp(item.x0, landX, p), y: lerp(y0, landY, p * p), p, rot: item.rot + (1 - p) * 4 };
  }

  /* ======================================================
     STATION 0 — KADAI (Fire · Tadka · Masala · Paneer)
     ====================================================== */
  const GHEE = [236, 176, 62], RED = [204, 76, 28], DEEP = [182, 62, 24];

  function kadaiLevel(T) {
    return 0.34 * ease(seg(T, 1.05, 1.45)) + 0.4 * ease(seg(T, 2.1, 2.8)) + 0.12 * seg(T, 3.0, 3.5);
  }
  function surf(level) {
    const rx = 112 + 86 * level;
    return { y: 8 + (1 - level) * 62, rx, ry: rx * 0.22 };
  }

  function drawKadai(T, time) {
    const heat = ease(seg(T, 0, 0.55));
    const level = kadaiLevel(T);
    const sf = surf(level);
    let col = mix(GHEE, RED, ease(seg(T, 2.3, 2.95)));
    col = mix(col, DEEP, seg(T, 3.4, 3.9));

    // floor glow
    glow(0, 200, 440, [255, 120, 40], 0.22 * heat);

    burner(188, heat, time);

    // body
    ctx.beginPath();
    ctx.moveTo(-220, 0);
    ctx.bezierCurveTo(-216, 104, -122, 166, 0, 170);
    ctx.bezierCurveTo(122, 166, 216, 104, 220, 0);
    ctx.ellipse(0, 0, 220, 52, 0, 0, PI, false);
    ctx.closePath();
    const bg = ctx.createLinearGradient(-220, 0, 220, 0);
    bg.addColorStop(0, '#1d140e'); bg.addColorStop(0.28, '#5e3b22'); bg.addColorStop(0.42, '#8a5a32');
    bg.addColorStop(0.55, '#4a3020'); bg.addColorStop(1, '#130d09');
    ctx.fillStyle = bg; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    const hg = ctx.createRadialGradient(0, 190, 0, 0, 190, 230);
    hg.addColorStop(0, `rgba(255,120,30,${0.6 * heat})`); hg.addColorStop(1, 'rgba(255,100,20,0)');
    ctx.fillStyle = hg; ctx.fillRect(-230, 0, 460, 200);
    ctx.restore();

    // handles
    ctx.lineWidth = 11; ctx.strokeStyle = '#2b1c13';
    ctx.beginPath(); ctx.ellipse(-246, 14, 26, 17, 0, PI * 0.5, PI * 1.5); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(246, 14, 26, 17, 0, -PI * 0.5, PI * 0.5); ctx.stroke();

    // interior
    ell(0, 0, 220, 52);
    const ig = ctx.createLinearGradient(0, -52, 0, 52);
    ig.addColorStop(0, '#3a2618'); ig.addColorStop(0.6, '#140d09'); ig.addColorStop(1, '#0b0806');
    ctx.fillStyle = ig; ctx.fill();

    ctx.save();
    ell(0, 4, 208, 47); ctx.clip();

    if (level > 0.005) {
      // liquid
      ell(0, sf.y, sf.rx, sf.ry);
      const lg = ctx.createRadialGradient(-sf.rx * 0.3, sf.y - sf.ry * 0.4, 4, 0, sf.y, sf.rx);
      lg.addColorStop(0, rgba(mix(col, [255, 240, 200], 0.35)));
      lg.addColorStop(0.55, rgba(col));
      lg.addColorStop(1, rgba(shade(col, 0.55)));
      ctx.fillStyle = lg; ctx.fill();
      // shimmer
      ctx.strokeStyle = `rgba(255,240,210,${0.18 + 0.08 * Math.sin(time * 2)})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(-sf.rx * 0.2, sf.y - sf.ry * 0.25, sf.rx * 0.45, sf.ry * 0.35, 0, PI * 1.1, PI * 1.7); ctx.stroke();

      // swirl from stirring
      const stir = seg(T, 2.4, 2.6) * (1 - seg(T, 3.85, 3.98));
      if (stir > 0) {
        const ang = T * 9 + time * 0.6;
        ctx.strokeStyle = rgba(mix(col, [255, 220, 170], 0.45), 0.35 * stir);
        ctx.lineWidth = 2.5;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.ellipse(0, sf.y, sf.rx * (0.3 + i * 0.2), sf.ry * (0.3 + i * 0.2), 0, ang + i, ang + i + 2.2);
          ctx.stroke();
        }
      }
    }

    // spices (cumin) resting on the surface
    DATA.seeds.forEach((s) => {
      const f = fall(s, T, 1.5, 0.12, s.p[0] * sf.rx, sf.y + s.p[1] * sf.ry);
      if (!f || f.p < 1) return;
      const fade = 1 - seg(T, 2.6, 3.0);
      if (fade <= 0) return;
      ctx.fillStyle = `rgba(70,40,18,${0.9 * fade})`;
      ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(s.rot); ell(0, 0, 4, 1.6); ctx.fill(); ctx.restore();
    });

    // onion & tomato pieces on the surface (melt into gravy)
    const pieceFade = 1 - seg(T, 2.6, 3.0);
    if (pieceFade > 0) {
      DATA.onions.forEach((o) => {
        const f = fall(o, T, 2.05, 0.14, o.p[0] * sf.rx, sf.y + o.p[1] * sf.ry);
        if (f && f.p >= 1) onionPiece(f.x, f.y, o.rot, o.s, pieceFade);
      });
      DATA.tomatoes.forEach((o) => {
        const f = fall(o, T, 2.3, 0.14, o.p[0] * sf.rx, sf.y + o.p[1] * sf.ry);
        if (f && f.p >= 1) tomatoPiece(f.x, f.y, o.rot, o.s, pieceFade);
      });
    }

    // paneer cubes resting
    const coat = seg(T, 3.35, 3.8);
    DATA.paneer.forEach((pc, i) => {
      const f = fall(pc, T, 3.05, 0.13, pc.p[0] * sf.rx * 0.8, sf.y + pc.p[1] * sf.ry * 0.8);
      if (f && f.p >= 1) paneerCube(f.x, f.y + Math.sin(time * 2 + i) * 1.2, pc.rot, pc.s, coat);
    });

    // cream swirl
    const cream = seg(T, 3.55, 3.78);
    if (cream > 0) {
      ctx.strokeStyle = 'rgba(252,246,236,0.85)';
      ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath();
      const turns = 3.2 * cream * TAU;
      for (let a = 0; a <= turns; a += 0.15) {
        const r = 6 + a * 4.2;
        const x = Math.cos(a) * r - 20, y = sf.y + Math.sin(a) * r * 0.22;
        a ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }

    // coriander resting
    DATA.leaves.forEach((l) => {
      const f = fall(l, T, 3.75, 0.12, l.p[0] * sf.rx, sf.y + l.p[1] * sf.ry);
      if (f && f.p >= 1) leaf(f.x, f.y, l.rot, l.s);
    });
    ctx.restore(); // end interior clip

    // rim
    ell(0, 0, 220, 52);
    ctx.lineWidth = 7;
    const rg = ctx.createLinearGradient(-220, 0, 220, 0);
    rg.addColorStop(0, '#3b2516'); rg.addColorStop(0.35, '#c07a44'); rg.addColorStop(0.5, '#f0b880');
    rg.addColorStop(0.65, '#a0602f'); rg.addColorStop(1, '#2b1a10');
    ctx.strokeStyle = rg; ctx.stroke();

    // falling items (above rim)
    DATA.seeds.forEach((s) => {
      const f = fall(s, T, 1.5, 0.12, s.p[0] * sf.rx, sf.y + s.p[1] * sf.ry);
      if (!f || f.p >= 1) return;
      ctx.fillStyle = '#5a3416';
      ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot); ell(0, 0, 4.5, 1.8); ctx.fill(); ctx.restore();
    });
    DATA.onions.forEach((o) => {
      const f = fall(o, T, 2.05, 0.14, o.p[0] * sf.rx, sf.y + o.p[1] * sf.ry);
      if (f && f.p < 1) onionPiece(f.x, f.y, f.rot, o.s, 1);
    });
    DATA.tomatoes.forEach((o) => {
      const f = fall(o, T, 2.3, 0.14, o.p[0] * sf.rx, sf.y + o.p[1] * sf.ry);
      if (f && f.p < 1) tomatoPiece(f.x, f.y, f.rot, o.s, 1);
    });
    DATA.paneer.forEach((pc) => {
      const f = fall(pc, T, 3.05, 0.13, pc.p[0] * sf.rx * 0.8, sf.y + pc.p[1] * sf.ry * 0.8);
      if (f && f.p < 1) paneerCube(f.x, f.y, f.rot, pc.s, 0);
    });
    DATA.leaves.forEach((l) => {
      const f = fall(l, T, 3.75, 0.12, l.p[0] * sf.rx, sf.y + l.p[1] * sf.ry);
      if (f && f.p < 1) leaf(f.x, f.y, f.rot, l.s);
    });

    // ghee pour
    const pour = seg(T, 1.03, 1.1) * (1 - seg(T, 1.42, 1.5));
    stream(-30, -520, sf.y, 16, GHEE, pour, time);
    // cream pour
    const cp = seg(T, 3.52, 3.56) * (1 - seg(T, 3.74, 3.8));
    stream(-20, -520, sf.y, 8, [250, 244, 232], cp, time);

    // ladle
    const lad = seg(T, 2.35, 2.5) * (1 - seg(T, 3.88, 3.98));
    if (lad > 0) ladle(T, time, sf, lad);

    // sizzle sparks
    const sizzle = seg(T, 1.5, 1.6) * (1 - seg(T, 2.3, 2.6)) + 0.35 * seg(T, 2.3, 2.4) * (1 - seg(T, 2.7, 2.9));
    if (sizzle > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      DATA.sparks.forEach((s) => {
        const ph = (time * s.sp + s.ph) % 1;
        const x = s.p[0] * sf.rx + Math.sin(ph * 8) * 4, y = sf.y + s.p[1] * sf.ry - ph * 46;
        ctx.fillStyle = `rgba(255,220,140,${(1 - ph) * sizzle})`;
        ell(x, y, 1.8, 1.8); ctx.fill();
      });
      ctx.restore();
    }

    // steam
    const st = heat * (level > 0.01 ? 0.35 + 0.75 * seg(T, 1.6, 3.6) : 0.1);
    steamPuffs(DATA.steam, sf.y - 10, sf.rx * 1.1, st, time);
  }

  function onionPiece(x, y, rot, s, a) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    ctx.strokeStyle = `rgba(214,170,200,${0.95 * a})`; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 0, 9, PI * 1.1, PI * 1.9); ctx.stroke();
    ctx.strokeStyle = `rgba(245,225,235,${0.8 * a})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 2, 6, PI * 1.15, PI * 1.85); ctx.stroke();
    ctx.restore();
  }
  function tomatoPiece(x, y, rot, s, a) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    ctx.fillStyle = `rgba(214,40,32,${a})`;
    ctx.beginPath(); ctx.moveTo(-9, -6); ctx.lineTo(9, -7); ctx.lineTo(7, 7); ctx.lineTo(-8, 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = `rgba(255,150,120,${0.6 * a})`; ell(-2, -1, 3, 2); ctx.fill();
    ctx.restore();
  }
  function paneerCube(x, y, rot, s, coat) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ell(2, 12, 16, 4); ctx.fill();
    const base = mix([248, 238, 214], [232, 140, 70], coat * 0.65);
    // side
    ctx.fillStyle = rgba(shade(base, 0.78));
    ctx.beginPath(); ctx.moveTo(-14, -4); ctx.lineTo(14, -4); ctx.lineTo(14, 12); ctx.lineTo(-14, 12); ctx.closePath(); ctx.fill();
    // top
    ctx.fillStyle = rgba(base);
    ctx.beginPath(); ctx.moveTo(-14, -4); ctx.lineTo(-6, -13); ctx.lineTo(20, -13); ctx.lineTo(14, -4); ctx.closePath(); ctx.fill();
    // right
    ctx.fillStyle = rgba(shade(base, 0.62));
    ctx.beginPath(); ctx.moveTo(14, -4); ctx.lineTo(20, -13); ctx.lineTo(20, 3); ctx.lineTo(14, 12); ctx.closePath(); ctx.fill();
    if (coat > 0.2) { ctx.fillStyle = `rgba(190,60,20,${0.35 * coat})`; ell(4, 8, 10, 3); ctx.fill(); }
    ctx.restore();
  }
  function leaf(x, y, rot, s) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    ctx.fillStyle = '#3f9a3a';
    ctx.beginPath(); ctx.moveTo(-7, 0); ctx.quadraticCurveTo(0, -7, 7, 0); ctx.quadraticCurveTo(0, 7, -7, 0); ctx.fill();
    ctx.strokeStyle = '#7fd06f'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.stroke();
    ctx.restore();
  }
  function ladle(T, time, sf, a) {
    const ang = T * 9 + time * 0.6;
    const bx = Math.cos(ang) * sf.rx * 0.55, by = sf.y + Math.sin(ang) * sf.ry * 0.55;
    ctx.globalAlpha = a;
    // handle
    const hx = 250 + Math.cos(ang) * 30, hy = -300;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#6b4426'; ctx.lineWidth = 12;
    ctx.beginPath(); ctx.moveTo(bx + 10, by - 6); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,210,160,0.35)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(bx + 12, by - 10); ctx.lineTo(hx - 3, hy - 2); ctx.stroke();
    // steel bowl
    ell(bx, by, 30, 10);
    const g = ctx.createLinearGradient(bx - 30, 0, bx + 30, 0);
    g.addColorStop(0, '#6d6a66'); g.addColorStop(0.5, '#e4e0da'); g.addColorStop(1, '#5a5754');
    ctx.fillStyle = g; ctx.fill();
    ctx.globalAlpha = 1;
  }

  /* ======================================================
     STATION 1 — TANDOOR (naan)
     ====================================================== */
  function naanPath(w, h) {
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.bezierCurveTo(w * 0.56, -h * 0.36, w * 0.56, h * 0.46, 0, h / 2);
    ctx.bezierCurveTo(-w * 0.56, h * 0.46, -w * 0.56, -h * 0.36, 0, -h / 2);
    ctx.closePath();
  }
  function naan(x, y, rot, sc, bake, charA, puffK, gloss, w = 120, h = 170) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc);
    const c = mix([238, 226, 200], [228, 176, 100], bake);
    naanPath(w, h);
    const g = ctx.createRadialGradient(-w * 0.15, -h * 0.15, 4, 0, 0, h * 0.6);
    g.addColorStop(0, rgba(mix(c, [255, 248, 230], 0.35)));
    g.addColorStop(1, rgba(shade(c, 0.82)));
    ctx.fillStyle = g; ctx.fill();
    ctx.save(); ctx.clip();
    if (puffK > 0) {
      DATA.char.forEach((p, i) => {
        if (i % 2) return;
        ctx.fillStyle = `rgba(255,246,226,${0.45 * puffK})`;
        ell(p.y * w * 0.9, p.x * h * 0.9, p.r * 1.6, p.r * 1.2); ctx.fill();
      });
    }
    if (charA > 0) {
      DATA.char.forEach((p) => {
        ctx.fillStyle = `rgba(92,52,24,${charA * (0.5 + p.a * 0.5)})`;
        ell(p.x * w, p.y * h, p.r, p.r * 0.75); ctx.fill();
      });
    }
    if (gloss > 0) {
      const gl = ctx.createLinearGradient(-w, -h, w, h);
      const k = clamp(gloss) * 1.4 - 0.2;
      gl.addColorStop(clamp(k - 0.15), 'rgba(255,255,255,0)');
      gl.addColorStop(clamp(k), `rgba(255,236,170,${0.55 * gloss})`);
      gl.addColorStop(clamp(k + 0.15), 'rgba(255,255,255,0)');
      ctx.fillStyle = gl; ctx.fillRect(-w, -h, w * 2, h * 2);
    }
    ctx.restore();
    ctx.restore();
  }

  function drawTandoor(T, time) {
    const u = clamp(T - 4, 0, 1);

    // ground glow
    glow(0, 230, 480, [255, 110, 40], 0.22);

    // body
    ctx.beginPath();
    ctx.moveTo(-200, -150);
    ctx.bezierCurveTo(-288, -60, -288, 140, -212, 232);
    ctx.lineTo(212, 232);
    ctx.bezierCurveTo(288, 140, 288, -60, 200, -150);
    ctx.closePath();
    const bg = ctx.createRadialGradient(-80, -40, 20, 0, 40, 330);
    bg.addColorStop(0, '#b4613a'); bg.addColorStop(0.55, '#7c3a1f'); bg.addColorStop(1, '#3a1a0d');
    ctx.fillStyle = bg; ctx.fill();
    ctx.strokeStyle = 'rgba(40,16,6,0.35)'; ctx.lineWidth = 3;
    [-60, 50, 160].forEach((yy) => { ctx.beginPath(); ctx.ellipse(0, yy, 262, 30, 0, 0.12 * PI, 0.88 * PI); ctx.stroke(); });

    // cut-away window
    ctx.save();
    ell(0, 52, 150, 160); ctx.clip();
    const flick = 0.85 + 0.15 * Math.sin(time * 7) * Math.sin(time * 3.1);
    const ig = ctx.createRadialGradient(0, 210, 10, 0, 160, 300);
    ig.addColorStop(0, `rgba(255,150,50,${0.95 * flick})`);
    ig.addColorStop(0.4, 'rgba(150,52,20,1)');
    ig.addColorStop(1, 'rgba(34,12,6,1)');
    ctx.fillStyle = ig; ctx.fillRect(-160, -120, 320, 340);
    // coals
    ctx.globalCompositeOperation = 'lighter';
    DATA.coals.forEach((c) => {
      const f = 0.6 + 0.4 * Math.sin(time * 3 + c.ph);
      const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r * 1.8);
      g.addColorStop(0, `rgba(255,${(150 + 80 * f) | 0},60,${0.9 * f})`);
      g.addColorStop(1, 'rgba(255,60,10,0)');
      ctx.fillStyle = g; ell(c.x, c.y, c.r * 1.8, c.r * 1.8); ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';
    // two naans already baking on the wall
    naan(-78, -10, -0.35, 0.55, 0.8, 0.7, 0.6, 0);
    naan(90, 30, 0.4, 0.5, 0.55, 0.4, 0.4, 0);

    // main naan while on the wall
    if (u < 0.72) {
      const enter = easeOut(seg(u, 0, 0.22));
      const stick = seg(u, 0.22, 0.3);
      const bake = seg(u, 0.3, 0.7);
      const x = lerp(-520, 0, enter), y = lerp(-40, -20, enter);
      const sq = 1 + Math.sin(stick * PI) * 0.1;
      naan(x, y, lerp(-0.6, 0.08, enter), 0.95 * (1 + 0.1 * ease(bake)) * sq, bake, ease(seg(u, 0.42, 0.7)), Math.sin(bake * PI) * 0.9 + bake * 0.3, 0);
    }
    ctx.restore();

    // window rim
    ell(0, 52, 150, 160);
    ctx.lineWidth = 9; ctx.strokeStyle = '#4a2111'; ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,170,110,0.35)'; ctx.stroke();

    // mouth
    ell(0, -150, 200, 34);
    ctx.fillStyle = '#1a0b05'; ctx.fill();
    ctx.lineWidth = 8; ctx.strokeStyle = '#9a4f2b'; ctx.stroke();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const mg = ctx.createRadialGradient(0, -150, 0, 0, -150, 200);
    mg.addColorStop(0, `rgba(255,120,40,${0.5 * flick})`); mg.addColorStop(1, 'rgba(255,80,20,0)');
    ctx.fillStyle = mg; ell(0, -150, 200, 34); ctx.fill();
    ctx.restore();

    // heat shimmer
    ctx.strokeStyle = 'rgba(255,200,150,0.07)'; ctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      for (let k = 0; k <= 20; k++) {
        const yy = -180 - k * 12, xx = -120 + i * 60 + Math.sin(time * 3 + k * 0.6 + i) * 8;
        k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
      }
      ctx.stroke();
    }

    // dough pad (gaddi) carrying the naan in
    const padIn = easeOut(seg(u, 0, 0.22)) * (1 - ease(seg(u, 0.24, 0.36)));
    if (padIn > 0.01) {
      const px = lerp(-560, -10, padIn);
      ctx.fillStyle = 'rgba(232,222,200,0.95)'; ell(px - 60, 0, 70, 58); ctx.fill();
      ctx.strokeStyle = 'rgba(150,120,90,0.6)'; ctx.lineWidth = 3; ctx.stroke();
      ctx.strokeStyle = 'rgba(150,120,90,0.4)'; ctx.lineWidth = 1.5;
      for (let r = 1; r <= 3; r++) { ell(px - 60, 0, 70 - r * 16, 58 - r * 13); ctx.stroke(); }
    }

    // skewers + naan pulled out
    if (u >= 0.66) {
      const pull = ease(seg(u, 0.7, 0.86));
      const nx = lerp(0, 300, pull), ny = lerp(-20, 40, pull);
      if (u >= 0.72) {
        const melt = seg(u, 0.88, 1);
        naan(nx, ny, lerp(0.08, -0.2, pull), 1.05, 1, 1, 0.3, seg(u, 0.9, 1));
        // butter
        if (u > 0.86) {
          const bs = 26 * (1 - melt * 0.85);
          ctx.fillStyle = `rgba(255,${(230 - melt * 30) | 0},120,${1 - melt * 0.4})`;
          ctx.save(); ctx.translate(nx + 6, ny - 10); ctx.rotate(-0.2);
          ctx.fillRect(-bs / 2, -bs / 2, bs, bs * 0.8);
          ctx.restore();
          ctx.fillStyle = `rgba(255,220,110,${0.45 * melt})`; ell(nx + 6, ny, 18 + melt * 34, 12 + melt * 26); ctx.fill();
        }
      }
      const sk = seg(u, 0.66, 0.72) * (1 - seg(u, 0.86, 0.9));
      if (sk > 0) {
        ctx.globalAlpha = sk;
        ctx.strokeStyle = '#cfcac2'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        const tx = u < 0.72 ? lerp(420, 10, seg(u, 0.66, 0.72)) : nx, ty = u < 0.72 ? lerp(-420, -30, seg(u, 0.66, 0.72)) : ny - 10;
        [-10, 12].forEach((o) => { ctx.beginPath(); ctx.moveTo(tx + o, ty); ctx.lineTo(tx + 340 + o, ty - 360); ctx.stroke(); });
        ctx.globalAlpha = 1;
      }
    }

    // steam off fresh naan
    if (u > 0.74) steamPuffs(DATA.steam.slice(0, 4), 20, 120, seg(u, 0.74, 0.85) * 0.8, time, 240);
  }

  /* ======================================================
     STATION 2 — MITHAI (khoya, ghee, laddoo)
     ====================================================== */
  const PYR = [[-66, 125], [-22, 125], [22, 125], [66, 125], [-44, 100], [0, 100], [44, 100], [-22, 75], [22, 75], [0, 50]];

  function laddoo(x, y, r, varq, time, i) {
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, 2, x, y, r);
    g.addColorStop(0, '#ffcf7a'); g.addColorStop(0.55, '#e88f2c'); g.addColorStop(1, '#9b4c12');
    ctx.fillStyle = g; ell(x, y, r, r); ctx.fill();
    ctx.fillStyle = 'rgba(255,230,160,0.65)';
    DATA.speck.forEach((s) => { ell(x + Math.cos(s.a + i) * s.r * r, y + Math.sin(s.a + i) * s.r * r, 1.6, 1.6); ctx.fill(); });
    if (varq > 0) {
      ctx.fillStyle = `rgba(235,235,240,${0.75 * varq})`;
      ctx.beginPath(); ctx.moveTo(x - r * 0.5, y - r * 0.6); ctx.lineTo(x + r * 0.3, y - r * 0.75); ctx.lineTo(x + r * 0.45, y - r * 0.2); ctx.lineTo(x - r * 0.2, y - r * 0.1); ctx.closePath(); ctx.fill();
      ctx.fillStyle = `rgba(120,190,90,${varq})`; ell(x + r * 0.1, y - r * 0.85, 3, 1.4); ctx.fill();
      const tw = Math.max(0, Math.sin(time * 4 + i * 2));
      if (tw > 0.6) sparkle(x + r * 0.2, y - r * 0.55, 7 * tw * varq);
    }
  }
  function sparkle(x, y, s) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,250,235,0.95)';
    ctx.beginPath();
    ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.22, y - s * 0.22); ctx.lineTo(x + s, y); ctx.lineTo(x + s * 0.22, y + s * 0.22);
    ctx.lineTo(x, y + s); ctx.lineTo(x - s * 0.22, y + s * 0.22); ctx.lineTo(x - s, y); ctx.lineTo(x - s * 0.22, y - s * 0.22);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawMithai(T, time) {
    const u = clamp(T - 5, 0, 1);
    const PX = -90; // pan centre x
    const milkLevel = 0.72 * ease(seg(u, 0.03, 0.25)) - 0.24 * ease(seg(u, 0.28, 0.55)) - 0.22 * seg(u, 0.56, 0.86);
    const lv = clamp(milkLevel, 0, 1);
    const col = mix([250, 247, 238], [226, 186, 132], ease(seg(u, 0.25, 0.55)));
    const goldK = seg(u, 0.5, 0.62);

    glow(PX, 210, 460, [255, 170, 70], 0.2);

    ctx.save(); ctx.translate(PX, 0);
    burner(150, 0.65, time, 140);

    // shallow pan body
    ctx.beginPath();
    ctx.moveTo(-230, 40);
    ctx.bezierCurveTo(-226, 96, -150, 128, 0, 130);
    ctx.bezierCurveTo(150, 128, 226, 96, 230, 40);
    ctx.ellipse(0, 40, 230, 54, 0, 0, PI, false);
    ctx.closePath();
    const bg = ctx.createLinearGradient(-230, 0, 230, 0);
    bg.addColorStop(0, '#3a1f10'); bg.addColorStop(0.35, '#b0683a'); bg.addColorStop(0.5, '#e7a874');
    bg.addColorStop(0.65, '#99572c'); bg.addColorStop(1, '#2a160b');
    ctx.fillStyle = bg; ctx.fill();

    ell(0, 40, 230, 54);
    ctx.fillStyle = '#24150c'; ctx.fill();
    ctx.save(); ell(0, 44, 218, 49); ctx.clip();
    if (lv > 0.005) {
      const sy = 44 + (1 - lv) * 26, rx = 150 + 66 * lv, ry = rx * 0.22;
      ell(0, sy, rx, ry);
      const lg = ctx.createRadialGradient(-rx * 0.3, sy - ry * 0.4, 4, 0, sy, rx);
      lg.addColorStop(0, rgba(mix(col, [255, 255, 255], 0.4)));
      lg.addColorStop(0.6, rgba(col));
      lg.addColorStop(1, rgba(shade(col, 0.72)));
      ctx.fillStyle = lg; ctx.fill();
      if (goldK > 0) {
        ctx.strokeStyle = `rgba(255,200,80,${0.55 * goldK})`; ctx.lineWidth = 4;
        ell(0, sy, rx * 0.92, ry * 0.92); ctx.stroke();
      }
      // bubbles
      const boil = seg(u, 0.08, 0.14) * (1 - seg(u, 0.52, 0.6));
      if (boil > 0) {
        DATA.bubbles.forEach((b) => {
          const ph = (time * b.sp + b.ph) % 1;
          ctx.strokeStyle = rgba(mix(col, [255, 255, 255], 0.5), boil * (1 - ph) * 0.8);
          ctx.lineWidth = 1.5;
          ell(b.p[0] * rx, sy + b.p[1] * ry, b.r * (0.4 + ph), b.r * (0.4 + ph) * 0.45); ctx.stroke();
        });
      }
    }
    ctx.restore();
    ell(0, 40, 230, 54); ctx.lineWidth = 6;
    const rg = ctx.createLinearGradient(-230, 0, 230, 0);
    rg.addColorStop(0, '#5a3018'); rg.addColorStop(0.5, '#ffd0a0'); rg.addColorStop(1, '#4a2612');
    ctx.strokeStyle = rg; ctx.stroke();

    // milk & ghee streams
    stream(-20, -520, 44 + (1 - lv) * 26, 14, [252, 250, 244], seg(u, 0.02, 0.06) * (1 - seg(u, 0.22, 0.27)), time);
    stream(30, -520, 44 + (1 - lv) * 26, 6, [246, 186, 60], seg(u, 0.46, 0.5) * (1 - seg(u, 0.58, 0.62)), time);

    steamPuffs(DATA.steam.slice(0, 5), 40, 200, 0.4 + 0.6 * seg(u, 0.1, 0.4) * (1 - seg(u, 0.6, 0.9)), time, 280);
    ctx.restore();

    // brass plate
    const PLX = 320, PLY = 150;
    const plateIn = easeOut(seg(u, 0.38, 0.52));
    if (plateIn > 0) {
      ctx.save(); ctx.translate(PLX + (1 - plateIn) * 400, PLY); ctx.globalAlpha = plateIn;
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ell(0, 22, 156, 34); ctx.fill();
      ell(0, 0, 150, 38);
      const pg = ctx.createLinearGradient(-150, 0, 150, 0);
      pg.addColorStop(0, '#7a4f1c'); pg.addColorStop(0.45, '#f2c46a'); pg.addColorStop(0.6, '#c8923c'); pg.addColorStop(1, '#5c3a12');
      ctx.fillStyle = pg; ctx.fill();
      ell(0, -3, 124, 30); ctx.strokeStyle = 'rgba(90,55,15,0.45)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    }

    // laddoos travel from pan to plate pyramid
    PYR.forEach((pp, i) => {
      const k = seg(u, 0.56 + i * 0.027, 0.56 + i * 0.027 + 0.06);
      if (k <= 0) return;
      const sx = PX + (i % 4 - 1.5) * 40, sy = 50;
      const tx = PLX + pp[0], ty = PLY - (125 - pp[1]) - 18;
      const e = ease(k);
      const x = lerp(sx, tx, e), y = lerp(sy, ty, e) - Math.sin(e * PI) * 140;
      laddoo(x, y, 22 * (0.6 + 0.4 * e), i >= 7 ? seg(u, 0.86, 0.95) : 0, time, i);
    });
  }

  /* ======================================================
     STATION 3 — THALI (serve)
     ====================================================== */
  function katori(x, y, rx, fill, extra) {
    const ry = rx * 0.32;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ell(x + 4, y + ry * 2.2, rx * 1.02, ry * 0.8); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - rx, y);
    ctx.bezierCurveTo(x - rx, y + ry * 2.4, x + rx, y + ry * 2.4, x + rx, y);
    ctx.closePath();
    const g = ctx.createLinearGradient(x - rx, 0, x + rx, 0);
    g.addColorStop(0, '#5b5854'); g.addColorStop(0.4, '#e2ded7'); g.addColorStop(0.6, '#a9a59f'); g.addColorStop(1, '#4a4744');
    ctx.fillStyle = g; ctx.fill();
    ell(x, y, rx, ry); ctx.fillStyle = '#3a3836'; ctx.fill();
    ell(x, y + 2, rx * 0.9, ry * 0.82);
    const fg = ctx.createRadialGradient(x - rx * 0.3, y - ry * 0.3, 2, x, y, rx);
    fg.addColorStop(0, rgba(mix(fill, [255, 240, 210], 0.35))); fg.addColorStop(1, rgba(shade(fill, 0.7)));
    ctx.fillStyle = fg; ctx.fill();
    if (extra) extra(x, y + 2, rx * 0.9, ry * 0.82);
    ell(x, y, rx, ry); ctx.lineWidth = 3; ctx.strokeStyle = '#d9d5ce'; ctx.stroke();
  }

  function drawThali(T, time) {
    const u = clamp(T - 6, 0, 1.8);

    // table glow
    glow(0, 60, 560, [255, 170, 80], 0.18 + 0.14 * seg(u, 0.8, 1.2));

    const inK = easeOut(seg(u, 0, 0.12));
    ctx.save(); ctx.globalAlpha = inK; ctx.translate(0, (1 - inK) * 60);
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ell(0, 88, 330, 112); ctx.fill();
    ell(0, 60, 320, 116);
    const pg = ctx.createLinearGradient(-320, 0, 320, 0);
    pg.addColorStop(0, '#6e4517'); pg.addColorStop(0.4, '#e9b75c'); pg.addColorStop(0.55, '#c48a35'); pg.addColorStop(1, '#4e300e');
    ctx.fillStyle = pg; ctx.fill();
    ell(0, 56, 292, 104); ctx.strokeStyle = 'rgba(80,45,10,0.5)'; ctx.lineWidth = 3; ctx.stroke();
    ell(0, 56, 292, 104); ctx.fillStyle = 'rgba(255,220,150,0.08)'; ctx.fill();
    ctx.restore();

    const items = [
      { a: 0.2, x: -20, y: -6, dx: 0, dy: -500, draw: (x, y) => katori(x, y, 74, [150, 84, 38], (cx, cy, rx, ry) => {
        ctx.strokeStyle = 'rgba(250,240,225,0.8)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(cx, cy, rx * 0.4, ry * 0.4, 0, 0.3, 4.6); ctx.stroke();
      }) },
      { a: 0.36, x: 178, y: 40, dx: 700, dy: 0, draw: (x, y) => {
        naan(x + 10, y + 6, 1.25, 0.8, 1, 0.9, 0.3, 0.4);
        naan(x - 8, y - 6, 1.1, 0.8, 0.95, 0.8, 0.3, 0.6);
      } },
      { a: 0.05, x: -170, y: 34, dx: -700, dy: 0, draw: (x, y) => katori(x, y, 80, [208, 84, 34], (cx, cy, rx, ry) => {
        [[-0.4, -0.1], [0.1, -0.3], [0.35, 0.2], [-0.1, 0.35]].forEach((p, i) => paneerCube(cx + p[0] * rx, cy + p[1] * ry - 4, 0.1 * i, 0.55, 0.8));
        ctx.strokeStyle = 'rgba(250,240,225,0.75)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(cx + 8, cy, rx * 0.25, ry * 0.25, 0, 0, 5); ctx.stroke();
        leaf(cx - 12, cy + 4, 0.5, 0.7); leaf(cx + 20, cy - 6, 2, 0.6);
      }) },
      { a: 0.62, x: -78, y: 112, dx: 0, dy: 500, draw: (x, y) => katori(x, y, 62, [170, 96, 46], (cx, cy, rx, ry) => {
        [[-0.4, 0], [0.05, -0.3], [0.4, 0.1], [0, 0.35]].forEach((p) => {
          ctx.fillStyle = '#e8d6b8'; ell(cx + p[0] * rx, cy + p[1] * ry, 9, 5); ctx.fill();
          ctx.fillStyle = '#8a6a48'; ell(cx + p[0] * rx, cy + p[1] * ry + 2, 7, 2); ctx.fill();
        });
      }) },
      { a: 0.5, x: 80, y: 110, dx: 0, dy: 500, draw: (x, y) => {
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ell(x, y + 18, 64, 16); ctx.fill();
        ell(x, y + 6, 62, 20); ctx.fillStyle = '#d8d3cb'; ctx.fill();
        laddoo(x - 22, y - 4, 20, seg(u, 0.8, 1), time, 1);
        laddoo(x + 20, y - 2, 20, seg(u, 0.8, 1), time, 2);
        laddoo(x, y - 24, 19, seg(u, 0.8, 1), time, 3);
      } }
    ];
    items.sort((p, q) => p.y - q.y).forEach((it) => {
      const k = easeOut(seg(u, it.a, it.a + 0.18));
      if (k <= 0) return;
      ctx.save(); ctx.globalAlpha = clamp(k * 2);
      it.draw(it.x + it.dx * (1 - k), it.y + it.dy * (1 - k) - Math.sin(k * PI) * 20);
      ctx.restore();
    });

    // steam from the bowls
    const st = seg(u, 0.3, 0.7);
    if (st > 0) steamPuffs(DATA.steam.slice(0, 5), -10, 260, st * 0.8, time, 300);

    // finishing sparkle + halo
    const fin = seg(u, 0.85, 1.25);
    if (fin > 0) {
      glow(0, 40, 440, [255, 190, 90], 0.18 * fin, true);
      DATA.stars.forEach((s) => {
        const tw = Math.max(0, Math.sin(time * 2.4 + s.ph * TAU));
        if (tw > 0.3) sparkle(s.x, s.y + 60, s.s * tw * fin);
      });
    }
  }

  /* ---------- Frame ---------- */
  const STATIONS = [drawKadai, drawTandoor, drawMithai, drawThali];
  const GLOW = [[243, 118, 40], [255, 104, 40], [240, 168, 70], [232, 170, 92]];
  const camX = (T) => ease(seg(T, 3.86, 4.14)) + ease(seg(T, 4.86, 5.14)) + ease(seg(T, 5.86, 6.14));

  function render(T, time) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#0b0907'; ctx.fillRect(0, 0, W, H);

    const cam = camX(T);
    const si = Math.min(3, Math.floor(cam)), sf = cam - si;
    const glowC = mix(GLOW[si], GLOW[Math.min(3, si + 1)], sf);
    const heat = T < 1 ? ease(seg(T, 0, 0.55)) : 1;

    const g = ctx.createRadialGradient(CX, CY + 60 * S, 0, CX, CY + 60 * S, Math.max(W, H) * 0.75);
    g.addColorStop(0, rgba(glowC, 0.28 * heat));
    g.addColorStop(0.5, rgba(glowC, 0.07 * heat));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    const zoom = 1 - 0.12 * Math.sin(PI * sf);
    for (let i = 0; i < STATIONS.length; i++) {
      const off = i - cam;
      if (Math.abs(off) >= 1) continue;
      ctx.save();
      ctx.translate(CX + off * W * 0.95, CY);
      ctx.scale(S * zoom, S * zoom);
      ctx.globalAlpha = 1;
      STATIONS[i](T, time);
      ctx.restore();
    }

    // embers
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const n = mobile ? 26 : DATA.embers.length;
    for (let i = 0; i < n; i++) {
      const e = DATA.embers[i];
      const life = (time * e.sp * 0.12 + e.ph) % 1;
      const y = H * (1.05 - life * 1.15);
      const x = e.x * W + Math.sin(time * 0.8 + e.w) * 30;
      const a = Math.sin(life * PI) * 0.75 * heat;
      ctx.fillStyle = `rgba(255,${(150 + 70 * Math.sin(e.w)) | 0},70,${a})`;
      ell(x, y, e.s, e.s); ctx.fill();
    }
    ctx.restore();

    ctx.fillStyle = vignette; ctx.fillRect(0, 0, W, H);
  }

  /* ---------- Chapter HUD ---------- */
  const CHAPTERS = [
    ['Fire', 'The flame comes alive'],
    ['Tadka', 'Ghee and whole spices'],
    ['Masala', 'Onion and tomato meet the heat'],
    ['Paneer', 'Paneer, cream and coriander'],
    ['Tandoor', 'Naan blisters in the clay oven'],
    ['Mithai', 'Khoya, ghee and laddoo'],
    ['Serve', 'Everything comes to the table']
  ];
  const hud = document.getElementById('cookingHud');
  let hudIdx = -1, hudNum, hudName, hudSub, hudBar;
  if (hud) {
    hud.innerHTML = '<span class="cooking-hud__num"></span><span class="cooking-hud__text"><b></b><small></small></span><span class="cooking-hud__bar"><i></i></span>';
    hudNum = hud.querySelector('.cooking-hud__num');
    hudName = hud.querySelector('b');
    hudSub = hud.querySelector('small');
    hudBar = hud.querySelector('i');
  }
  function updateHud(T) {
    if (!hud) return;
    const idx = clamp(Math.floor(T), 0, 6);
    if (idx !== hudIdx) {
      hudIdx = idx;
      hud.classList.remove('is-swap'); void hud.offsetWidth; hud.classList.add('is-swap');
      hudNum.textContent = String(idx + 1).padStart(2, '0') + ' / 07';
      hudName.textContent = CHAPTERS[idx][0];
      hudSub.textContent = CHAPTERS[idx][1];
    }
    hudBar.style.transform = `scaleX(${clamp(T / 7)})`;
    const y = window.scrollY;
    hud.classList.toggle('is-hidden', y < H * 0.7 || y > document.documentElement.scrollHeight - H * 1.6);
  }

  /* ---------- Loop ---------- */
  let tCur = null, time = 0, last = performance.now(), dirty = true, lastDrawnT = -1;

  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!reduce) time += dt;
    const target = debugT != null ? debugT : scrollToT(window.scrollY + H * 0.5);
    if (tCur == null) tCur = target;
    tCur += (target - tCur) * (reduce ? 1 : Math.min(1, dt * 5));
    if (!reduce || dirty || Math.abs(tCur - lastDrawnT) > 0.0005) {
      render(tCur, time);
      updateHud(tCur);
      lastDrawnT = tCur; dirty = false;
    }
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', resize);
  window.addEventListener('load', () => { computeAnchors(); dirty = true; });
  if ('ResizeObserver' in window) new ResizeObserver(() => { computeAnchors(); dirty = true; }).observe(document.body);
  document.addEventListener('site:ready', () => {
    setTimeout(computeAnchors, 600);
    if (window.ScrollTrigger) window.ScrollTrigger.addEventListener('refresh', computeAnchors);
  });

  resize();
  // Paint one frame immediately (also covers environments where rAF is throttled)
  render(debugT != null ? debugT : scrollToT(window.scrollY + H * 0.5), 0);
  requestAnimationFrame(tick);
})();
