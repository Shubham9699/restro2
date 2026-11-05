/* =========================================================
   SHREYA SWEETS & RESTAURANTS — cooking3d.js
   Immersive Three.js "kitchen world". The camera flies through
   four stations as you scroll, and each one cooks in real 3D:

     0 Fire · 1 Tadka · 2 Masala · 3 Paneer   → copper kadai on a gas flame
     4 Tandoor                                → cut-away clay oven, naan
     5 Mithai                                 → milk → khoya, laddoo pyramid
     6 Serve                                  → brass thali, bowls arrive

   Floating spices, gold dust and embers drift through the world
   (with mouse parallax on desktop). Scroll up to rewind.

   Requires js/vendor/three.min.js (local copy of three.js r170).
   If WebGL is unavailable, js/cooking.js (2D canvas) takes over.
   Debug: add ?cook=4.5 to the URL to freeze the story at that point.
   ========================================================= */

(function () {
  'use strict';

  const conf = (window.SITE && window.SITE.cooking) || { enabled: true };
  if (conf.enabled === false || conf.mode === '2d' || !window.THREE) return;
  const T3 = window.THREE;

  /* ---------- Renderer (bail out to 2D on failure) ---------- */
  const canvas = document.createElement('canvas');
  canvas.className = 'cooking-bg cooking-bg--3d';
  canvas.setAttribute('aria-hidden', 'true');
  let renderer;
  try {
    renderer = new T3.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) { return; }
  if (!renderer.getContext()) return;

  window.__cooking3D = true;
  const root = document.documentElement;
  root.classList.add('has-cooking', 'has-cooking-3d');
  if (typeof conf.scrim === 'number') root.style.setProperty('--cook-scrim', conf.scrim);
  const old2d = document.getElementById('cookingCanvas');
  (old2d ? old2d.parentNode : document.body).insertBefore(canvas, old2d || document.body.firstChild);
  if (old2d) old2d.style.display = 'none';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const debugT = (() => { const m = /[?&]cook=([\d.]+)/.exec(location.search); return m ? parseFloat(m[1]) : null; })();
  let mobile = window.innerWidth < 768;

  renderer.outputColorSpace = T3.SRGBColorSpace;
  renderer.toneMapping = T3.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.setClearColor(0x0b0907, 1);

  /* ---------- Math ---------- */
  const PI = Math.PI, TAU = PI * 2;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const R = rng(7319);
  const disk = () => { const a = R() * TAU, r = Math.sqrt(R()) * 0.82; return [Math.cos(a) * r, Math.sin(a) * r]; };
  const col = (hex) => new T3.Color(hex);
  const tmpM = new T3.Matrix4(), tmpQ = new T3.Quaternion(), tmpE = new T3.Euler(), tmpV = new T3.Vector3(), tmpS = new T3.Vector3(), tmpC = new T3.Color();

  /* ---------- Procedural textures ---------- */
  function canvasTex(w, h, draw, srgb = true) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new T3.CanvasTexture(c);
    if (srgb) t.colorSpace = T3.SRGBColorSpace;
    return t;
  }
  const glowTex = canvasTex(128, 128, (g, w) => {
    const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, w, w);
  });
  const puffTex = canvasTex(128, 128, (g, w) => {
    const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    r.addColorStop(0, 'rgba(255,248,236,.85)'); r.addColorStop(0.5, 'rgba(255,244,228,.3)'); r.addColorStop(1, 'rgba(255,240,220,0)');
    g.fillStyle = r; g.fillRect(0, 0, w, w);
  });
  const starTex = canvasTex(128, 128, (g, w) => {
    g.translate(w / 2, w / 2);
    const r = g.createRadialGradient(0, 0, 0, 0, 0, w / 2);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.beginPath(); g.moveTo(0, -64); g.lineTo(6, -6); g.lineTo(64, 0); g.lineTo(6, 6); g.lineTo(0, 64); g.lineTo(-6, 6); g.lineTo(-64, 0); g.lineTo(-6, -6); g.closePath(); g.fill();
    g.beginPath(); g.arc(0, 0, 10, 0, TAU); g.fill();
  });
  const clayTex = canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#a5532d'; g.fillRect(0, 0, w, h);
    const r2 = rng(11);
    for (let i = 0; i < 3500; i++) { g.fillStyle = `rgba(${r2() > 0.5 ? '60,25,10' : '220,150,110'},${r2() * 0.18})`; g.fillRect(r2() * w, r2() * h, 1 + r2() * 3, 1 + r2() * 3); }
    g.strokeStyle = 'rgba(60,24,10,.35)'; g.lineWidth = 3;
    [0.3, 0.55, 0.8].forEach((y) => { g.beginPath(); g.moveTo(0, y * h); g.lineTo(w, y * h); g.stroke(); });
  });
  const charTex = canvasTex(256, 256, (g, w) => {
    g.clearRect(0, 0, w, w);
    const r2 = rng(5);
    for (let i = 0; i < 26; i++) {
      const x = 40 + r2() * 176, y = 30 + r2() * 196, s = 5 + r2() * 14;
      const rg = g.createRadialGradient(x, y, 0, x, y, s);
      rg.addColorStop(0, 'rgba(70,35,12,.95)'); rg.addColorStop(1, 'rgba(90,50,20,0)');
      g.fillStyle = rg; g.beginPath(); g.ellipse(x, y, s, s * 0.75, r2() * 3, 0, TAU); g.fill();
    }
  });
  const naanTex = canvasTex(256, 256, (g, w) => {
    g.fillStyle = '#fff6e6'; g.fillRect(0, 0, w, w);
    const r2 = rng(9);
    for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + r2() * 0.5})`; g.beginPath(); g.ellipse(r2() * w, r2() * w, 4 + r2() * 10, 3 + r2() * 7, 0, 0, TAU); g.fill(); }
    for (let i = 0; i < 400; i++) { g.fillStyle = 'rgba(200,160,110,.25)'; g.fillRect(r2() * w, r2() * w, 2, 2); }
  });
  const speckTex = canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#f2a03a'; g.fillRect(0, 0, w, h);
    const r2 = rng(3);
    for (let i = 0; i < 900; i++) { const v = r2(); g.fillStyle = v > 0.5 ? 'rgba(255,215,120,.9)' : 'rgba(190,90,20,.7)'; g.beginPath(); g.arc(r2() * w, r2() * h, 1.6 + r2() * 1.6, 0, TAU); g.fill(); }
  });
  const groundGlowTex = canvasTex(256, 256, (g, w) => {
    const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    r.addColorStop(0, 'rgba(255,255,255,.9)'); r.addColorStop(0.4, 'rgba(255,255,255,.3)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, w, w);
  });
  const shadowTex = canvasTex(128, 128, (g, w) => {
    const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    r.addColorStop(0, 'rgba(0,0,0,.75)'); r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r; g.fillRect(0, 0, w, w);
  });

  /* ---------- Scene, environment, lights ---------- */
  const scene = new T3.Scene();
  scene.fog = new T3.FogExp2(0x0b0907, 0.045);
  const pmrem = new T3.PMREMGenerator(renderer);
  const envSrc = canvasTex(512, 256, (g, w, h) => {
    const lg = g.createLinearGradient(0, 0, 0, h);
    lg.addColorStop(0, '#6a4a2e'); lg.addColorStop(0.45, '#2e1d12'); lg.addColorStop(0.55, '#1a110b'); lg.addColorStop(1, '#050302');
    g.fillStyle = lg; g.fillRect(0, 0, w, h);
    [[0.15, 0.25, 60, '255,220,170'], [0.5, 0.18, 80, '255,235,200'], [0.82, 0.3, 50, '255,170,90'], [0.35, 0.62, 70, '255,120,40']].forEach(([x, y, r, c]) => {
      const rg = g.createRadialGradient(x * w, y * h, 0, x * w, y * h, r);
      rg.addColorStop(0, `rgba(${c},1)`); rg.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = rg; g.fillRect(0, 0, w, h);
    });
  });
  envSrc.mapping = T3.EquirectangularReflectionMapping;
  scene.environment = pmrem.fromEquirectangular(envSrc).texture;
  scene.environmentIntensity = 0.9;

  scene.add(new T3.HemisphereLight(0xffe2c0, 0x1a0f08, 0.55));
  const key = new T3.DirectionalLight(0xffe8cc, 1.6); key.position.set(-6, 10, 8); scene.add(key);
  const rim = new T3.DirectionalLight(0x6f8cff, 0.6); rim.position.set(8, 4, -10); scene.add(rim);

  const camera = new T3.PerspectiveCamera(42, 1, 0.1, 120);

  // Ground
  const ground = new T3.Mesh(new T3.PlaneGeometry(160, 60), new T3.MeshStandardMaterial({ color: 0x18120e, roughness: 0.92, metalness: 0.05 }));
  ground.rotation.x = -PI / 2; ground.position.set(20, -1.6, -5); scene.add(ground);

  function groundGlow(x, z, size, color, opacity) {
    const m = new T3.Mesh(new T3.PlaneGeometry(size, size), new T3.MeshBasicMaterial({ map: groundGlowTex, color, transparent: true, opacity, blending: T3.AdditiveBlending, depthWrite: false }));
    m.rotation.x = -PI / 2; m.position.set(x, -1.59, z); scene.add(m); return m;
  }
  function shadow(x, z, sx, sz, y = -1.585) {
    const m = new T3.Mesh(new T3.PlaneGeometry(sx, sz), new T3.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
    m.rotation.x = -PI / 2; m.position.set(x, y, z); scene.add(m); return m;
  }

  /* ---------- Shared materials ---------- */
  const M = {
    copper: new T3.MeshStandardMaterial({ color: 0xb8703c, metalness: 0.9, roughness: 0.3, side: T3.DoubleSide }),
    copperRim: new T3.MeshStandardMaterial({ color: 0xe8a56a, metalness: 1, roughness: 0.22 }),
    iron: new T3.MeshStandardMaterial({ color: 0x2a2420, metalness: 0.7, roughness: 0.55 }),
    steel: new T3.MeshStandardMaterial({ color: 0xd8d6d2, metalness: 1, roughness: 0.2, side: T3.DoubleSide }),
    brass: new T3.MeshStandardMaterial({ color: 0xd9a04c, metalness: 1, roughness: 0.28 }),
    wood: new T3.MeshStandardMaterial({ color: 0x6b4426, roughness: 0.7 }),
    woodBlock: new T3.MeshStandardMaterial({ color: 0x3a2618, roughness: 0.85 }),
    clay: new T3.MeshStandardMaterial({ map: clayTex, color: 0xd08a64, roughness: 0.95, side: T3.DoubleSide }),
    laddoo: new T3.MeshStandardMaterial({ map: speckTex, bumpMap: speckTex, bumpScale: 2, color: 0xffffff, roughness: 0.6 }),
    butter: new T3.MeshStandardMaterial({ color: 0xffe08a, roughness: 0.35, emissive: 0x3a2a00 })
  };

  /* Hand-written shaders below output display colours; with the cinematic pipeline
     they're converted to linear so the HDR grade doesn't brighten them twice. */
  const CINE_DEF = () => (conf.cinematic === false ? {} : { CINE: '' });

  /* ---------- Flame shader ---------- */
  const flameMat = new T3.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uHeat: { value: 1 } },
    vertexShader: `
      uniform float uTime; varying vec2 vUv; varying float vSeed;
      void main(){
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        float seed = modelMatrix[3].x * 13.1 + modelMatrix[3].z * 7.7;
        vSeed = seed;
        vec3 p = position;
        p.x += sin(uTime * 11.0 + p.y * 9.0 + seed) * 0.035 * uv.y;
        p.z += cos(uTime * 9.0 + p.y * 7.0 + seed) * 0.03 * uv.y;
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `
      uniform float uTime; uniform float uHeat; varying vec2 vUv; varying float vSeed;
      void main(){
        float h = vUv.y;
        vec3 blue = vec3(0.25, 0.45, 1.0), orange = vec3(1.0, 0.55, 0.15), tip = vec3(1.0, 0.85, 0.45);
        vec3 c = mix(blue, orange, smoothstep(0.12, 0.5, h));
        c = mix(c, tip, smoothstep(0.6, 1.0, h));
        float a = (1.0 - smoothstep(0.5, 1.0, h)) * (0.75 + 0.25 * sin(uTime * 17.0 + vSeed)) * uHeat;
        c *= 1.6;
        #ifdef CINE
        c = pow(c, vec3(2.2)) * 0.9; // display colour → linear HDR for the cinematic pipeline
        #endif
        gl_FragColor = vec4(c, a);
      }`,
    defines: CINE_DEF(),
    transparent: true, depthWrite: false, blending: T3.AdditiveBlending, side: T3.DoubleSide
  });

  function makeBurner(parent, y, radius, count) {
    const g = new T3.Group(); g.position.y = y; parent.add(g);
    const ring = new T3.Mesh(new T3.TorusGeometry(radius, 0.07, 12, 48), M.iron); ring.rotation.x = PI / 2; g.add(ring);
    const cap = new T3.Mesh(new T3.CylinderGeometry(radius * 0.75, radius * 0.85, 0.12, 40), M.iron); cap.position.y = -0.04; g.add(cap);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU + 0.5;
      const leg = new T3.Mesh(new T3.BoxGeometry(0.08, 0.5, 0.08), M.iron);
      leg.position.set(Math.cos(a) * radius * 1.25, 0.15, Math.sin(a) * radius * 1.25); g.add(leg);
    }
    const base = new T3.Mesh(new T3.CylinderGeometry(radius * 1.5, radius * 1.6, 0.25, 40), new T3.MeshStandardMaterial({ color: 0x15100d, metalness: 0.4, roughness: 0.6 }));
    base.position.y = -0.22; g.add(base);
    const flames = [];
    const cone = new T3.ConeGeometry(0.075, 0.5, 10, 4, true);
    cone.translate(0, 0.25, 0);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU;
      const f = new T3.Mesh(cone, flameMat);
      f.position.set(Math.cos(a) * radius, 0.03, Math.sin(a) * radius);
      f.rotation.z = -Math.cos(a) * 0.35; f.rotation.x = Math.sin(a) * 0.35;
      g.add(f); flames.push(f);
    }
    const glow = new T3.Sprite(new T3.SpriteMaterial({ map: glowTex, color: 0xff7a2a, transparent: true, blending: T3.AdditiveBlending, depthWrite: false, opacity: 0.9 }));
    glow.scale.set(radius * 5, radius * 2.6, 1); glow.position.y = 0.25; g.add(glow);
    const light = new T3.PointLight(0xff8a3a, 8, 7, 1.6); light.position.y = 0.6; g.add(light);
    return {
      group: g,
      update(heat, time) {
        flames.forEach((f, i) => {
          const fl = 0.75 + 0.25 * Math.sin(time * 9 + i * 1.7) * Math.sin(time * 5.3 + i);
          f.scale.set(1, Math.max(0.001, heat * (0.75 + 0.45 * fl)), 1);
          f.visible = heat > 0.02;
        });
        glow.material.opacity = 0.85 * heat;
        light.intensity = heat * (7 + Math.sin(time * 13) * 1.2 + Math.sin(time * 7.3) * 0.8);
      }
    };
  }

  /* ---------- Bowl helpers ---------- */
  function bowlLathe(Rr, D, segs = 64) {
    const pts = [];
    for (let i = 0; i <= 26; i++) { const a = (i / 26) * (PI / 2); pts.push(new T3.Vector2(Math.max(0.01, Rr * Math.sin(a)), -D * Math.cos(a))); }
    return new T3.LatheGeometry(pts, segs);
  }
  const bowlRadiusAt = (Rr, D, h) => Rr * Math.sin(Math.acos(clamp(-h / D, -1, 1)));
  const discGeo = new T3.CylinderGeometry(1, 1, 0.02, 64);

  /* ---------- Steam emitter ---------- */
  function steamEmitter(parent, count, spread, rise) {
    const sprites = [];
    for (let i = 0; i < count; i++) {
      const s = new T3.Sprite(new T3.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, opacity: 0 }));
      s.userData = { x: (R() - 0.5) * spread, z: (R() - 0.5) * spread * 0.6, ph: R() };
      parent.add(s); sprites.push(s);
    }
    return {
      update(strength, time, baseY = 0) {
        sprites.forEach((s, i) => {
          const d = s.userData;
          const ph = (time * 0.18 + d.ph) % 1;
          s.position.set(d.x + Math.sin(ph * 5 + i) * 0.25 * ph, baseY + ph * rise, d.z);
          const sc = 0.5 + ph * 1.8; s.scale.set(sc, sc, 1);
          s.material.opacity = strength * 0.22 * Math.sin(ph * PI);
          s.visible = strength > 0.01;
        });
      }
    };
  }

  function stream(parent, color, radius) {
    const m = new T3.Mesh(new T3.CylinderGeometry(radius, radius * 0.7, 1, 12, 1, true),
      new T3.MeshStandardMaterial({ color, roughness: 0.15, metalness: 0.1, emissive: color, emissiveIntensity: 0.25, transparent: true }));
    parent.add(m); m.visible = false;
    return {
      update(a, topY, botY, x, z) {
        m.visible = a > 0.01;
        if (!m.visible) return;
        m.material.opacity = a;
        m.scale.set(1, topY - botY, 1);
        m.position.set(x, (topY + botY) / 2, z);
      }
    };
  }

  /* falling instance helper */
  function fallPos(it, t, start, dur, land) {
    const p = seg(t, start + it.d, start + it.d + dur);
    if (p <= 0) return null;
    return { p, x: lerp(it.x0, land[0], p), y: lerp(4.2 + it.d * 4, land[1], p * p), z: lerp(it.z0, land[2], p) };
  }
  function mkItems(n, dSpread) {
    return Array.from({ length: n }, (_, i) => ({ q: disk(), d: R() * dSpread, x0: (R() - 0.5) * 1.6, z0: (R() - 0.5) * 1.2, rx: R() * TAU, ry: R() * TAU, s: 0.75 + R() * 0.5, i }));
  }
  function setInst(mesh, i, x, y, z, rx, ry, rz, s) {
    tmpE.set(rx, ry, rz); tmpQ.setFromEuler(tmpE); tmpV.set(x, y, z); tmpS.set(s, s, s);
    tmpM.compose(tmpV, tmpQ, tmpS); mesh.setMatrixAt(i, tmpM);
  }
  const hide = (mesh, i) => { tmpM.makeScale(0, 0, 0); mesh.setMatrixAt(i, tmpM); };

  /* ======================================================
     STATION 0 — KADAI
     ====================================================== */
  const ST = [0, 14, 28, 42];
  const kadai = (function () {
    const g = new T3.Group(); g.position.set(ST[0], 0, 0); scene.add(g);
    const BR = 1.6, BD = 0.95;
    const burner = makeBurner(g, -1.25, 0.85, 22);
    shadow(ST[0], 0, 5, 3);
    groundGlow(ST[0], 0, 9, 0xff7a2a, 0.35);

    g.add(new T3.Mesh(bowlLathe(BR, BD), M.copper));
    const rimM = new T3.Mesh(new T3.TorusGeometry(BR, 0.05, 12, 96), M.copperRim); rimM.rotation.x = PI / 2; g.add(rimM);
    [-1, 1].forEach((sx) => {
      const h = new T3.Mesh(new T3.TorusGeometry(0.22, 0.045, 10, 24, PI), M.iron);
      h.position.set(sx * (BR + 0.12), 0.02, 0); h.rotation.set(PI / 2, 0, sx > 0 ? -PI / 2 : PI / 2); g.add(h);
    });

    const liquidMat = new T3.MeshStandardMaterial({ color: 0xecb03e, roughness: 0.18, metalness: 0.05, emissive: 0x2a0d00, emissiveIntensity: 1 });
    const liquid = new T3.Mesh(discGeo, liquidMat); g.add(liquid);

    const seeds = new T3.InstancedMesh(new T3.CapsuleGeometry(0.018, 0.05, 2, 6), new T3.MeshStandardMaterial({ color: 0x4a2a10, roughness: 0.7 }), 30);
    const onions = new T3.InstancedMesh(new T3.TorusGeometry(0.08, 0.018, 6, 14, PI), new T3.MeshStandardMaterial({ color: 0xd8a8c8, roughness: 0.4, transparent: true }), 14);
    const toms = new T3.InstancedMesh(new T3.BoxGeometry(0.13, 0.08, 0.13), new T3.MeshStandardMaterial({ color: 0xd42a1e, roughness: 0.35, transparent: true }), 16);
    const paneer = new T3.InstancedMesh(new T3.BoxGeometry(0.2, 0.17, 0.2), new T3.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 }), 12);
    const leaves = new T3.InstancedMesh(new T3.CircleGeometry(0.05, 6), new T3.MeshStandardMaterial({ color: 0x3f9a3a, roughness: 0.6, side: T3.DoubleSide }), 24);
    [seeds, onions, toms, paneer, leaves].forEach((m) => { m.instanceMatrix.setUsage(T3.DynamicDrawUsage); g.add(m); });
    for (let i = 0; i < 12; i++) paneer.setColorAt(i, col(0xfff3dc));

    const D = { seeds: mkItems(30, 0.22), onions: mkItems(14, 0.2), toms: mkItems(16, 0.2), paneer: mkItems(12, 0.35), leaves: mkItems(24, 0.16) };

    // cream swirl
    const sp = [];
    for (let a = 0; a <= 3.2 * TAU; a += 0.12) { const r = 0.04 + a * 0.03; sp.push(new T3.Vector3(Math.cos(a) * r - 0.15, 0, Math.sin(a) * r)); }
    const creamGeo = new T3.TubeGeometry(new T3.CatmullRomCurve3(sp), 260, 0.028, 6, false);
    const cream = new T3.Mesh(creamGeo, new T3.MeshStandardMaterial({ color: 0xfffaf0, roughness: 0.3 })); g.add(cream);

    // ladle
    const ladle = new T3.Group(); g.add(ladle);
    const lBowl = new T3.Mesh(new T3.SphereGeometry(0.2, 18, 10, 0, TAU, PI / 2, PI / 2), M.steel); ladle.add(lBowl);
    const pivot = new T3.Group(); ladle.add(pivot);
    const handle = new T3.Mesh(new T3.CylinderGeometry(0.03, 0.04, 3.2, 10), M.wood); handle.rotation.x = PI / 2; handle.position.z = 1.6; pivot.add(handle);

    const gheeS = stream(g, 0xf0b440, 0.05), creamS = stream(g, 0xfff7ea, 0.035);
    const steam = steamEmitter(g, mobile ? 10 : 18, 2.2, 3.2);

    const sparks = new T3.Points(new T3.BufferGeometry(), new T3.PointsMaterial({ map: glowTex, color: 0xffd28a, size: 0.07, transparent: true, blending: T3.AdditiveBlending, depthWrite: false }));
    const spPos = new Float32Array(40 * 3); sparks.geometry.setAttribute('position', new T3.BufferAttribute(spPos, 3)); g.add(sparks);
    const spD = Array.from({ length: 40 }, () => ({ q: disk(), ph: R(), sp: 0.8 + R() }));

    const GHEE = col(0xecb03e), RED = col(0xc8461a), DEEP = col(0xa83a14);

    return {
      update(T, time) {
        const heat = ease(seg(T, 0, 0.55));
        burner.update(heat, time);
        const L = 0.34 * ease(seg(T, 1.05, 1.45)) + 0.4 * ease(seg(T, 2.1, 2.8)) + 0.12 * seg(T, 3.0, 3.5);
        const h = -0.9 + L * 0.72, r = bowlRadiusAt(BR, BD, h) * 0.985;
        liquid.visible = L > 0.005;
        liquid.scale.set(r, 1, r); liquid.position.y = h;
        tmpC.copy(GHEE).lerp(RED, ease(seg(T, 2.3, 2.95))).lerp(DEEP, seg(T, 3.4, 3.9));
        liquidMat.color.copy(tmpC);
        const land = (it, k = 0.85) => [it.q[0] * r * k, h + 0.03, it.q[1] * r * k];

        const seedFade = 1 - seg(T, 2.6, 3.0);
        D.seeds.forEach((it, i) => { const f = fallPos(it, T, 1.5, 0.12, land(it)); f && seedFade > 0 ? setInst(seeds, i, f.x, f.y, f.z, it.rx + (1 - f.p) * 6, it.ry, 0, it.s * (f.p < 1 ? 1 : seedFade)) : hide(seeds, i); });
        const pf = 1 - seg(T, 2.6, 3.0);
        onions.material.opacity = toms.material.opacity = 1;
        D.onions.forEach((it, i) => { const f = fallPos(it, T, 2.05, 0.14, land(it)); f && pf > 0 ? setInst(onions, i, f.x, f.y, f.z, PI / 2 + (1 - f.p) * 5, it.ry, 0, it.s * (f.p < 1 ? 1 : pf)) : hide(onions, i); });
        D.toms.forEach((it, i) => { const f = fallPos(it, T, 2.3, 0.14, land(it)); f && pf > 0 ? setInst(toms, i, f.x, f.y, f.z, it.rx * (1 - f.p), it.ry, 0, it.s * (f.p < 1 ? 1 : pf)) : hide(toms, i); });
        const coat = seg(T, 3.35, 3.8);
        D.paneer.forEach((it, i) => {
          const f = fallPos(it, T, 3.05, 0.13, land(it, 0.7));
          if (!f) return hide(paneer, i);
          setInst(paneer, i, f.x, f.y + 0.04 + (f.p >= 1 ? Math.sin(time * 2 + i) * 0.008 : 0), f.z, (1 - f.p) * 4, it.ry, (1 - f.p) * 3, it.s);
          paneer.setColorAt(i, tmpC.set(0xfff3dc).lerp(col(0xf0a060), coat * 0.7));
        });
        paneer.instanceColor.needsUpdate = true;
        D.leaves.forEach((it, i) => { const f = fallPos(it, T, 3.75, 0.12, land(it)); f ? setInst(leaves, i, f.x, f.y + 0.01, f.z, f.p >= 1 ? -PI / 2 : it.rx + (1 - f.p) * 8, it.ry, 0, it.s) : hide(leaves, i); });
        [seeds, onions, toms, paneer, leaves].forEach((m) => { m.instanceMatrix.needsUpdate = true; });

        const cr = seg(T, 3.55, 3.78);
        cream.visible = cr > 0;
        cream.position.y = h + 0.02;
        creamGeo.setDrawRange(0, Math.floor(creamGeo.index.count * cr / 3) * 3);

        const lad = seg(T, 2.35, 2.5) * (1 - seg(T, 3.88, 3.98));
        ladle.visible = lad > 0.02;
        if (ladle.visible) {
          const ang = T * 9 + time * 0.6;
          ladle.position.set(Math.cos(ang) * r * 0.5, h + 0.12, Math.sin(ang) * r * 0.5);
          tmpV.set(ladle.position.x * 0.3 + 2.4, h + 3.2, ladle.position.z * 0.3 + 1.2);
          pivot.lookAt(tmpV.add(g.position));
          ladle.position.y += (1 - lad) * 2;
        }

        gheeS.update(seg(T, 1.03, 1.1) * (1 - seg(T, 1.42, 1.5)), 5, h, -0.25, 0.1);
        creamS.update(seg(T, 3.52, 3.56) * (1 - seg(T, 3.74, 3.8)), 5, h, -0.15, 0);

        const sizzle = seg(T, 1.5, 1.6) * (1 - seg(T, 2.3, 2.6)) + 0.35 * seg(T, 2.3, 2.4) * (1 - seg(T, 2.7, 2.9));
        sparks.visible = sizzle > 0.01;
        if (sparks.visible) {
          spD.forEach((s, i) => {
            const ph = (time * s.sp + s.ph) % 1;
            spPos[i * 3] = s.q[0] * r; spPos[i * 3 + 1] = h + ph * 0.5; spPos[i * 3 + 2] = s.q[1] * r;
          });
          sparks.geometry.attributes.position.needsUpdate = true;
          sparks.material.opacity = sizzle;
        }
        steam.update(heat * (L > 0.01 ? 0.35 + 0.75 * seg(T, 1.6, 3.6) : 0.12), time, h);
      }
    };
  })();

  /* ======================================================
     STATION 1 — TANDOOR
     ====================================================== */
  function naanMesh(sx = 0.55, sy = 0.8) {
    const grp = new T3.Group();
    const geo = new T3.SphereGeometry(1, 40, 20);
    const base = new T3.Mesh(geo, new T3.MeshStandardMaterial({ map: naanTex, color: 0xffffff, roughness: 0.75 }));
    const charM = new T3.Mesh(geo, new T3.MeshStandardMaterial({ map: charTex, transparent: true, opacity: 0, depthWrite: false, roughness: 0.8 }));
    charM.scale.setScalar(1.004);
    grp.add(base, charM);
    grp.scale.set(sx, sy, 0.06);
    grp.userData = { base, charM, sx, sy };
    return grp;
  }
  function setNaan(n, bake, charA, puff, gloss) {
    const u = n.userData;
    u.base.material.color.set(0xf4ead6).lerp(col(0xe2a95e), bake);
    u.base.material.roughness = 0.75 - gloss * 0.5;
    u.base.material.emissive = u.base.material.emissive || new T3.Color();
    u.base.material.emissive.set(0x3a2400).multiplyScalar(gloss);
    u.charM.material.opacity = charA;
    n.scale.set(u.sx * (1 + puff * 0.06), u.sy * (1 + puff * 0.06), 0.06 + puff * 0.05);
  }

  const tandoor = (function () {
    const g = new T3.Group(); g.position.set(ST[1], -1.6, 0); scene.add(g);
    shadow(ST[1], 0, 5, 4);
    groundGlow(ST[1], 0.5, 10, 0xff6a2a, 0.4);
    const prof = [[0.05, 0], [1.25, 0], [1.45, 0.5], [1.55, 1.1], [1.47, 1.7], [1.22, 2.2], [1.15, 2.34], [1.26, 2.38], [1.26, 2.46], [1.1, 2.46]].map((p) => new T3.Vector2(p[0], p[1]));
    const open = 1.75; // radians of the cut-away opening facing the camera
    const outer = new T3.Mesh(new T3.LatheGeometry(prof, 72, open / 2, TAU - open), M.clay); g.add(outer);
    const innerProf = prof.slice(1, 7).map((p) => new T3.Vector2(p.x * 0.9, p.y));
    const innerMat = new T3.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform float uTime; varying vec2 vUv;
        void main(){ float f = 0.85 + 0.15 * sin(uTime * 7.0) * sin(uTime * 3.1 + vUv.x * 12.0);
          vec3 hot = vec3(1.0, 0.45, 0.12), mid = vec3(0.55, 0.16, 0.05), dark = vec3(0.12, 0.04, 0.02);
          vec3 c = mix(hot, mid, smoothstep(0.0, 0.45, vUv.y)); c = mix(c, dark, smoothstep(0.45, 1.0, vUv.y));
          c *= f * 1.4;
          #ifdef CINE
          c = pow(c, vec3(2.2)) * 0.7;
          #endif
          gl_FragColor = vec4(c, 1.0); }`,
      defines: CINE_DEF(),
      side: T3.DoubleSide
    });
    g.add(new T3.Mesh(new T3.LatheGeometry(innerProf, 72, open / 2, TAU - open), innerMat));
    // cut edges
    [open / 2, TAU - open / 2].forEach((phi) => {
      const shape = new T3.Shape();
      shape.moveTo(prof[1].x * 0.9, 0);
      prof.slice(1, 7).forEach((p) => shape.lineTo(p.x, p.y));
      prof.slice(1, 7).reverse().forEach((p) => shape.lineTo(p.x * 0.9, p.y));
      const edge = new T3.Mesh(new T3.ShapeGeometry(shape), M.clay);
      edge.rotation.y = phi - PI / 2; g.add(edge);
    });
    const floor = new T3.Mesh(new T3.CircleGeometry(1.12, 48), new T3.MeshBasicMaterial({ color: 0x3a1206 })); floor.rotation.x = -PI / 2; floor.position.y = 0.02; g.add(floor);

    const coals = new T3.InstancedMesh(new T3.IcosahedronGeometry(0.1, 1), new T3.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), 40);
    const coalD = Array.from({ length: 40 }, () => { const q = disk(); return { x: q[0] * 1.05, z: q[1] * 1.05, s: 0.6 + R() * 0.9, ph: R() * TAU }; });
    coalD.forEach((c, i) => setInst(coals, i, c.x, 0.08, c.z, c.ph, c.ph, 0, c.s));
    g.add(coals);
    const inLight = new T3.PointLight(0xff6a20, 14, 6, 1.4); inLight.position.set(0, 0.7, 0); g.add(inLight);
    const mouthGlow = new T3.Sprite(new T3.SpriteMaterial({ map: glowTex, color: 0xff7a30, transparent: true, blending: T3.AdditiveBlending, depthWrite: false, opacity: 0.7 }));
    mouthGlow.scale.set(3.5, 2.2, 1); mouthGlow.position.set(0, 2.6, 0); g.add(mouthGlow);

    // naans on the wall
    const wallR = 1.36;
    [[PI * 0.82, 1.35, 0.42], [PI * 1.18, 1.0, 0.38]].forEach(([phi, y, s]) => {
      const n = naanMesh(s * 0.7, s); setNaan(n, 0.75, 0.7, 0.5, 0);
      n.position.set(Math.sin(phi) * wallR, y, Math.cos(phi) * wallR); n.rotation.y = phi + PI; g.add(n);
    });
    const naan = naanMesh(); g.add(naan);
    const pad = new T3.Mesh(new T3.CylinderGeometry(0.55, 0.6, 0.18, 32), new T3.MeshStandardMaterial({ color: 0xe9dfc8, roughness: 0.95 }));
    pad.rotation.x = PI / 2; g.add(pad);
    const skewers = new T3.Group(); g.add(skewers);
    [-0.07, 0.07].forEach((o) => { const s = new T3.Mesh(new T3.CylinderGeometry(0.015, 0.015, 3, 8), M.steel); s.position.set(o, 1.5, 0); skewers.add(s); });
    skewers.rotation.z = -0.7;
    const butter = new T3.Mesh(new T3.BoxGeometry(0.2, 0.14, 0.18), M.butter); g.add(butter);
    const steam = steamEmitter(g, mobile ? 6 : 10, 0.8, 2.2);

    const embers = new T3.Points(new T3.BufferGeometry(), new T3.PointsMaterial({ map: glowTex, color: 0xff9a40, size: 0.08, transparent: true, blending: T3.AdditiveBlending, depthWrite: false }));
    const ePos = new Float32Array(50 * 3); embers.geometry.setAttribute('position', new T3.BufferAttribute(ePos, 3)); g.add(embers);
    const eD = Array.from({ length: 50 }, () => ({ x: (R() - 0.5) * 1.8, z: (R() - 0.5) * 1.4, ph: R(), sp: 0.3 + R() * 0.5 }));

    const WALL = new T3.Vector3(0, 1.25, -1.3);
    return {
      update(T, time) {
        const u = clamp(T - 4, 0, 1);
        const f = 0.8 + 0.2 * Math.sin(time * 7) * Math.sin(time * 3.1);
        innerMat.uniforms.uTime.value = time;
        inLight.intensity = 12 * f; mouthGlow.material.opacity = 0.6 * f;
        coalD.forEach((c, i) => coals.setColorAt(i, tmpC.setRGB(1, 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(time * 3 + c.ph)), 0.08)));
        coals.instanceColor.needsUpdate = true;
        eD.forEach((e, i) => { const ph = (time * e.sp + e.ph) % 1; ePos[i * 3] = e.x + Math.sin(ph * 6 + i) * 0.2; ePos[i * 3 + 1] = 2.4 + ph * 2.6; ePos[i * 3 + 2] = e.z; });
        embers.geometry.attributes.position.needsUpdate = true;

        const enter = easeOut(seg(u, 0, 0.22)), stick = seg(u, 0.22, 0.3), bake = seg(u, 0.3, 0.7);
        const pull = ease(seg(u, 0.7, 0.86));
        if (u < 0.7) {
          naan.position.set(lerp(-3.4, WALL.x, enter), lerp(1.6, WALL.y, enter), lerp(2.2, WALL.z, enter));
          naan.rotation.set(0, lerp(0.9, 0, enter), lerp(-0.6, 0.05, enter));
        } else {
          naan.position.set(lerp(WALL.x, 2.3, pull), lerp(WALL.y, 1.5, pull), lerp(WALL.z, 1.8, pull));
          naan.rotation.set(lerp(0, -0.5, pull), lerp(0, -0.5, pull), lerp(0.05, -0.2, pull));
        }
        setNaan(naan, bake, ease(seg(u, 0.42, 0.7)), Math.sin(bake * PI) * 0.9 + bake * 0.3 + Math.sin(stick * PI) * 0.3, seg(u, 0.9, 1));

        const padK = enter * (1 - ease(seg(u, 0.24, 0.36)));
        pad.visible = padK > 0.01 && u < 0.4;
        pad.position.set(naan.position.x - 0.05, naan.position.y, naan.position.z + 0.2 - (1 - padK) * 2);
        pad.rotation.set(PI / 2, 0, 0);

        const sk = seg(u, 0.66, 0.72) * (1 - seg(u, 0.86, 0.9));
        skewers.visible = sk > 0.01;
        skewers.position.set(naan.position.x + 0.9 + (1 - sk) * 2, naan.position.y + 0.6 + (1 - sk) * 2, naan.position.z + 0.1);

        const melt = seg(u, 0.88, 1);
        butter.visible = u > 0.86;
        butter.position.set(naan.position.x + 0.05, naan.position.y + 0.05, naan.position.z + 0.08);
        butter.scale.setScalar(Math.max(0.05, 1 - melt * 0.9));
        butter.rotation.copy(naan.rotation);

        steam.update(0.25 + 0.65 * seg(u, 0.74, 0.85), time, 2.4);
      },
      naanWorld: () => naan.getWorldPosition(new T3.Vector3())
    };
  })();

  /* ======================================================
     STATION 2 — MITHAI
     ====================================================== */
  const mithai = (function () {
    const g = new T3.Group(); g.position.set(ST[2], -0.2, 0); scene.add(g);
    const PR = 1.75, PD = 0.42;
    shadow(ST[2], 0, 5, 3); shadow(ST[2] + 3, 0.3, 4, 3);
    groundGlow(ST[2] + 1.2, 0, 11, 0xffa040, 0.32);
    const burner = makeBurner(g, -0.95, 0.75, 18);
    g.add(new T3.Mesh(bowlLathe(PR, PD), M.copper));
    const rimM = new T3.Mesh(new T3.TorusGeometry(PR, 0.05, 12, 96), M.copperRim); rimM.rotation.x = PI / 2; g.add(rimM);
    const milkMat = new T3.MeshStandardMaterial({ color: 0xfbf8ef, roughness: 0.35 });
    const milk = new T3.Mesh(discGeo, milkMat); g.add(milk);
    const gheeRing = new T3.Mesh(new T3.TorusGeometry(1, 0.03, 8, 64), new T3.MeshStandardMaterial({ color: 0xffc050, emissive: 0x6a3a00, roughness: 0.1, transparent: true }));
    gheeRing.rotation.x = PI / 2; g.add(gheeRing);
    const bubbles = new T3.InstancedMesh(new T3.SphereGeometry(0.05, 10, 6), new T3.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, transparent: true, opacity: 0.85 }), 18);
    const bD = Array.from({ length: 18 }, () => ({ q: disk(), ph: R(), sp: 0.6 + R() * 0.8, s: 0.6 + R() }));
    g.add(bubbles);
    const milkS = stream(g, 0xfdfbf6, 0.06), gheeS = stream(g, 0xf6b83c, 0.03);
    const steam = steamEmitter(g, mobile ? 8 : 14, 2.4, 3);

    // wooden block + brass plate
    const PL = new T3.Vector3(3.2, -0.25, 0.4);
    const block = new T3.Mesh(new T3.BoxGeometry(2.6, 1.15, 2.0), M.woodBlock); block.position.set(PL.x, -0.82, PL.z); g.add(block);
    const plate = new T3.Group(); plate.position.copy(PL); g.add(plate);
    const pl = new T3.Mesh(new T3.CylinderGeometry(1.0, 0.95, 0.06, 64), M.brass); plate.add(pl);
    const plRim = new T3.Mesh(new T3.TorusGeometry(1.0, 0.035, 8, 64), M.brass); plRim.rotation.x = PI / 2; plRim.position.y = 0.03; plate.add(plRim);

    const r = 0.2, dd = 0.4;
    const pyr = [];
    [[-dd, -0.35], [0, -0.35], [dd, -0.35], [-dd / 2, 0], [dd / 2, 0], [0, 0.35]].forEach(([x, z]) => pyr.push([x, r + 0.03, z]));
    [[-dd / 2, -0.17], [dd / 2, -0.17], [0, 0.17]].forEach(([x, z]) => pyr.push([x, r * 2.6, z]));
    pyr.push([0, r * 4.2, 0]);
    const laddoos = new T3.InstancedMesh(new T3.IcosahedronGeometry(r, 3), M.laddoo, pyr.length);
    laddoos.instanceMatrix.setUsage(T3.DynamicDrawUsage); g.add(laddoos);
    const sparkles = Array.from({ length: 5 }, () => {
      const s = new T3.Sprite(new T3.SpriteMaterial({ map: starTex, color: 0xffffff, transparent: true, blending: T3.AdditiveBlending, depthWrite: false, opacity: 0 }));
      g.add(s); return s;
    });
    const varq = new T3.InstancedMesh(new T3.PlaneGeometry(0.16, 0.12), new T3.MeshStandardMaterial({ color: 0xe8e8ee, metalness: 1, roughness: 0.15, side: T3.DoubleSide }), 4);
    g.add(varq);

    return {
      update(T, time) {
        const u = clamp(T - 5, 0, 1);
        burner.update(0.75, time);
        const L = clamp(0.72 * ease(seg(u, 0.03, 0.25)) - 0.24 * ease(seg(u, 0.28, 0.55)) - 0.22 * seg(u, 0.56, 0.86));
        const h = -0.38 + L * 0.3, rr = bowlRadiusAt(PR, PD, h) * 0.985;
        milk.visible = L > 0.005; milk.scale.set(rr, 1, rr); milk.position.y = h;
        milkMat.color.set(0xfbf8ef).lerp(col(0xdcb27c), ease(seg(u, 0.25, 0.55)));
        const gk = seg(u, 0.5, 0.62);
        gheeRing.visible = gk > 0 && milk.visible; gheeRing.scale.set(rr * 0.9, rr * 0.9, 1); gheeRing.position.y = h + 0.012; gheeRing.material.opacity = gk;
        const boil = seg(u, 0.08, 0.14) * (1 - seg(u, 0.52, 0.6));
        bD.forEach((b, i) => {
          const ph = (time * b.sp + b.ph) % 1;
          boil > 0 ? setInst(bubbles, i, b.q[0] * rr, h + 0.01, b.q[1] * rr, 0, 0, 0, Math.sin(ph * PI) * b.s * boil) : hide(bubbles, i);
        });
        bubbles.instanceMatrix.needsUpdate = true;
        milkS.update(seg(u, 0.02, 0.06) * (1 - seg(u, 0.22, 0.27)), 5, h, -0.2, 0);
        gheeS.update(seg(u, 0.46, 0.5) * (1 - seg(u, 0.58, 0.62)), 5, h, 0.25, 0);
        steam.update(0.35 + 0.65 * seg(u, 0.1, 0.4) * (1 - seg(u, 0.6, 0.9)), time, h);

        const plateIn = easeOut(seg(u, 0.38, 0.52));
        plate.position.set(PL.x + (1 - plateIn) * 3, PL.y, PL.z);
        plate.visible = plateIn > 0.01;
        let vi = 0;
        pyr.forEach((p, i) => {
          const k = ease(seg(u, 0.56 + i * 0.027, 0.62 + i * 0.027));
          if (k <= 0) return hide(laddoos, i);
          const sx = (i % 4 - 1.5) * 0.3, sy = h + 0.15;
          const tx = plate.position.x + p[0], ty = plate.position.y + p[1], tz = plate.position.z + p[2];
          setInst(laddoos, i, lerp(sx, tx, k), lerp(sy, ty, k) + Math.sin(k * PI) * 1.4, lerp(0, tz, k), i, i * 2, 0, 0.6 + 0.4 * k);
          if (i >= 6 && vi < 4) {
            const vk = seg(u, 0.86, 0.95);
            vk > 0 ? setInst(varq, vi, tx + 0.02, ty + r * 0.98, tz, -PI / 2 + 0.3, 0, i, vk) : hide(varq, vi);
            vi++;
          }
        });
        for (; vi < 4; vi++) hide(varq, vi);
        laddoos.instanceMatrix.needsUpdate = true; varq.instanceMatrix.needsUpdate = true;
        const sk = seg(u, 0.86, 0.95);
        sparkles.forEach((s, i) => {
          const tw = Math.max(0, Math.sin(time * 3 + i * 1.9));
          const p = pyr[6 + (i % 4)];
          s.position.set(plate.position.x + p[0] + (i - 2) * 0.08, plate.position.y + p[1] + r * 1.1, plate.position.z + p[2] + 0.1);
          const sc = 0.35 * tw * sk; s.scale.set(sc, sc, 1); s.material.opacity = tw * sk;
        });
      }
    };
  })();

  /* ======================================================
     STATION 3 — THALI
     ====================================================== */
  function katori(rr, fillHex) {
    const grp = new T3.Group();
    const b = new T3.Mesh(bowlLathe(rr, rr * 0.6, 40), M.steel); b.position.y = rr * 0.6; grp.add(b);
    const rimK = new T3.Mesh(new T3.TorusGeometry(rr, 0.02, 8, 40), M.steel); rimK.rotation.x = PI / 2; rimK.position.y = rr * 0.6; grp.add(rimK);
    const fill = new T3.Mesh(discGeo, new T3.MeshStandardMaterial({ color: fillHex, roughness: 0.25, emissive: 0x1a0800 }));
    fill.scale.set(rr * 0.93, 1, rr * 0.93); fill.position.y = rr * 0.6 - 0.06; grp.add(fill);
    grp.userData.top = rr * 0.6 - 0.05;
    return grp;
  }
  const thali = (function () {
    const g = new T3.Group(); g.position.set(ST[3], -1.2, 0); scene.add(g);
    shadow(ST[3], 0, 7, 5);
    const tableGlow = groundGlow(ST[3], 0, 12, 0xffb050, 0.3);
    const plateG = new T3.Group(); g.add(plateG);
    plateG.add(new T3.Mesh(new T3.CylinderGeometry(2.3, 2.2, 0.08, 96), M.brass));
    const tr = new T3.Mesh(new T3.TorusGeometry(2.3, 0.05, 10, 96), M.brass); tr.rotation.x = PI / 2; tr.position.y = 0.04; plateG.add(tr);
    const inner = new T3.Mesh(new T3.TorusGeometry(1.95, 0.015, 6, 96), new T3.MeshStandardMaterial({ color: 0x8a5a20, metalness: 1, roughness: 0.4 }));
    inner.rotation.x = PI / 2; inner.position.y = 0.045; plateG.add(inner);

    const pan = katori(0.62, 0xd0541f);
    const cubeGeo = new T3.BoxGeometry(0.13, 0.11, 0.13), cubeMat = new T3.MeshStandardMaterial({ color: 0xf6c890, roughness: 0.5 });
    [[-0.2, 0.1], [0.15, -0.15], [0.22, 0.2], [-0.1, -0.25]].forEach(([x, z], i) => { const c = new T3.Mesh(cubeGeo, cubeMat); c.position.set(x, pan.userData.top + 0.04, z); c.rotation.y = i; pan.add(c); });
    const dal = katori(0.58, 0x8a4a1e);
    const swirl = new T3.Mesh(new T3.TorusGeometry(0.18, 0.02, 6, 40, 5), new T3.MeshStandardMaterial({ color: 0xfffaf0, roughness: 0.3 }));
    swirl.rotation.x = PI / 2; swirl.position.y = dal.userData.top + 0.015; dal.add(swirl);
    const mush = katori(0.52, 0xa86230);
    const capGeo = new T3.SphereGeometry(0.08, 12, 8, 0, TAU, 0, PI / 2), capMat = new T3.MeshStandardMaterial({ color: 0xeadcc4, roughness: 0.6 });
    [[-0.18, 0], [0.12, -0.15], [0.15, 0.17], [-0.05, 0.22]].forEach(([x, z]) => { const c = new T3.Mesh(capGeo, capMat); c.position.set(x, mush.userData.top, z); c.scale.y = 0.6; mush.add(c); });
    const sweetPlate = new T3.Group();
    sweetPlate.add(new T3.Mesh(new T3.CylinderGeometry(0.62, 0.58, 0.05, 48), M.steel));
    const lg = new T3.IcosahedronGeometry(0.19, 3);
    [[-0.2, 0.2, 0.05], [0.2, 0.2, 0.05], [0, 0.48, 0]].forEach(([x, y, z]) => { const l = new T3.Mesh(lg, M.laddoo); l.position.set(x, y, z); sweetPlate.add(l); });
    const naanG = new T3.Group();
    const n1 = naanMesh(0.55, 0.85); setNaan(n1, 1, 0.9, 0.3, 0.5); n1.rotation.set(-PI / 2 + 0.15, 0, 0.5); n1.position.y = 0.1; naanG.add(n1);
    const n2 = naanMesh(0.5, 0.8); setNaan(n2, 0.95, 0.8, 0.3, 0.7); n2.rotation.set(-PI / 2 + 0.25, 0, 0.2); n2.position.set(-0.1, 0.2, 0.1); naanG.add(n2);

    const items = [
      { o: dal, a: 0.2, p: [-0.2, 0.04, -0.85], from: [0, 4, -2] },
      { o: naanG, a: 0.36, p: [1.25, 0.06, -0.2], from: [5, 1, 0] },
      { o: pan, a: 0.05, p: [-1.1, 0.04, 0.05], from: [-5, 1, 0] },
      { o: mush, a: 0.62, p: [-0.45, 0.04, 1.0], from: [0, 1, 5] },
      { o: sweetPlate, a: 0.5, p: [0.75, 0.07, 0.9], from: [0, 1, 5] }
    ];
    items.forEach((it) => g.add(it.o));
    const steam = steamEmitter(g, mobile ? 8 : 14, 2.6, 2.6);
    const halo = new T3.PointLight(0xffc070, 0, 9, 1.5); halo.position.set(0, 2.2, 0.5); g.add(halo);
    const stars = Array.from({ length: 12 }, () => {
      const s = new T3.Sprite(new T3.SpriteMaterial({ map: starTex, transparent: true, blending: T3.AdditiveBlending, depthWrite: false, opacity: 0 }));
      s.userData = { x: (R() - 0.5) * 4.5, y: 0.5 + R() * 1.8, z: (R() - 0.5) * 2.5, ph: R() * TAU }; g.add(s); return s;
    });

    return {
      update(T, time) {
        const u = clamp(T - 6, 0, 1.8);
        const inK = easeOut(seg(u, 0, 0.12));
        plateG.position.y = (1 - inK) * -0.8; plateG.visible = inK > 0.01;
        items.forEach((it) => {
          const k = easeOut(seg(u, it.a, it.a + 0.18));
          it.o.visible = k > 0.01;
          it.o.position.set(it.p[0] + it.from[0] * (1 - k), it.p[1] + it.from[1] * (1 - k) + Math.sin(k * PI) * 0.4, it.p[2] + it.from[2] * (1 - k));
        });
        steam.update(seg(u, 0.3, 0.7) * 0.9, time, 0.3);
        const fin = seg(u, 0.85, 1.25);
        halo.intensity = 6 * fin;
        tableGlow.material.opacity = 0.3 + 0.25 * fin;
        stars.forEach((s) => {
          const d = s.userData, tw = Math.max(0, Math.sin(time * 2.4 + d.ph));
          s.position.set(d.x, d.y, d.z); const sc = 0.4 * tw * fin; s.scale.set(sc, sc, 1); s.material.opacity = tw * fin;
        });
      }
    };
  })();

  /* ======================================================
     AMBIENT WORLD — floating spices, gold dust, embers
     ====================================================== */
  const ambient = (function () {
    const grp = new T3.Group(); scene.add(grp);
    const star = new T3.Shape();
    for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU, rr = i % 2 ? 0.07 : 0.22; i ? star.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : star.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    const kinds = [
      { geo: new T3.ExtrudeGeometry(star, { depth: 0.05, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 1 }), mat: new T3.MeshStandardMaterial({ color: 0x6a3a1c, roughness: 0.6 }), n: 22 },
      { geo: new T3.SphereGeometry(0.09, 14, 10), mat: new T3.MeshStandardMaterial({ color: 0x8aa35a, roughness: 0.55 }), n: 26, sc: [1, 1, 1.7] },
      { geo: new T3.CapsuleGeometry(0.05, 0.45, 4, 10), mat: new T3.MeshStandardMaterial({ color: 0xc8241a, roughness: 0.3 }), n: 18 },
      { geo: new T3.CylinderGeometry(0.05, 0.05, 0.6, 10, 1, true), mat: new T3.MeshStandardMaterial({ color: 0x8a4a22, roughness: 0.8, side: T3.DoubleSide }), n: 16 },
      { geo: new T3.TetrahedronGeometry(0.08, 0), mat: new T3.MeshStandardMaterial({ color: 0xe0b060, roughness: 0.4, metalness: 0.3 }), n: 30 }
    ];
    const all = [];
    kinds.forEach((k) => {
      const n = mobile ? Math.ceil(k.n * 0.55) : k.n;
      const im = new T3.InstancedMesh(k.geo, k.mat, n); im.instanceMatrix.setUsage(T3.DynamicDrawUsage); grp.add(im);
      for (let i = 0; i < n; i++) {
        all.push({ im, i, sc: k.sc, x: -6 + R() * 56, y: -0.8 + R() * 6.5, z: -7 + R() * 9, rx: R() * TAU, ry: R() * TAU, sp: 0.2 + R() * 0.5, bob: R() * TAU, s: 0.7 + R() * 0.9 });
      }
    });
    // keep the area right in front of each station clear
    all.forEach((a) => { ST.forEach((sx) => { if (Math.abs(a.x - sx) < 2.6 && a.z > -2.5 && a.y < 3.2) a.z -= 4; }); });

    const dustN = mobile ? 500 : 1200;
    const dPos = new Float32Array(dustN * 3);
    for (let i = 0; i < dustN; i++) { dPos[i * 3] = -8 + R() * 60; dPos[i * 3 + 1] = -1.4 + R() * 9; dPos[i * 3 + 2] = -10 + R() * 14; }
    const dGeo = new T3.BufferGeometry(); dGeo.setAttribute('position', new T3.BufferAttribute(dPos, 3));
    const dust = new T3.Points(dGeo, new T3.PointsMaterial({ map: glowTex, color: 0xe8b860, size: 0.05, transparent: true, opacity: 0.7, blending: T3.AdditiveBlending, depthWrite: false }));
    grp.add(dust);

    const eN = mobile ? 60 : 140;
    const ePos = new Float32Array(eN * 3), eD = [];
    for (let i = 0; i < eN; i++) eD.push({ x: -6 + R() * 56, z: -6 + R() * 8, ph: R(), sp: 0.04 + R() * 0.08 });
    const eGeo = new T3.BufferGeometry(); eGeo.setAttribute('position', new T3.BufferAttribute(ePos, 3));
    const embers = new T3.Points(eGeo, new T3.PointsMaterial({ map: glowTex, color: 0xff8a3a, size: 0.09, transparent: true, opacity: 0.9, blending: T3.AdditiveBlending, depthWrite: false }));
    grp.add(embers);

    return {
      update(time) {
        all.forEach((a) => {
          tmpE.set(a.rx + time * a.sp, a.ry + time * a.sp * 0.7, 0); tmpQ.setFromEuler(tmpE);
          tmpV.set(a.x, a.y + Math.sin(time * 0.6 + a.bob) * 0.18, a.z);
          a.sc ? tmpS.set(a.s * a.sc[0], a.s * a.sc[1], a.s * a.sc[2]) : tmpS.set(a.s, a.s, a.s);
          tmpM.compose(tmpV, tmpQ, tmpS); a.im.setMatrixAt(a.i, tmpM);
        });
        grp.children.forEach((c) => { if (c.isInstancedMesh) c.instanceMatrix.needsUpdate = true; });
        dust.position.y = Math.sin(time * 0.2) * 0.15; dust.rotation.y = Math.sin(time * 0.05) * 0.01;
        eD.forEach((e, i) => { const ph = (time * e.sp + e.ph) % 1; ePos[i * 3] = e.x + Math.sin(time + i) * 0.3; ePos[i * 3 + 1] = -1.4 + ph * 8; ePos[i * 3 + 2] = e.z; });
        eGeo.attributes.position.needsUpdate = true;
      }
    };
  })();

  /* ======================================================
     LIGHT SHAFTS — soft volumetric beams over each station
     ====================================================== */
  const shafts = (function () {
    const mat = new T3.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uColor: { value: col(0xffd6a0) }, uStrength: { value: 0.11 } },
      vertexShader: `varying vec3 vN; varying vec3 vV; varying float vH;
        void main(){ vH = uv.y; vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vV = normalize(-mv.xyz); vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float uTime; uniform vec3 uColor; uniform float uStrength; varying vec3 vN; varying vec3 vV; varying float vH;
        void main(){ float f = pow(abs(dot(vN, vV)), 1.6);
          float a = f * pow(vH, 1.3) * uStrength * (0.86 + 0.14 * sin(uTime * 0.7 + vH * 6.0));
          gl_FragColor = vec4(uColor, a); }`,
      transparent: true, depthWrite: false, blending: T3.AdditiveBlending, side: T3.DoubleSide
    });
    const geo = new T3.CylinderGeometry(0.45, 2.6, 8, 40, 1, true);
    [[ST[0] - 0.6, 0.15], [ST[1] + 0.4, -0.12], [ST[2] + 1.4, 0.18], [ST[3], -0.1]].forEach(([x, tilt]) => {
      const m = new T3.Mesh(geo, mat);
      m.position.set(x, 2.6, -0.6); m.rotation.set(0.12, 0, tilt); m.renderOrder = 5; scene.add(m);
    });
    return { update(time) { mat.uniforms.uTime.value = time; } };
  })();

  /* ======================================================
     CAMERA PATH — keyframes on story time T
     ====================================================== */
  const K = [
    [0.0, [3.6, 2.4, 7.2], [0, -0.3, 0]],
    [1.0, [2.2, 3.6, 4.8], [0, -0.4, 0]],
    [2.0, [-2.4, 3.2, 4.2], [0, -0.45, 0]],
    [3.0, [0.8, 4.2, 3.4], [0, -0.5, 0]],
    [3.75, [1.2, 3.4, 5.6], [0, -0.3, 0]],
    [4.15, [ST[1] + 3.4, 2.6, 6.6], [ST[1], 0.0, 0]],
    [4.5, [ST[1] + 1.2, 1.6, 4.6], [ST[1], -0.1, -0.4]],
    [4.85, [ST[1] + 2.6, 1.6, 5.4], [ST[1] + 1.2, -0.2, 0.4]],
    [5.15, [ST[2] + 3.6, 3.4, 6.8], [ST[2] + 1.2, -0.4, 0]],
    [5.55, [ST[2] + 0.8, 3.0, 4.6], [ST[2] + 0.4, -0.5, 0]],
    [5.85, [ST[2] + 4.6, 2.4, 4.8], [ST[2] + 3.1, -0.1, 0.4]],
    [6.15, [ST[3] + 0.4, 5.6, 6.4], [ST[3], -1.2, 0]],
    [7.0, [ST[3] + 1.6, 4.2, 4.4], [ST[3], -1.2, 0]],
    [7.8, [ST[3] - 1.5, 6.8, 8.0], [ST[3], -1.0, 0]]
  ].map(([t, p, q]) => ({ t, p: new T3.Vector3(...p), q: new T3.Vector3(...q) }));
  const camPos = new T3.Vector3(), camTgt = new T3.Vector3();
  const pA = new T3.Vector3(), pD = new T3.Vector3();
  let camSwoop = 0, camDir = 0; // 0..1 during a fly-over between stations, and its direction
  function catmull(out, a, b, c, d, t) {
    const t2 = t * t, t3 = t2 * t;
    const f = (p0, p1, p2, p3) => 0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (3 * p1 - p0 - 3 * p2 + p3) * t3);
    out.set(f(a.x, b.x, c.x, d.x), f(a.y, b.y, c.y, d.y), f(a.z, b.z, c.z, d.z));
  }
  const far = (a, b) => Math.abs(a.p.x - b.p.x) > 5;
  function cameraAt(T) {
    let i = 0;
    while (i < K.length - 2 && T > K[i + 1].t) i++;
    const a = K[i], b = K[i + 1], lin = seg(T, a.t, b.t);
    camSwoop = 0;
    if (far(a, b)) {
      // fly-over between stations: eased crane move with a swoop
      const k = ease(lin);
      camPos.lerpVectors(a.p, b.p, k); camTgt.lerpVectors(a.q, b.q, k);
      camSwoop = Math.sin(k * PI); camDir = Math.sign(b.p.x - a.p.x);
      camPos.y += camSwoop * 2.2;
    } else {
      // within a station: a smooth curved dolly through the keyframes (no corners)
      const k = lerp(lin, ease(lin), 0.6);
      const prev = i > 0 && !far(K[i - 1], a) ? K[i - 1] : null;
      const next = i + 2 < K.length && !far(b, K[i + 2]) ? K[i + 2] : null;
      catmull(camPos, prev ? prev.p : pA.copy(a.p).multiplyScalar(2).sub(b.p), a.p, b.p, next ? next.p : pD.copy(b.p).multiplyScalar(2).sub(a.p), k);
      catmull(camTgt, prev ? prev.q : pA.copy(a.q).multiplyScalar(2).sub(b.q), a.q, b.q, next ? next.q : pD.copy(b.q).multiplyScalar(2).sub(a.q), k);
    }
    if (mobile) { tmpV.subVectors(camPos, camTgt).multiplyScalar(1.45); camPos.copy(camTgt).add(tmpV); }
  }

  /* ======================================================
     CINEMA — HDR buffer → bloom → lens & film finish
     Turn off with SITE.cooking.cinematic = false.
     ====================================================== */
  const cine = (function () {
    if (conf.cinematic === false) return null;
    try {
      const hdr = { type: T3.HalfFloatType, depthBuffer: false };
      const sceneRT = new T3.WebGLRenderTarget(1, 1, { type: T3.HalfFloatType, samples: mobile ? 2 : 4 });
      const LV = 5, down = [], up = [];
      for (let i = 0; i < LV; i++) down.push(new T3.WebGLRenderTarget(1, 1, hdr));
      for (let i = 0; i < LV - 1; i++) up.push(new T3.WebGLRenderTarget(1, 1, hdr));
      const qCam = new T3.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const quad = new T3.Mesh(new T3.PlaneGeometry(2, 2)); quad.frustumCulled = false;
      const qScene = new T3.Scene(); qScene.add(quad);
      const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
      const mk = (uniforms, fs) => new T3.ShaderMaterial({ uniforms, vertexShader: VS, fragmentShader: fs, depthTest: false, depthWrite: false, toneMapped: false });
      const box4 = `vec3 box4(sampler2D t, vec2 uv, vec2 d){ return 0.25 * (texture2D(t, uv - d).rgb + texture2D(t, uv + vec2(d.x, -d.y)).rgb
        + texture2D(t, uv + vec2(-d.x, d.y)).rgb + texture2D(t, uv + d).rgb); }`;

      // 1. keep only the bright parts (flames, embers, brass glints)
      const pre = mk({ tMap: { value: null }, uTexel: { value: new T3.Vector2() }, uThreshold: { value: 0.95 }, uKnee: { value: 0.6 } }, `
        uniform sampler2D tMap; uniform vec2 uTexel; uniform float uThreshold; uniform float uKnee; varying vec2 vUv; ${box4}
        void main(){ vec3 c = box4(tMap, vUv, uTexel); float br = max(c.r, max(c.g, c.b));
          float s = clamp(br - uThreshold + uKnee, 0.0, 2.0 * uKnee); s = s * s / (4.0 * uKnee + 1e-4);
          c *= max(s, br - uThreshold) / max(br, 1e-4); gl_FragColor = vec4(min(c, vec3(40.0)), 1.0); }`);
      // 2. blur down a mip chain …
      const dn = mk({ tMap: { value: null }, uTexel: { value: new T3.Vector2() } }, `
        uniform sampler2D tMap; uniform vec2 uTexel; varying vec2 vUv; ${box4}
        void main(){ gl_FragColor = vec4(box4(tMap, vUv, uTexel), 1.0); }`);
      // 3. … and back up with a tent filter, accumulating every level
      const upM = mk({ tLow: { value: null }, tHigh: { value: null }, uTexel: { value: new T3.Vector2() } }, `
        uniform sampler2D tLow; uniform sampler2D tHigh; uniform vec2 uTexel; varying vec2 vUv;
        void main(){ vec2 d = uTexel;
          vec3 s = texture2D(tLow, vUv).rgb * 4.0;
          s += (texture2D(tLow, vUv + vec2(d.x, 0.0)).rgb + texture2D(tLow, vUv - vec2(d.x, 0.0)).rgb
              + texture2D(tLow, vUv + vec2(0.0, d.y)).rgb + texture2D(tLow, vUv - vec2(0.0, d.y)).rgb) * 2.0;
          s += texture2D(tLow, vUv + d).rgb + texture2D(tLow, vUv - d).rgb
             + texture2D(tLow, vUv + vec2(d.x, -d.y)).rgb + texture2D(tLow, vUv + vec2(-d.x, d.y)).rgb;
          gl_FragColor = vec4(texture2D(tHigh, vUv).rgb + s / 16.0, 1.0); }`);
      // 4. final grade: lens fringing, depth-of-field, bloom + anamorphic streak,
      //    ACES (same curve three.js uses), warm/teal split-tone, vignette, grain, letterbox, fade
      const comp = mk({
        tScene: { value: sceneRT.texture }, tBloom: { value: null }, uRes: { value: new T3.Vector2(1, 1) },
        uTime: { value: 0 }, uBloom: { value: typeof conf.bloom === 'number' ? conf.bloom : 0.14 }, uExposure: { value: 1.15 },
        uVignette: { value: 0.6 }, uGrain: { value: 0.04 }, uCA: { value: 0.008 }, uBars: { value: 0 },
        uDof: { value: 0 }, uFocusY: { value: 0.5 }, uFade: { value: 1 }, uWarm: { value: 1 }
      }, `
        uniform sampler2D tScene; uniform sampler2D tBloom; uniform vec2 uRes;
        uniform float uTime, uBloom, uExposure, uVignette, uGrain, uCA, uBars, uDof, uFocusY, uFade, uWarm;
        varying vec2 vUv;
        vec3 cineFit(vec3 v){ vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
        vec3 cineACES(vec3 c){
          const mat3 IN = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
          const mat3 OUT = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
          c *= uExposure / 0.6; return clamp(OUT * cineFit(IN * c), 0.0, 1.0);
        }
        vec3 cineSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(0.41666)) - 0.055, step(vec3(0.0031308), c)); }
        float cineHash(vec2 p){ p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
        void main(){
          vec2 uv = vUv, dc = uv - 0.5;
          vec2 ca = dc * dot(dc, dc) * uCA;
          vec3 col = vec3(texture2D(tScene, uv + ca).r, texture2D(tScene, uv).g, texture2D(tScene, uv - ca).b);
          float blur = uDof * smoothstep(0.1, 0.5, abs(uv.y - uFocusY));
          if (blur > 0.002) {
            vec3 acc = col;
            for (int i = 0; i < 12; i++) {
              float fi = float(i), an = fi * 2.39996, rr = sqrt((fi + 0.5) / 12.0);
              acc += texture2D(tScene, uv + vec2(cos(an), sin(an)) * rr * blur / uRes).rgb;
            }
            col = acc / 13.0;
          }
          vec3 bl = texture2D(tBloom, uv).rgb, st = vec3(0.0);
          for (int i = 1; i <= 4; i++) {
            float fi = float(i); vec2 o = vec2(fi * 0.02, 0.0);
            st += (texture2D(tBloom, uv + o).rgb + texture2D(tBloom, uv - o).rgb) * (1.0 - fi * 0.2);
          }
          col += uBloom * (bl + st * 0.12 * vec3(1.0, 0.72, 0.45));
          col = cineACES(col);
          float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
          col *= mix(vec3(1.0), vec3(1.05, 0.99, 0.9), smoothstep(0.45, 1.0, l) * uWarm);
          col *= mix(vec3(1.0), vec3(0.93, 0.99, 1.04), (1.0 - smoothstep(0.0, 0.3, l)) * uWarm * 0.7);
          col = cineSRGB(clamp(col, 0.0, 1.0));
          float vd = length(dc * vec2(uRes.x / uRes.y, 1.0) * 0.85);
          col *= mix(1.0, 1.0 - smoothstep(0.35, 1.05, vd), uVignette);
          col += (cineHash(uv * uRes + fract(uTime * 7.13) * 917.0) - 0.5) * uGrain;
          float bar = clamp(step(uv.y, uBars) + step(1.0 - uBars, uv.y), 0.0, 1.0);
          col = mix(col, vec3(0.0), bar);
          gl_FragColor = vec4(col * (1.0 - uFade), 1.0);
        }`);

      let w = 1, h = 1;
      const pass = (mat, rt) => { quad.material = mat; renderer.setRenderTarget(rt); renderer.render(qScene, qCam); };
      return {
        u: comp.uniforms,
        setSize(bw0, bh0) {
          w = Math.max(1, bw0); h = Math.max(1, bh0);
          sceneRT.setSize(w, h);
          let bw = Math.max(1, w >> 1), bh = Math.max(1, h >> 1);
          for (let i = 0; i < LV; i++) {
            down[i].setSize(bw, bh); if (i < LV - 1) up[i].setSize(bw, bh);
            bw = Math.max(1, bw >> 1); bh = Math.max(1, bh >> 1);
          }
          comp.uniforms.uRes.value.set(w, h);
        },
        render() {
          renderer.setRenderTarget(sceneRT); renderer.render(scene, camera);
          pre.uniforms.tMap.value = sceneRT.texture; pre.uniforms.uTexel.value.set(1 / w, 1 / h); pass(pre, down[0]);
          for (let i = 1; i < LV; i++) {
            const src = down[i - 1];
            dn.uniforms.tMap.value = src.texture; dn.uniforms.uTexel.value.set(1 / src.width, 1 / src.height); pass(dn, down[i]);
          }
          for (let i = LV - 2; i >= 0; i--) {
            const low = i === LV - 2 ? down[LV - 1] : up[i + 1];
            upM.uniforms.tLow.value = low.texture; upM.uniforms.tHigh.value = down[i].texture;
            upM.uniforms.uTexel.value.set(1 / low.width, 1 / low.height); pass(upM, up[i]);
          }
          comp.uniforms.tBloom.value = up[0].texture; pass(comp, null);
        }
      };
    } catch (e) {
      // pipeline unavailable: put the hand-written shaders back to display-colour output
      scene.traverse((o) => { const m = o.material; if (m && m.defines && 'CINE' in m.defines) { delete m.defines.CINE; m.needsUpdate = true; } });
      return null;
    }
  })();

  /* ---------- Opening shot: crane down out of the haze once the preloader lifts ---------- */
  const clock = () => performance.now() / 1000;
  const introDeep = !reduce && debugT == null && window.scrollY < window.innerHeight * 0.5;
  let introAt = null;
  const startIntro = () => { if (introAt == null) introAt = clock(); };
  if (!document.body.classList.contains('is-loading')) startIntro();
  setTimeout(startIntro, 9000); // safety net if site:ready never fires
  const introK = () => (introAt == null ? 0 : clamp((clock() - introAt) / (introDeep ? 4.6 : 0.9)));

  /* ---------- Layout / resize ---------- */
  let W = 0, H = 0, baseFov = 40;
  const dbSize = new T3.Vector2();
  function resize() {
    W = window.innerWidth; H = window.innerHeight; mobile = W < 768;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.6));
    renderer.setSize(W, H, false);
    if (cine) { renderer.getDrawingBufferSize(dbSize); cine.setSize(dbSize.x, dbSize.y); }
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    camera.aspect = W / H;
    baseFov = camera.fov = mobile ? 50 : 40;
    // shift the subject to the right on desktop so the hero headline has room
    if (!mobile) camera.setViewOffset(W, H, -W * 0.13, 0, W, H); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    computeAnchors();
  }

  /* ---------- Scroll → story time ---------- */
  let anchors = [[0, 0], [1, 1]];
  function computeAnchors() {
    const sy = window.scrollY, half = H * 0.5;
    const el = (id) => document.getElementById(id);
    const top = (id) => { const e = el(id); return e ? e.getBoundingClientRect().top + sy : null; };
    const hgt = (id) => { const e = el(id); return e ? e.offsetHeight : 0; };
    const sig = top('signature'), sigH = hgt('signature');
    const end = document.documentElement.scrollHeight - H + half;
    const list = [[half, 0.32], [sig, 1], [sig + sigH * 0.38, 2], [sig + sigH * 0.72, 3],
      [top('menu'), 4], [top('sweets'), 5], [top('gallery'), 6], [top('contact'), 7], [end, 7.8]]
      .filter((a) => a[0] != null && isFinite(a[0]));
    for (let i = 1; i < list.length; i++) if (list[i][0] <= list[i - 1][0]) list[i][0] = list[i - 1][0] + 1;
    anchors = list;
  }
  function scrollToT(pos) {
    const a = anchors;
    if (pos <= a[0][0]) return a[0][1];
    for (let i = 1; i < a.length; i++) if (pos <= a[i][0]) return lerp(a[i - 1][1], a[i][1], (pos - a[i - 1][0]) / (a[i][0] - a[i - 1][0]));
    return a[a.length - 1][1];
  }

  /* ---------- Chapter HUD ---------- */
  const CHAPTERS = [['Fire', 'The flame comes alive'], ['Tadka', 'Ghee and whole spices'], ['Masala', 'Onion and tomato meet the heat'],
    ['Paneer', 'Paneer, cream and coriander'], ['Tandoor', 'Naan blisters in the clay oven'], ['Mithai', 'Khoya, ghee and laddoo'], ['Serve', 'Everything comes to the table']];
  const hud = document.getElementById('cookingHud');
  let hudIdx = -1, hNum, hName, hSub, hBar;
  if (hud) {
    hud.innerHTML = '<span class="cooking-hud__num"></span><span class="cooking-hud__text"><b></b><small></small></span><span class="cooking-hud__bar"><i></i></span>';
    hNum = hud.querySelector('.cooking-hud__num'); hName = hud.querySelector('b'); hSub = hud.querySelector('small'); hBar = hud.querySelector('i');
  }
  // film-style chapter caption, shown briefly at the bottom centre when a chapter changes
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  let cap = null, capNum, capName, capTimer;
  if (cine) {
    cap = document.createElement('div');
    cap.className = 'cine-caption'; cap.setAttribute('aria-hidden', 'true');
    cap.innerHTML = '<span class="cine-caption__num"></span><span class="cine-caption__name"></span>';
    document.body.appendChild(cap);
    capNum = cap.firstChild; capName = cap.lastChild;
  }
  function showCaption(idx) {
    capNum.textContent = 'Chapter ' + ROMAN[idx];
    capName.textContent = CHAPTERS[idx][0] + ' — ' + CHAPTERS[idx][1];
    cap.classList.remove('is-on'); void cap.offsetWidth; cap.classList.add('is-on');
    clearTimeout(capTimer); capTimer = setTimeout(() => cap.classList.remove('is-on'), 2800);
  }
  function updateHud(T) {
    if (!hud) return;
    const idx = clamp(Math.floor(T), 0, 6);
    if (idx !== hudIdx) {
      if (cap && hudIdx !== -1 && debugT == null && window.scrollY > H * 0.7) showCaption(idx);
      hudIdx = idx;
      hud.classList.remove('is-swap'); void hud.offsetWidth; hud.classList.add('is-swap');
      hNum.textContent = String(idx + 1).padStart(2, '0') + ' / 07'; hName.textContent = CHAPTERS[idx][0]; hSub.textContent = CHAPTERS[idx][1];
    }
    hBar.style.transform = `scaleX(${clamp(T / 7)})`;
    const y = window.scrollY;
    hud.classList.toggle('is-hidden', y < H * 0.7 || y > document.documentElement.scrollHeight - H * 1.6);
  }

  /* ---------- Pointer parallax ---------- */
  let mx = 0, my = 0, pmx = 0, pmy = 0;
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduce) {
    window.addEventListener('mousemove', (e) => { mx = e.clientX / W - 0.5; my = e.clientY / H - 0.5; }, { passive: true });
  }

  /* ---------- Loop ---------- */
  let tCur = null, time = 0, last = performance.now(), running = true;
  const lookTmp = new T3.Vector3();
  function frame(T) {
    flameMat.uniforms.uTime.value = time;
    kadai.update(T, time);
    tandoor.update(T, time);
    mithai.update(T, time);
    thali.update(T, time);
    ambient.update(time);
    shafts.update(time);
    cameraAt(T);
    pmx += (mx - pmx) * 0.05; pmy += (my - pmy) * 0.05;

    // opening crane shot (0 = start, 1 = settled on the story camera)
    const ik = introK(), crane = introDeep ? 1 - ease(ik) : 0;
    // handheld drift: two slow, out-of-phase sines per axis
    const live = reduce ? 0 : 1;
    const hx = live * (Math.sin(time * 0.53) + 0.5 * Math.sin(time * 1.31 + 2)) * 0.045;
    const hy = live * (Math.sin(time * 0.71 + 1) + 0.4 * Math.sin(time * 1.73)) * 0.035;
    camera.position.set(camPos.x + pmx * 0.9 + hx - crane * 2.5, camPos.y - pmy * 0.5 + hy + crane * 5.5, camPos.z + crane * 8);
    lookTmp.copy(camTgt); lookTmp.y += crane * 1.4;
    camera.lookAt(lookTmp);
    if (!reduce) camera.rotateZ(-camSwoop * camDir * 0.045 + hx * 0.12 + crane * 0.07); // dutch tilt into swoops
    const fov = baseFov + (reduce ? 0 : camSwoop * 6 - crane * 8);                       // lens widens on fly-overs
    if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }

    if (cine) {
      const u = cine.u, pr = renderer.getPixelRatio();
      const bars = mobile ? 0 : 0.045 + camSwoop * 0.035;
      u.uTime.value = time;
      u.uFade.value = 1 - easeOut(seg(ik, 0, introDeep ? 0.4 : 1));
      u.uBars.value = introDeep ? lerp(0.5, bars, ease(seg(ik, 0.04, 0.5))) : bars; // bars open like a curtain
      u.uDof.value = mobile ? 0 : (2.5 + camSwoop * 7 + crane * 12) * pr;           // rack focus + motion softness
      cine.render();
    } else {
      renderer.render(scene, camera);
    }
    updateHud(T);
  }
  function tick(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!reduce) time += dt;
    const target = debugT != null ? debugT : scrollToT(window.scrollY + H * 0.5);
    if (tCur == null) tCur = target;
    tCur += (target - tCur) * (reduce ? 1 : Math.min(1, dt * 4.5));
    frame(tCur);
    requestAnimationFrame(tick);
  }

  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); running = false; }, false);
  canvas.addEventListener('webglcontextrestored', () => { running = true; last = performance.now(); requestAnimationFrame(tick); }, false);
  window.addEventListener('resize', resize);
  window.addEventListener('load', computeAnchors);
  if ('ResizeObserver' in window) new ResizeObserver(computeAnchors).observe(document.body);
  document.addEventListener('site:ready', () => {
    startIntro();
    setTimeout(computeAnchors, 600);
    if (window.ScrollTrigger) window.ScrollTrigger.addEventListener('refresh', computeAnchors);
  });

  resize();
  const t0 = debugT != null ? debugT : scrollToT(window.scrollY + H * 0.5);
  tCur = t0;
  frame(t0); // first frame immediately
  requestAnimationFrame(tick);
})();
