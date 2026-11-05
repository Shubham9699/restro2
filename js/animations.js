/* =========================================================
   SHREYA SWEETS & RESTAURANTS — animations.js
   GSAP + ScrollTrigger + Lenis choreography.
   Everything here is progressive enhancement: if the CDN
   libraries fail to load or the visitor prefers reduced
   motion, the site stays fully visible and usable.
   ========================================================= */

(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  /* ---------- Split text into words / chars (accessible) ---------- */
  function splitText(el) {
    if (el.dataset.splitDone) return $$('.char', el);
    if (!el.getAttribute('aria-label')) {
      el.setAttribute('aria-label', el.textContent.trim().replace(/\s+/g, ' '));
    }
    const walk = (node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = 'word';
            w.setAttribute('aria-hidden', 'true');
            Array.from(part).forEach((ch) => {
              const c = document.createElement('span');
              c.className = 'char';
              c.textContent = ch;
              w.appendChild(c);
            });
            frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) {
          walk(n);
        }
      });
    };
    walk(el);
    el.dataset.splitDone = '1';
    return $$('.char', el);
  }

  /* ---------- Counters ---------- */
  function animateCounter(el, gsap) {
    const target = parseFloat(el.dataset.count) || 0;
    const obj = { v: 0 };
    gsap.to(obj, {
      v: target, duration: 2, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      onUpdate: () => { el.textContent = Math.round(obj.v).toLocaleString('en-IN'); }
    });
  }

  function start() {
    const gsap = window.gsap;
    const ST = window.ScrollTrigger;

    if (!gsap || !ST || reduceMotion) {
      document.documentElement.classList.add('no-motion');
      // Lenis alone (no GSAP) — still give smooth scrolling if allowed.
      if (window.Lenis && !reduceMotion && !gsap) {
        const lenis = new window.Lenis({ duration: 1.15 });
        window.__lenis = lenis;
        const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
        requestAnimationFrame(raf);
      }
      return;
    }

    gsap.registerPlugin(ST);
    ST.config({ ignoreMobileResize: true });
    document.documentElement.classList.add('has-motion');

    /* ---------- Smooth scroll (Lenis) ---------- */
    if (window.Lenis) {
      const lenis = new window.Lenis({
        duration: 1.15,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true
      });
      window.__lenis = lenis;
      lenis.on('scroll', ST.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
      if (document.body.classList.contains('menu-open')) lenis.stop();
    }

    /* ---------- Hero entrance ---------- */
    const heroTitle = $('[data-split="hero"]');
    const heroChars = heroTitle ? splitText(heroTitle) : [];
    const intro = gsap.timeline({ defaults: { ease: 'expo.out' } });
    intro
      .fromTo('.hero__media', { scale: 1.22 }, { scale: 1, duration: 2.6, ease: 'power3.out' }, 0)
      .from('.hero__overlay', { opacity: 0.4, duration: 2 }, 0)
      .from('.site-header', { yPercent: -100, opacity: 0, duration: 1.2 }, 0.5)
      .from(heroChars, { yPercent: 115, rotate: 8, opacity: 0, duration: 1.4, stagger: 0.026 }, 0.25)
      .from('[data-hero-fade]', { y: 34, opacity: 0, duration: 1.2, stagger: 0.12 }, 0.95)
      .from('.hero__devanagari', { opacity: 0, scale: 0.9, duration: 2.4, ease: 'power2.out' }, 0.4)
      .from('.float-el', { opacity: 0, duration: 1.6, stagger: 0.1 }, 0.9)
      .from('.scroll-indicator', { opacity: 0, y: 20, duration: 1 }, 1.5);

    /* Hero scroll parallax */
    gsap.to('.hero__media', {
      yPercent: 18, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
    });
    gsap.to('.hero__content', {
      yPercent: -22, opacity: 0, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 15%', scrub: true }
    });
    gsap.to('.hero__devanagari', {
      xPercent: -12, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
    });

    /* ---------- Split heading reveals ---------- */
    $$('[data-split]:not([data-split="hero"])').forEach((el) => {
      const chars = splitText(el);
      gsap.from(chars, {
        yPercent: 110, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.016,
        scrollTrigger: { trigger: el, start: 'top 86%', once: true }
      });
    });

    /* ---------- Generic fade-up reveals (batched) ---------- */
    gsap.set('[data-reveal]', { y: 40, opacity: 0 });
    ST.batch('[data-reveal]', {
      start: 'top 90%',
      once: true,
      onEnter: (batch) => gsap.to(batch, {
        y: 0, opacity: 1, duration: 1.1, ease: 'power3.out', stagger: 0.09, clearProps: 'transform'
      })
    });

    /* ---------- Menu cards ---------- */
    gsap.set('.menu-card, .menu-group__aside', { y: 36, opacity: 0 });
    ST.batch('.menu-card, .menu-group__aside', {
      start: 'top 92%',
      once: true,
      onEnter: (batch) => gsap.to(batch, {
        y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', stagger: 0.05, clearProps: 'transform'
      })
    });

    /* ---------- Image clip-path reveals ---------- */
    $$('.clip-reveal').forEach((fig) => {
      const img = $('img', fig);
      const tl = gsap.timeline({ scrollTrigger: { trigger: fig, start: 'top 85%', once: true } });
      tl.fromTo(fig,
        { clipPath: 'inset(100% 0% 0% 0%)' },
        { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'expo.inOut' });
      if (img) tl.fromTo(img, { scale: 1.4 }, { scale: 1, duration: 2, ease: 'expo.out', clearProps: 'transform' }, 0.1);
    });

    /* ---------- Scroll parallax ---------- */
    $$('[data-parallax]').forEach((el) => {
      const speed = parseFloat(el.dataset.parallax) || 0;
      gsap.to(el, {
        y: () => speed * window.innerHeight, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true }
      });
    });

    /* Signature dish index numbers drift */
    $$('.dish__index').forEach((n) => {
      gsap.fromTo(n, { yPercent: 40 }, {
        yPercent: -40, ease: 'none',
        scrollTrigger: { trigger: n.closest('.dish'), start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    /* ---------- Counters ---------- */
    $$('[data-count]').forEach((el) => animateCounter(el, gsap));

    /* ---------- Sweets: warm glow breathing on scroll ---------- */
    gsap.fromTo('.sweets__glow', { scale: 0.6, opacity: 0.3 }, {
      scale: 1.25, opacity: 1, ease: 'none',
      scrollTrigger: { trigger: '.sweets', start: 'top bottom', end: 'bottom top', scrub: true }
    });

    /* ---------- Gallery: pinned horizontal scroll on larger screens ---------- */
    const mm = gsap.matchMedia();
    mm.add('(min-width: 901px)', () => {
      const track = $('#galleryTrack');
      const section = $('.gallery');
      if (!track || !section) return;
      const distance = () => Math.max(0, track.scrollWidth - window.innerWidth + 64);
      const tween = gsap.to(track, {
        x: () => -distance(), ease: 'none',
        scrollTrigger: {
          trigger: section, start: 'top top', end: () => `+=${distance()}`,
          pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1
        }
      });
      // Subtle inner parallax on each image while the track moves
      $$('.gallery__item img', track).forEach((img) => {
        gsap.fromTo(img, { xPercent: -6 }, {
          xPercent: 6, ease: 'none',
          scrollTrigger: { trigger: img.parentElement, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true }
        });
      });
      return () => gsap.set(track, { clearProps: 'transform' });
    });

    /* ---------- Section transitions: soft scale-in for big blocks ---------- */
    $$('.section-head').forEach((h) => {
      const line = document.createElement('span');
      line.className = 'section-head__rule';
      line.setAttribute('aria-hidden', 'true');
      h.prepend(line);
      gsap.fromTo(line, { scaleX: 0 }, {
        scaleX: 1, duration: 1.4, ease: 'expo.out',
        scrollTrigger: { trigger: h, start: 'top 88%', once: true }
      });
    });

    gsap.from('.footer__wordmark', {
      yPercent: 60, opacity: 0, duration: 1.6, ease: 'expo.out',
      scrollTrigger: { trigger: '.footer', start: 'top 85%', once: true }
    });

    gsap.from('.contact__bg img', {
      scale: 1.25, ease: 'none',
      scrollTrigger: { trigger: '.contact', start: 'top bottom', end: 'bottom top', scrub: true }
    });

    /* Marquee drifts sideways with scroll in addition to its CSS loop */
    gsap.fromTo('.marquee', { xPercent: 0 }, {
      xPercent: -6, ease: 'none',
      scrollTrigger: { trigger: '.marquee', start: 'top bottom', end: 'bottom top', scrub: true }
    });

    /* Refresh after images settle */
    window.addEventListener('load', () => ST.refresh());
    $$('img').forEach((img) => {
      if (!img.complete) img.addEventListener('load', debounceRefresh, { once: true });
    });
  }

  let refreshTimer = null;
  function debounceRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => window.ScrollTrigger && window.ScrollTrigger.refresh(), 300);
  }

  if (window.__siteReady) start();
  else document.addEventListener('site:ready', start, { once: true });
})();
