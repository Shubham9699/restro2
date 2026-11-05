/* ==========================================================================
   interactions.js — hero video, navigation, mobile menu, particles,
   skills accordion, horizontal gallery, signature scroll scene, timeline,
   contact actions
   ========================================================================== */
(() => {
  'use strict';
  const P = window.Portfolio;
  const { $, $$, clamp, damp } = P;

  /* ======================================================================
     Hero video: responsive source, poster fallback, offscreen pausing
     ====================================================================== */
  function initMedia() {
    const video = $('[data-hero-video]');
    if (!video) return;

    if (P.env.isMobile) video.poster = 'assets/images/hero-poster-mobile.webp';

    // Save-Data: keep the poster only, never download the video.
    if (P.env.saveData) {
      video.dataset.skipped = 'true';
      video.removeAttribute('autoplay');
      $$('source', video).forEach((s) => s.remove());
      video.load();
      return;
    }

    // Some browsers ignore <source media>; make sure the right file is used.
    const wanted = P.env.isMobile ? 'hero-mobile.mp4' : 'hero-desktop.mp4';
    video.addEventListener('loadstart', () => {
      if (video.currentSrc && !video.currentSrc.endsWith(wanted)) {
        video.src = `assets/videos/${wanted}`;
      }
    }, { once: true });

    video.addEventListener('playing', () => video.classList.add('is-playing'));
    video.addEventListener('error', () => video.classList.remove('is-playing'), true);

    if (P.env.reducedMotion) {
      video.removeAttribute('autoplay');
      video.pause();
      return;
    }

    const tryPlay = () => { const p = video.play(); if (p && p.catch) p.catch(() => { /* autoplay blocked → poster stays */ }); };
    let visible = true;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        visible && !document.hidden ? tryPlay() : video.pause();
      }, { threshold: 0.01 }).observe(video.closest('.hero'));
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) video.pause();
      else if (visible) tryPlay();
    });
    tryPlay();
  }

  /* ======================================================================
     Particles — lightweight 2D canvas field with optional pointer repulsion
     ====================================================================== */
  class Particles {
    constructor(canvas, { count = 80, interactive = false, links = false, getTop = () => 0 } = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.count = count;
      this.interactive = interactive;
      this.links = links;
      this.getTop = getTop;
      this.items = [];
      this.visible = false;
      this.sprite = this.makeSprite();
      this.resize();
      P.onResize(() => this.resize());
      this.loop = (t, dt) => this.step(t, dt);

      new IntersectionObserver(([e]) => {
        this.visible = e.isIntersecting;
        if (P.env.reducedMotion) { if (this.visible) this.draw(0); return; }
        this.visible ? P.ticker.add(this.loop) : P.ticker.remove(this.loop);
      }).observe(canvas);
    }

    makeSprite() {
      const s = document.createElement('canvas');
      s.width = s.height = 64;
      const c = s.getContext('2d');
      const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.25, 'rgba(170,190,255,0.6)');
      g.addColorStop(1, 'rgba(120,100,255,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, 64, 64);
      return s;
    }

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      this.w = this.canvas.clientWidth;
      this.h = this.canvas.clientHeight;
      this.dpr = dpr;
      this.canvas.width = Math.round(this.w * dpr);
      this.canvas.height = Math.round(this.h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = P.env.isMobile ? Math.round(this.count * 0.45) : this.count;
      this.items = Array.from({ length: n }, () => this.spawn(true));
      if (P.env.reducedMotion) this.draw(0);
    }

    spawn(anywhere) {
      const z = 0.25 + Math.random() * 0.75;
      return {
        x: Math.random() * this.w,
        y: anywhere ? Math.random() * this.h : this.h + 10,
        z,
        vx: (Math.random() - 0.5) * 6,
        vy: -(6 + Math.random() * 22) * z,
        ox: 0, oy: 0,
        r: 1 + z * 3.2,
        tw: Math.random() * Math.PI * 2,
      };
    }

    step(t, dt) {
      const px = P.pointer.x;
      const py = P.pointer.y - this.getTop();
      const R = 150;
      this.items.forEach((p, i) => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (this.interactive && P.pointer.active) {
          const dx = p.x + p.ox - px;
          const dy = p.y + p.oy - py;
          const d2 = dx * dx + dy * dy;
          if (d2 < R * R) {
            const d = Math.sqrt(d2) || 1;
            const f = (1 - d / R) * 90 * p.z;
            p.ox += (dx / d) * f * dt * 6;
            p.oy += (dy / d) * f * dt * 6;
          }
        }
        p.ox = damp(p.ox, 0, 2.2, dt);
        p.oy = damp(p.oy, 0, 2.2, dt);
        if (p.y < -20 || p.x < -20 || p.x > this.w + 20) this.items[i] = this.spawn(false);
      });
      this.draw(t);
    }

    draw(t) {
      const { ctx } = this;
      ctx.clearRect(0, 0, this.w, this.h);
      const py = P.pointer.y - this.getTop();
      if (this.links && P.pointer.active) {
        ctx.lineWidth = 0.6;
        const pts = this.items;
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i];
          const ax = a.x + a.ox, ay = a.y + a.oy;
          const dpx = ax - P.pointer.x, dpy = ay - py;
          if (dpx * dpx + dpy * dpy > 260 * 260) continue;
          for (let j = i + 1; j < pts.length; j++) {
            const b = pts[j];
            const dx = ax - (b.x + b.ox), dy = ay - (b.y + b.oy);
            const d2 = dx * dx + dy * dy;
            if (d2 < 120 * 120) {
              ctx.strokeStyle = `rgba(150,170,255,${(1 - Math.sqrt(d2) / 120) * 0.35})`;
              ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(b.x + b.ox, b.y + b.oy); ctx.stroke();
            }
          }
        }
      }
      this.items.forEach((p) => {
        const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 1.6 + p.tw));
        const s = p.r * 4;
        ctx.globalAlpha = a * p.z;
        ctx.drawImage(this.sprite, p.x + p.ox - s / 2, p.y + p.oy - s / 2, s, s);
      });
      ctx.globalAlpha = 1;
    }
  }

  function initParticles() {
    const hero = $('[data-particles="hero"]');
    if (hero) new Particles(hero, { count: 90, interactive: true, getTop: () => -P.scroll.y });

    const sigCanvas = $('[data-particles="signature"]');
    const sig = $('[data-signature]');
    if (sigCanvas && sig) {
      let top = 0, h = 0;
      const measure = () => { top = sig.getBoundingClientRect().top + P.scroll.y; h = sig.offsetHeight; };
      measure();
      P.onResize(measure);
      // Viewport top of the sticky stage
      const getTop = () => {
        const y = P.scroll.y;
        return Math.min(Math.max(top - y, 0), top + h - P.viewport.h - y);
      };
      new Particles(sigCanvas, { count: 110, interactive: true, links: true, getTop });
    }
  }

  /* ======================================================================
     Hero mouse-reactive light
     ====================================================================== */
  function initHeroLight() {
    const hero = $('.hero');
    const light = $('[data-hero-light]');
    if (!hero || !light || !P.env.finePointer || P.env.reducedMotion) return;
    const cur = { x: P.viewport.w * 0.7, y: P.viewport.h * 0.4 };
    let visible = true;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(hero);
    P.ticker.add((t, dt) => {
      if (!visible) return;
      cur.x = damp(cur.x, P.pointer.x, 5, dt);
      cur.y = damp(cur.y, P.pointer.y + P.scroll.y, 5, dt);
      light.style.setProperty('--mx', `${cur.x.toFixed(1)}px`);
      light.style.setProperty('--my', `${cur.y.toFixed(1)}px`);
    });
  }

  /* ======================================================================
     Navigation: scrolled state, hide on scroll down, active section
     ====================================================================== */
  function initNav() {
    const nav = $('#nav');
    if (!nav) return;
    let scrolled = null, hidden = null;
    P.ticker.add(() => {
      const y = P.scroll.y;
      const s = y > 40;
      const menuOpen = document.documentElement.classList.contains('menu-open');
      const h = !menuOpen && y > P.viewport.h * 0.6 && P.scroll.direction > 0 && Math.abs(P.scroll.velocity) > 0.5;
      const show = P.scroll.direction < 0 || y < P.viewport.h * 0.6 || menuOpen;
      if (s !== scrolled) { nav.classList.toggle('is-scrolled', s); scrolled = s; }
      if (h && hidden !== true) { nav.classList.add('is-hidden'); hidden = true; }
      else if (show && hidden !== false) { nav.classList.remove('is-hidden'); hidden = false; }
    });
    // Re-show nav when keyboard focus enters it
    nav.addEventListener('focusin', () => { nav.classList.remove('is-hidden'); hidden = false; });

    const links = $$('[data-nav]');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        links.forEach((a) => {
          const on = a.dataset.nav === e.target.id;
          if (on) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('[data-section]').forEach((s) => io.observe(s));
  }

  /* Smooth anchor scrolling for every in-page link */
  function initAnchors() {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const wasOpen = Menu.isOpen;
      if (wasOpen) Menu.close({ restoreFocus: false });
      setTimeout(() => P.scrollTo(target), wasOpen ? 450 : 0);
      if (history.replaceState) history.replaceState(null, '', id);
    });
  }

  /* ======================================================================
     Mobile menu — accessible overlay with focus trap
     ====================================================================== */
  const Menu = {
    isOpen: false,
    init() {
      this.el = $('#menu');
      this.toggle = $('[data-menu-toggle]');
      if (!this.el || !this.toggle) return;
      this.toggle.addEventListener('click', () => (this.isOpen ? this.close() : this.open()));
      document.addEventListener('keydown', (e) => {
        if (!this.isOpen) return;
        if (e.key === 'Escape') { e.preventDefault(); this.close(); }
        if (e.key === 'Tab') this.trap(e);
      });
      P.onResize(() => { if (this.isOpen && P.viewport.w > 1024) this.close({ restoreFocus: false }); });
    },
    focusables() { return [this.toggle, ...$$('a[href], button', this.el)]; },
    trap(e) {
      const f = this.focusables();
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    },
    open() {
      this.isOpen = true;
      this.el.inert = false;
      this.el.classList.add('is-open');
      document.documentElement.classList.add('menu-open');
      this.toggle.setAttribute('aria-expanded', 'true');
      this.toggle.setAttribute('aria-label', 'Close menu');
      P.lockScroll(true);
      setTimeout(() => { const l = $('.menu__link', this.el); l && l.focus({ preventScroll: true }); }, 350);
    },
    close({ restoreFocus = true } = {}) {
      this.isOpen = false;
      this.el.classList.remove('is-open');
      this.el.inert = true;
      document.documentElement.classList.remove('menu-open');
      this.toggle.setAttribute('aria-expanded', 'false');
      this.toggle.setAttribute('aria-label', 'Open menu');
      P.lockScroll(false);
      if (restoreFocus) this.toggle.focus({ preventScroll: true });
    },
  };

  /* ======================================================================
     Skills accordion + pointer spotlight
     ====================================================================== */
  function initSkills() {
    $$('.skill').forEach((item) => {
      const btn = $('.skill__head', item);
      btn.addEventListener('click', () => {
        const open = !item.classList.contains('is-open');
        item.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', String(open));
      });
      if (P.env.finePointer) {
        item.addEventListener('pointermove', (e) => {
          const r = item.getBoundingClientRect();
          item.style.setProperty('--sx', `${e.clientX - r.left}px`);
          item.style.setProperty('--sy', `${e.clientY - r.top}px`);
        });
      }
    });
  }

  /* ======================================================================
     Horizontal gallery — pinned on desktop, native swipe on touch
     ====================================================================== */
  function initGallery() {
    const section = $('[data-gallery]');
    if (!section) return;
    const viewport = $('[data-gallery-viewport]', section);
    const track = $('[data-gallery-track]', section);
    const bar = $('[data-gallery-progress]', section);
    const hint = $('[data-gallery-hint]', section);
    let native = true;
    let maxX = 0;

    const setProgress = (p) => {
      bar.style.transform = `scaleX(${p.toFixed(4)})`;
      const txt = p > 0.98 ? 'That’s the lab' : (native ? 'Swipe to explore' : 'Keep scrolling');
      if (hint.textContent !== txt) hint.textContent = txt;
    };

    const setup = () => {
      native = !P.env.finePointer || P.env.reducedMotion || P.viewport.w <= 900;
      section.classList.toggle('is-native', native);
      track.style.transform = '';
      if (native) {
        section.style.height = '';
        viewport.removeAttribute('data-cursor');
      } else {
        viewport.setAttribute('data-cursor', 'view');
        maxX = Math.max(0, track.scrollWidth - viewport.clientWidth);
        section.style.height = `${Math.round(maxX + P.viewport.h)}px`;
      }
    };
    setup();
    P.onResize(setup);

    viewport.addEventListener('scroll', () => {
      if (!native) return;
      const max = viewport.scrollWidth - viewport.clientWidth;
      setProgress(max > 0 ? viewport.scrollLeft / max : 0);
    }, { passive: true });

    let x = 0;
    let targetX = 0;
    P.anim.scrollScene(section, (p) => {
      if (native) return;
      targetX = -p * maxX;
      setProgress(p);
    });
    P.ticker.add((t, dt) => {
      if (native || Math.abs(targetX - x) < 0.1) return;
      x = damp(x, targetX, 14, dt);
      track.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0)`;
    });
    setProgress(0);
  }

  /* ======================================================================
     Signature section — scroll drives the 3D morph and typography
     ====================================================================== */
  function initSignature() {
    const section = $('[data-signature]');
    if (!section) return;
    const readout = $('[data-sig-readout]', section);
    const state = $('[data-sig-state]', section);
    P.anim.scrollScene(section, (p) => {
      section.style.setProperty('--p', p.toFixed(4));
      P.three && P.three.setProgress && P.three.setProgress('signature', p);
      readout.textContent = String(Math.round(p * 100)).padStart(3, '0');
      const s = p < 0.25 ? 'State: Merge' : p < 0.62 ? 'State: Split' : 'State: Ring';
      if (state.textContent !== s) state.textContent = s;
    });
  }

  /* ======================================================================
     Experience timeline — animated line, active nodes, expandable details
     ====================================================================== */
  function initTimeline() {
    const tl = $('[data-timeline]');
    if (!tl) return;
    const fill = $('[data-timeline-fill]', tl);
    const items = $$('[data-tl-item]', tl).map((el) => ({ el, top: 0, active: false }));

    P.anim.scrollScene(tl, (p) => { fill.style.transform = `scaleY(${p.toFixed(4)})`; }, { mode: 'through' });

    const measure = () => items.forEach((it) => { it.top = $('.tl-item__node', it.el).getBoundingClientRect().top + P.scroll.y; });
    measure();
    P.onResize(measure);
    P.ticker.add(() => {
      const line = P.scroll.y + P.viewport.h * 0.6;
      items.forEach((it) => {
        const on = it.top < line;
        if (on !== it.active) { it.active = on; it.el.classList.toggle('is-active', on); }
      });
    });

    $$('.tl-item__toggle', tl).forEach((btn) => {
      const panel = document.getElementById(btn.getAttribute('aria-controls'));
      btn.addEventListener('click', () => {
        const open = btn.getAttribute('aria-expanded') !== 'true';
        btn.setAttribute('aria-expanded', String(open));
        panel.classList.toggle('is-open', open);
        $('span', btn).textContent = open ? 'Less' : 'Details';
      });
    });
  }

  /* ======================================================================
     Contact — copy email + toast, back to top
     ====================================================================== */
  let toastTimer;
  function toast(message) {
    const el = $('[data-toast]');
    if (!el) return;
    el.textContent = message;
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2600);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise((resolve, reject) => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy') ? resolve() : reject(); } catch (err) { reject(err); }
      ta.remove();
    });
  }

  function initContact() {
    $$('[data-copy-email]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const email = P.config.email;
        copyText(email)
          .then(() => toast(`Copied ${email} to clipboard`))
          .catch(() => toast(`Email: ${email}`));
      });
    });
    $$('[data-back-to-top]').forEach((btn) => btn.addEventListener('click', () => P.scrollTo('#home')));
  }

  /* ======================================================================
     Footer wordmark — fit to container width
     ====================================================================== */
  function initFitText() {
    $$('[data-fit-text]').forEach((el) => {
      const inner = el.firstElementChild || el;
      const fit = () => {
        el.style.fontSize = '100px';
        const w = inner.offsetWidth;
        const avail = el.clientWidth;
        if (w > 0) el.style.fontSize = `${Math.floor(100 * (avail / w) * 0.98)}px`;
      };
      fit();
      P.onResize(fit);
      document.fonts && document.fonts.ready.then(fit);
    });
  }

  P.media = { init: initMedia };
  P.interactions = {
    Particles,
    toast,
    init() {
      initNav();
      Menu.init();
      initAnchors();
      initHeroLight();
      initParticles();
      initSkills();
      initGallery();
      initSignature();
      initTimeline();
      initContact();
      initFitText();
    },
  };
})();
