/* Info button: page instructions kept out of the way until they are wanted (BA review, Merge Patients).

   <button type="button" class="btn btn-light rounded-circle ds-btn-icon" data-ds-infotip aria-expanded="false"
           aria-controls="panelId" aria-label="How to merge">(info icon)</button>
   <div class="alert alert-info ds-infotip-panel" id="panelId" hidden>...</div>

   It is a disclosure, not a hover tooltip: the button shows and hides the panel, which sits in the page right after
   it, so the text is in reading order, reachable from the keyboard and by a screen reader, and stays until it is
   closed (WCAG 1.4.13, 3.3.2). Escape in the panel or on the button closes it and leaves focus on the button. */
(function () {
  'use strict';

  function panelOf(btn) { return document.getElementById(btn.getAttribute('aria-controls')); }

  function set(btn, open) {
    var panel = panelOf(btn);
    if (!panel) return;
    panel.hidden = !open;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-ds-infotip]');
    if (!btn) return;
    set(btn, btn.getAttribute('aria-expanded') !== 'true');
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !e.target.closest) return;
    var btn = e.target.closest('[data-ds-infotip]');
    if (!btn) {
      var panel = e.target.closest('.ds-infotip-panel');
      btn = panel && document.querySelector('[data-ds-infotip][aria-controls="' + panel.id + '"]');
    }
    if (!btn || btn.getAttribute('aria-expanded') !== 'true') return;
    e.preventDefault();
    set(btn, false);
    btn.focus();
  });
})();
