/* =========================================================
   SHREYA SWEETS & RESTAURANTS — cursor.js
   Custom cursor + magnetic buttons (desktop / fine pointer only).
   ========================================================= */

(function () {
  'use strict';

  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!finePointer || reduceMotion) return;

  /* ---------- Custom cursor ---------- */
  const dot = document.createElement('div');
  const ring = document.createElement('div');
  dot.className = 'cursor-dot';
  ring.className = 'cursor-ring';
  ring.innerHTML = '<span class="cursor-ring__label">View</span>';
  dot.setAttribute('aria-hidden', 'true');
  ring.setAttribute('aria-hidden', 'true');
  document.body.append(dot, ring);
  document.documentElement.classList.add('has-cursor');

  let mx = window.innerWidth / 2, my = window.innerHeight / 2;
  let rx = mx, ry = my;
  let visible = false;

  window.addEventListener('mousemove', (e) => {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
    if (!visible) { visible = true; dot.classList.add('is-visible'); ring.classList.add('is-visible'); }
  }, { passive: true });

  document.addEventListener('mouseleave', () => {
    visible = false;
    dot.classList.remove('is-visible'); ring.classList.remove('is-visible');
  });

  (function loop() {
    rx += (mx - rx) * 0.16;
    ry += (my - ry) * 0.16;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
    requestAnimationFrame(loop);
  })();

  const HOVER = 'a, button, [role="tab"], input, textarea, select, label';
  document.addEventListener('mouseover', (e) => {
    const view = e.target.closest('[data-cursor="view"]');
    const hov = e.target.closest(HOVER);
    ring.classList.toggle('is-view', !!view);
    ring.classList.toggle('is-hover', !view && !!hov);
    dot.classList.toggle('is-hidden', !!view);
  });
  document.addEventListener('mousedown', () => ring.classList.add('is-down'));
  document.addEventListener('mouseup', () => ring.classList.remove('is-down'));

  /* ---------- Magnetic buttons ---------- */
  const STRENGTH = 0.32;
  const setT = (el, x, y) => {
    if (window.gsap) window.gsap.to(el, { x, y, duration: 0.6, ease: 'power3.out' });
    else el.style.transform = `translate(${x}px, ${y}px)`;
  };

  function bindMagnetic(el) {
    if (el.dataset.magneticBound) return;
    el.dataset.magneticBound = '1';
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) * STRENGTH;
      const y = (e.clientY - (r.top + r.height / 2)) * STRENGTH;
      setT(el, x, y);
    });
    el.addEventListener('mouseleave', () => {
      if (window.gsap) window.gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)' });
      else el.style.transform = '';
    });
  }

  document.querySelectorAll('[data-magnetic]').forEach(bindMagnetic);
})();
