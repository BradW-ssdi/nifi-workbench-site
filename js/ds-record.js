/* Record dialogs on search screens: View, Edit, and Add New for the rows of js/ds-search.js, as the current Lab
   Management screens show them on the search page itself, so the results stay in place.

   Markup (generated with the page):
   - #recordSpec (JSON): { noun, key, keyLabel, fields: [{ key, label, type: text | select | check | textarea,
     required, keyField, from, viewOnly }] }. viewOnly: listed in View, not on the form. keyField: typed on Add, read only on Edit. from: the id of a search criteria select
     whose choice the record takes (shown read only).
   - #viewDialog: #viewTitle, a <dl id="viewList">, and #viewEdit (optional) to edit the record shown.
   - #formDialog: #formTitle, a field per spec field with id "rf-<key>" and "rf-<key>-error"; a key field also has a
     read-only <dl id="rf-<key>-ro"> for Edit; a "from" field has only that read-only list. #formSave saves.
   - #recordStatus (role="status"); the Add button [data-record="add"]; row buttons [data-record="view|edit"][data-key].

   View lists every field. Edit and Add check the required fields: each message sits under its field and focus goes to
   the first problem; a message clears as soon as its field is edited (input, so it does not vanish on blur and move
   Save mid-click). Add also refuses a key already in use. A good save updates or adds the row, says so, and returns
   focus to the row's button (to the new row's View or Edit after Add). Cancel, Close, and Escape return focus to the
   control that opened the dialog; Tab stays in the dialog. DEV: the server saves the record and checks the key. */
(function () {
  'use strict';
  var specEl = document.getElementById('recordSpec');
  if (!specEl || !window.dsSearch) return;
  function $(id) { return document.getElementById(id); }
  var spec = JSON.parse(specEl.textContent), S = window.dsSearch;
  var viewDlg = $('viewDialog'), formDlg = $('formDialog'), status = $('recordStatus');
  var opener = null, openAct = null, current = null, mode = null;
  function say(m) { status.textContent = ''; setTimeout(function () { status.textContent = m; }, 60); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function find(key) { return S.data.filter(function (r) { return String(r[spec.key]) === String(key); })[0]; }
  function fixedValue(f) { var sel = $(f.from); return sel && sel.value ? sel.value : ''; }
  function fixedText(f) { var sel = $(f.from); return sel && sel.selectedIndex > 0 ? sel.options[sel.selectedIndex].text : ''; }
  function shown(v) { return v === undefined || v === null || v === '' ? 'None' : v; }

  function setError(el, msg) {
    var err = $(el.id + '-error');
    if (!err) return;
    var ids = (el.getAttribute('aria-describedby') || '').split(' ').filter(function (i) { return i && i !== err.id; });
    err.textContent = msg || ''; err.hidden = !msg;
    if (msg) { el.setAttribute('aria-invalid', 'true'); ids.push(err.id); } else el.removeAttribute('aria-invalid');
    if (ids.length) el.setAttribute('aria-describedby', ids.join(' ')); else el.removeAttribute('aria-describedby');
  }
  /* which row button opened the dialog: the rows are drawn again after a save, so the button itself is gone by then */
  function show(dlg, from) { opener = from; openAct = from && from.closest('#resultsTable') ? from.getAttribute('data-record') : null; dsDialog.show(dlg); }
  function close(dlg, back) { dsDialog.hide(dlg); if (back !== false && opener) opener.focus(); }

  function openView(row, from) {
    current = row;
    $('viewTitle').textContent = 'View ' + spec.noun;
    $('viewList').innerHTML = spec.fields.map(function (f) {
      return '<div><dt>' + esc(f.label) + '</dt><dd>' + esc(shown(row[f.key])) + '</dd></div>';
    }).join('');
    show(viewDlg, from);
  }
  function openForm(row, from) {
    current = row; mode = row ? 'edit' : 'add';
    $('formTitle').textContent = (row ? 'Edit ' : 'Add ') + spec.noun;
    spec.fields.forEach(function (f) {
      if (f.viewOnly) return;
      var el = $('rf-' + f.key), ro = $('rf-' + f.key + '-ro');
      if (f.from) { ro.querySelector('dd').textContent = shown(row ? row[f.key + 'Text'] || row[f.key] : fixedText(f)); return; }
      if (el) setError(el, '');
      if (f.keyField) { el.closest('.ds-field').hidden = !!row; ro.hidden = !row; if (row) ro.querySelector('dd').textContent = row[f.key]; }
      if (f.type === 'check') el.checked = row ? row[f.key] === 'Yes' : false;
      else el.value = row ? (row[f.key] || '') : '';
    });
    show(formDlg, from);
  }
  function save() {
    var bad = [];
    spec.fields.forEach(function (f) {
      var el = $('rf-' + f.key);
      if (!el || f.from || f.viewOnly) return;
      setError(el, '');
      if (f.required && el.offsetParent && !String(el.value).trim()) bad.push([el, (f.type === 'select' ? 'Choose ' : 'Enter ') + (f.article || 'the') + ' ' + f.label.toLowerCase()]);
    });
    var keyEl = $('rf-' + spec.key);
    if (mode === 'add' && keyEl && keyEl.value.trim() && find(keyEl.value.trim()))
      bad.push([keyEl, 'The ' + spec.keyLabel + ' ' + keyEl.value.trim() + ' is already in use']);
    if (bad.length) { bad.forEach(function (b) { setError(b[0], b[1]); }); bad[0][0].focus(); return; }
    var row = current || {};
    spec.fields.forEach(function (f) {
      var el = $('rf-' + f.key);
      if (f.viewOnly) return;
      if (f.from) { if (!current) { row[f.key] = fixedValue(f); row[f.key + 'Text'] = fixedText(f); } return; }
      if (f.keyField && current) return;
      row[f.key] = f.type === 'check' ? (el.checked ? 'Yes' : 'No') : String(el.value).trim();
    });
    var key = row[spec.key];
    if (current) S.refresh(); else S.add(row);
    close(formDlg, false);
    var tr = document.querySelector('#resultsTable tr[data-key="' + (window.CSS && CSS.escape ? CSS.escape(String(key)) : key) + '"]');
    var act = openAct || 'view';
    var back = tr && (tr.querySelector('[data-record="' + act + '"]') || tr.querySelector('[data-record]'));
    opener = back || opener; if (opener) opener.focus();
    say(spec.noun + ' ' + key + (current ? ' saved.' : ' added.'));
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-record]');
    if (!b) return;
    var act = b.getAttribute('data-record'), row = b.hasAttribute('data-key') ? find(b.getAttribute('data-key')) : null;
    if (act === 'view' && row) openView(row, b);
    else if (act === 'edit' && row) openForm(row, b);
    else if (act === 'add') openForm(null, b);
  });
  var viewEdit = $('viewEdit');
  if (viewEdit) viewEdit.addEventListener('click', function () {
    var row = current, back = opener;
    dsDialog.hide(viewDlg);
    openForm(row, back);
  });
  $('formSave').addEventListener('click', save);
  formDlg.addEventListener('input', function (e) { if (e.target.getAttribute('aria-invalid') === 'true') setError(e.target, ''); });
  [viewDlg, formDlg].forEach(function (dlg) {
    Array.prototype.forEach.call(dlg.querySelectorAll('[data-close]'), function (b) { b.addEventListener('click', function () { close(dlg); }); });
  });
  window.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var dlg = !formDlg.hidden ? formDlg : (!viewDlg.hidden ? viewDlg : null);
    if (dlg) { e.stopPropagation(); close(dlg); }
  }, true);
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab') return;
    var dlg = !formDlg.hidden ? formDlg : (!viewDlg.hidden ? viewDlg : null);
    if (!dlg) return;
    var f = Array.prototype.slice.call(dlg.querySelectorAll('button, [href], input, select, textarea')).filter(function (el) { return !el.disabled && el.offsetParent; });
    if (e.shiftKey && (document.activeElement === f[0] || document.activeElement === dlg)) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });
})();
