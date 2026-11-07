/* Section links in a dialog (Phase 3 review, Team B: View, Add, and Edit Condition need a side nav, as Phase 2's
   Patient Events dialog). Markup (scss/_extensions.scss):

     .ds-modal-layout
       aside.ds-modal-aside
         button.ds-modal-nav-toggle  aria-expanded, aria-controls = the nav
         nav.ds-modal-nav            a.nav-link href="#<section id>"
       .ds-modal-content             the sections (.accordion.ds-form-accordion)

   - A link opens its section (by clicking the section's own button, so the page's accordion script and Collapse All
     stay in step), scrolls the dialog body to it, marks the link aria-current="location", and moves focus to the
     section's button.
   - The toggle collapses the links to itself and back, as Phase 2's secondary nav does; its tooltip and icon follow.
   - dsModalNav.reset(dialog) clears the current link; the pages call it when a dialog opens. */
(function () {
  'use strict';
  if (window.dsModalNav) return;
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  document.addEventListener('click', function (e) {
    var a = e.target.closest('.ds-modal-nav a[href^="#"]');
    if (a) {
      e.preventDefault();
      var sec = document.getElementById(a.getAttribute('href').slice(1));
      if (!sec) return;
      var btn = sec.querySelector('.accordion-button');
      if (btn && btn.getAttribute('aria-expanded') !== 'true') btn.click();
      $$('a', a.closest('.ds-modal-nav')).forEach(function (x) { x.removeAttribute('aria-current'); });
      a.setAttribute('aria-current', 'location');
      sec.scrollIntoView({ block: 'start' });
      if (btn) btn.focus();
      return;
    }
    var t = e.target.closest('.ds-modal-nav-toggle');
    if (t) {
      var open = t.getAttribute('aria-expanded') !== 'true';
      t.setAttribute('aria-expanded', String(open));
      t.setAttribute('data-bs-title', open ? 'Hide section links' : 'Show section links');
      var bt = window.bootstrap && bootstrap.Tooltip && bootstrap.Tooltip.getInstance(t);   /* the Phase 2 frame's tooltips are Bootstrap's */
      if (bt) bt.setContent({ '.tooltip-inner': t.getAttribute('data-bs-title') });
      var use = t.querySelector('use');
      if (use) use.setAttribute('href', use.getAttribute('href').replace(/#.*/, open ? '#left_panel_close' : '#left_panel_open'));
      var layout = t.closest('.ds-modal-layout');
      if (layout) layout.classList.toggle('is-nav-collapsed', !open);
    }
  });

  window.dsModalNav = {
    reset: function (dlg) { $$('.ds-modal-nav a[aria-current]', dlg).forEach(function (x) { x.removeAttribute('aria-current'); }); }
  };
})();
