/* Design system form behavior: the reference implementation for the form templates (Add and Edit Algorithm, Edit
   User). It runs on the form marked data-ds-form (or #algForm). The parts a form does not use are skipped: no tabs,
   no repeating tables, no lookups.

   Contracts (keep them when wiring the server):
   - Tabs: WAI-ARIA tabs, roving tabindex, Left and Right arrows.
   - Conditional sections: an element with data-show-when="name=value[|value]" shows only while the named control
     (select, checked radio, or checked checkbox) has one of the values. Hidden sections keep their values but are not validated.
   - Repeating tables ([data-repeat]): an entry area under the table with an Add button. Each column in data-columns
     names how it reads the entry: a WDS reader (READ below) or a generic one, select:<id> (the option text) or
     check:<id> (Yes or No). data-validate="unique" with data-unique="<fields>" rejects a row that repeats another
     row's values in those fields. Rows are named by their first column, or by the first N with
     data-label-columns="N", so no two row buttons share a name. Add validates the entry,
     appends a row, clears the entry, announces "<row> added", and returns focus to the first entry field. Each row has
     Edit (loads the row back into the entry, the button reads Update) and Delete (confirmed in the page dialog, focus
     moves to the next row or to the first entry field). Rows post as hidden inputs named <data-name>[i].<field>.
   - Lookups ([data-lookup]): a read-only field with Search and Clear. Search opens a dialog with a filter box and a
     list of options; Select fills the field and returns focus to Search.
   - Validation on Submit: required controls that are visible, and every repeating table marked data-min="1".
     The error summary links focus the control and switch to its tab first. On success the form's data-saved
     message is announced (DEV: post the form). */
(function () {
  'use strict';
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function txt(el) { return (el.textContent || '').replace(/\s+/g, ' ').trim(); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  var form = $('form[data-ds-form]') || $('#algForm');
  if (!form) return;
  var status = $('#formStatus');
  function say(msg) { status.textContent = ''; setTimeout(function () { status.textContent = msg; }, 60); }

  /* --- Tabs --- */
  var tabs = $$('[role="tab"]', $('[role="tablist"]'));
  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus !== false) tab.focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(t); });
    t.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); selectTab(tabs[(i + 1) % tabs.length]); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); selectTab(tabs[(i - 1 + tabs.length) % tabs.length]); }
    });
  });
  $$('[data-goto-tab]').forEach(function (b) { b.addEventListener('click', function () { selectTab(document.getElementById(b.getAttribute('data-goto-tab'))); }); });
  function revealTab(el) {
    var panel = el.closest('[role="tabpanel"]');
    if (panel && panel.hidden) selectTab(document.getElementById(panel.getAttribute('aria-labelledby')), false);
  }

  /* --- Conditional sections --- */
  function valueOf(name) {
    var els = $$('[name="' + name + '"]', form);
    if (!els.length) return '';
    if (els[0].type === 'radio') { var c = els.filter(function (e) { return e.checked; })[0]; return c ? c.value : ''; }
    if (els[0].type === 'checkbox') return els[0].checked ? els[0].value : '';
    return els[0].value;
  }
  /* Part of the form as it stands: not inside a hidden conditional section. An inactive tab still counts, so Submit
     validates both tabs. */
  function visible(el) {
    for (var n = el; n && n !== form; n = n.parentElement) {
      if (n.hidden && n.getAttribute('role') !== 'tabpanel') return false;
    }
    return true;
  }
  function syncConditions() {
    $$('[data-show-when]', form).forEach(function (el) {
      var rule = el.getAttribute('data-show-when').split('='), vals = rule[1].split('|');
      el.hidden = vals.indexOf(valueOf(rule[0])) === -1;
    });
    // Investigation Type (Related Page) follows the condition
    var cond = $('#condition'), out = $('#invType');
    if (cond && out) { var o = cond.options[cond.selectedIndex]; out.textContent = o && o.getAttribute('data-page') ? o.getAttribute('data-page') : 'Select a condition first'; }
  }
  form.addEventListener('change', syncConditions);
  syncConditions();

  /* --- Shared confirm dialog (delete a row) --- */
  var confirmDlg = $('#confirmDialog'), confirmYes = $('#confirmYes'), pendingConfirm = null, confirmOpener = null;
  function confirmAction(message, opener, onYes) {
    $('#confirmText').textContent = message;
    pendingConfirm = onYes; confirmOpener = opener;
    dsDialog.show(confirmDlg);
  }
  function closeConfirm(done) {
    dsDialog.hide(confirmDlg);
    if (done && pendingConfirm) pendingConfirm(); else if (confirmOpener) confirmOpener.focus();
    pendingConfirm = null;
  }
  if (confirmDlg) {
    confirmYes.addEventListener('click', function () { closeConfirm(true); });
    $$('[data-close]', confirmDlg).forEach(function (b) { b.addEventListener('click', function () { closeConfirm(false); }); });
  }

  /* --- Lookups --- */
  var lookupDlg = $('#lookupDialog'), lookupOpener = null, lookupTarget = null;
  function openLookup(field, opener) {
    lookupTarget = field; lookupOpener = opener;
    var source = document.getElementById(field.getAttribute('data-lookup'));
    $('#lookupTitle').textContent = field.getAttribute('data-lookup-title');
    var list = $('#lookupList');
    list.innerHTML = '';
    $$('li', source).forEach(function (li, i) {
      var id = 'lk' + i;
      var row = document.createElement('div');
      row.className = 'form-check';
      row.innerHTML = '<input class="form-check-input" type="radio" name="lookupPick" id="' + id + '" value="' + esc(li.getAttribute('data-value')) + '"><label class="form-check-label" for="' + id + '">' + esc(txt(li)) + '</label>';
      list.appendChild(row);
    });
    $('#lookupFilter').value = '';
    $('#lookupCount').textContent = '';
    dsDialog.show(lookupDlg);
    $('#lookupFilter').focus();
  }
  function closeLookup() { dsDialog.hide(lookupDlg); if (lookupOpener) lookupOpener.focus(); }
  if (lookupDlg) {
    var lt;
    $('#lookupFilter').addEventListener('input', function () {
      clearTimeout(lt);
      lt = setTimeout(function () {
        var q = $('#lookupFilter').value.trim().toLowerCase(), n = 0;
        $$('.form-check', $('#lookupList')).forEach(function (r) { var hit = !q || txt(r).toLowerCase().indexOf(q) !== -1; r.hidden = !hit; if (hit) n++; });
        $('#lookupCount').textContent = q ? n + (n === 1 ? ' match' : ' matches') : '';
      }, 250);
    });
    $('#lookupSelect').addEventListener('click', function () {
      var pick = $('input[name="lookupPick"]:checked', lookupDlg);
      var err = $('#lookupError');
      if (!pick) { err.hidden = false; err.textContent = 'Choose one, or Cancel.'; $('#lookupList input').focus(); return; }
      err.hidden = true;
      lookupTarget.value = txt(pick.parentElement);
      lookupTarget.setAttribute('data-code', pick.value);
      lookupTarget.dispatchEvent(new Event('change', { bubbles: true }));
      closeLookup();
      say(lookupTarget.getAttribute('data-lookup-title').replace(/^Find an? /, '') + ' set to ' + lookupTarget.value + '.');
    });
    $$('[data-close]', lookupDlg).forEach(function (b) { b.addEventListener('click', closeLookup); });
  }
  $$('[data-lookup]', form).forEach(function (field) {
    var wrap = field.closest('.ds-lookup');
    $('[data-lookup-search]', wrap).addEventListener('click', function (e) { openLookup(field, e.currentTarget); });
    $('[data-lookup-clear]', wrap).addEventListener('click', function () { field.value = ''; field.removeAttribute('data-code'); say('Cleared.'); });
  });

  /* Escape closes the open dialog (the dialog markup carries no data-bs-toggle) */
  window.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (lookupDlg && !lookupDlg.hidden) { e.stopPropagation(); closeLookup(); }
    else if (confirmDlg && !confirmDlg.hidden) { e.stopPropagation(); closeConfirm(false); }
  }, true);
  /* Focus stays in the open dialog */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab') return;
    var dlg = [lookupDlg, confirmDlg].filter(function (d) { return d && !d.hidden; })[0];
    if (!dlg) return;
    var f = $$('input, select, textarea, button, [href]', dlg).filter(function (el) { return !el.disabled && el.offsetParent; });
    if (!f.length) return;
    if (e.shiftKey && (document.activeElement === f[0] || document.activeElement === dlg)) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });

  /* --- Criteria rows (Question, Logic, Value): logic and value control follow the question's type --- */
  var LOGIC = {
    coded: [['=', 'Equal'], ['!=', 'Not Equal']],
    number: [['=', '='], ['<', '<'], ['<=', '<='], ['>', '>'], ['>=', '>='], ['!=', 'Not Equal']],
    date: [['<', 'Before'], ['=', 'On'], ['>', 'After']],
    text: [['CT', 'Contains'], ['=', 'Equal'], ['!=', 'Not Equal'], ['SW', 'Starts With']]
  };
  function syncQuestion(entry) {
    var q = $('[data-role="question"]', entry), logic = $('[data-role="logic"]', entry), valueWrap = $('[data-role="value-wrap"]', entry);
    if (!q || !logic) return;
    var opt = q.options[q.selectedIndex], type = opt && opt.getAttribute('data-type') || 'text';
    logic.innerHTML = '<option value="">Select logic</option>' + LOGIC[type].map(function (l) { return '<option value="' + l[0] + '">' + l[1] + '</option>'; }).join('');
    var label = valueWrap.getAttribute('data-label'), id = valueWrap.getAttribute('data-id');
    var control;
    if (type === 'coded') {
      control = '<select class="form-select" id="' + id + '" data-role="value" data-entry-required data-errmsg="Choose a value"><option value="">Select a value</option>' + (opt.getAttribute('data-values') || '').split('|').filter(Boolean).map(function (v) { return '<option>' + esc(v) + '</option>'; }).join('') + '</select>';
    } else if (type === 'date') {
      control = '<div class="ds-datefield"><input class="form-control" type="text" inputmode="numeric" id="' + id + '" data-role="value" data-entry-required data-errmsg="Enter a date" aria-describedby="' + id + '-fmt"><svg class="ds-icon" aria-hidden="true"><use href="../../icons/sprite.svg#calendar_today"/></svg></div><span class="form-text" id="' + id + '-fmt">Format: MM/DD/YYYY</span>';
    } else {
      control = '<input class="form-control" type="' + (type === 'number' ? 'number' : 'text') + '" id="' + id + '" data-role="value" data-entry-required data-errmsg="Enter a value">';
    }
    valueWrap.innerHTML = '<label class="ds-required" for="' + id + '">' + label + '</label>' + control + '<span class="invalid-feedback" id="' + id + '-error" hidden></span>';
  }
  $$('[data-repeat] [data-role="question"]', form).forEach(function (q) {
    var entry = q.closest('[data-entry]');
    q.addEventListener('change', function () { syncQuestion(entry); });
    syncQuestion(entry);
  });

  /* --- Lab criteria entry: one result type, chosen by which result fields are filled --- */
  var numOp = $('#numericOp');
  if (numOp) numOp.addEventListener('change', function () { var b = numOp.value === 'BET'; $('#numericAnd').hidden = !b; $('#numericValue2').hidden = !b; });

  /* --- What each table column shows (text) and posts (value), read from its entry area --- */
  function sel(entry, role) { return $('[data-role="' + role + '"]', entry); }
  function selText(el) { return el && el.tagName === 'SELECT' ? (el.value ? el.options[el.selectedIndex].text : '') : (el ? el.value : ''); }
  function labState(entry) {
    var include = ($('input[name="includeResult"]:checked', entry) || {}).value !== 'N';
    var coded = $('#codedResult'), nv = $('#numericValue'), nv2 = $('#numericValue2'), tv = $('#textValue'), to = $('#textOp');
    if (!include) return { op: 'Any result', opv: '', res: '', resv: '' };
    if (coded.value) return { op: '=', opv: '=', res: coded.value, resv: coded.getAttribute('data-code') || coded.value };
    if (nv.value) {
      var units = $('#numericUnits').value, between = numOp.value === 'BET';
      var r = nv.value + (between ? ' and ' + nv2.value : '') + (units ? ' ' + units : '');
      return { op: selText(numOp), opv: numOp.value, res: r, resv: r };
    }
    return { op: selText(to), opv: to.value, res: to.value === 'NN' ? '' : tv.value, resv: tv.value };
  }
  var READ = {
    test: function (entry, raw) { var f = $('#resultedTest'); return raw ? (f.getAttribute('data-code') || f.value) : f.value; },
    labOp: function (entry, raw) { var s = labState(entry); return raw ? s.opv : s.op; },
    labResult: function (entry, raw) { var s = labState(entry); return raw ? s.resv : s.res; },
    question: function (entry, raw) { var q = sel(entry, 'question'); return raw ? q.value : selText(q); },
    logic: function (entry, raw) { var l = sel(entry, 'logic'); return raw ? l.value : selText(l); },
    value: function (entry, raw) { var v = sel(entry, 'value'); return raw ? v.value : selText(v); }
  };
  /* Generic readers: "select:<id>" shows the option text and posts the value; "check:<id>" shows Yes or No */
  function reader(spec) {
    if (READ[spec]) return READ[spec];
    var p = spec.split(':'), el = document.getElementById(p[1]);
    if (p[0] === 'check') return function (entry, raw) { return el.checked ? (raw ? 'Y' : 'Yes') : (raw ? 'N' : 'No'); };
    return function (entry, raw) { return raw ? el.value : selText(el); };
  }
  var VALIDATE = {
    /* No two rows with the same values in the fields named by data-unique (the row being edited is not compared) */
    unique: function (entry, block, editing, cells) {
      var keys = block.getAttribute('data-unique').split(','), mine = keys.map(function (k) { return cells.filter(function (c) { return c.field === k; })[0].value; }).join('|');
      var dup = block._rows().some(function (tr) {
        if (tr === editing) return false;
        return keys.map(function (k) { var h = $('input[type=hidden][data-field="' + k + '"]', tr); return h ? h.value : ''; }).join('|') === mine;
      });
      if (!dup) return [];
      var first = $('select, input', entry);
      setError(first, block.getAttribute('data-unique-msg'));
      return [first];
    },
    labResult: function (entry) {
      if (($('input[name="includeResult"]:checked', entry) || {}).value === 'N') return [];
      var coded = $('#codedResult'), filled = [coded.value, $('#numericValue').value, $('#textValue').value || ($('#textOp').value === 'NN' ? 'x' : '')].filter(Boolean).length;
      clearError(coded);
      if (filled === 1) {
        if (numOp.value === 'BET' && $('#numericValue').value && !$('#numericValue2').value) { setError($('#numericValue2'), 'Enter the second number for Between'); return [$('#numericValue2')]; }
        return [];
      }
      setError(coded, filled === 0 ? 'Enter one result: a coded result, a numeric result, or a text result' : 'Enter only one result: coded, numeric, or text');
      return [$('[data-lookup-search]', coded.closest('.ds-lookup'))];
    }
  };

  /* --- Field errors --- */
  function setError(field, msg) {
    var err = document.getElementById(field.id + '-error');
    field.setAttribute('aria-invalid', 'true');
    var d = (field.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
    if (err && d.indexOf(err.id) === -1) { d.push(err.id); field.setAttribute('aria-describedby', d.join(' ')); }
    if (err) { err.textContent = msg; err.hidden = false; }
  }
  function clearError(field) {
    var err = document.getElementById(field.id + '-error');
    field.removeAttribute('aria-invalid');
    if (err) { err.textContent = ''; err.hidden = true; }
  }

  /* --- Repeating tables --- */
  function initRepeat(block) {
    var tbody = $('tbody', block), entry = $('[data-entry]', block), addBtn = $('[data-add]', block), empty = $('[data-empty]', block);
    var name = block.getAttribute('data-name'), noun = block.getAttribute('data-noun');
    var editing = null;
    function rows() { return $$('tr[data-row]', tbody); }
    function syncEmpty() { if (empty) empty.hidden = rows().length > 0; renumber(); }
    function renumber() {
      rows().forEach(function (tr, i) {
        $$('input[type=hidden]', tr).forEach(function (h) { h.name = name + '[' + i + '].' + h.getAttribute('data-field'); });
      });
    }
    function entryFields() { return $$('input:not([type=radio]), select, textarea', entry).filter(function (f) { return visible(f); }); }
    function readEntry() {
      var spec = JSON.parse(block.getAttribute('data-columns'));
      var errs = [];
      $$('[data-entry-required]', entry).filter(visible).forEach(function (f) {
        clearError(f);
        if (!f.value.trim()) { setError(f, f.getAttribute('data-errmsg')); errs.push(f); }
      });
      var cells = spec.map(function (c) { return { field: c.field, text: reader(c.read)(entry), value: reader(c.read)(entry, true) }; });
      var custom = block.getAttribute('data-validate');
      if (!errs.length && custom) errs = errs.concat(VALIDATE[custom](entry, block, editing, cells));
      if (errs.length) { errs[0].focus(); return null; }
      return cells;
    }
    /* The entry's own values, kept on the row so Edit can load them back */
    function entryState() {
      var st = { f: {}, r: {} };
      $$('input:not([type=radio]), select, textarea', entry).forEach(function (f) { if (f.id) st.f[f.id] = [f.type === 'checkbox' ? (f.checked ? '1' : '') : f.value, f.getAttribute('data-code') || '']; });
      $$('input[type=radio]:checked', entry).forEach(function (r) { st.r[r.name] = r.value; });
      return st;
    }
    function loadState(st) {
      Object.keys(st.r).forEach(function (n) { var r = $('input[name="' + n + '"][value="' + st.r[n] + '"]', entry); if (r) r.checked = true; });
      var q = sel(entry, 'question');
      if (q && st.f[q.id]) { q.value = st.f[q.id][0]; syncQuestion(entry); }
      Object.keys(st.f).forEach(function (id) {
        var f = document.getElementById(id); if (!f || f === q) return;
        if (f.type === 'checkbox') { f.checked = !!st.f[id][0]; return; }
        f.value = st.f[id][0];
        if (st.f[id][1]) f.setAttribute('data-code', st.f[id][1]); else f.removeAttribute('data-code');
      });
      if (numOp) numOp.dispatchEvent(new Event('change'));
    }
    /* A row is named by its first column, or by its first N when data-label-columns="N" (so two rows never share a name) */
    var labelCols = +(block.getAttribute('data-label-columns') || 1);
    function rowLabel(cells) { return cells.slice(0, labelCols).map(function (c) { return c.text; }).join(', '); }
    function makeRow(cells) {
      var tr = document.createElement('tr');
      tr.setAttribute('data-row', '');
      tr.innerHTML = cells.map(function (c) { return '<td>' + esc(c.text || '') + '<input type="hidden" data-field="' + c.field + '" value="' + esc(c.value || '') + '"></td>'; }).join('') +
        '<td class="ds-row-actions"><button type="button" class="ds-icon-btn" data-edit aria-label="Edit ' + esc(noun) + ': ' + esc(rowLabel(cells)) + '"><svg class="ds-icon" aria-hidden="true"><use href="../../icons/sprite.svg#edit"/></svg></button>' +
        '<button type="button" class="ds-icon-btn" data-delete aria-label="Delete ' + esc(noun) + ': ' + esc(rowLabel(cells)) + '"><svg class="ds-icon" aria-hidden="true"><use href="../../icons/sprite.svg#delete"/></svg></button></td>';
      tr._cells = cells;
      tr.setAttribute('data-state', JSON.stringify(entryState()));
      return tr;
    }
    function clearEntry() {
      entryFields().forEach(function (f) { if (f.tagName === 'SELECT') f.selectedIndex = 0; else if (f.type === 'checkbox') f.checked = false; else f.value = ''; f.removeAttribute('data-code'); clearError(f); });
      $$('input[type=radio][data-default]', entry).forEach(function (r) { r.checked = true; });
      $$('[data-role="question"]', entry).forEach(function () { syncQuestion(entry); });
      if (numOp) { numOp.dispatchEvent(new Event('change')); }
      syncConditions();
    }
    addBtn.addEventListener('click', function () {
      var cells = readEntry();
      if (!cells) return;
      var label = rowLabel(cells);
      if (editing) {
        var nr = makeRow(cells); tbody.replaceChild(nr, editing); editing = null;
        addBtn.innerHTML = addBtn.getAttribute('data-add-label');
        say(noun + ' updated: ' + label + '.');
      } else {
        tbody.appendChild(makeRow(cells));
        say(noun + ' added: ' + label + '. ' + rows().length + ' in the table.');
      }
      clearEntry(); syncEmpty();
      var first = entryFields()[0] || $('[data-lookup-search]', entry); if (first) first.focus();
    });
    tbody.addEventListener('click', function (e) {
      var btn = e.target.closest('button'); if (!btn) return;
      var tr = btn.closest('tr');
      if (btn.hasAttribute('data-delete')) {
        confirmAction('Delete this ' + noun.toLowerCase() + ': ' + (tr._cells ? rowLabel(tr._cells) : txt(tr.cells[0])) + '?', btn, function () {
          var next = tr.nextElementSibling || tr.previousElementSibling;
          if (editing === tr) { editing = null; addBtn.innerHTML = addBtn.getAttribute('data-add-label'); clearEntry(); }
          tr.remove(); syncEmpty();
          say(noun + ' deleted. ' + rows().length + ' in the table.');
          var target = next && next.hasAttribute('data-row') ? $('[data-edit]', next) : (entryFields()[0] || $('[data-lookup-search]', entry));
          if (target) target.focus();
        });
      }
      if (btn.hasAttribute('data-edit')) {
        editing = tr;
        clearEntry();
        loadState(JSON.parse(tr.getAttribute('data-state')));
        syncConditions();
        addBtn.innerHTML = '<svg class="ds-icon" aria-hidden="true"><use href="../../icons/sprite.svg#save"/></svg>Update ' + noun.toLowerCase();
        var f = entryFields()[0] || $('[data-lookup-search]', entry); if (f) f.focus();
        say('Editing ' + noun.toLowerCase() + ': ' + rowLabel(tr._cells) + '. Change the fields, then Update.');
      }
    });
    // rows rendered by the server: keep their cells for labels
    rows().forEach(function (tr) { tr._cells = $$('td', tr).slice(0, -1).map(function (td) { return { text: txt(td) }; }); });
    syncEmpty();
    block._rows = rows;
  }
  $$('[data-repeat]', form).forEach(initRepeat);

  /* --- Error count on each tab, so errors on the tab that is not open are visible: "Action, 2 errors" --- */
  function markTabs(bad) {
    tabs.forEach(function (t) {
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      var n = bad.filter(function (b) { return panel.contains(b.f); }).length;
      var badge = t.querySelector('.ds-tab-errors');
      if (!n) { if (badge) badge.remove(); return; }
      if (!badge) { badge = document.createElement('span'); badge.className = 'badge rounded-pill text-bg-danger ms-2 ds-tab-errors'; t.appendChild(badge); }
      badge.innerHTML = '<span class="visually-hidden">, </span>' + n + '<span class="visually-hidden">' + (n === 1 ? ' error' : ' errors') + '</span>';
    });
  }

  /* --- Submit --- */
  var summary = $('#errorSummary'), list = $('#errorList');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    list.innerHTML = '';
    var bad = [];
    $$('[required]', form).forEach(function (f) {
      clearError(f);
      if (!visible(f)) return;
      var empty = f.type === 'radio' ? !$$('[name="' + f.name + '"]', form).some(function (r) { return r.checked; }) : !f.value.trim();
      if (empty && !bad.some(function (b) { return b.f.name && b.f.name === f.name && f.type === 'radio'; })) { setError(f, f.getAttribute('data-errmsg')); bad.push({ f: f, msg: f.getAttribute('data-errmsg') }); }
    });
    $$('[data-repeat][data-min]', form).forEach(function (block) {
      if (!visible(block) || block._rows().length >= +block.getAttribute('data-min')) return;
      var target = $('[data-lookup-search], [data-entry] select, [data-entry] input', block);
      bad.push({ f: target, msg: block.getAttribute('data-min-msg') });
    });
    markTabs(bad);
    if (!bad.length) { summary.hidden = true; say(form.getAttribute('data-saved') || 'Algorithm saved.'); /* DEV: post the form; on success go to the View screen with a success alert. */ return; }
    bad.forEach(function (b) {
      var li = document.createElement('li'), a = document.createElement('a');
      a.href = '#' + b.f.id; a.textContent = b.msg;
      a.addEventListener('click', function (ev) { ev.preventDefault(); revealTab(b.f); b.f.focus(); });
      li.appendChild(a); list.appendChild(li);
    });
    summary.hidden = false; summary.focus();
  });
  $$('[required]', form).forEach(function (f) {
    f.addEventListener('change', function () { if (f.value.trim()) clearError(f); });
  });
})();
