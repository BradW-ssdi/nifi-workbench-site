/* Tooltips for Phase 2's tooltip markup (data-bs-toggle="tooltip" data-bs-title="...", data-bs-custom-class
   "custom-tooltip") where Bootstrap's tooltip script is not running (the design system templates), and Escape for
   the ones it runs (BA review: tooltips on hover, as Phase 2).

   - Shows on hover and on keyboard focus, beside the control; stays while the pointer moves onto it (WCAG 1.4.13
     hoverable), stays until the pointer or focus leaves (persistent), and Escape hides it (dismissible). Phase 2's
     Bootstrap tooltips do not close on Escape after keyboard focus; this hides those too.
   - The tooltip is not the control's name: the control keeps its aria-label. When the tooltip says something the
     name does not, the control is described by it while it shows.
   - A tooltip on a wrapper (Phase 2's pager puts it on the li) shows for the control inside it.
   - Every icon-only button or link (no visible text; named by aria-label) in the page, a dialog, or the selection bar
     gets one, from its name, when it has none of its own (BA review: tooltips on every button and icon, as Phase 2).
     Phase 2's own components (.ds-phase2) and the app frame's rail, which shows its labels itself, are left as they
     are. The rule for the app: give each icon-only control Phase 2's tooltip markup with its name as the title.
   - Loaded on every screen by js/app-frame.js. */
(function () {
  'use strict';
  if (window.dsTooltip) return;   // the page and js/app-frame.js may both load it
  window.dsTooltip = true;
  var SEL = '[data-bs-toggle="tooltip"][data-bs-title]';
  var AUTO_IN = 'main, .modal, .ds-bulkbar', AUTO_OUT = '.ds-phase2, .ds-nav-rail';
  var tip = null, owner = null, timer = null, hovered = null;

  function bootstrapOwns(el) { return !!(window.bootstrap && bootstrap.Tooltip && bootstrap.Tooltip.getInstance(el)); }
  function control(el) { return el.matches('a, button, [tabindex]') ? el : el.querySelector('a, button, [tabindex]'); }
  function make() {
    if (tip) return tip;
    tip = document.createElement('div');
    tip.className = 'ds-tooltip';
    tip.id = 'dsTooltip';
    tip.setAttribute('role', 'tooltip');
    tip.hidden = true;
    tip.addEventListener('mouseenter', function () { clearTimeout(timer); });
    tip.addEventListener('mouseleave', later);
    document.body.appendChild(tip);
    return tip;
  }
  function show(el) {
    if (bootstrapOwns(el)) return;
    /* Inside the Phase 2 frame Bootstrap's tooltip script runs: an icon-only control gets Phase 2's tooltip markup and a
       Bootstrap tooltip, styled and placed as Phase 2's are (ours is styled only in the design system layout) */
    if (!el.matches(SEL) && window.bootstrap && bootstrap.Tooltip) {
      el.setAttribute('data-bs-toggle', 'tooltip'); el.setAttribute('data-bs-custom-class', 'custom-tooltip'); el.setAttribute('data-bs-title', textOf(el));
      el.setAttribute('data-ds-auto-tip', '');   // its title is its name: the click handler below keeps the two the same
      bootstrap.Tooltip.getOrCreateInstance(el).show();
      return;
    }
    clearTimeout(timer);
    if (owner && owner !== el) hide();
    var t = make(), text = textOf(el);
    owner = el;
    t.textContent = text;
    t.hidden = false;
    place();
    var c = control(el);
    var name = c ? (c.getAttribute('aria-label') || c.textContent || '').trim().toLowerCase() : '';
    if (c && name.indexOf(text.trim().toLowerCase()) === -1 && !c.hasAttribute('aria-describedby')) c.setAttribute('aria-describedby', t.id);
  }
  /* beside its control, above it unless there is no room; again when the page or a scroller moves */
  function place() {
    if (!tip || tip.hidden || !owner) return;
    var r = owner.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
    var top = r.top - h - 6 < 4 ? r.bottom + 6 : r.top - h - 6;
    var left = Math.min(Math.max(4, r.left + r.width / 2 - w / 2), document.documentElement.clientWidth - w - 4);
    tip.style.top = (top + window.scrollY) + 'px';
    tip.style.left = (left + window.scrollX) + 'px';
  }
  function hide() {
    clearTimeout(timer);
    if (!tip) return;
    tip.hidden = true;
    var c = owner && control(owner);
    if (c && c.getAttribute('aria-describedby') === 'dsTooltip') c.removeAttribute('aria-describedby');
    owner = null;
  }
  function later() { clearTimeout(timer); timer = setTimeout(hide, 150); }
  /* the control a pointer or focus event is for: Phase 2's tooltip markup, or an icon-only control that has no
     tooltip of its own (its name is the tooltip) */
  function from(e) {
    var n = e.target; if (!n || !n.closest) return null;
    var el = n.closest(SEL); if (el) return el;
    var c = n.closest('button, a[href], [role="button"]');
    return c && !c.textContent.trim() && !c.hasAttribute('title') && (c.getAttribute('aria-label') || '').trim() && c.closest(AUTO_IN) && !c.closest(AUTO_OUT) ? c : null;
  }
  function textOf(el) { return el.getAttribute('data-bs-title') || el.getAttribute('aria-label') || ''; }

  document.addEventListener('mouseover', function (e) { var el = from(e); hovered = el; if (el) show(el); });
  document.addEventListener('mouseout', function (e) {
    var el = from(e), to = e.relatedTarget;
    if (el && !(to && (el.contains(to) || (tip && tip.contains(to))))) later();
  });
  document.addEventListener('focusin', function (e) {
    var el = from(e);
    if (el && e.target.matches(':focus-visible')) show(el); else if (!el) hide();
  });
  document.addEventListener('focusout', function (e) { if (from(e)) later(); });
  /* a toggle that changes its own tooltip (Show / Hide) shows the new text right after the click */
  document.addEventListener('click', function (e) {
    var el = from(e);
    if (el && el === owner) setTimeout(function () { if (owner === el && tip) { tip.textContent = textOf(el); place(); } }, 0);
    /* in the Phase 2 frame the title was copied from the name when Bootstrap's tooltip was made: copy the new name */
    if (el && el.hasAttribute('data-ds-auto-tip')) setTimeout(function () {
      var name = (el.getAttribute('aria-label') || '').trim(), t = window.bootstrap && bootstrap.Tooltip.getInstance(el);
      if (name && name !== el.getAttribute('data-bs-title')) { el.setAttribute('data-bs-title', name); if (t) t.setContent({ '.tooltip-inner': name }); }
    }, 0);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (tip && !tip.hidden) hide();
    var a = document.activeElement, el = a && a.closest ? a.closest(SEL) : null;
    [el, hovered].forEach(function (x) { if (x && bootstrapOwns(x)) bootstrap.Tooltip.getInstance(x).hide(); });
  }, true);
  /* it stays while its control is hovered or focused (1.4.13 persistent), so it follows the page when it scrolls */
  window.addEventListener('scroll', place, true);
  window.addEventListener('resize', place);
  document.addEventListener('htmx:beforeSwap', hide);
})();
