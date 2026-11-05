/* ==========================================================================
   animations.js — reusable animation utilities
   splitText · reveal observer · counters · parallax · scroll-lit words ·
   magnetic elements · scroll progress · scroll scenes · marquee · hero intro
   ========================================================================== */
(() => {
  'use strict';
  const P = window.Portfolio;
  const { $, $$, clamp, damp } = P;

  /* ------------------------------------------------------------------------
     splitText(el, 'chars' | 'words')
     Wraps text into spans while preserving nested elements (em, span…).
     Screen readers get the original text via aria-label; the visual copy is
     aria-hidden. Sets --ci (global char index) and --cl (index inside word).
  ------------------------------------------------------------------------ */
  function splitText(el, mode = 'chars') {
    if (!el || el.dataset.splitDone) return el;
    const label = el.textContent.replace(/\s+/g, ' ').trim();
    let ci = 0;
    let wi = 0;

    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const word = document.createElement('span');
            word.className = mode === 'words' ? 'split-word sw' : 'split-word';
            word.style.setProperty('--wi', wi++);
            if (mode === 'chars') {
              Array.from(part).forEach((ch, li) => {
                const c = document.createElement('span');
                c.className = 'split-char';
                c.textContent = ch;
                c.style.setProperty('--ci', ci++);
                c.style.setProperty('--cl', li);
                word.appendChild(c);
              });
            } else {
              word.textContent = part;
            }
            frag.appendChild(word);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE && !child.matches('br, svg')) {
          walk(child);
        }
      });
    };
    walk(el);

    // Keep accessible name intact
    if (/^H[1-6]$/.test(el.tagName) || el.hasAttribute('role')) {
      el.setAttribute('aria-label', label);
      Array.from(el.children).forEach((c) => c.setAttribute('aria-hidden', 'true'));
    } else {
      const sr = document.createElement('span');
      sr.className = 'sr-only';
      sr.textContent = label;
      const visual = document.createElement('span');
      visual.setAttribute('aria-hidden', 'true');
      while (el.firstChild) visual.appendChild(el.firstChild);
      el.append(sr, visual);
    }
    el.dataset.splitDone = 'true';
    return el;
  }

  /* ------------------------------------------------------------------------
     Reveal observer — adds .is-in when [data-reveal] enters the viewport.
     Stagger: children of [data-stagger] get --i. Lines get --li.
  ------------------------------------------------------------------------ */
  const revealCallbacks = new WeakMap();
  let revealObserver;

  function onReveal(el, cb) { revealCallbacks.set(el, cb); }

  function initReveals() {
    $$('[data-stagger]').forEach((group) => {
      $$('[data-reveal]', group).forEach((child, i) => child.style.setProperty('--i', i));
    });
    $$('[data-reveal="lines"]').forEach((el) => {
      $$('.line__inner', el).forEach((l, i) => l.style.setProperty('--li', i));
    });
    $$('[data-delay]').forEach((el) => el.style.setProperty('--delay', `${el.dataset.delay}ms`));

    const targets = $$('[data-reveal]');
    if (!('IntersectionObserver' in window) || P.env.reducedMotion) {
      targets.forEach(reveal);
      return;
    }
    // A fully clipped element has a zero-area visual rect, so clip reveals are
    // observed through their parent (sentinel) instead of themselves.
    const sentinels = new Map(); // observed node → [elements to reveal]
    targets.forEach((el) => {
      const node = el.dataset.reveal === 'clip' ? el.parentElement : el;
      if (!sentinels.has(node)) sentinels.set(node, []);
      sentinels.get(node).push(el);
    });
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        (sentinels.get(entry.target) || []).forEach(reveal);
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    sentinels.forEach((els, node) => revealObserver.observe(node));
  }

  function reveal(el) {
    el.classList.add('is-in');
    const cb = revealCallbacks.get(el);
    if (cb) cb(el);
  }

  /* ------------------------------------------------------------------------
     Animated counters — [data-count] (optionally [data-count-from])
  ------------------------------------------------------------------------ */
  const easeOutExpo = (x) => (x === 1 ? 1 : 1 - Math.pow(2, -10 * x));
  function animateCounter(el, duration = 2000) {
    const to = parseFloat(el.dataset.count);
    const from = parseFloat(el.dataset.countFrom || 0);
    if (P.env.reducedMotion) { el.textContent = to; return; }
    const start = performance.now();
    const tick = () => {
      const p = clamp((performance.now() - start) / duration);
      el.textContent = Math.round(from + (to - from) * easeOutExpo(p));
      if (p < 1) requestAnimationFrame(tick);
    };
    el.textContent = from;
    tick();
  }
  function initCounters() {
    $$('[data-count]').forEach((el) => {
      const host = el.closest('[data-reveal]');
      el.textContent = el.dataset.countFrom || 0;
      if (host) onReveal(host, () => animateCounter(el));
      else animateCounter(el);
    });
  }

  /* ------------------------------------------------------------------------
     Layout cache — measures document offsets once (and on resize) so scroll
     effects never force layout inside the animation loop.
  ------------------------------------------------------------------------ */
  const docTop = (el) => el.getBoundingClientRect().top + P.scroll.y;

  /* Parallax — [data-parallax="0.15"] (negative = opposite direction) */
  const parallaxItems = [];
  function initParallax() {
    if (P.env.reducedMotion) return;
    $$('[data-parallax]').forEach((el) => parallaxItems.push({ el, speed: parseFloat(el.dataset.parallax) || 0.1, top: 0, h: 0, cur: 0 }));
    const measure = () => parallaxItems.forEach((it) => {
      it.el.style.transform = '';
      const host = it.el.parentElement;
      it.top = docTop(host);
      it.h = host.offsetHeight;
    });
    measure();
    P.onResize(measure);
    P.ticker.add((t, dt) => {
      const vh = P.viewport.h;
      const y = P.scroll.y;
      parallaxItems.forEach((it) => {
        const rel = it.top - y;
        if (rel > vh * 1.2 || rel + it.h < -vh * 0.2) return; // offscreen: skip
        const offset = (rel + it.h / 2 - vh / 2) * it.speed;
        it.cur = damp(it.cur, offset, 10, dt);
        it.el.style.transform = `translate3d(0, ${it.cur.toFixed(2)}px, 0)`;
      });
    });
  }

  /* Scroll-lit words — [data-scroll-words] */
  function initScrollWords() {
    $$('[data-scroll-words]').forEach((el) => {
      splitText(el, 'words');
      const words = $$('.sw', el);
      let top = 0;
      let h = 0;
      let lit = -1;
      const measure = () => { top = docTop(el); h = el.offsetHeight; };
      measure();
      P.onResize(measure);
      if (P.env.reducedMotion) { words.forEach((w) => w.classList.add('is-lit')); return; }
      P.ticker.add(() => {
        const vh = P.viewport.h;
        const p = clamp((vh * 0.85 - (top - P.scroll.y)) / (h + vh * 0.35));
        const count = Math.round(p * words.length);
        if (count === lit) return; // no DOM writes unless something changed
        words.forEach((w, i) => w.classList.toggle('is-lit', i < count));
        lit = count;
      });
    });
  }

  /* ------------------------------------------------------------------------
     Magnetic elements — [data-magnetic="0.3"]
  ------------------------------------------------------------------------ */
  function initMagnetic() {
    if (!P.env.finePointer || P.env.reducedMotion) return;
    $$('[data-magnetic]').forEach((el) => {
      const strength = parseFloat(el.dataset.magnetic) || 0.3;
      const state = { x: 0, y: 0, tx: 0, ty: 0, active: false };
      let rect = null;
      el.addEventListener('pointerenter', () => { rect = el.getBoundingClientRect(); state.active = true; });
      el.addEventListener('pointermove', (e) => {
        if (!rect) rect = el.getBoundingClientRect();
        state.tx = (e.clientX - (rect.left + rect.width / 2)) * strength;
        state.ty = (e.clientY - (rect.top + rect.height / 2)) * strength;
      });
      el.addEventListener('pointerleave', () => { state.tx = 0; state.ty = 0; rect = null; });
      P.ticker.add((t, dt) => {
        if (!state.active) return;
        state.x = damp(state.x, state.tx, 12, dt);
        state.y = damp(state.y, state.ty, 12, dt);
        if (Math.abs(state.x) < 0.05 && Math.abs(state.y) < 0.05 && state.tx === 0 && state.ty === 0) {
          state.x = state.y = 0;
          state.active = false;
          el.style.transform = '';
          return;
        }
        el.style.transform = `translate3d(${state.x.toFixed(2)}px, ${state.y.toFixed(2)}px, 0)`;
      });
    });
  }

  /* ------------------------------------------------------------------------
     Scroll progress bar
  ------------------------------------------------------------------------ */
  function initScrollProgress() {
    const bar = $('[data-scroll-progress]');
    if (!bar) return;
    let last = -1;
    P.ticker.add(() => {
      const p = Math.round(P.scroll.progress * 1000) / 1000;
      if (p === last) return;
      last = p;
      bar.style.transform = `scaleX(${p})`;
    });
  }

  /* ------------------------------------------------------------------------
     Scroll scene — progress (0→1) of a tall element scrolling past a sticky
     viewport. Used by the gallery, signature section and timeline.
  ------------------------------------------------------------------------ */
  function scrollScene(el, onProgress, { mode = 'pin' } = {}) {
    let top = 0;
    let h = 0;
    let last = -1;
    const measure = () => { top = docTop(el); h = el.offsetHeight; last = -1; };
    measure();
    P.onResize(measure);
    const update = () => {
      const vh = P.viewport.h;
      const y = P.scroll.y;
      if (y + vh < top - vh * 0.5 || y > top + h + vh * 0.5) return; // far offscreen
      const p = mode === 'pin'
        ? clamp((y - top) / Math.max(1, h - vh))
        : clamp((y + vh * 0.6 - top) / Math.max(1, h)); // 'through': follows reading line
      if (Math.abs(p - last) < 0.0005) return;
      last = p;
      onProgress(p);
    };
    P.ticker.add(update);
    return { measure, update };
  }

  /* ------------------------------------------------------------------------
     Marquee — Web Animations API, speeds up / reverses with scroll velocity
  ------------------------------------------------------------------------ */
  function initMarquee() {
    $$('[data-marquee]').forEach((wrap) => {
      const track = $('.marquee__track', wrap);
      if (!track || !track.animate) return;
      const anim = track.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-50%)' }], { duration: 38000, iterations: Infinity });
      if (P.env.reducedMotion) { anim.pause(); return; }
      let rate = 1;
      let visible = true;
      new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        visible ? anim.play() : anim.pause();
      }).observe(wrap);
      P.ticker.add((t, dt) => {
        if (!visible) return;
        const target = P.scroll.direction * (1 + Math.min(Math.abs(P.scroll.velocity) * 0.25, 6));
        rate = damp(rate, target, 4, dt);
        anim.playbackRate = rate;
      });
    });
  }

  /* ------------------------------------------------------------------------
     Pause CSS ambient loops for regions that are offscreen
  ------------------------------------------------------------------------ */
  function initOffscreenPausing() {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => e.target.classList.toggle('is-offscreen', !e.isIntersecting));
    }, { rootMargin: '10% 0px' });
    $$('.contact__bg, .signature__sticky, .hero').forEach((el) => io.observe(el));
  }

  /* ------------------------------------------------------------------------
     Hero intro + hero scroll parallax
  ------------------------------------------------------------------------ */
  function heroIntro() {
    const hero = $('.hero');
    if (!hero) return;
    hero.classList.add('is-in');
    const chars = $$('.hero__title .split-char', hero).length;
    setTimeout(() => hero.classList.add('intro-done'), P.env.reducedMotion ? 0 : 1400 + chars * 32);
  }

  function initHeroScroll() {
    const hero = $('.hero');
    const media = $('[data-hero-media]');
    const content = $('[data-hero-content]');
    if (!hero || P.env.reducedMotion) return;
    let last = -1;
    P.ticker.add(() => {
      const vh = P.viewport.h;
      const y = Math.min(P.scroll.y, vh * 1.2);
      if (y === last) return;
      last = y;
      if (y >= vh * 1.2) return;
      const p = y / vh;
      media.style.transform = `translate3d(0, ${(y * 0.35).toFixed(1)}px, 0) scale(${(1 + p * 0.08).toFixed(4)})`;
      content.style.transform = `translate3d(0, ${(y * 0.18).toFixed(1)}px, 0)`;
      content.style.opacity = (1 - p * 1.15).toFixed(3);
    });
  }

  /* ---------- Public API ---------- */
  P.anim = {
    splitText,
    reveal,
    onReveal,
    animateCounter,
    scrollScene,
    heroIntro,
    init() {
      $$('[data-split]').forEach((el) => splitText(el, el.dataset.split));
      initCounters(); // registers reveal callbacks first
      initReveals();
      initParallax();
      initScrollWords();
      initMagnetic();
      initScrollProgress();
      initMarquee();
      initHeroScroll();
      initOffscreenPausing();
    },
  };
})();
