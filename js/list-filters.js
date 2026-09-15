/* List screen behavior shared by every table screen (Phase 2 dynamic queue pattern).
   Reference implementation: in the app the server renders the panel values and swaps
   rows with HTMX. Keep every aria update and every announcement below.

   Markup contract
   - Filter chip: <button type="button" class="ds-chip" data-filter-column="Program Area"
     aria-expanded="false">. It is a disclosure button, not a listbox. The script adds
     aria-controls and builds the panel from the column's values. DEV: render the panel
     on the server with the code set values (Phase 2 codedValueCheckboxList) and put its
     id in aria-controls.
   - Chip row: #columnFilters. The panel is inserted right after it, in the page flow, so
     it never covers content and reflows at 320px.
   - Status: #filterStatus (role="status"). Every change is announced there.
   - Applied filter: <button class="ds-chip is-filtered" data-chip data-chip-column="...">
     removes itself on click.
   - Footer: #pageSummary, .ds-pagination with "Previous page", "Page N", "Next page"
     buttons, and #pageSize.

   Keyboard
   - Enter or Space on a chip opens its panel and moves focus to the panel search.
   - Escape anywhere in the panel, or on the chip, closes it and returns focus to the chip.
   - Update applies the checked values; Clear selection removes the filter. Both close
     the panel and return focus to the chip. */
(function () {
  'use strict';

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function text(el) { return (el.textContent || '').replace(/\s+/g, ' ').trim(); }
  function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

  function initFilters() {
    var row = document.getElementById('columnFilters');
    var status = document.getElementById('filterStatus');
    var table = $('.ds-table-frame .ds-table') || $('.ds-table');
    if (!row || !table) return;
    var tbody = table.tBodies[0];
    var headers = $$('thead th', table).map(text);
    var clearLink = document.getElementById('clearFilters');
    var active = {};
    var openChip = null;

    function say(msg) { if (status) { status.textContent = ''; window.setTimeout(function () { status.textContent = msg; }, 50); } }
    function shownCount() { return Array.prototype.filter.call(tbody.rows, function (r) { return !r.hidden && !r.classList.contains('ds-row-filtered'); }).length; }

    function applyRows() {
      Array.prototype.forEach.call(tbody.rows, function (r) {
        var keep = Object.keys(active).every(function (col) {
          var idx = headers.indexOf(col);
          if (idx < 0 || !r.cells[idx]) return true;
          return active[col].indexOf(text(r.cells[idx])) !== -1;
        });
        r.classList.toggle('ds-row-filtered', !keep);
      });
    }

    function appliedChip(col) { return $('[data-chip-column="' + col.replace(/"/g, '') + '"]', row); }

    function setApplied(col, values) {
      var old = appliedChip(col);
      if (old) old.parentNode.removeChild(old);
      if (!values.length) { delete active[col]; return; }
      active[col] = values;
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'ds-chip is-filtered';
      chip.setAttribute('data-chip', '');
      chip.setAttribute('data-chip-column', col);
      chip.setAttribute('aria-label', 'Remove filter: ' + col + ' ' + values.join(', '));
      chip.innerHTML = '<span></span><svg class="ds-icon" aria-hidden="true"><use href="../../icons/sprite.svg#close"/></svg>';
      chip.firstChild.textContent = col + ': ' + values.join(', ');
      row.insertBefore(chip, clearLink || null);
    }

    function closePanel(returnFocus) {
      if (!openChip) return;
      var chip = openChip;
      var panel = document.getElementById(chip.getAttribute('aria-controls'));
      chip.setAttribute('aria-expanded', 'false');
      if (panel) panel.hidden = true;
      openChip = null;
      if (returnFocus) chip.focus();
    }

    function buildPanel(chip, col) {
      var id = 'filter-' + slug(col);
      var idx = headers.indexOf(col);
      var values = [];
      Array.prototype.forEach.call(tbody.rows, function (r) {
        var v = r.cells[idx] ? text(r.cells[idx]) : '';
        if (v && values.indexOf(v) === -1) values.push(v);
      });
      values.sort(function (a, b) { return a.localeCompare(b); });
      var panel = document.createElement('div');
      panel.className = 'ds-filter-panel';
      panel.id = id;
      panel.hidden = true;
      panel.setAttribute('role', 'group');
      panel.setAttribute('aria-labelledby', id + '-title');
      panel.innerHTML =
        '<p class="ds-filter-panel-title" id="' + id + '-title"></p>' +
        '<input type="search" class="ds-input ds-input-search" id="' + id + '-search" autocomplete="off" placeholder="Search to filter...">' +
        '<fieldset class="ds-filter-options" id="' + id + '-options"><legend class="ds-sr-only"></legend>' +
        '<label class="ds-check ds-filter-all"><input type="checkbox" data-select-all> Select all</label></fieldset>' +
        '<p class="ds-sr-only" role="status" id="' + id + '-count"></p>' +
        '<div class="ds-filter-panel-actions">' +
        '<button type="button" class="ds-btn ds-btn-outline ds-btn-round" data-clear>Clear selection</button>' +
        '<button type="button" class="ds-btn ds-btn-primary ds-btn-round" data-apply>Update</button></div>';
      $('.ds-filter-panel-title', panel).textContent = col;
      $('input[type="search"]', panel).setAttribute('aria-label', 'Filter ' + col + ' options');
      $('legend', panel).textContent = col + ' values';
      var fieldset = $('fieldset', panel);
      values.forEach(function (v) {
        var label = document.createElement('label');
        label.className = 'ds-check';
        var box = document.createElement('input');
        box.type = 'checkbox';
        box.value = v;
        label.appendChild(box);
        label.appendChild(document.createTextNode(' ' + v));
        fieldset.appendChild(label);
      });
      row.parentNode.insertBefore(panel, row.nextSibling);
      chip.setAttribute('aria-controls', id);

      var all = $('[data-select-all]', panel);
      var boxes = function () { return $$('input[type="checkbox"]:not([data-select-all])', panel); };
      function syncAll() {
        var visible = boxes().filter(function (b) { return !b.parentNode.hidden; });
        var on = visible.filter(function (b) { return b.checked; }).length;
        all.checked = visible.length > 0 && on === visible.length;
        all.indeterminate = on > 0 && on < visible.length;
      }
      all.addEventListener('change', function () {
        boxes().forEach(function (b) { if (!b.parentNode.hidden) b.checked = all.checked; });
        syncAll();
      });
      panel.addEventListener('change', function (e) { if (!e.target.hasAttribute('data-select-all')) syncAll(); });
      var search = $('input[type="search"]', panel), count = $('[role="status"]', panel), t;
      search.addEventListener('input', function () {
        window.clearTimeout(t);
        t = window.setTimeout(function () {
          var q = search.value.trim().toLowerCase(), n = 0;
          boxes().forEach(function (b) { var hit = !q || b.value.toLowerCase().indexOf(q) !== -1; b.parentNode.hidden = !hit; if (hit) n++; });
          syncAll();
          count.textContent = q ? n + ' of ' + boxes().length + ' options shown' : '';
        }, 250);
      });
      $('[data-apply]', panel).addEventListener('click', function () {
        var picked = boxes().filter(function (b) { return b.checked; }).map(function (b) { return b.value; });
        if (picked.length === boxes().length) picked = [];
        setApplied(col, picked);
        applyRows();
        closePanel(true);
        say((picked.length ? 'Filter applied: ' + col + ' is ' + picked.join(' or ') + '. ' : 'Filter removed: ' + col + '. ') + shownCount() + ' of ' + tbody.rows.length + ' rows shown.');
      });
      $('[data-clear]', panel).addEventListener('click', function () {
        boxes().forEach(function (b) { b.checked = false; });
        syncAll();
        setApplied(col, []);
        applyRows();
        closePanel(true);
        say('Filter removed: ' + col + '. ' + shownCount() + ' of ' + tbody.rows.length + ' rows shown.');
      });
      panel.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { e.preventDefault(); closePanel(true); }
      });
      return panel;
    }

    $$('[data-filter-column]', row).forEach(function (chip) {
      var col = chip.getAttribute('data-filter-column');
      if (headers.indexOf(col) === -1) return;
      var panel = null;
      chip.addEventListener('click', function () {
        if (openChip === chip) { closePanel(false); return; }
        closePanel(false);
        panel = panel || buildPanel(chip, col);
        var picked = active[col] || [];
        $$('input[type="checkbox"]:not([data-select-all])', panel).forEach(function (b) { b.checked = picked.indexOf(b.value) !== -1; });
        panel.dispatchEvent(new Event('change'));
        chip.setAttribute('aria-expanded', 'true');
        panel.hidden = false;
        openChip = chip;
        $('input[type="search"]', panel).focus();
      });
      chip.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && openChip === chip) { e.preventDefault(); closePanel(true); }
      });
    });

    document.addEventListener('click', function (e) {
      if (!openChip) return;
      var panel = document.getElementById(openChip.getAttribute('aria-controls'));
      if (openChip.contains(e.target) || (panel && panel.contains(e.target))) return;
      closePanel(false);
    });

    row.addEventListener('click', function (e) {
      var chip = e.target.closest('[data-chip-column]');
      if (!chip) return;
      var col = chip.getAttribute('data-chip-column');
      var next = chip.nextElementSibling || chip.previousElementSibling;
      setApplied(col, []);
      applyRows();
      say('Filter removed: ' + col + '. ' + shownCount() + ' of ' + tbody.rows.length + ' rows shown.');
      if (next) next.focus();
    });

    if (clearLink) clearLink.addEventListener('click', function () {
      closePanel(false);
      Object.keys(active).forEach(function (col) { setApplied(col, []); });
      applyRows();
    });
  }

  function initPagination() {
    $$('.ds-footer-pagination').forEach(function (footer) {
      var nav = $('.ds-pagination', footer);
      var summary = $('.ds-page-summary', footer);
      var size = $('select', footer);
      var status = document.getElementById('filterStatus');
      if (!nav || !summary) return;
      var m = text(summary).match(/of\s+([0-9,]+)/);
      if (!m) return;
      var total = parseInt(m[1].replace(/,/g, ''), 10);
      var prev = $('[aria-label="Previous page"]', nav), next = $('[aria-label="Next page"]', nav);
      var nums = $$('button', nav).filter(function (b) { return /^Page \d+$/.test(b.getAttribute('aria-label') || ''); });
      var page = 1;
      function perPage() { return size ? parseInt(size.value, 10) || 25 : 25; }
      function pages() { return Math.max(1, Math.ceil(total / perPage())); }
      function render(announce) {
        var last = pages();
        page = Math.min(Math.max(page, 1), last);
        var start = Math.max(1, Math.min(page - Math.floor(nums.length / 2), last - nums.length + 1));
        nums.forEach(function (b, i) {
          var n = start + i;
          b.hidden = n > last;
          b.textContent = String(n);
          b.setAttribute('aria-label', 'Page ' + n);
          var current = n === page;
          b.classList.toggle('is-active', current);
          if (current) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
        });
        if (prev) prev.disabled = page === 1;
        if (next) next.disabled = page === last;
        var a = (page - 1) * perPage() + 1, z = Math.min(page * perPage(), total);
        summary.textContent = 'Items ' + a + ' - ' + z + ' of ' + total;
        if (announce && status) { status.textContent = ''; window.setTimeout(function () { status.textContent = 'Page ' + page + ' of ' + last + '. Items ' + a + ' - ' + z + ' of ' + total + '.'; }, 50); }
      }
      nav.addEventListener('click', function (e) {
        var b = e.target.closest('button');
        if (!b || b.disabled) return;
        var label = b.getAttribute('aria-label') || '';
        if (label === 'Previous page') page--;
        else if (label === 'Next page') page++;
        else if (/^Page \d+$/.test(label)) page = parseInt(b.textContent, 10);
        render(true);
        /* Keep focus on a real control: a button that just became disabled loses it. */
        if (b.disabled || b.hidden) { var cur = $('[aria-current="page"]', nav); if (cur) cur.focus(); }
      });
      if (size) size.addEventListener('change', function () { page = 1; render(false); if (status) { status.textContent = ''; window.setTimeout(function () { status.textContent = 'Showing ' + perPage() + ' items per page. Page 1 of ' + pages() + '.'; }, 50); } });
      render(false);
    });
  }

  function init() { initFilters(); initPagination(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
