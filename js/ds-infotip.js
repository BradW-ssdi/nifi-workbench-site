/* Info button: page instructions kept out of the way until they are wanted (BA review, Merge Patients).

   <button type="button" class="btn btn-light rounded-circle ds-btn-icon" data-ds-infotip aria-expanded="false"
           aria-controls="panelId" aria-label="How to merge">(info icon)</button>
   <div class="alert alert-info ds-infotip-panel" id="panelId" hidden>...</div>

   It is a disclosure: the button shows and hides the panel, which sits in the page right after it, so the text is in
   reading order, reachable from the keyboard and by a screen reader, and stays until it is closed (WCAG 3.3.2).
   Escape in the panel or on the button closes it and leaves focus on the button.

   Hovering the button with a mouse also opens it (Phase 3 review deck: "hover or click"). That panel stays while the
   pointer is on the button or the panel, closes a moment after the pointer leaves both, and Escape closes it from
   anywhere (WCAG 1.4.13). A click while it is open from hover keeps it open, as if it had been opened by the click.
   Touch and pen only use the click. */
(function () {
  'use strict';

  function panelOf(btn) { return document.getElementById(btn.getAttribute('aria-controls')); }

  // The button whose panel is open from hover, not from a click, and the timer that closes it after the pointer leaves.
  var hovered = null, timer = null;
  var CLOSE_MS = 400;

  function set(btn, open) {
    var panel = panelOf(btn);
    if (!panel) return;
    panel.hidden = !open;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (btn === hovered) { hovered = null; clearTimeout(timer); }
  }

  // The info button or the hover-opened panel the element is in, if any.
  function hoverZone(el) {
    if (!el || !el.closest) return null;
    var btn = el.closest('[data-ds-infotip]');
    if (btn) return btn;
    var panel = el.closest('.ds-infotip-panel');
    return panel && hovered && panelOf(hovered) === panel ? hovered : null;
  }

  document.addEventListener('pointerover', function (e) {
    if (e.pointerType !== 'mouse') return;
    var btn = hoverZone(e.target);
    if (!btn || hoverZone(e.relatedTarget) === btn) return;
    if (btn === hovered) { clearTimeout(timer); return; }
    if (e.target.closest('[data-ds-infotip]') !== btn || btn.getAttribute('aria-expanded') === 'true') return;
    if (hovered) set(hovered, false);
    set(btn, true);
    hovered = btn;
  });

  document.addEventListener('pointerout', function (e) {
    if (e.pointerType !== 'mouse' || !hovered) return;
    if (hoverZone(e.target) !== hovered || hoverZone(e.relatedTarget) === hovered) return;
    var btn = hovered;
    clearTimeout(timer);
    timer = setTimeout(function () { if (hovered === btn) set(btn, false); }, CLOSE_MS);
  });

  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-ds-infotip]');
    if (!btn) return;
    if (btn === hovered) { hovered = null; clearTimeout(timer); return; }
    set(btn, btn.getAttribute('aria-expanded') !== 'true');
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !e.target.closest) return;
    if (hovered && !e.target.closest('[data-ds-infotip], .ds-infotip-panel')) { e.preventDefault(); set(hovered, false); return; }
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
