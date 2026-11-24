/* Add and Edit Algorithm: the Resulted Test and Coded Result searches (PI planning, Team A slide 13), as Phase 2's
   two-step search dialogs (pagedataentry/labreports/resultedTestModalFragments.html, codedResultModalFragments.html).
   Markup: scripts/screens/wds-lab-search.py.

   - Search beside the field ([data-search-dialog="<modal id>"] on the field, js/ds-form.js) opens the dialog on its
     search form, empty, the short list chosen, focus in the field.
   - Submit with the field empty shows the error at the top of the form (Phase 2's alert) and marks the field invalid
     (aria-invalid; js/ds-errors.js gives it .is-invalid and the label the error color); focus stays in the field.
     Enter in the field submits.
   - Submit with text shows the results in the same dialog: the search criteria in legacy's words ("Your Search
     Criteria: Resulted Test contains 'hep' resulted in 2 possible matches."), announced; the table (the long list of
     tests adds Method, System and Priority), Phase 2's "No Data Found" row when nothing matches; the pager; focus on the
     results title.
   - Search to filter narrows the rows (any column), and the pager and the count follow. The headers sort
     (js/ds-table-sort.js); the pager follows the new order. Table Settings: Compact Rows (js/table-settings.js).
   - Select on a row fills the field with "<name> (<code>)" (legacy's populateResultedTestName), keeps the code in
     data-code, closes the dialog, focus back on Search, and says what was set.
   - New Search goes back to the form empty; Refine Search goes back to it as it was submitted.
   - Tab and Shift+Tab stay in the dialog. The X, Cancel, and Escape close the dialog (Escape closes an open Table Settings menu first); focus goes back to
     Search. Phase 2's search dialogs do not ask before closing, so these do not (data-no-confirm).
   DEV: the server searches (Phase 2's hx-post search-resulted-test and search-coded-result); filter, sort and paging
   are the server's, as Phase 2's results table. The sample lists are in #labSearchData. */
(function () {
  'use strict';
  var dataEl = document.getElementById('labSearchData');
  if (!dataEl || !window.dsDialog) return;
  var DATA = JSON.parse(dataEl.textContent);
  var formStatus = document.getElementById('formStatus');
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function say(el, msg) { if (!el) return; el.textContent = ''; setTimeout(function () { el.textContent = msg; }, 80); }

  $$('.ds-lab-search').forEach(function (modal) {
    var kind = modal.getAttribute('data-lab-search');
    var form = $('form[data-step="search"]', modal), results = $('[data-step="results"]', modal);
    var field = $('input[type="text"]', form), alertBox = $('.alert-danger', form), alertMsg = alertBox.querySelector('span:not([aria-hidden])');
    var table = $('table', results), tbody = $('tbody', table), filter = $('input.search', results);
    var status = $('[data-table-status]', results), criteria = $('[id$="-criteria"]', results), title = $('[id$="-results-title"]', results);
    var summary = $('.ds-page-summary', results), pager = $('.pagination', results), size = $('.ds-page-size select', results);
    var noun = modal.getAttribute('data-noun'), target = null, opener = null, last = null, page = 1;

    function step(name) {
      form.hidden = name !== 'search';
      results.hidden = name !== 'results';
      modal.setAttribute('aria-labelledby', (name === 'search' ? $('.modal-title', form) : title).id);
    }
    function setError(on) {
      alertBox.classList.toggle('d-none', !on);
      alertBox.classList.toggle('d-flex', on);
      if (on) { field.setAttribute('aria-invalid', 'true'); field.setAttribute('aria-describedby', alertMsg.id); }
      else { field.removeAttribute('aria-invalid'); field.removeAttribute('aria-describedby'); }
    }
    function fillForm(v) {
      field.value = v ? v.q : '';
      var radios = $$('input[type="radio"]', form);
      radios.forEach(function (r, i) { r.checked = v ? r.value === v.list : i === 0; });
      setError(false);
    }
    function showForm(v) { fillForm(v); step('search'); field.focus(); }

    function open(f, btn) {
      target = f; opener = btn; last = null;
      fillForm(null); step('search');
      dsDialog.show(modal);
      field.focus();
    }
    function close() {
      dsDialog.hide(modal);
      tbody.innerHTML = '';
      if (opener) opener.focus();
    }

    /* the results: rows in the table (sorted as the headers say), then the filter and the pager */
    function render() {
      var list = last.list, q = last.q.toLowerCase();
      var rows = (DATA[kind][list] || []).filter(function (r) { return r[0].toLowerCase().indexOf(q) !== -1 || r[1].toLowerCase().indexOf(q) !== -1; });
      var extra = $$('th[data-list]', table);
      extra.forEach(function (th) { th.hidden = th.getAttribute('data-list') !== list; });
      var shown = 2 + extra.filter(function (th) { return !th.hidden; }).length;
      var rowId = modal.getAttribute('data-row-id'), tip = modal.getAttribute('data-select-tip');
      tbody.innerHTML = rows.length ? rows.map(function (r, i) {
        var label = r[1] + ' (' + r[0] + ')';
        var cells = r.slice(0, shown).map(function (v) { return '<td class="align-top">' + esc(v) + '</td>'; }).join('');
        /* the row's button as the queues' row actions (Phase 2's btn-light rounded-circle btn-sm in td.ds-row-actions) */
        return '<tr id="' + rowId + i + '" data-code="' + esc(r[0]) + '" data-label="' + esc(label) + '"><td class="ds-row-actions">' +
          '<button type="button" class="btn btn-light rounded-circle btn-sm" data-select aria-label="Select ' + esc(label) + '" data-bs-toggle="tooltip" data-bs-custom-class="custom-tooltip" data-bs-title="' + esc(tip) + '">' +
          '<span class="ds-icon material-symbols-rounded" aria-hidden="true">check_circle</span></button></td>' + cells + '</tr>';
      }).join('') : '<tr class="text-center py-2" data-empty><td colspan="' + (shown + 1) + '">No Data Found</td></tr>';
      var words = 'Your Search Criteria: ' + modal.getAttribute('data-criteria') + " contains '" + last.q + "' resulted in " + rows.length + ' possible matches.';
      criteria.textContent = words;
      filter.value = '';
      page = 1;
      table.dispatchEvent(new CustomEvent('ds-rows-changed'));
      paginate();
      return words;
    }
    function matching() {
      var q = filter.value.trim().toLowerCase();
      return $$('tr:not([data-empty])', tbody).filter(function (tr) { return !q || tr.textContent.toLowerCase().indexOf(q) !== -1; });
    }
    function paginate() {
      var all = $$('tr:not([data-empty])', tbody), hits = matching(), per = parseInt(size.value, 10) || 10;
      var pages = Math.max(1, Math.ceil(hits.length / per));
      if (page > pages) page = pages;
      var from = (page - 1) * per;
      all.forEach(function (tr) { tr.hidden = true; });
      hits.slice(from, from + per).forEach(function (tr) { tr.hidden = false; });
      var empty = $('tr[data-empty]', tbody);
      if (all.length && !hits.length) {
        if (!empty) { empty = document.createElement('tr'); empty.className = 'text-center py-2'; empty.setAttribute('data-empty', ''); empty.setAttribute('data-filtered', ''); tbody.appendChild(empty); }
        empty.innerHTML = '<td colspan="' + (table.tHead.rows[0].querySelectorAll('th:not([hidden])').length) + '">No Data Found</td>';
      } else if (empty && empty.hasAttribute('data-filtered')) empty.remove();
      summary.textContent = hits.length ? 'Items ' + (from + 1) + ' - ' + Math.min(from + per, hits.length) + ' of ' + hits.length : 'Items 0 - 0 of 0';
      var b = '<li class="page-item"><button type="button" class="page-link' + (page === 1 ? ' disabled' : '') + '" data-page="' + (page - 1) + '" aria-label="Previous page"' + (page === 1 ? ' disabled' : '') + '>Previous</button></li>';
      for (var n = 1; n <= pages; n++) b += '<li class="page-item"><button type="button" class="page-link' + (n === page ? ' active" aria-current="page' : '') + '" data-page="' + n + '" aria-label="Page ' + n + '">' + n + '</button></li>';
      b += '<li class="page-item"><button type="button" class="page-link' + (page === pages ? ' disabled' : '') + '" data-page="' + (page + 1) + '" aria-label="Next page"' + (page === pages ? ' disabled' : '') + '>Next</button></li>';
      pager.innerHTML = b;
      return hits.length;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = field.value.trim(), list = ($('input[type="radio"]:checked', form) || {}).value;
      if (!q || !list) { setError(true); field.focus(); return; }
      setError(false);
      last = { q: q, list: list };
      step('results');
      var words = render();
      title.focus();
      say(status, words);
    });
    field.addEventListener('input', function () { if (field.value.trim()) setError(false); });

    var ft;
    filter.addEventListener('input', function () {
      clearTimeout(ft);
      ft = setTimeout(function () {
        page = 1;
        var n = paginate(), q = filter.value.trim();
        say(status, q ? n + ' ' + (n === 1 ? noun.replace(/s$/, '') : noun) + ' shown' : 'Filter cleared. ' + n + ' ' + noun + '.');
      }, 250);
    });
    size.addEventListener('change', function () { page = 1; paginate(); });
    pager.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-page]');
      if (!btn || btn.disabled) return;
      page = parseInt(btn.getAttribute('data-page'), 10);
      var name = btn.getAttribute('aria-label');
      paginate();
      /* focus stays on the button pressed; Previous or Next that is now disabled hands it to the current page */
      var same = $('[aria-label="' + name + '"]', pager);
      (same && !same.disabled ? same : $('[aria-current="page"]', pager)).focus();
    });
    /* a sort reorders every row; the page shows the first rows of the new order */
    $$('th[data-sort]', table).forEach(function (th) {
      th.addEventListener('click', function () { setTimeout(function () { page = 1; paginate(); }, 0); });
      th.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') setTimeout(function () { page = 1; paginate(); }, 0); });
    });

    tbody.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-select]');
      if (!btn) return;
      var tr = btn.closest('tr');
      target.value = tr.getAttribute('data-label');
      target.setAttribute('data-code', tr.getAttribute('data-code'));
      target.dispatchEvent(new Event('change', { bubbles: true }));
      close();
      say(formStatus, modal.getAttribute('data-criteria').replace(/ Description$/, '') + ' set to ' + target.value + '.');
    });
    $('[data-new-search]', results).addEventListener('click', function () { showForm(null); });
    $('[data-refine-search]', results).addEventListener('click', function () { showForm(last); });
    $$('[data-close]', modal).forEach(function (b) { b.addEventListener('click', close); });
    modal.addEventListener('keydown', function (e) {
      /* focus stays in the dialog: Tab and Shift+Tab wrap among the controls of the step shown (js/ds-dialog.js leaves the trap to the screen) */
      if (e.key === 'Tab') {
        var f = $$('input, select, textarea, button, [href], [tabindex="0"]', modal).filter(function (el) { return !el.disabled && el.offsetParent; });
        if (!f.length) return;
        var a = document.activeElement, i = f.indexOf(a);
        if (i === -1) {
          /* focus on the results title (tabindex -1) or the dialog itself: the next control after it, or the one before */
          var after = f.filter(function (el) { return a.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING; });
          var before = f.filter(function (el) { return after.indexOf(el) === -1; });
          e.preventDefault();
          (e.shiftKey ? (before[before.length - 1] || f[f.length - 1]) : (after[0] || f[0])).focus();
        }
        else if (e.shiftKey && i === 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
        return;
      }
      if (e.key !== 'Escape') return;
      if ($('.dropdown-menu.show', modal)) return;   /* the Table Settings menu closes first (Bootstrap, or js/table-settings.js) */
      e.preventDefault(); e.stopPropagation(); close();
    });

    $$('[data-search-dialog="' + modal.id + '"]').forEach(function (f) {
      var btn = $('[data-lookup-search]', f.closest('.ds-lookup'));
      btn.addEventListener('click', function () { open(f, btn); });
    });
  });
})();
