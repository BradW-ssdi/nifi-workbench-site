/* Type-ahead single select: <select data-ds-typeahead> becomes Phase 2's Tom Select combobox, so typing filters the
   options to those that contain the text (PI planning: a high-priority "should have" for Phase 3, deferred from
   Epic 39). The options, the value, and the submitted name stay on the <select>.

   In the app, and in the workbench's Phase 2 layout, Phase 2's own makeTomSelect(id, 1) (js/components/dropdowns.js)
   builds it, with Phase 2's settings and accessibility fixes. In the design system templates, where Phase 2's
   script is not loaded, the same settings and fixes are applied here with the same Tom Select (2.3.1):
   - the label stays on the <select>, and the combobox is named by it (aria-labelledby); clicking the label goes to
     the combobox (NIFI-29209)
   - the list renders on <body> so no table or dialog clips it, and follows its field while the page scrolls
     (NIFI-26296, NIFI-28900)
   - the list stays open after a choice, as on every Phase 2 Tom Select (NIFI-27435)
   Added here for both: while typing, the number of matching options is announced (WCAG 4.1.3); a validation error on
  the <select> (aria-invalid, aria-describedby) shows on the combobox; and focusing the <select> from a script (an
  error summary link) moves focus to the combobox.

   Keyboard (Tom Select): type to filter, Down and Up move through the options, Enter chooses, Escape closes the
   list, Tab moves on. */
(function () {
  'use strict';

  function labelOf(sel) {
    var l = sel.id && document.querySelector('label[for="' + (window.CSS && CSS.escape ? CSS.escape(sel.id) : sel.id) + '"]');
    return l ? (l.textContent || '').replace(/\s+/g, ' ').replace(/^[*\s]+/, '').replace(/[:\s]+$/, '').trim() : '';
  }

  /* Phase 2's makeTomSelect settings and fixes, for pages without Phase 2's script */
  function build(sel) {
    if (!sel.getAttribute('aria-label') && !sel.getAttribute('aria-labelledby')) {
      var name = labelOf(sel);
      if (name) sel.setAttribute('aria-label', name);
    }
    new TomSelect(sel, {
      maxItems: 1,
      maxOptions: null,
      dropdownParent: 'body',
      closeAfterSelect: false,
      onInitialize: function () {
        var id = sel.id, lbl = document.getElementById(id + '-ts-label'), ctrl = document.getElementById(id + '-ts-control');
        if (!lbl) return;
        lbl.setAttribute('for', id);
        if (ctrl) {
          ctrl.setAttribute('aria-labelledby', lbl.id);
          lbl.addEventListener('click', function (e) { e.preventDefault(); ctrl.focus(); });
        }
      }
    });
  }

  /* the list follows its field while the page scrolls (Phase 2 binds the same listener once, under this flag) */
  if (!window.__tsScrollBound) {
    window.__tsScrollBound = true;
    var settle = null;
    var reposition = function () {
      document.querySelectorAll('.ts-wrapper.dropdown-active').forEach(function (w) {
        var s = w.previousElementSibling, ts = s && s.tomselect;
        if (!ts || !ts.control) return;
        var r = ts.control.getBoundingClientRect();
        if (r.bottom <= 0 || r.top >= (window.innerHeight || 0)) { ts.close(); return; }
        if (typeof ts.positionDropdown === 'function') ts.positionDropdown();
      });
    };
    document.addEventListener('scroll', function (e) {
      if (e.target && e.target.nodeType === 1 && e.target.closest && e.target.closest('.ts-dropdown')) return;
      reposition();
      if (settle) clearTimeout(settle);
      settle = setTimeout(function () { settle = null; reposition(); }, 80);
    }, true);
    window.addEventListener('resize', reposition);
  }

  /* announce how many options match while typing */
  function announce(sel) {
    var ts = sel.tomselect;
    if (!ts || sel.__dsAnnounce) return;
    sel.__dsAnnounce = true;
    var live = document.createElement('div');
    live.className = 'visually-hidden'; live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite');
    live.id = sel.id + '-ts-status';
    ts.wrapper.insertAdjacentElement('afterend', live);
    ts.wrapper.classList.add('ds-typeahead');
    // Validation marks the <select>: the combobox carries the same state and message, and the field shows it
    var ctrl = ts.control_input;
    var mirror = function () {
      var bad = sel.getAttribute('aria-invalid') === 'true';
      ts.wrapper.classList.toggle('is-invalid', bad);
      if (bad) ctrl.setAttribute('aria-invalid', 'true'); else ctrl.removeAttribute('aria-invalid');
      var d = sel.getAttribute('aria-describedby');
      if (d) ctrl.setAttribute('aria-describedby', d); else ctrl.removeAttribute('aria-describedby');
    };
    new MutationObserver(mirror).observe(sel, { attributes: true, attributeFilter: ['aria-invalid', 'aria-describedby'] });
    mirror();
    // A script that focuses the <select> (an error summary link) lands on the combobox
    sel.addEventListener('focus', function () { ts.focus(); });
    var t = null;
    ts.on('type', function (str) {
      clearTimeout(t);
      t = setTimeout(function () {
        var n = Object.keys(ts.currentResults && ts.currentResults.items ? ts.currentResults.items : {}).length;
        if (!str) n = Object.keys(ts.options).length;
        live.textContent = '';
        setTimeout(function () { live.textContent = n === 0 ? 'No matching options.' : n === 1 ? '1 option.' : n + ' options.'; }, 50);
      }, 250);
    });
  }

  function init(root) {
    (root || document).querySelectorAll('select[data-ds-typeahead]:not([multiple])').forEach(function (sel) {
      if (!sel.tomselect) {
        if (typeof window.makeTomSelect === 'function' && sel.id) window.makeTomSelect(sel.id, 1);
        else if (typeof window.TomSelect === 'function') build(sel);
      }
      announce(sel);
    });
  }
  window.dsTypeahead = { init: init };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(); }); else init();
  document.addEventListener('htmx:afterSettle', function (e) { init(e.target); });
})();
