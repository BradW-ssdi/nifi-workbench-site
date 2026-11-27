/* The summary card collapses to its first row while the content scrolls (Phase 3 review, Team A slide 7: "Only first
   row should show on scroll of page"), as Phase 2's js/sum-collapse.js does on its view and add pages.

   Markup (Phase 2's): the card is #case-summary (card summary py-2 px-3) with its first row .sum-primary, then
   .sum-divider and the .sum-extra rows; <div id="summary-sentinel" style="height:1px"></div> is the first thing in the
   scrolling content (.scrollspy). When the sentinel scrolls out of view the card gets .is-compact, which hides the
   divider and the extra rows (Phase 2's CSS; css/ds.css, scss/_p2-view.scss, in the design preview). At 992px wide
   or less (and at high zoom) the card stays whole, so its height does not move the sentinel and flicker (1.4.10).

   In the app and in the workbench's Phase 2 layout, Phase 2's script does this and marks the card
   data-initialized="true"; this script then leaves it alone. */
(function () {
  'use strict';
  function init() {
    ['case-summary', 'case-summary-left', 'case-summary-right'].forEach(function (id) {
      var card = document.getElementById(id), sentinel = document.getElementById('summary-sentinel');
      if (!card || !sentinel || card.dataset.initialized === 'true' || !window.IntersectionObserver) return;
      card.dataset.initialized = 'true';
      new IntersectionObserver(function (entries) {
        var e = entries[0]; if (!e) return;
        card.classList.toggle('is-compact', window.innerWidth > 992 && !e.isIntersecting);
      }).observe(sentinel);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
