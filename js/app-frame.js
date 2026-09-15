/* App frame behavior, shared by every screen.
   Markup contract: workbench/frame/frame-top.html and frame-bottom.html, stamped
   into each screen by scripts/sync-frame.py. In the app this is the shared layout
   fragment (layout/navbar.html + layout/header.html): wire it once there.

   - Rail collapse: the hamburger toggles .is-expanded on #railNav and keeps
     aria-expanded and its label in step. State persists per tab in
     sessionStorage under the same key and values the app already uses.
   - Groups: buttons with aria-expanded + aria-controls; the sub-list toggles
     with the hidden attribute. Clicking a group while the rail is collapsed
     expands the rail and opens that group. Collapsing closes every group.
     When the rail is expanded, the group holding the current page opens.
   - Collapsed-rail labels show as a visible flyout on hover and keyboard focus
     (CSS). Escape hides them until focus or the pointer moves on (WCAG 1.4.13).
   - Account menu: disclosure button. Escape closes and returns focus; a click
     outside or focus leaving the menu closes it. */
(function () {
  'use strict';

  var KEY = 'statusNavBar';

  function store(value) {
    try { sessionStorage.setItem(KEY, value); } catch (e) { /* storage blocked: state just won't persist */ }
  }

  function initRail() {
    var rail = document.getElementById('railNav');
    var toggle = document.getElementById('railToggle');
    if (!rail || !toggle) return;

    var groups = Array.prototype.slice.call(rail.querySelectorAll('.ds-nav-group'));

    function setGroup(btn, open) {
      btn.setAttribute('aria-expanded', String(open));
      var list = document.getElementById(btn.getAttribute('aria-controls'));
      if (list) list.hidden = !open;
    }

    function setExpanded(expanded, persist) {
      rail.classList.toggle('is-expanded', expanded);
      toggle.setAttribute('aria-expanded', String(expanded));
      toggle.setAttribute('aria-label', expanded ? 'Collapse navigation' : 'Expand navigation');
      groups.forEach(function (g) { setGroup(g, expanded && g.classList.contains('has-current')); });
      if (persist) store(expanded ? 'expanded' : 'collapsed');
    }

    setExpanded(rail.classList.contains('is-expanded'), false);

    toggle.addEventListener('click', function () {
      setExpanded(!rail.classList.contains('is-expanded'), true);
    });

    groups.forEach(function (g) {
      g.addEventListener('click', function () {
        if (!rail.classList.contains('is-expanded')) {
          setExpanded(true, true);
          setGroup(g, true);
          return;
        }
        setGroup(g, g.getAttribute('aria-expanded') !== 'true');
      });
    });

    rail.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') rail.classList.add('is-tips-off');
    });
    rail.addEventListener('focusin', function () { rail.classList.remove('is-tips-off'); });
    rail.addEventListener('pointerleave', function () { rail.classList.remove('is-tips-off'); });
  }

  function initMenus() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-menu-button]'), function (btn) {
      var menu = document.getElementById(btn.getAttribute('aria-controls'));
      if (!menu) return;
      var isOpen = function () { return btn.getAttribute('aria-expanded') === 'true'; };
      function close(returnFocus) {
        btn.setAttribute('aria-expanded', 'false');
        menu.hidden = true;
        if (returnFocus) btn.focus();
      }
      btn.addEventListener('click', function () {
        if (isOpen()) { close(false); return; }
        btn.setAttribute('aria-expanded', 'true');
        menu.hidden = false;
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && isOpen()) close(true);
      });
      document.addEventListener('click', function (e) {
        if (isOpen() && !btn.contains(e.target) && !menu.contains(e.target)) close(false);
      });
      menu.addEventListener('focusout', function (e) {
        if (e.relatedTarget && !menu.contains(e.relatedTarget) && e.relatedTarget !== btn) close(false);
      });
    });
  }

  function init() { initRail(); initMenus(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
