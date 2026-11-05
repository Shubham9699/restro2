/* ==========================================================================
   main.js — site config, shared core (ticker, pointer, scroll), preloader, boot
   ========================================================================== */

/* ---------------------------------------------------------------------------
   EDIT ME — personal details used across the site.
   Everything marked data-site / data-site-email / data-site-social in the
   HTML is filled from here. Leave a social URL empty ('') to hide that link.
--------------------------------------------------------------------------- */
const SITE_CONFIG = {
  name: 'Your Name',
  initials: 'YN',
  role: 'Creative Developer',
  email: 'hello@yourname.com',
  social: {
    linkedin: 'https://www.linkedin.com/in/your-handle',
    github: 'https://github.com/your-handle',
    instagram: 'https://www.instagram.com/your-handle',
  },
  available: true,
  availableText: 'Available for new projects',
  unavailableText: 'Currently booked — say hi anyway',
};

(() => {
  'use strict';

  const P = (window.Portfolio = window.Portfolio || {});
  P.config = SITE_CONFIG;

  /* ---------- Helpers ---------- */
  P.$ = (sel, ctx = document) => ctx.querySelector(sel);
  P.$$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  P.clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  P.lerp = (a, b, t) => a + (b - a) * t;
  // Frame-rate independent damping
  P.damp = (a, b, lambda, dt) => P.lerp(a, b, 1 - Math.exp(-lambda * dt));

  /* ---------- Environment ---------- */
  const mq = (q) => window.matchMedia(q);
  P.env = {
    reducedMotion: mq('(prefers-reduced-motion: reduce)').matches,
    finePointer: mq('(hover: hover) and (pointer: fine)').matches,
    isMobile: mq('(max-width: 768px)').matches,
    saveData: !!(navigator.connection && navigator.connection.saveData),
    lowPower: (navigator.hardwareConcurrency || 8) <= 4,
  };
  mq('(max-width: 768px)').addEventListener('change', (e) => { P.env.isMobile = e.matches; });
  mq('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => { P.env.reducedMotion = e.matches; });

  /* ---------- Ticker: one requestAnimationFrame loop for the whole site ---------- */
  const subscribers = new Set();
  P.ticker = {
    add(fn) { subscribers.add(fn); return () => subscribers.delete(fn); },
    remove(fn) { subscribers.delete(fn); },
  };
  let lastTime = performance.now();
  function frame(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    const t = now / 1000;
    subscribers.forEach((fn) => fn(t, dt));
    requestAnimationFrame(frame);
  }

  /* ---------- Viewport + scroll state ---------- */
  P.viewport = { w: window.innerWidth, h: window.innerHeight };
  P.scroll = { y: window.scrollY, velocity: 0, direction: 1, progress: 0, limit: 1 };
  const resizeCallbacks = new Set();
  P.onResize = (fn) => { resizeCallbacks.add(fn); return () => resizeCallbacks.delete(fn); };

  function measure() {
    P.viewport.w = window.innerWidth;
    P.viewport.h = window.innerHeight;
    P.scroll.limit = Math.max(1, document.documentElement.scrollHeight - P.viewport.h);
  }
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      measure();
      resizeCallbacks.forEach((fn) => fn());
      P.lenis && P.lenis.resize();
    }, 120);
  }, { passive: true });

  // Re-measure when the page height changes (accordions, fonts, images…)
  P.refresh = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { measure(); resizeCallbacks.forEach((fn) => fn()); }, 150);
  };
  if ('ResizeObserver' in window) {
    let lastH = 0;
    new ResizeObserver(() => {
      const hgt = document.documentElement.scrollHeight;
      if (Math.abs(hgt - lastH) > 2) { lastH = hgt; P.refresh(); }
    }).observe(document.body);
  }

  function updateScroll(y) {
    const prev = P.scroll.y;
    P.scroll.y = y;
    P.scroll.velocity = y - prev;
    if (y !== prev) P.scroll.direction = y > prev ? 1 : -1;
    P.scroll.progress = P.clamp(y / P.scroll.limit);
  }

  /* ---------- Pointer (shared by cursor, lights, WebGL) ---------- */
  P.pointer = { x: P.viewport.w / 2, y: P.viewport.h / 2, nx: 0, ny: 0, active: false };
  window.addEventListener('pointermove', (e) => {
    P.pointer.x = e.clientX;
    P.pointer.y = e.clientY;
    P.pointer.nx = (e.clientX / P.viewport.w) * 2 - 1;
    P.pointer.ny = -((e.clientY / P.viewport.h) * 2 - 1);
    P.pointer.active = true;
  }, { passive: true });

  /* ---------- Smooth scrolling (Lenis) with native fallback ---------- */
  function initSmoothScroll() {
    if (!P.env.reducedMotion && typeof window.Lenis === 'function') {
      P.lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 1, touchMultiplier: 1.4 });
      P.lenis.on('scroll', (l) => updateScroll(l.scroll));
      P.ticker.add((t) => P.lenis.raf(t * 1000));
    } else {
      window.addEventListener('scroll', () => updateScroll(window.scrollY), { passive: true });
    }
  }

  /**
   * Scroll to an element, selector or Y position. Moves keyboard focus to the
   * target section for accessibility.
   */
  P.scrollTo = (target, { focus = true } = {}) => {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    const top = typeof target === 'number' ? target : el;
    if (el === null && typeof target !== 'number') return;
    const done = () => {
      if (focus && el instanceof HTMLElement) {
        if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
        el.focus({ preventScroll: true });
      }
    };
    if (P.lenis) {
      P.lenis.scrollTo(top, { duration: 1.6, easing: (x) => 1 - Math.pow(1 - x, 4), onComplete: done });
    } else {
      const y = typeof top === 'number' ? top : top.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: y, behavior: P.env.reducedMotion ? 'auto' : 'smooth' });
      setTimeout(done, P.env.reducedMotion ? 0 : 700);
    }
  };

  P.lockScroll = (lock) => {
    if (P.lenis) lock ? P.lenis.stop() : P.lenis.start();
    document.documentElement.style.overflow = lock ? 'hidden' : '';
  };

  /* ---------- Apply SITE_CONFIG to the DOM ---------- */
  function applyConfig(c) {
    P.$$('[data-site]').forEach((el) => {
      const key = el.dataset.site;
      if (c[key] != null) el.textContent = c[key];
    });
    P.$$('[data-site-email]').forEach((a) => { a.href = `mailto:${c.email}`; });
    P.$$('[data-site-social]').forEach((a) => {
      const url = c.social[a.dataset.siteSocial];
      if (url) a.href = url;
      else (a.closest('li') || a).remove();
    });
    P.$$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

    const text = c.available ? c.availableText : c.unavailableText;
    P.$$('[data-availability-text]').forEach((el) => { el.textContent = text; });
    P.$$('[data-availability], [data-availability-dot]').forEach((el) => {
      el.classList.toggle('is-unavailable', !c.available);
      el.classList.toggle('is-busy', !c.available && el.hasAttribute('data-availability-dot'));
    });

    document.title = `${c.name} — ${c.role}`;
  }

  /* ---------- Preloader: tracks real asset readiness, no artificial delay ---------- */
  function runPreloader() {
    const el = document.getElementById('preloader');
    if (!el) return Promise.resolve();
    document.documentElement.classList.add('is-loading');

    const countEl = P.$('[data-preloader-count]', el);
    const barEl = P.$('[data-preloader-bar]', el);
    let total = 0;
    let done = 0;
    const track = (promise, weight = 1) => {
      total += weight;
      const settle = () => { done += weight; };
      Promise.resolve(promise).then(settle, settle);
    };

    // Fonts
    track(document.fonts ? document.fonts.ready : null, 1);
    // Window load (images, styles, scripts)
    track(new Promise((r) => (document.readyState === 'complete' ? r() : window.addEventListener('load', r, { once: true }))), 2);
    // Hero video: ready to play (or failed / skipped)
    const video = P.$('[data-hero-video]');
    track(new Promise((r) => {
      if (!video || video.dataset.skipped === 'true' || video.readyState >= 3) return r();
      video.addEventListener('canplay', r, { once: true });
      video.addEventListener('error', r, { once: true });
      video.addEventListener('stalled', r, { once: true });
    }), 2);

    // Safety net so a slow network never traps the visitor (not an artificial delay).
    const hardStop = performance.now() + 7000;

    return new Promise((resolve) => {
      let shown = 0;
      let finished = false;
      const step = (t, dt) => {
        const real = total ? done / total : 1;
        const target = performance.now() > hardStop ? 1 : real;
        shown = P.damp(shown, target, 9, dt);
        if (target === 1 && shown > 0.995) shown = 1;
        const pct = Math.round(shown * 100);
        countEl.textContent = pct;
        barEl.style.transform = `scaleX(${shown})`;
        el.setAttribute('aria-valuenow', pct);

        if (shown === 1 && !finished) {
          finished = true;
          P.ticker.remove(step);
          el.classList.add('is-done');
          el.setAttribute('aria-hidden', 'true');
          document.documentElement.classList.remove('is-loading');
          resolve();
          setTimeout(() => el.remove(), 1300);
        }
      };
      P.ticker.add(step);
    });
  }

  /* ---------- Boot ---------- */
  function boot() {
    measure();
    applyConfig(SITE_CONFIG);
    initSmoothScroll();
    if (P.lenis) P.lenis.stop();
    requestAnimationFrame(frame);

    // Module initialisation (each module guards itself)
    const init = (name) => {
      try { P[name] && P[name].init && P[name].init(); }
      catch (err) { console.error(`[portfolio] ${name} failed to init`, err); }
    };
    init('media');        // interactions.js — hero video source handling (before preloader tracks it)
    init('anim');         // animations.js
    init('cursor');       // cursor.js
    init('interactions'); // interactions.js
    init('three');        // three-scene.js

    runPreloader().then(() => {
      document.documentElement.classList.add('is-loaded');
      if (P.lenis) P.lenis.start();
      measure();
      resizeCallbacks.forEach((fn) => fn());
      P.anim && P.anim.heroIntro && P.anim.heroIntro();
    });
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
