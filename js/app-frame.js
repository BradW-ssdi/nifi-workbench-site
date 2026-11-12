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
   - Account menu: a Bootstrap dropdown driven by this script instead of
     bootstrap.bundle.js: disclosure button with aria-expanded and aria-controls;
     the menu toggles hidden plus .show. Escape closes and returns focus; a click
     outside or focus leaving the menu closes it. */
(function () {
  'use strict';

  var KEY = 'statusNavBar';
  var SELF = document.currentScript && document.currentScript.src;
  /* The tooltip, Search clear, error banner and Cancel confirmation scripts below, and the tab icon, are the workbench's
     stand-ins for what the app already does with Phase 2's scripts. They load only on workbench pages: in the app they
     would 404 (only this file is copied) or add a second Cancel confirmation on top of Phase 2's. */
  var WORKBENCH = !!SELF && /\/workbench\//.test(location.pathname) && /\/js\/app-frame\.js(\?.*)?$/.test(SELF);

  /* A design preview page (workbench/design-preview, the design system's own layout) says so at the top, and where the
     developers' templates are: workbench/screens, inside Phase 2's header and sidebar. Not shown to automated runs (the
     508 harness, the Figma extraction), which test and copy the page itself. */
  if (/\/design-preview\/[^/]+\.html/.test(location.pathname) && !navigator.webdriver) {
    var showPreviewNote = function () {
      if (document.getElementById('dsPreviewNote')) return;
      var file = location.pathname.split('/').pop();
      var note = document.createElement('div');
      note.id = 'dsPreviewNote';
      note.setAttribute('role', 'note');
      note.style.cssText = 'position:sticky;top:0;z-index:1100;background:#fff3e0;border-bottom:2px solid #996b00;color:#333;' +
        'font:600 15px/1.4 Inter,sans-serif;padding:10px 16px;text-align:center';
      var local = !/github\.io$/.test(location.hostname);
      note.innerHTML = 'Design preview: do not build from this page. Developers: use ' +
        (local ? '<a href="../screens/' + file + '" style="color:#004a80">workbench/screens/' + file + '</a>' : '<b>workbench/screens/' + file + '</b>') +
        ' in the nifi-design-system repo (the template inside Phase 2’s header and sidebar).';
      document.body.insertBefore(note, document.body.firstChild);
    };
    if (document.body) showPreviewNote(); else document.addEventListener('DOMContentLoaded', showPreviewNote);
  }

  /* Tooltips on every screen (js/ds-tooltip.js), loaded once from beside this script */
  if (WORKBENCH && !window.dsTooltip && !document.querySelector('script[src$="ds-tooltip.js"]')) {
    var tipScript = document.createElement('script');
    tipScript.src = SELF.replace(/app-frame\.js(\?.*)?$/, 'ds-tooltip.js');
    document.head.appendChild(tipScript);
  }
  /* The Texas seal in the browser tab (Phase 3 review, Team B: in the tab we will have the Texas logo), on every screen
     that has none. DEV: in the app, <link rel="icon" href="/images/favicon.png"> in the layout's head. */
  if (WORKBENCH && !document.querySelector('link[rel~="icon"]')) {
    var icon = document.createElement('link');
    icon.rel = 'icon'; icon.type = 'image/png';
    icon.href = SELF.replace(/js\/app-frame\.js(\?.*)?$/, 'workbench/assets/favicon.png');
    document.head.appendChild(icon);
  }
  /* The clear button in Search to filter (js/ds-search-clear.js), the same way */
  if (WORKBENCH && !window.dsSearchClear && !document.querySelector('script[src$="ds-search-clear.js"]')) {
    var clearScript = document.createElement('script');
    clearScript.src = SELF.replace(/app-frame\.js(\?.*)?$/, 'ds-search-clear.js');
    document.head.appendChild(clearScript);
  }
  /* Phase 2's validation banner and red labels on every form (js/ds-errors.js), the same way */
  if (WORKBENCH && !window.dsErrors && !document.querySelector('script[src$="ds-errors.js"]')) {
    var errorsScript = document.createElement('script');
    errorsScript.src = SELF.replace(/app-frame\.js(\?.*)?$/, 'ds-errors.js');
    document.head.appendChild(errorsScript);
  }
  /* Phase 2's Cancel confirmation on every form (js/ds-cancel-confirm.js), the same way */
  if (WORKBENCH && !window.dsCancelConfirm && !document.querySelector('script[src$="ds-cancel-confirm.js"]')) {
    var cancelScript = document.createElement('script');
    cancelScript.src = SELF.replace(/app-frame\.js(\?.*)?$/, 'ds-cancel-confirm.js');
    document.head.appendChild(cancelScript);
  }

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

    /* Escape hides a flyout whether keyboard focus or pointer hover opened it. Hovering
       does not move focus into the rail, so the listener is on the document (WCAG 1.4.13). */
    document.addEventListener('keydown', function (e) {
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
        menu.classList.remove('show'); /* Bootstrap .dropdown-menu shows with .show */
        /* After the collapsed state is published, so screen readers announce it on return. */
        if (returnFocus) window.setTimeout(function () { btn.focus(); }, 30);
      }
      btn.addEventListener('click', function () {
        if (isOpen()) { close(false); return; }
        btn.setAttribute('aria-expanded', 'true');
        menu.hidden = false;
        menu.classList.add('show');
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

  /* Chrome brings the caret of a focused text field into view, not the field. A tall field near the
     bottom edge stays cut off. Bring the whole field in; scroll-margin in _a11y.scss keeps it clear
     of the sticky header. */
  function initFieldReveal() {
    document.addEventListener('focusin', function (e) {
      var el = e.target;
      if (!el.matches || !el.matches('textarea, input, select')) return;
      var win = document.querySelector('.ds-window');   /* inside the Phase 2 frame, leave the frame's own fields alone */
      if (win && !win.contains(el)) return;
      var r = el.getBoundingClientRect();
      if (r.bottom > window.innerHeight || r.top < 0) el.scrollIntoView({ block: 'nearest' });
    });
  }

  /* Chrome does not scroll a table's sideways scroller when focus lands on a control that is mostly past
     its edge with a sliver still showing (the last column's sort button on a table a little wider than
     the window). Scroll it in, with the 8px of scroll-padding-inline from _extensions.scss so the focus
     outline stays clear of the edge. */
  function initTableReveal() {
    document.addEventListener('focusin', function (e) {
      var el = e.target, sc = el.closest && el.closest('.ds-table-scroll');
      if (!sc || sc === el) return;
      var r = el.getBoundingClientRect(), s = sc.getBoundingClientRect(), pad = 8;
      if (r.right + pad > s.right) sc.scrollLeft += Math.min(r.right + pad - s.right, r.left - pad - s.left);
      else if (r.left - pad < s.left) sc.scrollLeft -= s.left - (r.left - pad);
    });
  }

  /* A queue table sized to the window, as the app does: Phase 2's queues.js resizeTableHeight() sets
     #myScrollableTable to 80% of the window less 150px (none at 992px and narrower) after every results swap. A
     template has no swap, so it runs once here; Phase 2's own resize listener keeps it after that. The design
     system layout has no queues.js and takes the same size from _extensions.scss. */
  function initQueueHeight() {
    if (typeof window.resizeTableHeight === 'function' && document.getElementById('myScrollableTable')) window.resizeTableHeight();
  }

  function init() { initRail(); initMenus(); initFieldReveal(); initTableReveal(); initQueueHeight(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
