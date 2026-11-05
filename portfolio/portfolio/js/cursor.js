/* ==========================================================================
   cursor.js — custom cursor (dot + lagging ring with contextual labels)
   Enabled only for fine pointers (mouse / trackpad). Touch devices keep
   native behaviour.

   Usage in HTML:
     data-cursor="hover"                     → ring grows
     data-cursor="view" data-cursor-label="" → ring becomes a labelled lens
   Links and buttons get the "hover" state automatically.
   ========================================================================== */
(() => {
  'use strict';
  const P = window.Portfolio;
  const { $, damp } = P;

  const INTERACTIVE = 'a, button, [role="button"], input, textarea, select, label, [data-cursor]';

  function init() {
    const root = $('.cursor');
    if (!root || !P.env.finePointer) return;

    const dot = $('.cursor__dot', root);
    const ring = $('.cursor__ring', root);
    const label = $('.cursor__label', root);
    document.documentElement.classList.add('has-cursor');

    const pos = { x: -100, y: -100 };
    const ringPos = { x: -100, y: -100 };
    let state = '';
    let seen = false;

    const setState = (next, text = '') => {
      if (next === state && label.textContent === text) return;
      root.classList.remove(`is-${state}`);
      state = next;
      if (state) root.classList.add(`is-${state}`);
      label.textContent = text;
    };

    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      pos.x = e.clientX;
      pos.y = e.clientY;
      if (!seen) { ringPos.x = pos.x; ringPos.y = pos.y; seen = true; }
      root.classList.remove('is-hidden');
    }, { passive: true });

    // Context detection via delegation (no per-element listeners)
    document.addEventListener('pointerover', (e) => {
      const target = e.target.closest(INTERACTIVE);
      if (!target) { setState(''); return; }
      const mode = target.dataset.cursor;
      if (mode === 'view') setState('view', target.dataset.cursorLabel || 'View');
      else setState('hover');
    });

    document.addEventListener('pointerdown', () => root.classList.add('is-down'));
    document.addEventListener('pointerup', () => root.classList.remove('is-down'));
    document.documentElement.addEventListener('pointerleave', () => root.classList.add('is-hidden'));
    window.addEventListener('blur', () => root.classList.add('is-hidden'));

    const instant = P.env.reducedMotion;
    P.ticker.add((t, dt) => {
      if (instant) { ringPos.x = pos.x; ringPos.y = pos.y; }
      else {
        ringPos.x = damp(ringPos.x, pos.x, 16, dt);
        ringPos.y = damp(ringPos.y, pos.y, 16, dt);
      }
      dot.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      ring.style.transform = `translate3d(${ringPos.x.toFixed(1)}px, ${ringPos.y.toFixed(1)}px, 0)`;
    });
  }

  P.cursor = { init };
})();
