/* Design system search screens: criteria first, then results (the code table screens in Lab Management: SNOMEDs,
   LOINCs, laboratories, and the links between them). Reference behavior for form[data-ds-search].

   Contracts (keep them when wiring the server):
   - Criteria: each field with data-match="<key>" matches that key of a result row. A select with data-op-for="<id>"
     sets how its field matches: CT (contains) or = (equal). Matching ignores case.
   - At least one: data-either="<id>,<id>" on the form with data-either-msg: Search needs one of those fields.
     [required] fields are required as usual. Problems show in the error summary (#errorSummary, #errorList); each
     field gets aria-invalid and its message, and the summary links focus the field.
   - Results: #results stays hidden until the first search. Its heading (#resultsTitle, tabindex="-1") takes focus
     after a search and says how many were found; the count is also written to the status region (#searchStatus).
     No match shows #noResults instead of the table.
   - Rows: the result rows come from the server. Here they come from the JSON in #searchData; each row's actions are
     links named for the row (data-row-label="<key>").
   - Clear empties the criteria, hides the results, and says so; focus stays on Clear. */
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
  var labelKey = table.getAttribute('data-row-label');

  function setError(f, msg) {
    var err = document.getElementById(f.id + '-error'), d = (f.getAttribute('aria-describedby') || '').split(' ').filter(function (x) { return x && (!err || x !== err.id); });
    f.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (err) { err.textContent = msg || ''; err.hidden = !msg; if (msg) d.push(err.id); }
    if (d.length) f.setAttribute('aria-describedby', d.join(' ')); else f.removeAttribute('aria-describedby');
  }
  function fields() { return $$('[data-match]', form); }
  function problems() {
    var bad = [];
    $$('[required]', form).forEach(function (f) { if (!f.value.trim()) bad.push([f, f.getAttribute('data-errmsg')]); });
    var either = form.getAttribute('data-either');
    if (either) {
      var ids = either.split(','), filled = ids.some(function (id) { return document.getElementById(id).value.trim(); });
      if (!filled) bad.push([document.getElementById(ids[0]), form.getAttribute('data-either-msg')]);
    }
    return bad;
  }
  function match(row) {
    return fields().every(function (f) {
      var q = f.value.trim().toLowerCase(); if (!q) return true;
      var v = String(row[f.getAttribute('data-match')] || '').toLowerCase();
      var op = $('[data-op-for="' + f.id + '"]', form);
      return op && op.value === '=' ? v === q : v.indexOf(q) !== -1;
    });
  }
  function render(rows) {
    tbody.innerHTML = rows.map(function (r) {
      var label = esc(r[labelKey]);
      var acts = actions.map(function (a) { return '<a href="' + esc(a.href) + '" aria-label="' + esc(a.label) + ' ' + label + '"><svg class="ds-icon" aria-hidden="true"><use href="../../icons/sprite.svg#' + a.icon + '"/></svg></a>'; }).join('');
      return '<tr>' + (actions.length ? '<td class="ds-row-actions">' + acts + '</td>' : '') + cols.map(function (c, i) { return (i === 0 ? '<th scope="row">' : '<td>') + (r[c] ? esc(r[c]) : '<span class="visually-hidden">None</span>') + (i === 0 ? '</th>' : '</td>'); }).join('') + '</tr>';
    }).join('');
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
    var rows = data.filter(match), n = rows.length;
    render(rows);
    results.hidden = false;
    table.closest('.ds-table-frame').hidden = n === 0;
    none.hidden = n > 0;
    var said = n === 0 ? 'No ' + nouns + ' found' : n + ' ' + (n === 1 ? noun : nouns) + ' found';
    title.textContent = 'Search results: ' + said;
    status.textContent = said + '.';
    title.focus();
  });
  form.addEventListener('reset', function () {
    setTimeout(function () {
      fields().concat($$('[required]', form)).forEach(function (f) { setError(f, ''); });
      summary.hidden = true; results.hidden = true;
      status.textContent = 'Search cleared.';
    }, 0);
  });
  $$('[required]', form).concat(fields()).forEach(function (f) { f.setAttribute('aria-invalid', 'false'); });
})();
