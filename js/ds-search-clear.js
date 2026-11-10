/* The clear button in Search to filter (Phase 3 review, Team B: when text is entered, an x should let the user quickly
   clear it), as Phase 2's type-to-filter fragment (queues/fragments/typeToFilterFragment.html: #clearButton, "Clear
   filter text", btn btn-link with the close icon, gray, inside the end of the field, shown only while the field has
   text). In the app that fragment has the button; in the design system templates this script adds it.

   - Every input[type=search] with the placeholder "Search to filter..." gets one, in a .ds-search-wrap around the
     field (scss/_extensions.scss). The browser's own clear control is hidden there, so there is one x.
   - It shows while the field has text, after typing, a paste, or a script that fills or empties the field (it follows
     the field after every input, search, change, click, and key release on the page, so Reset hides it too).
   - Clicking it empties the field, sends input and search events (the list filters again: htmx's "input changed" and
     "search" triggers and the list scripts listen for them), puts focus back in the field, and hides itself.
   - Loaded on every screen by js/app-frame.js. */
(function () {
  'use strict';
  if (window.dsSearchClear) return;
  window.dsSearchClear = true;
  var SEL = 'input[type="search"][placeholder^="Search to filter"]';

  function sync(input) {
    var b = input.__dsClear;
    if (b) b.hidden = !input.value;
  }
  function add(input) {
    if (input.__dsClear || input.hasAttribute('data-ds-clear')) return;
    var wrap = document.createElement('span');
    wrap.className = 'ds-search-wrap';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-link ds-search-clear';
    b.setAttribute('aria-label', 'Clear filter text');
    if (input.id) b.setAttribute('aria-controls', input.id);
    // Phase 2's glyph: Material Symbols Rounded "close", 24px (Phase 3 review: the X was a different icon)
    b.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">close</span>';
    b.hidden = true;
    b.addEventListener('click', function () {
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('search', { bubbles: true }));
      b.hidden = true;
      input.focus();
    });
    wrap.appendChild(b);
    input.__dsClear = b;
    sync(input);
  }
  function all() { Array.prototype.forEach.call(document.querySelectorAll(SEL), function (i) { add(i); sync(i); }); }

  ['input', 'search', 'change', 'keyup'].forEach(function (t) {
    document.addEventListener(t, function (e) { if (e.target && e.target.matches && e.target.matches(SEL)) sync(e.target); }, true);
  });
  /* a script that empties or fills the field (Reset, a restored search) */
  document.addEventListener('click', function () { setTimeout(all, 0); });
  document.addEventListener('htmx:afterSettle', all);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', all); else all();
})();
