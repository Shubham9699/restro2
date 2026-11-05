/* =========================================================
   SHREYA SWEETS & RESTAURANTS — interactions.js
   Navigation, mobile menu, smooth anchors, menu tabs,
   lightbox, hero video / slideshow, scroll progress.
   (Works with or without GSAP/Lenis.)
   ========================================================= */

(function () {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const header = $('#siteHeader');

  /* ---------- Smooth scroll to anchors ---------- */
  function scrollToTarget(target) {
    if (!target) return;
    const offset = target.id === 'home' ? 0 : -(header ? header.offsetHeight - 1 : 70);
    if (window.__lenis) {
      window.__lenis.scrollTo(target, { offset, duration: 1.4 });
    } else {
      const top = target.getBoundingClientRect().top + window.scrollY + offset;
      window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  }
  window.__scrollToTarget = scrollToTarget;

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();

    if (a.dataset.menuJump) setMenuCategory(a.dataset.menuJump);
    if (document.body.classList.contains('menu-open')) closeMobileMenu();

    scrollToTarget(target);
    if (history.replaceState) history.replaceState(null, '', id);
  });

  /* ---------- Header state + scroll progress + action bar ---------- */
  const progress = $('#scrollProgress');
  const actionBar = $('#actionBar');
  let ticking = false;

  function onScroll() {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (header) header.classList.toggle('is-scrolled', y > 40);
    if (progress) progress.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
    if (actionBar) actionBar.classList.toggle('is-visible', y > window.innerHeight * 0.6);
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();

  /* ---------- Active nav link ---------- */
  const navLinks = $$('.nav__link');
  const sectionMap = { home: 'home', signature: 'home', story: 'story', menu: 'menu', sweets: 'menu',
    gallery: 'gallery', why: 'gallery', reviews: 'contact', contact: 'contact' };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const key = sectionMap[en.target.id];
        navLinks.forEach((l) => l.classList.toggle('is-active', l.dataset.nav === key));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(sectionMap).forEach((id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* ---------- Mobile menu ---------- */
  const toggle = $('#navToggle');
  const mobileMenu = $('#mobileMenu');

  function openMobileMenu() {
    document.body.classList.add('menu-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close menu');
    mobileMenu.setAttribute('aria-hidden', 'false');
    if (window.__lenis) window.__lenis.stop();
    const first = $('a', mobileMenu);
    if (first) setTimeout(() => first.focus({ preventScroll: true }), 350);
  }
  function closeMobileMenu() {
    document.body.classList.remove('menu-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
    mobileMenu.setAttribute('aria-hidden', 'true');
    if (window.__lenis) window.__lenis.start();
  }
  if (toggle && mobileMenu) {
    toggle.addEventListener('click', () =>
      document.body.classList.contains('menu-open') ? closeMobileMenu() : openMobileMenu());
    window.addEventListener('resize', () => {
      if (window.innerWidth > 1024 && document.body.classList.contains('menu-open')) closeMobileMenu();
    });
  }

  /* ---------- Menu tabs ---------- */
  const tabsWrap = $('#menuTabs');
  const indicator = $('#menuIndicator');
  const panel = $('#menuPanel');

  function moveIndicator(btn) {
    if (!indicator || !btn) return;
    indicator.style.width = `${btn.offsetWidth}px`;
    indicator.style.transform = `translateX(${btn.offsetLeft}px)`;
  }

  function setMenuCategory(cat, focus) {
    if (!tabsWrap || !panel) return;
    const tabs = $$('.menu-tab', tabsWrap);
    const btn = tabs.find((t) => t.dataset.cat === cat) || tabs[0];
    tabs.forEach((t) => {
      const on = t === btn;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
    });
    panel.setAttribute('aria-labelledby', btn.id);
    moveIndicator(btn);
    // Scroll only the tab strip horizontally (never the page) to keep the active tab centred.
    tabsWrap.scrollTo({
      left: btn.offsetLeft - (tabsWrap.clientWidth - btn.offsetWidth) / 2,
      behavior: reduceMotion ? 'auto' : 'smooth'
    });
    if (focus) btn.focus();

    const groups = $$('.menu-group', panel);
    groups.forEach((g) => { g.hidden = !(cat === 'all' || g.dataset.group === cat); });

    const cards = $$('.menu-group:not([hidden]) .menu-card, .menu-group:not([hidden]) .menu-group__aside', panel);
    if (window.gsap && !reduceMotion) {
      window.gsap.fromTo(cards, { y: 28, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out', stagger: 0.03, overwrite: true, clearProps: 'transform' });
    } else {
      panel.classList.remove('is-switching');
      void panel.offsetWidth;
      panel.classList.add('is-switching');
    }
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  }
  window.__setMenuCategory = setMenuCategory;

  if (tabsWrap) {
    tabsWrap.addEventListener('click', (e) => {
      const b = e.target.closest('.menu-tab');
      if (b) setMenuCategory(b.dataset.cat);
    });
    tabsWrap.addEventListener('keydown', (e) => {
      const tabs = $$('.menu-tab', tabsWrap);
      const i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      let n = null;
      if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
      if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
      if (e.key === 'Home') n = 0;
      if (e.key === 'End') n = tabs.length - 1;
      if (n !== null) { e.preventDefault(); setMenuCategory(tabs[n].dataset.cat, true); }
    });
    const init = () => moveIndicator($('.menu-tab.is-active', tabsWrap));
    window.addEventListener('resize', init);
    if (document.fonts) document.fonts.ready.then(init);
    init();
  }

  /* ---------- Lightbox ---------- */
  const lb = $('#lightbox');
  const lbImg = $('#lbImg');
  const lbCap = $('#lbCaption');
  const lbCount = $('#lbCounter');
  let lbIndex = 0;
  let lastFocus = null;

  function showLb(i) {
    const items = (window.SITE && window.SITE.gallery) || [];
    if (!items.length) return;
    lbIndex = (i + items.length) % items.length;
    const g = items[lbIndex];
    const src = (window.SITE.images[g.img] || '').replace(/w=\d+/, 'w=2000');
    lb.classList.add('is-changing');
    const im = new Image();
    im.onload = im.onerror = () => {
      lbImg.src = im.complete && im.naturalWidth ? src : 'assets/icons/placeholder.svg';
      lbImg.alt = g.caption;
      lbCap.textContent = g.caption;
      lbCount.textContent = `${lbIndex + 1} / ${items.length}`;
      requestAnimationFrame(() => lb.classList.remove('is-changing'));
    };
    im.src = src;
  }
  function openLb(i) {
    lastFocus = document.activeElement;
    lb.classList.add('is-open');
    lb.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lb-open');
    if (window.__lenis) window.__lenis.stop();
    showLb(i);
    $('#lbClose').focus();
  }
  function closeLb() {
    lb.classList.remove('is-open');
    lb.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lb-open');
    if (window.__lenis) window.__lenis.start();
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }

  if (lb) {
    document.addEventListener('click', (e) => {
      const item = e.target.closest('.gallery__item');
      if (item) openLb(parseInt(item.dataset.index, 10) || 0);
    });
    $('#lbClose').addEventListener('click', closeLb);
    $('#lbPrev').addEventListener('click', () => showLb(lbIndex - 1));
    $('#lbNext').addEventListener('click', () => showLb(lbIndex + 1));
    lb.addEventListener('click', (e) => { if (e.target === lb) closeLb(); });

    // Touch swipe
    let sx = 0;
    lb.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 50) showLb(lbIndex + (dx < 0 ? 1 : -1));
    });
  }

  /* ---------- Global keyboard ---------- */
  document.addEventListener('keydown', (e) => {
    if (lb && lb.classList.contains('is-open')) {
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowRight') showLb(lbIndex + 1);
      if (e.key === 'ArrowLeft') showLb(lbIndex - 1);
      if (e.key === 'Tab') { // simple focus trap
        const f = $$('button', lb);
        const i = f.indexOf(document.activeElement);
        e.preventDefault();
        f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
      return;
    }
    if (e.key === 'Escape' && document.body.classList.contains('menu-open')) {
      closeMobileMenu();
      toggle.focus();
    }
  });

  /* ---------- Hero: video with cinematic slideshow fallback ---------- */
  const slides = $$('.hero__slide');
  let slideIndex = 0;
  let slideTimer = null;

  function nextSlide() {
    if (slides.length < 2) return;
    const cur = slides[slideIndex];
    slideIndex = (slideIndex + 1) % slides.length;
    const nxt = slides[slideIndex];
    const img = $('img', nxt);
    if (img && img.loading === 'lazy') img.loading = 'eager';
    cur.classList.remove('is-active');
    cur.classList.add('is-leaving');
    nxt.classList.add('is-active');
    setTimeout(() => cur.classList.remove('is-leaving'), 1800);
  }
  function startSlides() {
    if (reduceMotion || slideTimer) return;
    // Warm up the next images
    slides.forEach((s) => { const i = $('img', s); if (i) i.loading = 'eager'; });
    slideTimer = setInterval(nextSlide, 6000);
  }
  function stopSlides() { clearInterval(slideTimer); slideTimer = null; }

  function initHeroVideo() {
    // The scroll-driven cooking canvas replaces the hero slideshow/video.
    if (document.documentElement.classList.contains('has-cooking')) return;
    const video = $('#heroVideo');
    const conf = window.SITE && window.SITE.hero;
    const conn = navigator.connection || {};
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (!video || !conf || !conf.videos.length || reduceMotion || conn.saveData ||
        (isMobile && !conf.playOnMobile)) { startSlides(); return; }

    conf.videos.forEach((v) => {
      const s = document.createElement('source');
      s.src = v.src; s.type = v.type;
      video.appendChild(s);
    });
    const sources = $$('source', video);
    const fail = () => { video.remove(); startSlides(); };
    if (sources.length) sources[sources.length - 1].addEventListener('error', fail);
    video.addEventListener('error', fail);
    video.addEventListener('playing', () => {
      video.classList.add('is-playing');
      stopSlides();
    }, { once: true });

    video.preload = 'auto';
    video.load();
    const p = video.play();
    if (p && p.catch) p.catch(() => { if (!video.classList.contains('is-playing')) startSlides(); });
    // If nothing plays within 4s keep the slideshow moving.
    setTimeout(() => { if (!video.classList.contains('is-playing')) startSlides(); }, 4000);
  }

  document.addEventListener('visibilitychange', () => {
    const v = $('#heroVideo');
    if (document.hidden) { stopSlides(); if (v) v.pause(); }
    else if (v && v.classList.contains('is-playing')) { v.play().catch(() => {}); }
    else if (!document.documentElement.classList.contains('has-cooking')) startSlides();
  });

  initHeroVideo();
})();
