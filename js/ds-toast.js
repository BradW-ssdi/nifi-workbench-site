/* Toast: post-action feedback (BA review: the green success banner becomes a toast), in Phase 2's global toast markup
   (fragments/globalToast.html):

   <div class="toast-container top-center">
     <div class="toast alert-success" role="status" aria-live="polite" aria-atomic="true" data-ds-toast
          data-bs-autohide="true" data-bs-delay="5000">
       <div class="d-flex">(icon)<div class="toast-body">...</div>
         <button type="button" class="btn-close ms-auto me-3" data-bs-dismiss="toast" aria-label="Close"></button></div>
     </div>
   </div>

   - Shown on load, and announced: the message is set again just after load so the live region speaks it.
   - It hides itself after data-bs-delay (Phase 2: 5 seconds) unless it holds a link or a button, which people need
     time to reach (WCAG 2.2.1); and never while the pointer is over it or focus is in it. A toast that stays is in the
     page, not fixed over it (the CSS), so it covers nothing (2.4.11).
   - Close, or Escape inside it, hides it; focus that was in it goes to the page's main region instead of being lost.
   - window.dsToast.show(toastElement) shows one again (after an action that does not reload the page). */
(function () {
  'use strict';

  function hide(t) {
    var hadFocus = t.contains(document.activeElement);
    t.classList.remove('show');
    t.hidden = true;
    var main = document.getElementById('main') || document.querySelector('main');   /* the Phase 2 frame's main has its own id */
    if (hadFocus && main) {
      if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
      main.focus();
    }
  }

  function show(t) {
    if (!t.__dsToast) {
      t.__dsToast = true;
      var timer = null, held = false;
      var auto = t.getAttribute('data-bs-autohide') === 'true' && !t.querySelector('.toast-body a, .toast-body button');
      var delay = parseInt(t.getAttribute('data-bs-delay') || '5000', 10);
      t.__dsStart = function () { clearTimeout(timer); if (auto && !held) timer = setTimeout(function () { hide(t); }, delay); };
      function hold() { held = true; clearTimeout(timer); }
      function release() { held = false; t.__dsStart(); }
      t.addEventListener('mouseenter', hold);
      t.addEventListener('mouseleave', release);
      t.addEventListener('focusin', hold);
      t.addEventListener('focusout', function (e) { if (!t.contains(e.relatedTarget)) release(); });
      var close = t.querySelector('[data-bs-dismiss="toast"]');
      if (close) close.addEventListener('click', function () { hide(t); });
      t.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        e.stopPropagation();
        hide(t);
      });
    }
    t.hidden = false;
    t.classList.add('show');
    var body = t.querySelector('.toast-body');
    if (body) {
      var html = body.innerHTML;
      body.innerHTML = '';
      setTimeout(function () { body.innerHTML = html; }, 150);
    }
    t.__dsStart();
  }

  function init() { Array.prototype.forEach.call(document.querySelectorAll('.toast[data-ds-toast]'), show); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.dsToast = { show: show, hide: hide };
})();
