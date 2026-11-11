/* Sort for a list whose rows are all on the page: Phase 2's sort header behavior (table-sort.js) on
   table[data-ds-sort] th[data-sort].

   Markup (scripts/screens/p2chips.py sort_head()): th scope="col" id="<name>Column" tabindex="0" data-sort="<cell index>"
   aria-sort="none" with span (the label) and i.bi.sortable-icon; the sorted th is .sorted with aria-sort ascending or
   descending and the caret (bi-caret-up-fill, bi-caret-down-fill).
   - A click on the th sorts by its column, ascending first, then the other way. Enter and Space sort from the keyboard
     (508 2.1.1); Phase 2's th sorts on click only.
   - Dates (MM/DD/YYYY at the start of the cell, with the time when there is one) sort as dates, numbers as numbers, the rest as text, ignoring case.
   - The order is announced in #filterStatus (the search pages' #searchStatus).
   - Rows replaced by a search (the table fires ds-rows-changed, js/ds-search.js) are put in the current order again.
   DEV: in the app the server sorts (Phase 2's hx-post on the th); keep the aria-sort, the caret, and the keys. */
(function () {
  'use strict';
  if (window.dsTableSort) return;
  window.dsTableSort = true;
  var DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?)?/;

  function key(cell) {
    var t = (cell ? cell.textContent : '').trim(), d = DATE.exec(t);
    if (d) return { n: new Date(+d[3], +d[1] - 1, +d[2], +(d[4] || 0), +(d[5] || 0), +(d[6] || 0), +((d[7] || '0') + '00').slice(0, 3)).getTime() };
    if (t !== '' && !isNaN(+t.replace(/,/g, ''))) return { n: +t.replace(/,/g, '') };
    return { s: t.toLowerCase() };
  }
  function compare(a, b) {
    if (a.n !== undefined && b.n !== undefined) return a.n - b.n;
    return String(a.s !== undefined ? a.s : a.n).localeCompare(String(b.s !== undefined ? b.s : b.n), undefined, { numeric: true });
  }
  function order(table) {
    var th = table.querySelector('th[data-sort][aria-sort="ascending"], th[data-sort][aria-sort="descending"]');
    if (!th) return;
    var col = +th.getAttribute('data-sort'), dir = th.getAttribute('aria-sort') === 'ascending' ? 1 : -1, tbody = table.tBodies[0];
    var rows = Array.prototype.slice.call(tbody.rows);
    rows.sort(function (a, b) { return dir * compare(key(a.cells[col]), key(b.cells[col])); });
    rows.forEach(function (r) { tbody.appendChild(r); });
  }
  function sortBy(table, th) {
    var dir = th.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
    table.querySelectorAll('th[data-sort]').forEach(function (t) {
      t.setAttribute('aria-sort', 'none'); t.classList.remove('sorted');
      var i = t.querySelector('.sortable-icon'); if (i) i.className = 'bi sortable-icon';
    });
    th.setAttribute('aria-sort', dir); th.classList.add('sorted');
    var icon = th.querySelector('.sortable-icon'); if (icon) icon.className = 'bi ' + (dir === 'ascending' ? 'bi-caret-up-fill' : 'bi-caret-down-fill') + ' sortable-icon';
    order(table);
    var status = document.getElementById('filterStatus') || document.getElementById('searchStatus');
    if (status) status.textContent = 'Sorted by ' + th.textContent.trim() + ', ' + dir;
  }
  function init() {
    document.querySelectorAll('table[data-ds-sort]').forEach(function (table) {
      table.querySelectorAll('th[data-sort]').forEach(function (th) {
        th.addEventListener('click', function () { sortBy(table, th); });
        th.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sortBy(table, th); } });
      });
      order(table);
      table.addEventListener('ds-rows-changed', function () { order(table); });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
