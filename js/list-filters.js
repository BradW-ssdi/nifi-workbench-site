/* List screen behavior shared by every table screen (Phase 2 dynamic queue pattern).
   Reference implementation: in the app the server renders the chips and swaps rows with HTMX.

   Column filter chips are Phase 2's own component: queues/queueFilterChips.html, js/chip.js, and
   styles/chips.css in the app. The markup below uses Phase 2's structure and class names, inside a .ds-phase2
   wrapper so the design system stylesheets leave it to Phase 2's CSS. In the app, render the Phase 2 fragment
   there as it is and keep chip.js; this script only stands in for chip.js in the design system templates, with
   the same behavior and announcements.

   Markup contract (Phase 2 names)
   - #filterChipsDiv[data-list-chips]: the chip row. data-table is the table id, data-noun the plural row name.
   - One .chipsWithSubMenu[data-column] per chip, holding .chip-button (label span, optional operator select
     and value span when filtered, .chip-expand, and .remove-filter on added chips) and its
     .dropdown-menu.custom-dropdown submenu (id <chip id>-subMenu). data-chip-type="S" marks a standard chip (Phase 2
     type S): always shown, no close button, cleared with Clear selection. Chips added from Filter (Phase 2 type D)
     have a close button. data-values="A|B" on .chipsWithSubMenu marks a filter applied on load (data-op="!=" for
     not equals, data-blanks to include blank rows).
   - #filtersButtonDiv: the Filter button (#filtersId) after the last chip, and its column menu (#filterButtonId),
     listing the columns without a standard chip (or only those named in data-addable="A|B" on #filterChipsDiv).
     Hidden when there is nothing to add.
   - #clearFiltersDiv: "| Reset", after the Filter button, shown only while a filter is applied.
   - #filterStatus (role="status"): every change is announced there.
   - Footer: .ds-table-footer holding #pageSummary, a Bootstrap .pagination whose .page-link buttons are named
     "Previous page", "Page N", "Next page", and #pageSize.

   Keyboard
   - Enter or Space on a chip's expand button opens its menu and moves focus to the first control in it.
   - Escape in a menu, or on its button, closes it and returns focus to the button.
   - Update applies the checked values; Clear selection removes the chip's filter; the close button removes the
     chip. Reset removes every filter, the text filter, and the sort. */
(function () {
  'use strict';

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function text(el) { return (el.textContent || '').replace(/\s+/g, ' ').trim(); }
  /* A cell's value for filtering. An empty cell holds only a visually hidden "None", so a cell whose text is all
     visually hidden counts as blank. */
  function cellValue(td) {
    if (!td) return '';
    var walk = document.createTreeWalker(td, NodeFilter.SHOW_TEXT), n, seen = false;
    while ((n = walk.nextNode())) if (n.nodeValue.trim() && !(n.parentNode.closest && n.parentNode.closest('.visually-hidden'))) { seen = true; break; }
    return seen ? text(td) : '';
  }
  function camel(s) { return s.replace(/[^A-Za-z0-9]+(.)?/g, function (m, c) { return c ? c.toUpperCase() : ''; }).replace(/^./, function (c) { return c.toLowerCase(); }); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  var ICON = function (name, size) { return '<span class="material-symbols-rounded" aria-hidden="true" style="font-size:' + size + 'px;">' + name + '</span>'; };

  function initFilters() {
    var bar = $('[data-list-chips]');
    var status = document.getElementById('filterStatus');
    var table = bar && (document.getElementById(bar.getAttribute('data-table')) || $('.ds-table'));
    if (!bar || !table) return;
    var tbody = table.tBodies[0];
    var noun = bar.getAttribute('data-noun') || 'rows';
    var headers = $$('thead th', table).map(text);
    var filterDiv = $('#filtersButtonDiv', bar), filterBtn = $('#filtersId', bar), filterMenu = $('#filterButtonId', bar);
    var resetDiv = $('#clearFiltersDiv', bar), resetBtn = $('#clearFilters', bar);
    var textFilter = document.getElementById('filterInput');
    var originalOrder = Array.prototype.slice.call(tbody.rows);
    var originalSort = $$('th[aria-sort]', table).map(function (th) { return [th, th.getAttribute('aria-sort')]; });
    var active = {};           /* column -> { op: '=' | '!=', values: [...] } */
    var open = null;           /* { button, menu } */

    function say(msg) { if (status) { status.textContent = ''; window.setTimeout(function () { status.textContent = msg; }, 50); } }
    function shownCount() { return Array.prototype.filter.call(tbody.rows, function (r) { return !r.hidden && !r.classList.contains('ds-row-filtered'); }).length; }
    function counts() { return shownCount() + ' of ' + tbody.rows.length + ' ' + noun + ' shown.'; }
    function valuesOf(col) {
      var idx = headers.indexOf(col), out = [];
      Array.prototype.forEach.call(tbody.rows, function (r) { var v = cellValue(r.cells[idx]); if (v && out.indexOf(v) === -1) out.push(v); });
      return out.sort(function (a, b) { return a.localeCompare(b); });
    }

    function applyRows() {
      Array.prototype.forEach.call(tbody.rows, function (r) {
        var keep = Object.keys(active).every(function (col) {
          var idx = headers.indexOf(col);
          if (idx < 0 || !r.cells[idx]) return true;
          var v = cellValue(r.cells[idx]), hit = v === '' ? active[col].blanks : active[col].values.indexOf(v) !== -1;
          return active[col].op === '!=' ? !hit : hit;
        });
        r.classList.toggle('ds-row-filtered', !keep);
      });
      syncSummary();
      if (resetDiv) resetDiv.style.display = Object.keys(active).length ? '' : 'none';
    }

    /* When every result fits on one page, the item count follows the filters. With server paging the
       count comes from the server instead. */
    function syncSummary() {
      var summary = $('.ds-page-summary');
      if (!summary) return;
      var m = text(summary).match(/of\s+([0-9,]+)/);
      if (!m || parseInt(m[1].replace(/,/g, ''), 10) > tbody.rows.length) return;
      var n = shownCount();
      summary.textContent = n ? 'Items 1 - ' + n + ' of ' + n : 'Items 0 - 0 of 0';
    }

    /* Phase 2's chip value: the value, or Multiple (n), with ", Blanks" when blank rows are included. */
    function describe(f) {
      var v = f.values.length > 1 ? 'Multiple (' + f.values.length + ')' : f.values[0] || '';
      return f.blanks ? (v ? v + ', Blanks' : 'Blanks') : v;
    }
    function spoken(f) { return f.values.concat(f.blanks ? ['blank'] : []).join(' or '); }

    function chipOf(col) { return $$('.chipsWithSubMenu', bar).filter(function (w) { return w.getAttribute('data-column') === col; })[0]; }

    /* The chip shows its filter the way Phase 2 does: label, operator select, and the value, or Multiple (n). */
    function renderChip(wrap) {
      var col = wrap.getAttribute('data-column'), chip = $('.chip-button', wrap), id = chip.id;
      var f = active[col];
      chip.classList.toggle('chip-filtered', !!f);
      var opWrap = $('.chip-op', chip), value = $('#' + id + '-chipValue', chip);
      if (!f) { if (opWrap) opWrap.remove(); if (value) value.remove(); return; }
      if (!opWrap) {
        opWrap = document.createElement('div');
        opWrap.className = 'd-inline-block position-relative chip-op';
        opWrap.innerHTML = '<select class="chip-operator rounded-pill" id="' + id + '-chipOperator" style="margin-left:10px" aria-label="' + esc(col) + ' filter operator"><option value="=">= (equals)</option><option value="!=">!= (not equals)</option></select>';
        $('#' + id + '-chipLabel', chip).after(opWrap);
        $('select', opWrap).addEventListener('change', function (e) {
          active[col].op = e.target.value; applyRows();
          say(col + ' filter ' + (e.target.value === '=' ? 'equals' : 'does not equal') + ' the selected values. ' + counts());
        });
      }
      $('select', opWrap).value = f.op;
      if (!value) { value = document.createElement('span'); value.id = id + '-chipValue'; value.style.fontWeight = 'normal'; opWrap.after(value); }
      value.textContent = describe(f);
    }

    function close(returnFocus) {
      if (!open) return;
      var o = open; open = null;
      o.menu.classList.remove('show');
      o.button.setAttribute('aria-expanded', 'false');
      /* Focus moves after the collapsed state reaches the accessibility tree; focusing in the same task
         made NVDA announce the button as still expanded. */
      if (returnFocus) window.setTimeout(function () { o.button.focus(); }, 30);
    }
    function show(button, menu) {
      close(false);
      menu.classList.add('show');
      /* Keep the menu on screen: a chip near the right edge would open its menu past it (Phase 2 positions its
         Filter menu with Popper; these menus are placed by CSS alone). */
      menu.style.transform = '';
      var over = menu.getBoundingClientRect().right - (document.documentElement.clientWidth - 8);
      if (over > 0) menu.style.transform = 'translateX(' + (-Math.ceil(over)) + 'px)';
      button.setAttribute('aria-expanded', 'true');
      open = { button: button, menu: menu };
      var first = $('input, select, textarea, button, a[href]', menu);
      if (first) first.focus();
    }

    /* A chip's submenu, built from the column's values the first time it opens (Phase 2 renders it on the server). */
    function buildMenu(wrap) {
      var col = wrap.getAttribute('data-column'), id = $('.chip-button', wrap).id, menu = $('#' + id + '-subMenu', wrap);
      if (menu.hasAttribute('data-built')) return menu;
      menu.setAttribute('data-built', '');
      var html = '<select class="form-select mb-2 submenu-operator" id="' + id + '-operator" aria-label="' + esc(col) + ' filter operator in the menu"><option value="=">= (equals)</option><option value="!=">!= (not equals)</option></select>' +
        '<input autocomplete="off" class="form-control mb-2" placeholder="Search to filter..." style="border-radius: 10px" aria-label="Filter ' + esc(col) + ' options" id="' + id + '-typeahead" type="search">' +
        '<div style="width: 100%; max-height: 250px; overflow-y: auto;" id="' + id + '-divcheckboxlist" role="group" aria-label="' + esc(col) + ' values">' +
        '<div class="form-check mb-2"><input class="form-check-input" type="checkbox" id="' + id + '-selectAllRadio" data-select-all><label class="form-check-label" for="' + id + '-selectAllRadio">Select All</label></div>' +
        '<div class="form-check mb-2"><input class="form-check-input" type="checkbox" id="' + id + '-blanksCheckbox" data-blanks><label class="form-check-label" for="' + id + '-blanksCheckbox">Blanks</label></div>' +
        '<div id="' + id + '-divcheckboxlistInner">';
      valuesOf(col).forEach(function (v, i) {
        html += '<div class="form-check mb-2"><input class="form-check-input" type="checkbox" id="' + id + '-option-' + i + '" value="' + esc(v) + '"><label class="form-check-label" for="' + id + '-option-' + i + '">' + esc(v) + '</label></div>';
      });
      html += '</div></div><p class="visually-hidden" role="status" id="' + id + '-count"></p>' +
        '<button type="button" class="clear-selection clear-selection-data-entered d-block mt-2" id="' + id + '-clearSelection">Clear selection</button>' +
        '<button class="btn btn-primary btn-sm btn-add mb-2" id="' + id + '-updateButton" type="button"><i class="bi bi-plus" aria-hidden="true"></i> Update</button>';
      menu.innerHTML = html;
      var all = $('[data-select-all]', menu), blanks = $('[data-blanks]', menu), search = $('input[type="search"]', menu), count = $('[role="status"]', menu), t;
      /* Select All covers Blanks and every value, as in Phase 2. */
      var boxes = function () { return $$('input[type="checkbox"]:not([data-select-all]):not([data-blanks])', menu); };
      function syncAll() {
        var visible = boxes().filter(function (b) { return !b.parentNode.hidden; }).concat(blanks);
        var on = visible.filter(function (b) { return b.checked; }).length;
        all.checked = visible.length > 0 && on === visible.length;
        all.indeterminate = on > 0 && on < visible.length;
      }
      menu.syncAll = syncAll;
      all.addEventListener('change', function () { boxes().forEach(function (b) { if (!b.parentNode.hidden) b.checked = all.checked; }); blanks.checked = all.checked; syncAll(); });
      menu.addEventListener('change', function (e) { if (e.target.type === 'checkbox' && !e.target.hasAttribute('data-select-all')) syncAll(); });
      search.addEventListener('input', function () {
        window.clearTimeout(t);
        t = window.setTimeout(function () {
          var q = search.value.trim().toLowerCase(), n = 0;
          boxes().forEach(function (b) { var hit = !q || b.value.toLowerCase().indexOf(q) !== -1; b.parentNode.hidden = !hit; if (hit) n++; });
          syncAll();
          count.textContent = q ? n + ' of ' + boxes().length + ' options shown' : '';
        }, 250);
      });
      $('#' + id + '-updateButton', menu).addEventListener('click', function () {
        var picked = boxes().filter(function (b) { return b.checked; }).map(function (b) { return b.value; });
        var op = $('.submenu-operator', menu).value;
        if ((!picked.length && !blanks.checked) || (picked.length === boxes().length && blanks.checked && op === '=')) delete active[col];
        else active[col] = { op: op, values: picked, blanks: blanks.checked };
        renderChip(wrap); applyRows(); close(true);
        say(active[col] ? 'Filter applied: ' + col + (op === '=' ? ' is ' : ' is not ') + spoken(active[col]) + '. ' + counts() : 'Filter removed: ' + col + '. ' + counts());
      });
      $('#' + id + '-clearSelection', menu).addEventListener('click', function () {
        boxes().forEach(function (b) { b.checked = false; });
        blanks.checked = false;
        syncAll();
        delete active[col];
        renderChip(wrap); applyRows(); close(true);
        say('Filter removed: ' + col + '. ' + counts());
      });
      return menu;
    }

    function wireChip(wrap) {
      var col = wrap.getAttribute('data-column'), chip = $('.chip-button', wrap), id = chip.id;
      var expand = $('.chip-expand', chip), remove = $('.remove-filter', chip);
      expand.addEventListener('click', function (e) {
        e.stopPropagation();
        if (open && open.button === expand) { close(false); return; }
        var menu = buildMenu(wrap), f = active[col];
        $$('input[type="checkbox"]:not([data-select-all]):not([data-blanks])', menu).forEach(function (b) { b.checked = f ? f.values.indexOf(b.value) !== -1 : true; });
        $('[data-blanks]', menu).checked = f ? !!f.blanks : true;
        $('.submenu-operator', menu).value = f ? f.op : '=';
        menu.syncAll();
        show(expand, menu);
      });
      if (remove) remove.addEventListener('click', function () {
        var had = !!active[col];
        delete active[col];
        close(false);
        wrap.remove();
        var box = document.getElementById(id + '-check'); if (box) box.checked = false;
        applyRows();
        say(col + ' filter removed' + (had ? '. ' + counts() : '.'));
        filterBtn.focus();
      });
    }

    function addChip(col) {
      var id = camel(col);
      var wrap = document.createElement('div');
      wrap.className = 'chipsWithSubMenu';
      wrap.setAttribute('data-column', col);
      wrap.innerHTML = '<div class="chip-button chip-to-filter rounded-pill d-flex align-items-center chip badge me-2 ps-3" id="' + id + '">' +
        '<span id="' + id + '-chipLabel">' + esc(col) + '</span>' +
        '<button type="button" class="chip-expand" aria-haspopup="true" aria-expanded="false" aria-controls="' + id + '-subMenu" aria-label="Edit ' + esc(col) + ' filter">' + ICON('expand_more', 18) + '</button>' +
        '<button type="button" class="btn-close ms-2 remove-filter" style="width:2px" aria-label="Remove ' + esc(col) + ' filter"></button></div>' +
        '<div class="dropdown-menu custom-dropdown dropdown typeahead-container" id="' + id + '-subMenu"></div>';
      bar.insertBefore(wrap, filterDiv);
      wireChip(wrap);
      return wrap;
    }

    /* The Filter button's menu lists the table's columns; checking one adds its chip, unchecking removes it. */
    function addableColumns() {
      var listed = bar.getAttribute('data-addable');
      return headers.filter(function (h) {
        if (!h || /^actions?$/i.test(h) || h.indexOf('Select') === 0) return false;
        if (standardChip(h)) return false;
        return listed ? listed.split('|').indexOf(h) !== -1 : true;
      });
    }
    function standardChip(col) { var w = chipOf(col); return !!(w && w.getAttribute('data-chip-type') === 'S'); }

    function buildFilterMenu() {
      var cols = addableColumns();
      var html = '<input aria-label="Search to filter the list of columns" autocomplete="off" class="form-control mb-2" id="typeaheadFilters-typeahead" placeholder="Search to filter..." style="border-radius: 10px" type="search">' +
        '<div id="checkbox-list" style="width: 100%; max-height: 250px; overflow-y: auto;" role="group" aria-label="Columns to filter by">';
      cols.forEach(function (c) {
        var id = camel(c);
        html += '<div class="form-check"><input class="form-check-input typeahead-checkbox" id="' + id + '-check" value="' + esc(c) + '" type="checkbox"' + (chipOf(c) ? ' checked' : '') + '><label class="form-check-label" for="' + id + '-check">' + esc(c) + '</label></div>';
      });
      filterMenu.innerHTML = html + '</div>';
      var search = $('input[type="search"]', filterMenu), t;
      search.addEventListener('input', function () {
        window.clearTimeout(t);
        t = window.setTimeout(function () {
          var q = search.value.trim().toLowerCase();
          $$('.form-check', filterMenu).forEach(function (row) { row.hidden = q && text(row).toLowerCase().indexOf(q) === -1; });
        }, 250);
      });
      filterMenu.addEventListener('change', function (e) {
        var col = e.target.value; if (!col) return;
        if (e.target.checked) { if (!chipOf(col)) addChip(col); say(col + ' filter added. Its menu is the ' + col + ' button before Filter.'); }
        else { var w = chipOf(col); if (w) { delete active[col]; w.remove(); applyRows(); } say(col + ' filter removed. ' + counts()); }
      });
    }

    /* Filters present on load (data-values on .chipsWithSubMenu) filter the rows too, so the table never
       contradicts a chip. */
    $$('.chipsWithSubMenu', bar).forEach(function (wrap) {
      var col = wrap.getAttribute('data-column');
      if (wrap.hasAttribute('data-values') && headers.indexOf(col) !== -1) active[col] = { op: wrap.getAttribute('data-op') || '=', values: wrap.getAttribute('data-values').split('|').filter(Boolean), blanks: wrap.hasAttribute('data-blanks') };
      wireChip(wrap);
      renderChip(wrap);
    });
    applyRows();
    // Filter shows only when there are columns to add (Phase 2 shows it only when the queue has dynamic filters)
    if (filterDiv && !addableColumns().length) filterDiv.hidden = true;

    filterBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (open && open.button === filterBtn) { close(false); return; }
      buildFilterMenu();
      show(filterBtn, filterMenu);
    });

    /* Escape closes the open menu. Caught on window in the capture phase: in the Phase 2 layout Bootstrap's dropdown
       keyboard handler listens on document in the capture phase too, and for a .dropdown-menu without a
       data-bs-toggle button (these menus, and Phase 2's own chip menus) it throws. */
    window.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || !open) return;
      if (open.menu.contains(e.target) || open.button === e.target) { e.preventDefault(); e.stopPropagation(); close(true); }
    }, true);
    document.addEventListener('click', function (e) {
      if (open && !open.menu.contains(e.target) && !open.button.contains(e.target)) close(false);
    });

    /* Reset (Phase 2's "| Reset"): every filter value, the text filter, and the sort go back to how the page loaded. */
    if (resetBtn) resetBtn.addEventListener('click', function () {
      close(false);
      active = {};
      // chips added from Filter go; standard chips stay, cleared
      $$('.chipsWithSubMenu:not([data-chip-type="S"])', bar).forEach(function (w) { w.remove(); });
      $$('.chipsWithSubMenu', bar).forEach(renderChip);
      if (textFilter && textFilter.value) { textFilter.value = ''; Array.prototype.forEach.call(tbody.rows, function (r) { r.hidden = false; }); }
      $$('th[aria-sort]', table).forEach(function (th) { th.removeAttribute('aria-sort'); });
      originalSort.forEach(function (p) { p[0].setAttribute('aria-sort', p[1]); });
      originalOrder.forEach(function (r) { tbody.appendChild(r); });
      applyRows();
      say('Filters and sorting reset. Showing all ' + tbody.rows.length + ' ' + noun + '.');
      var first = $('.chipsWithSubMenu .chip-expand', bar) || filterBtn;
      first.focus();
    });
  }


  function initPagination() {
    $$('.ds-table-footer').forEach(function (footer) {
      var nav = $('.pagination', footer);
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
          b.classList.toggle('active', current);
          if (current) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
        });
        if (prev) { prev.disabled = page === 1; prev.classList.toggle('disabled', prev.disabled); }
        if (next) { next.disabled = page === last; next.classList.toggle('disabled', next.disabled); }
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
