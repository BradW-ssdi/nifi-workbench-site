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
   - A group's name (button.ds-secnav-group-title, Phase 2's secondary nav group; also on the WDS view page) shows and
     hides its links; its chevron points up while they show.
   - dsModalNav.reset(dialog) opens the nav as Phase 2's does on every load (Phase 3 review, Team B slide 7: it stayed
     collapsed after it was collapsed once): the links shown, every group open, the first link current. The pages call
     it when a dialog opens. */
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
      setNav(t, t.getAttribute('aria-expanded') !== 'true');
      return;
    }
    var g = e.target.closest('.ds-secnav-group-title[aria-controls]');
    if (g) setGroup(g, g.getAttribute('aria-expanded') !== 'true');
  });

  function setGroup(g, open) {
    g.setAttribute('aria-expanded', String(open));
    var list = document.getElementById(g.getAttribute('aria-controls'));
    if (list) list.hidden = !open;
    var glyph = g.querySelector('.material-symbols-rounded');
    if (glyph) glyph.textContent = open ? 'keyboard_arrow_up' : 'keyboard_arrow_down';
  }
  function setNav(t, open) {
    t.setAttribute('aria-expanded', String(open));
    t.setAttribute('data-bs-title', open ? 'Hide section links' : 'Show section links');
    var bt = window.bootstrap && bootstrap.Tooltip && bootstrap.Tooltip.getInstance(t);   /* the Phase 2 frame's tooltips are Bootstrap's */
    if (bt) bt.setContent({ '.tooltip-inner': t.getAttribute('data-bs-title') });
    var glyph = t.querySelector('.material-symbols-rounded');
    if (glyph) glyph.textContent = open ? 'left_panel_close' : 'left_panel_open';
    var layout = t.closest('.ds-modal-layout');
    if (layout) layout.classList.toggle('is-nav-collapsed', !open);
  }

  window.dsModalNav = {
    reset: function (dlg) {
      $$('.ds-modal-nav-toggle', dlg).forEach(function (t) { setNav(t, true); });
      $$('.ds-modal-nav .ds-secnav-group-title[aria-controls]', dlg).forEach(function (g) { setGroup(g, true); });
      $$('.ds-modal-nav a[aria-current]', dlg).forEach(function (x) { x.removeAttribute('aria-current'); });
      var first = dlg && dlg.querySelector('.ds-modal-nav a.nav-link');
      if (first) first.setAttribute('aria-current', 'location');
    }
  };
})();
