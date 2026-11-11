/* Merge Patients: the Find Patient dialog and the View Patient dialog (BA review 2026-10-20), shared by the manual
   search (opened over Home), the candidate list, and the system identified queue. Dialogs open with js/ds-dialog.js.

   Find Patient (#searchDialog): Phase 2's Search for Existing Patient dialog. General Search and Advanced Search are
   accordions; Date of Birth takes month, day, and year for Equal and a from and a to date for Between; Submit with no
   criterion shows the error summary in the dialog. On Home (merge-patients-search.html) it opens with
   the page and Search goes to the candidate list; on the candidate list, New Search opens it empty and Refine Search
   with the current criteria, and Submit lists the matches in place.
   DEV: post the criteria (hx-post) and swap the results; keep the criteria for Refine Search.

   View Patient (#patientDialog): read only, as Phase 2's Patient Events dialog: the summary bar, the section links
   (they collapse to a toggle), then the patient's events by type as accordions with Phase 2's columns, "No Data
   Found" when a type has none. Opened from a patient ID link ([data-view-patient="<id>"]); the sample events are in
   the page's #patientData.
   DEV: load the dialog content with hx-get, as Phase 2 does for Patient Events. */
(function () {
  'use strict';
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  var openers = new Map();
  function open(dlg, opener) { openers.set(dlg, opener); dsDialog.show(dlg); }
  /* Focus goes back to the control that opened the dialog. On Home that is the rail's Manual Search link, which is
     hidden when its rail group is closed; then focus goes to the page's main content. */
  function close(dlg) {
    dsDialog.hide(dlg);
    var o = openers.get(dlg);
    if (o && document.contains(o) && o.getClientRects().length) { o.focus(); return; }
    var main = document.getElementById('main') || document.querySelector('main');
    if (main) { if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1'); main.focus(); }
  }

  /* ---- accordions and Collapse All, in every Phase 2 dialog on the page ---- */
  function setSection(btn, on) {
    btn.setAttribute('aria-expanded', String(on)); btn.classList.toggle('collapsed', !on);
    document.getElementById(btn.getAttribute('aria-controls')).classList.toggle('show', on);
  }
  function syncAll(dlg) {
    var all = $('[data-toggle-all]', dlg); if (!all) return;
    all.textContent = $$('.accordion-button', dlg).some(function (b) { return b.getAttribute('aria-expanded') === 'true'; }) ? 'Collapse All' : 'Expand All';
  }
  $$('.modal.ds-modal-p2').forEach(function (dlg) {
    dlg.addEventListener('click', function (e) {
      var b = e.target.closest('.accordion-button');
      if (b) { setSection(b, b.getAttribute('aria-expanded') !== 'true'); syncAll(dlg); return; }
      var all = e.target.closest('[data-toggle-all]');
      if (all) { var on = all.textContent === 'Expand All'; $$('.accordion-button', dlg).forEach(function (x) { setSection(x, on); }); syncAll(dlg); }
      var x = e.target.closest('[data-dismiss]');
      if (x) close(dlg);
    });
  });

  /* ---- Escape closes the top dialog; Tab stays in it ---- */
  window.addEventListener('keydown', function (e) {
    var top = window.dsDialog && dsDialog.top();
    if (!top || !top.matches('#searchDialog, #patientDialog')) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(top); return; }
    if (e.key !== 'Tab') return;
    var items = $$('input:not([type=hidden]), select, textarea, button, a[href], [tabindex="0"]', top).filter(function (el) {
      return !el.disabled && el.getClientRects().length && !el.closest('.collapse:not(.show)') && !(el.type === 'radio' && !el.checked && $$('input[name="' + el.name + '"]:checked', top).length);
    });
    if (!items.length) return;
    if (e.shiftKey && (document.activeElement === items[0] || document.activeElement === top)) { e.preventDefault(); items[items.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === items[items.length - 1]) { e.preventDefault(); items[0].focus(); }
  }, true);

  /* =========================================================== Find Patient */
  var search = $('#searchDialog');
  if (search) {
    var form = $('#searchForm', search), summary = $('#searchErrors', search), status = $('#status');
    var dobOp = $('#msDobOp', search);
    // Equal: the month, day, and year boxes; Between: the from and to dates. The hidden pair is emptied.
    var syncDob = function () {
      var between = dobOp.value === 'BET';
      $('#msDobParts', search).hidden = between; $('#msDobRange', search).hidden = !between;
      $$(between ? '#msDobParts input' : '#msDobRange input', search).forEach(function (el) { el.value = ''; });
      $('label[for^="msDob"]', search).setAttribute('for', between ? 'msDobFrom' : 'msDobMonth');
    };
    dobOp.addEventListener('change', syncDob);
    // The criteria: every named field except the selects with a default (the operators and the identifier type),
    // which only go with a field that has a value.
    var fields = function () { return $$('input[name]:not([type="checkbox"]), select[name]:not([data-default])', form); };
    // Include Records (Active, Deleted, Superceded): checkboxes, Active on by default as Phase 2's
    var records = function () { return $$('input[type="checkbox"][name]', form); };
    var paired = function () { return $$('select[data-default]', form); };
    var pairOf = function (sel) {
      var name = sel.getAttribute('data-for') || sel.name.replace(/Operator$/, '');
      if (sel === dobOp) return $$('#msDobParts input, #msDobRange input', form);
      return $$('[name="' + name + '"]', form);
    };
    var clear = function () {
      fields().forEach(function (el) { el.value = ''; });
      records().forEach(function (el) { el.checked = el.defaultChecked; });
      paired().forEach(function (s) { s.value = s.getAttribute('data-default'); });
      syncDob(); summary.hidden = true;
    };
    form.addEventListener('reset', function (e) { e.preventDefault(); clear(); if (status) status.textContent = 'Search criteria cleared.'; $('#msLast', search).focus(); });
    var params = new URLSearchParams(location.search);
    var fromUrl = function () {
      clear();
      paired().forEach(function (el) { if (params.has(el.name)) el.value = params.get(el.name); });
      syncDob();
      fields().forEach(function (el) { if (params.has(el.name)) el.value = params.get(el.name); });
      if (params.has('personSearch.recordsSet')) records().forEach(function (el) { el.checked = params.has(el.name); });
    };
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!fields().some(function (el) { return el.value.trim() !== ''; })) {
        summary.hidden = false;
        $$('.accordion-button', search).slice(0, 1).forEach(function (b) { setSection(b, true); }); syncAll(search);
        summary.focus();
        return;
      }
      summary.hidden = true;
      var q = new URLSearchParams();
      fields().forEach(function (el) { if (el.value.trim() !== '') q.set(el.name, el.value.trim()); });
      paired().forEach(function (el) { if (pairOf(el).some(function (f) { return f.value.trim() !== ''; })) q.set(el.name, el.value); });
      records().forEach(function (el) { if (el.checked) q.set(el.name, 'on'); });
      q.set('personSearch.recordsSet', '1');   // so Refine Search restores the boxes as they were
      if (window.mergeCandidates) {   // the candidate list: list the matches in place
        dsDialog.hide(search);
        params = q; history.replaceState(null, '', '?' + q.toString());
        window.mergeCandidates.search(q);
        var o = openers.get(search); if (o && document.contains(o)) o.focus();
      } else {
        location.href = 'merge-patients.html?' + q.toString();
      }
    });
    $$('[data-open-search]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.getAttribute('data-open-search') === 'refine') fromUrl(); else clear();
        open(search, b);
        $('#msLast', search).focus();
      });
    });
    // On Home the dialog opens with the page (the rail's Manual Search link), and closing it leaves Home
    if (search.hasAttribute('data-open-on-load')) {
      var railLink = $('a[data-nav-id="merge-manual"]');
      open(search, railLink);
      $('#msLast', search).focus();
      if (railLink) railLink.addEventListener('click', function (e) { e.preventDefault(); clear(); open(search, railLink); $('#msLast', search).focus(); });
    }
  }

  /* =========================================================== View Patient */
  var dlg = $('#patientDialog'), dataEl = $('#patientData');
  if (dlg && dataEl) {
    var PATIENTS = JSON.parse(dataEl.textContent);
    // Phase 2's Patient Events columns, section by section
    var SECTIONS = [['investigations', 'Investigations', ['Investigation ID', 'Status', 'Start Date', 'Conditions', 'Case Status', 'Notification', 'Jurisdiction', 'Investigator']],
      ['labReports', 'Lab Reports', ['Event ID', 'Date Received', 'Facility/Provider', 'Date Collected', 'Test Results', 'Associated With', 'Program Area', 'Jurisdiction']],
      ['morbidityReports', 'Morbidity Reports', ['Event ID', 'Date Received', 'Provider', 'Report Date', 'Condition', 'Jurisdiction', 'Associated With']],
      ['vaccinations', 'Vaccinations', ['Event ID', 'Date Created', 'Provider', 'Date Administered', 'Vaccine Administered', 'Associated With']],
      ['treatments', 'Treatments', ['Event ID', 'Date Created', 'Provider', 'Treatment Date', 'Treatment', 'Associated With']],
      ['documents', 'Documents', ['Event ID', 'Date Received', 'Document Type', 'Sending Facility', 'Date Reported', 'Condition', 'Associated With']],
      ['contactRecords', 'Contact Records', ['Event ID', 'Date Created', 'Name/Relationship', 'Date Named', 'Description', 'Associated With']]];
    var EMPTY = '<p class="pv-empty">No Data Found</p>';
    /* Status as Phase 2's badge (PatientService: badge ms-1 bg-info Open, bg-close Closed; Phase 3 review, Team A slide 5) */
    var badge = function (v) {
      var cls = /^open$/i.test(v) ? 'bg-info' : /^closed$/i.test(v) ? 'bg-close' : '';
      return cls ? '<span class="badge ms-1 ' + cls + '">' + esc(v) + '</span>' : esc(v);
    };
    var table = function (caption, cols, rows) {
      var statusCol = cols.indexOf('Status');
      return '<div class="ds-table-scroll" tabindex="0" role="group" aria-label="' + esc(caption) + ', scrolls horizontally when zoomed"><table class="table table-sm table-hover table-css ds-table mb-0"><caption class="visually-hidden">' + esc(caption) + '</caption><thead><tr>' +
        cols.map(function (h) { return '<th scope="col">' + h + '</th>'; }).join('') + '</tr></thead><tbody>' +
        rows.map(function (r) { return '<tr>' + r.map(function (c, i) { return '<td>' + (i === statusCol ? badge(c) : esc(c)) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
    };
    /* Contact Records, as Phase 2 splits them: the contacts the patient named, by investigation, then the
       investigations in which the patient was named as a contact */
    var contacts = function (p, cols) {
      var c = p.contactRecords || {}, out = '', n = 0;
      var part = function (title, groups, line) {
        var keys = Object.keys(groups || {});
        out += '<p class="mb-2 mt-1"><b>' + title + '</b></p>';
        if (!keys.length) { out += EMPTY; return; }
        keys.forEach(function (k) { n += groups[k].length; out += '<p class="mb-2">' + line(k) + '</p>' + table(title + ' ' + k, cols, groups[k]); });
      };
      part('Contacts Named by Patient:', c.namedByPatient, function (k) { return 'The following contacts were named in <b>' + esc(p.name) + '\'s</b> Investigation of <b>' + esc(k) + '</b>:'; });
      part('Patient Named by Contacts:', c.patientNamedBy, function (k) { return '<b>' + esc(p.name) + '</b> was named as a contact in the following <b>' + esc(k) + '</b>:'; });
      return { html: out, count: n };
    };
    var fill = function (id) {
      var p = PATIENTS[id]; if (!p) return false;
      $('#pvName').textContent = p.name; $('#pvSex').textContent = p.sex; $('#pvDob').textContent = p.dob + ' (' + p.age + ')'; $('#pvId').textContent = id;
      SECTIONS.forEach(function (s) {
        var body = $('#pv-' + s[0] + '-body'), n;
        if (s[0] === 'contactRecords') { var c = contacts(p, s[2]); body.innerHTML = c.html; n = c.count; }
        else { var rows = p[s[0]] || []; n = rows.length; body.innerHTML = rows.length ? table(s[1] + ' for ' + p.name, s[2], rows) : EMPTY; }
        $('#pv-' + s[0] + '-count').textContent = '(' + n + ')';
      });
      $$('.accordion-button', dlg).forEach(function (b) { setSection(b, true); }); syncAll(dlg);
      $$('#pvNav a', dlg).forEach(function (x, i) { if (i === 0) x.setAttribute('aria-current', 'location'); else x.removeAttribute('aria-current'); });
      $('.modal-body', dlg).scrollTop = 0;
      return true;
    };
    document.addEventListener('click', function (e) {
      var a = e.target.closest('[data-view-patient]'); if (!a) return;
      e.preventDefault();
      if (fill(a.getAttribute('data-view-patient'))) open(dlg, a);
    });
    // section links: open the section and move to it
    $('#pvNav').addEventListener('click', function (e) {
      var a = e.target.closest('a'); if (!a) return;
      e.preventDefault();
      var sec = document.getElementById(a.getAttribute('href').slice(1));
      var b = $('.accordion-button', sec); setSection(b, true); syncAll(dlg);
      $$('a', this).forEach(function (x) { x.removeAttribute('aria-current'); });
      a.setAttribute('aria-current', 'location');
      sec.scrollIntoView({ block: 'start' }); b.focus();
    });
    $('#pvPrint').addEventListener('click', function () { window.print(); });
    // the section links collapse to their toggle, as Phase 2's secondary nav does
    $('#pvNavToggle').addEventListener('click', function () {
      var open = this.getAttribute('aria-expanded') !== 'true';
      this.setAttribute('aria-expanded', String(open));
      this.setAttribute('data-bs-title', open ? 'Hide section links' : 'Show section links');
      var bt = window.bootstrap && bootstrap.Tooltip && bootstrap.Tooltip.getInstance(this);   // the Phase 2 frame's tooltips are Bootstrap's
      if (bt) bt.setContent({ '.tooltip-inner': this.getAttribute('data-bs-title') });
      $('.material-symbols-rounded', this).textContent = open ? 'left_panel_close' : 'left_panel_open';
      $('#pvLayout').classList.toggle('is-nav-collapsed', !open);
    });
  }
})();
