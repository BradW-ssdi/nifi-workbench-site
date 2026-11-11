/* The floating selection bar (.ds-bulkbar.is-floating) can be dragged out of the way, as Phase 2's (floating-bar.js
   dragElement: the DRRQ's bulk toolbar; Phase 3 review, Team A slides 3, 4, 11/10).

   - Drag from the bar itself (its count, the space between its buttons), not from a button: a press on a button is
     still a click.
   - The bar keeps its place while it is shown and goes back to its own place when it is hidden and shown again.
   - Moving it is a convenience, not the only way to see what is under it (WCAG 2.5.7): the page keeps room below
     its content for the bar (scroll padding), so everything scrolls clear of it without dragging.
   - It stays inside the window. */
(function () {
  'use strict';
  if (window.dsFloatingBar) return;
  window.dsFloatingBar = true;

  function init(bar) {
    var x = 0, y = 0, start = null;
    function place() { bar.style.translate = x || y ? x + 'px ' + y + 'px' : ''; }
    bar.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || e.target.closest('button, a, input, select, [tabindex]')) return;
      start = { px: e.clientX, py: e.clientY, x: x, y: y, r: bar.getBoundingClientRect() };
      bar.setPointerCapture(e.pointerId);
      bar.classList.add('is-dragging');
      e.preventDefault();
    });
    bar.addEventListener('pointermove', function (e) {
      if (!start) return;
      var dx = e.clientX - start.px, dy = e.clientY - start.py, r = start.r, w = document.documentElement.clientWidth, h = document.documentElement.clientHeight;
      dx = Math.min(Math.max(dx, -r.left), w - r.right);
      dy = Math.min(Math.max(dy, -r.top), h - r.bottom);
      x = start.x + dx; y = start.y + dy; place();
    });
    function end(e) { if (!start) return; start = null; bar.classList.remove('is-dragging'); try { bar.releasePointerCapture(e.pointerId); } catch (err) { /* already released */ } }
    bar.addEventListener('pointerup', end);
    bar.addEventListener('pointercancel', end);
    new MutationObserver(function () { if (bar.hidden) { x = 0; y = 0; place(); } }).observe(bar, { attributes: true, attributeFilter: ['hidden'] });
  }
  function all() { Array.prototype.forEach.call(document.querySelectorAll('.ds-bulkbar.is-floating'), init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', all); else all();
})();
