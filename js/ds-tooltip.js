/* Tooltips for Phase 2's tooltip markup (data-bs-toggle="tooltip" data-bs-title="...", data-bs-custom-class
   "custom-tooltip") where Bootstrap's tooltip script is not running (the design system templates), and Escape for
   the ones it runs (BA review: tooltips on hover, as Phase 2).

   - Shows on hover and on keyboard focus, beside the control; stays while the pointer moves onto it (WCAG 1.4.13
     hoverable), stays until the pointer or focus leaves (persistent), and Escape hides it (dismissible). Phase 2's
     Bootstrap tooltips do not close on Escape after keyboard focus; this hides those too.
   - The tooltip is not the control's name: the control keeps its aria-label. When the tooltip says something the
     name does not, the control is described by it while it shows.
   - A tooltip on a wrapper (Phase 2's pager puts it on the li) shows for the control inside it. */
(function () {
  'use strict';
  var SEL = '[data-bs-toggle="tooltip"][data-bs-title]';
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
    clearTimeout(timer);
    if (owner && owner !== el) hide();
    var t = make(), text = el.getAttribute('data-bs-title');
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
  function from(e) { return e.target.closest ? e.target.closest(SEL) : null; }

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
