/* Design system search screens: criteria first, then results (the code table screens in Lab Management: SNOMEDs,
   LOINCs, laboratories, and the links between them). Reference behavior for form[data-ds-search].

   Contracts (keep them when wiring the server):
   - Criteria: each field with data-match="<key>" matches that key of a result row. A select with data-op-for="<id>"
     sets how its field matches: CT (contains) or = (equal). Matching ignores case.
   - Dates: a field with data-match-from="<key>" or data-match-to="<key>" keeps rows whose date (MM/DD/YYYY at the
     start of the value) is on or after, or on or before, it. Date fields (data-date) must be MM/DD/YYYY, and
     data-range="<fromId>,<toId>" with data-range-msg rejects a To before the From.
   - Checkbox groups: checkboxes with data-match-any="<key>" keep rows whose value is one of the checked values; a
     fieldset with data-require-one and data-errmsg needs at least one checked.
   - At least one: data-either="<id>,<id>[,...]" on the form with data-either-msg: Search needs one of those fields.
     [required] fields are required as usual. Problems show in the error summary (#errorSummary, #errorList); each
     field gets aria-invalid and its message, and the summary links focus the field.
   - Results: #results stays hidden until the first search. Its heading (#resultsTitle, tabindex="-1") takes focus
     after a search and says how many were found; the count is also written to the status region (#searchStatus).
     No match shows #noResults instead of the table.
   - Rows: the result rows come from the server. Here they come from the JSON in #searchData; each row's actions are
     links named for the row (data-row-label="<key>"). An action with "dialog" (view or edit) is a button instead,
     data-record="<dialog>" with data-key="<row key>" (data-row-key on the table, or the row label), for
     js/ds-record.js. Each row carries data-key.
   - window.dsSearch: { data, label, rows() (the rows shown), add(row), refresh() } so js/ds-record.js can show a saved
     or added row without a new search.
   - Clear empties the criteria, hides the results, and says so; focus stays on Clear.
   - Read-only chips: a form with data-criteria-chips lists the criteria of the last search in #filterChipsDiv, as
     Phase 2's read-only chips (gray, the -readOnly ids, as on Merge Patients). Each filled field is a chip: its label,
     how it matched (contains, is, on or after, on or before), and its value. They show what the results are for while
     the fields above are changed, and they go with the results on Clear. */
(function () {
  'use strict';
  var form = document.querySelector('form[data-ds-search]');
  if (!form) return;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  var data = JSON.parse($('#searchData').textContent);
  var results = $('#results'), table = $('#resultsTable'), tbody = $('tbody', table), title = $('#resultsTitle'), none = $('#noResults'), status = $('#searchStatus');
  var summary = $('#errorSummary'), list = $('#errorList');
  var noun = form.getAttribute('data-noun'), nouns = form.getAttribute('data-nouns');
  var cols = JSON.parse(table.getAttribute('data-columns')), actions = JSON.parse(table.getAttribute('data-actions') || '[]');
  var labelKey = table.getAttribute('data-row-label'), rowKey = table.getAttribute('data-row-key') || labelKey;

  function setError(f, msg) {
    var err = document.getElementById(f.id + '-error'), d = (f.getAttribute('aria-describedby') || '').split(' ').filter(function (x) { return x && (!err || x !== err.id); });
    f.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (err) { err.textContent = msg || ''; err.hidden = !msg; if (msg) d.push(err.id); }
    if (d.length) f.setAttribute('aria-describedby', d.join(' ')); else f.removeAttribute('aria-describedby');
  }
  function fields() { return $$('[data-match], [data-match-from], [data-match-to]', form); }
  var DATE = /^(\d{2})\/(\d{2})\/(\d{4})/;
  function dateOf(v) { var m = DATE.exec(String(v || '').trim()); return m ? new Date(+m[3], +m[1] - 1, +m[2]).getTime() : null; }
  function problems() {
    var bad = [];
    $$('[required]', form).forEach(function (f) { if (!f.value.trim()) bad.push([f, f.getAttribute('data-errmsg')]); });
    $$('[data-date]', form).forEach(function (f) {
      if (f.value.trim() && !/^\d{2}\/\d{2}\/\d{4}$/.test(f.value.trim())) bad.push([f, f.getAttribute('data-format-msg')]);
    });
    $$('fieldset[data-require-one]', form).forEach(function (fs) {
      if (!$$('input[type=checkbox]:checked', fs).length) bad.push([$('input[type=checkbox]', fs), fs.getAttribute('data-errmsg')]);
    });
    var range = form.getAttribute('data-range');
    if (range) {
      var r = range.split(','), a = dateOf(document.getElementById(r[0]).value), z = dateOf(document.getElementById(r[1]).value);
      if (a !== null && z !== null && z < a) bad.push([document.getElementById(r[1]), form.getAttribute('data-range-msg')]);
    }
    var either = form.getAttribute('data-either');
    if (either) {
      var ids = either.split(','), filled = ids.some(function (id) { return document.getElementById(id).value.trim(); });
      if (!filled) bad.push([document.getElementById(ids[0]), form.getAttribute('data-either-msg')]);
    }
    return bad;
  }
  function match(row) {
    var groups = {};
    $$('[data-match-any]', form).forEach(function (c) { var k = c.getAttribute('data-match-any'); groups[k] = groups[k] || []; if (c.checked) groups[k].push(c.value.toLowerCase()); });
    var inGroups = Object.keys(groups).every(function (k) { return groups[k].indexOf(String(row[k] || '').toLowerCase()) !== -1; });
    return inGroups && fields().every(function (f) {
      var q = f.value.trim().toLowerCase(); if (!q) return true;
      if (f.hasAttribute('data-match-from')) { var d = dateOf(row[f.getAttribute('data-match-from')]); return d !== null && d >= dateOf(q); }
      if (f.hasAttribute('data-match-to')) { var d2 = dateOf(row[f.getAttribute('data-match-to')]); return d2 !== null && d2 <= dateOf(q); }
      var v = String(row[f.getAttribute('data-match')] || '').toLowerCase();
      var op = $('[data-op-for="' + f.id + '"]', form);
      return op && op.value === '=' ? v === q : v.indexOf(q) !== -1;
    });
  }
  /* A Status column shows the status badge, as the other lists (Phase 3 review, Team A slide 5: status as a badge) */
  var BADGE = { success: 'text-bg-success', active: 'text-bg-success', failure: 'text-bg-danger', inactive: 'text-bg-secondary' };
  function cell(c, v) { return c === 'status' ? '<span class="badge ' + (BADGE[String(v).toLowerCase()] || 'text-bg-secondary') + '">' + esc(v) + '</span>' : esc(v); }
  function render(rows) {
    tbody.innerHTML = rows.map(function (r) {
      var label = esc(r[labelKey]), key = esc(r[rowKey]);
      var acts = actions.map(function (a) {
        var icon = '<span class="ds-icon material-symbols-rounded" aria-hidden="true">' + a.icon + '</span>';
        if (a.dialog) return '<button type="button" class="btn btn-light rounded-circle btn-sm" data-record="' + a.dialog + '" data-key="' + key + '" aria-haspopup="dialog" aria-label="' + esc(a.label) + ' ' + label + '" data-bs-toggle="tooltip" data-bs-custom-class="custom-tooltip" data-bs-title="' + esc(a.label) + '">' + icon + '</button>';
        return '<a class="btn btn-light rounded-circle btn-sm" href="' + esc(a.href) + '" aria-label="' + esc(a.label) + ' ' + label + '" data-bs-toggle="tooltip" data-bs-custom-class="custom-tooltip" data-bs-title="' + esc(a.label) + '">' + icon + '</a>';
      }).map(function (a) { return '<td class="ds-row-actions">' + a + '</td>'; }).join('');   /* a column per button (Team A, Slack 11-10 and 11-12) */
      return '<tr data-key="' + key + '">' + acts + cols.map(function (c, i) { return (i === 0 ? '<th scope="row">' : '<td>') + (r[c] ? cell(c, r[c]) : '<span class="visually-hidden">None</span>') + (i === 0 ? '</th>' : '</td>'); }).join('') + '</tr>';
    }).join('');
    table.dispatchEvent(new CustomEvent('ds-rows-changed', { bubbles: true }));   // js/list-filters.js starts its filters over
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var bad = problems();
    fields().concat($$('[required]', form)).forEach(function (f) { setError(f, ''); });
    list.innerHTML = '';
    if (bad.length) {
      bad.forEach(function (b) {
        setError(b[0], b[1]);
        var li = document.createElement('li'), a = document.createElement('a');
        a.href = '#' + b[0].id; a.textContent = b[1];
        a.addEventListener('click', function (ev) { ev.preventDefault(); b[0].focus(); });
        li.appendChild(a); list.appendChild(li);
      });
      summary.hidden = false; summary.focus(); return;
    }
    summary.hidden = true;
    /* DEV: the server searches; these rows stand in for its results. */
    shown = data.filter(match);
    show();
    chips();
    status.textContent = title.textContent.replace('Search results: ', '') + '.';
    title.focus();
  });
  var shown = [];
  /* the criteria of the last search as read-only chips (data-criteria-chips) */
  var chipBox = form.hasAttribute('data-criteria-chips') && document.getElementById('filterChipsDiv');
  var CHIP_PART = 'font-weight: normal; margin-left: 6px; white-space: normal; overflow-wrap: anywhere; text-align: left;';
  function labelOf(f) {
    var l = form.querySelector('label[for="' + f.id + '"]');
    return l ? l.textContent.replace(/\*/g, '').replace(/\s+/g, ' ').replace(/:\s*$/, '').trim() : f.getAttribute('aria-label') || f.id;   // a chip names the field without Phase 2's label colon
  }
  function criteria() {
    var out = [], groups = {};
    fields().forEach(function (f) {
      var v = f.value.trim(); if (!v) return;
      if (f.tagName === 'SELECT') { out.push([f.id, labelOf(f), 'is', f.options[f.selectedIndex].textContent.trim()]); return; }
      if (f.hasAttribute('data-match-from')) { out.push([f.id, labelOf(f), 'on or after', v]); return; }
      if (f.hasAttribute('data-match-to')) { out.push([f.id, labelOf(f), 'on or before', v]); return; }
      var op = $('[data-op-for="' + f.id + '"]', form);
      out.push([f.id, labelOf(f), op && op.value === '=' ? 'is' : 'contains', v]);
    });
    $$('[data-match-any]:checked', form).forEach(function (c) {
      var k = c.getAttribute('data-match-any');
      if (!groups[k]) { var lg = c.closest('fieldset') && $('legend', c.closest('fieldset')); groups[k] = [k, lg ? lg.textContent.trim() : k, 'is', []]; out.push(groups[k]); }
      groups[k][3].push(c.value);
    });
    return out.map(function (c) { return Array.isArray(c[3]) ? [c[0], c[1], c[2], c[3].join(' or ')] : c; });
  }
  function chips() {
    if (!chipBox) return;
    chipBox.innerHTML = '';
    criteria().forEach(function (c) {
      var wrap = document.createElement('div'), chip = document.createElement('div');
      wrap.className = 'chipsWithSubMenu';
      chip.className = 'chip-button chip-read-only rounded-pill d-flex align-items-center chip badge me-2 ps-3';
      chip.id = c[0] + '-readOnly';
      [[c[1], c[0] + '-chipLabel-readOnly', ''], [c[2], c[0] + '-chipOperator-readOnly', 'chip-operator-read-only'], [c[3], c[0] + '-chipValue', 'chip-value-read-only']].forEach(function (part, i) {
        var span = document.createElement('span');
        span.textContent = part[0]; span.id = part[1];
        if (part[2]) { span.className = part[2]; span.setAttribute('style', CHIP_PART); }
        if (i) chip.appendChild(document.createTextNode(' '));   /* a space between the parts for screen readers */
        chip.appendChild(span);
      });
      wrap.appendChild(chip);
      chipBox.appendChild(wrap);
    });
    document.getElementById('filterChips').hidden = !chipBox.children.length;
  }
  function show() {
    var n = shown.length;
    render(shown);
    results.hidden = false;
    table.closest('.table-wrapper').hidden = n === 0;
    none.hidden = n > 0;
    title.textContent = 'Search results: ' + (n === 0 ? 'No ' + nouns + ' found' : n + ' ' + (n === 1 ? noun : nouns) + ' found');
  }
  window.dsSearch = {
    data: data, label: labelKey, key: rowKey,
    rows: function () { return shown; },
    add: function (row) { data.push(row); shown.push(row); show(); },
    refresh: show
  };
  form.addEventListener('reset', function () {
    setTimeout(function () {
      fields().concat($$('[required]', form)).forEach(function (f) { setError(f, ''); });
      summary.hidden = true; results.hidden = true;
      status.textContent = 'Search cleared.';
    }, 0);
  });
  $$('[required]', form).concat(fields()).forEach(function (f) { f.setAttribute('aria-invalid', 'false'); });
})();
