/* ==========================================================================
   three-scene.js — liquid chrome 3D scenes
   A dependency-free WebGL ray-marcher (signed distance fields), so there is
   no Three.js download: metaball "liquid metal" with a procedural studio
   environment, iridescent fresnel, rim light and an atmospheric glow halo.

   - Mouse-responsive rotation, smooth damped camera
   - Scroll-driven morph in the signature section (merge → split → ring)
   - Renders only while visible; adaptive resolution keeps frame time low
   - Falls back to a static CSS chrome object when WebGL is unavailable
   ========================================================================== */
(() => {
  'use strict';
  const P = window.Portfolio || (window.Portfolio = {});

  const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

  const FRAG = (steps) => `
precision highp float;
uniform vec2  uRes;
uniform float uTime;
uniform vec2  uMouse;
uniform float uProgress;
uniform float uMode;     // 0 = hero, 1 = signature
uniform float uScroll;
uniform vec2  uCenter;

#define MAX_STEPS ${steps}
#define PI 3.14159265

mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

float sdTorus(vec3 p, vec2 t) { vec2 q = vec2(length(p.xz) - t.x, p.y); return length(q) - t.y; }

float map(vec3 p) {
  float t = uTime;
  p.yz *= rot(uMouse.y * 0.45 + uScroll * 0.7);
  p.xz *= rot(uMouse.x * 0.7 + t * 0.16 + uProgress * PI * 1.5);

  float sig   = step(0.5, uMode);
  float split = sig * sin(clamp(uProgress * 1.6, 0.0, 1.0) * PI);
  float ring  = sig * smoothstep(0.6, 0.92, uProgress);

  float wob  = sin(p.x * 2.6 + t * 1.3) * sin(p.y * 2.9 + t * 1.1) * sin(p.z * 2.4 + t * 0.9);
  float core = length(p) - mix(1.0, 0.7, split) + wob * 0.075;
  vec3 pt = p; pt.xy *= rot(0.45); pt.yz *= rot(0.3);
  float tor  = sdTorus(pt, vec2(1.2, 0.3)) + wob * 0.04;
  float d = mix(core, tor, ring);

  float k     = mix(0.55, 0.2, split);
  float orbit = mix(1.3, 2.4, split) * mix(1.0, 0.82, ring);
  float count = mix(3.0, 6.0, sig);
  float stepA = 2.0 * PI / count;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    if (fi >= count) break;
    float a = fi * stepA + t * (0.32 + fi * 0.05);
    vec3 c = vec3(cos(a) * orbit, sin(a * 1.7 + fi) * 0.38 * orbit, sin(a) * orbit);
    float r = (0.27 + 0.06 * sin(t * 1.3 + fi * 1.7)) * mix(1.0, 1.2, split) * mix(1.0, 0.7, ring);
    d = smin(d, length(p - c) - r, k);
  }
  return d;
}

vec3 calcNormal(vec3 p) {
  const vec2 e = vec2(1.0, -1.0) * 0.0015;
  return normalize(e.xyy * map(p + e.xyy) + e.yyx * map(p + e.yyx) +
                   e.yxy * map(p + e.yxy) + e.xxx * map(p + e.xxx));
}

// Procedural studio: softbox, strip lights, electric blue & violet panels
vec3 env(vec3 r) {
  float y = r.y;
  float a = atan(r.x, r.z);
  vec3 col = mix(vec3(0.02, 0.022, 0.04), vec3(0.16, 0.18, 0.26), smoothstep(-0.6, 0.1, y));
  col = mix(col, vec3(0.52, 0.57, 0.70), smoothstep(0.1, 0.95, y));
  col += vec3(0.50, 0.60, 0.95) * exp(-abs(y - 0.02) * 16.0) * 0.9;           // horizon band
  col += vec3(1.0) * smoothstep(0.55, 0.85, y) * 1.6;                          // top softbox
  col += vec3(1.0) * smoothstep(0.28, 0.08, abs(a - 1.1)) * smoothstep(-0.4, 0.2, y) * 2.2; // key strip
  col += vec3(0.95) * smoothstep(0.16, 0.04, abs(a + 0.5)) * smoothstep(-0.2, 0.4, y) * 1.4; // fill strip
  col += vec3(0.15, 0.38, 1.0) * smoothstep(0.8, 0.0, abs(a + 2.0)) * smoothstep(-0.6, 0.3, y) * 2.0; // electric blue
  col += vec3(0.60, 0.30, 1.0) * smoothstep(0.8, 0.0, abs(a - 2.6)) * smoothstep(-0.6, 0.3, y) * 1.8;  // violet
  col *= mix(0.35, 1.0, smoothstep(-0.7, -0.05, y));                           // dark floor
  return col;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y - uCenter;
  float camZ = mix(4.7, mix(5.6, 4.6, uProgress), step(0.5, uMode));
  vec3 ro = vec3(uMouse.x * 0.25, uMouse.y * 0.15, camZ);
  vec3 rd = normalize(vec3(uv, -1.7));

  float t = 0.0;
  float minD = 1e3;
  bool hit = false;
  for (int i = 0; i < MAX_STEPS; i++) {
    float d = map(ro + rd * t);
    minD = min(minD, d);
    if (d < 0.0012 * (1.0 + t)) { hit = true; break; }
    t += d * 0.9;
    if (t > 10.0) break;
  }

  if (hit) {
    vec3 p = ro + rd * t;
    vec3 n = calcNormal(p);
    vec3 r = reflect(rd, n);
    float ndv = clamp(dot(n, -rd), 0.0, 1.0);
    float fres = 0.78 + 0.22 * pow(1.0 - ndv, 5.0);
    vec3 col = env(r) * fres;
    vec3 irid = 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + ndv * 1.6 + uTime * 0.04));
    col *= mix(vec3(1.0), irid, 0.2);
    col += vec3(0.25, 0.40, 1.0) * pow(1.0 - ndv, 3.0) * 0.55;
    col = col / (1.0 + col * 0.55);
    gl_FragColor = vec4(pow(col, vec3(0.92)), 1.0);
  } else {
    float glow = exp(-max(minD, 0.0) * 3.2) * 0.32;
    vec3 g = mix(vec3(0.23, 0.42, 1.0), vec3(0.58, 0.36, 1.0), 0.5 + 0.5 * uv.y);
    gl_FragColor = vec4(g * glow, glow); // premultiplied alpha
  }
}
`;

  /* ------------------------------------------------------------------------
     ChromeScene — one canvas, one GL context. Usable standalone:
       const s = new ChromeScene(canvas, { mode: 'hero' }); s.render(time);
  ------------------------------------------------------------------------ */
  class ChromeScene {
    constructor(canvas, opts = {}) {
      this.canvas = canvas;
      this.opts = Object.assign({ mode: 'hero', steps: 72, scale: 0.55, center: [0, 0] }, opts);
      this.progress = 0;
      this.mouse = [0, 0];
      this.scroll = 0;
      this.scale = this.opts.scale;
      this.ok = this.setup();
    }

    setup() {
      const gl = this.canvas.getContext('webgl', {
        alpha: true, antialias: false, depth: false, stencil: false,
        premultipliedAlpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!this.opts.preserve,
      });
      if (!gl) return false;
      this.gl = gl;

      const compile = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
          console.warn('[chrome] shader error', gl.getShaderInfoLog(s));
          return null;
        }
        return s;
      };
      const vs = compile(gl.VERTEX_SHADER, VERT);
      const fs = compile(gl.FRAGMENT_SHADER, FRAG(this.opts.steps));
      if (!vs || !fs) return false;
      const prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
      gl.useProgram(prog);
      this.prog = prog;

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'aPos');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      this.u = {};
      ['uRes', 'uTime', 'uMouse', 'uProgress', 'uMode', 'uScroll', 'uCenter'].forEach((n) => { this.u[n] = gl.getUniformLocation(prog, n); });
      gl.uniform1f(this.u.uMode, this.opts.mode === 'signature' ? 1 : 0);
      gl.uniform2f(this.u.uCenter, this.opts.center[0], this.opts.center[1]);
      gl.clearColor(0, 0, 0, 0);
      return true;
    }

    resize() {
      if (!this.ok) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.round(this.canvas.clientWidth * dpr * this.scale));
      const h = Math.max(1, Math.round(this.canvas.clientHeight * dpr * this.scale));
      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w;
        this.canvas.height = h;
      }
      this.gl.viewport(0, 0, w, h);
      this.gl.uniform2f(this.u.uRes, w, h);
    }

    render(time) {
      if (!this.ok) return;
      const { gl, u } = this;
      gl.uniform1f(u.uTime, time);
      gl.uniform2f(u.uMouse, this.mouse[0], this.mouse[1]);
      gl.uniform1f(u.uProgress, this.progress);
      gl.uniform1f(u.uScroll, this.scroll);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
  }

  /* ------------------------------------------------------------------------
     Site wiring: lifecycle, visibility, mouse damping, adaptive quality
  ------------------------------------------------------------------------ */
  const scenes = {};

  function webglAvailable() {
    if (/[?&]nowebgl\b/.test(location.search)) return false;
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && c.getContext('webgl'));
    } catch (e) { return false; }
  }

  function mount(canvas) {
    const name = canvas.dataset.chrome;
    const mobile = P.env.isMobile;
    const scene = new ChromeScene(canvas, {
      mode: name,
      steps: mobile || P.env.lowPower ? 48 : 72,
      scale: mobile ? 0.42 : name === 'hero' ? 0.55 : 0.5,
    });
    if (!scene.ok) return null;
    scenes[name] = scene;

    const reduced = P.env.reducedMotion;
    const staticTime = 2.4;
    const mouse = { x: 0, y: 0 };
    let visible = false;
    let frames = 0;
    let slowFrames = 0;
    let dirty = true;

    const draw = (t, dt) => {
      // Smooth camera / rotation follow
      const tx = P.env.finePointer ? P.pointer.nx : 0;
      const ty = P.env.finePointer ? P.pointer.ny : 0;
      mouse.x = P.damp(mouse.x, tx, 2.5, dt);
      mouse.y = P.damp(mouse.y, ty, 2.5, dt);
      scene.mouse[0] = mouse.x;
      scene.mouse[1] = mouse.y;
      if (name === 'hero') scene.scroll = P.clamp(P.scroll.y / P.viewport.h, 0, 1.2);

      // Adaptive resolution: drop render scale if frames are consistently slow
      if (dt > 0.026) slowFrames++;
      if (++frames % 60 === 0) {
        if (slowFrames > 20 && scene.scale > 0.3) { scene.scale *= 0.85; scene.resize(); }
        slowFrames = 0;
      }
      scene.render(t);
      if (!canvas.classList.contains('is-ready')) canvas.classList.add('is-ready');
    };

    const drawStatic = () => {
      if (!dirty) return;
      dirty = false;
      scene.render(staticTime);
      canvas.classList.add('is-ready');
    };

    scene.resize();
    P.onResize(() => { scene.resize(); dirty = true; if (reduced) drawStatic(); });

    const loop = reduced ? drawStatic : draw;
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) { dirty = true; P.ticker.add(loop); } else P.ticker.remove(loop);
    }, { rootMargin: '100px 0px' }).observe(canvas);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) P.ticker.remove(loop);
      else if (visible) P.ticker.add(loop);
    });

    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); P.ticker.remove(loop); });
    canvas.addEventListener('webglcontextrestored', () => {
      scene.ok = scene.setup();
      if (scene.ok) { scene.resize(); if (visible) P.ticker.add(loop); }
    });

    scene.markDirty = () => { dirty = true; };
    return scene;
  }

  P.three = {
    ChromeScene,
    scenes,
    init() {
      const canvases = Array.from(document.querySelectorAll('[data-chrome]'));
      if (!canvases.length) return;
      if (!webglAvailable()) { document.documentElement.classList.add('no-webgl'); return; }
      let failed = false;
      canvases.forEach((c) => { if (!mount(c)) failed = true; });
      if (failed) document.documentElement.classList.add('no-webgl');
    },
    setProgress(name, p) {
      const s = scenes[name];
      if (!s) return;
      s.progress = p;
      s.markDirty && s.markDirty();
    },
  };
})();
