/* Merge Patients: the Find Patient dialog and the View Patient dialog (BA review 2026-10-20), shared by the manual
   search (opened over Home), the candidate list, and the system identified queue. Dialogs open with js/ds-dialog.js.

   Find Patient (#searchDialog): Phase 2's patient search layout. General Search and Advanced Search are accordions;
   Search with no criterion shows the error summary in the dialog. On Home (merge-patients-search.html) it opens with
   the page and Search goes to the candidate list; on the candidate list, New Search opens it empty and Refine Search
   with the current criteria, and Search lists the matches in place.
   DEV: post the criteria (hx-post) and swap the results; keep the criteria for Refine Search.

   View Patient (#patientDialog): read only, as Phase 2's Patient Events dialog: the patient summary, then the
   patient's events by type as accordions, with section links. Opened from a patient ID link
   ([data-view-patient="<id>"]); the sample events are in the page's #patientData.
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
    var syncDob = function () {
      var between = dobOp.value === 'BET';
      $('#msDobAnd', search).hidden = !between; $('#msDobToWrap', search).hidden = !between;
      if (!between) $('#msDobTo', search).value = '';
    };
    dobOp.addEventListener('change', syncDob);
    var fields = function () { return $$('input[name], select[name]:not([name$="Operator"])', form); };
    var clear = function () {
      fields().forEach(function (el) { el.value = ''; });
      $$('select[name$="Operator"]', form).forEach(function (s) { s.value = s.getAttribute('data-default'); });
      syncDob(); summary.hidden = true;
    };
    form.addEventListener('reset', function (e) { e.preventDefault(); clear(); if (status) status.textContent = 'Search criteria cleared.'; $('#msLast', search).focus(); });
    var params = new URLSearchParams(location.search);
    var fromUrl = function () {
      clear();
      fields().concat($$('select[name$="Operator"]', form)).forEach(function (el) { if (params.has(el.name)) el.value = params.get(el.name); });
      syncDob();
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
      fields().concat($$('select[name$="Operator"]', form)).forEach(function (el) { if (el.value.trim() !== '' && (!/Operator$/.test(el.name) || form.querySelector('[name="' + el.name.replace(/Operator$/, '') + '"]').value.trim())) q.set(el.name, el.value.trim()); });
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
        $('#searchContext', search).textContent = b.getAttribute('data-open-search') === 'refine' ? 'Change the criteria of the current search.' : 'Search for the patient records to merge.';
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
    var SECTIONS = [['investigations', 'Investigations', ['Investigation ID', 'Condition', 'Status', 'Start date']],
      ['labReports', 'Lab Reports', ['Lab report ID', 'Test', 'Result', 'Date received']],
      ['morbidityReports', 'Morbidity Reports', ['Report ID', 'Condition', 'Date reported']],
      ['vaccinations', 'Vaccinations', ['Vaccine', 'Date given']],
      ['treatments', 'Treatments', ['Treatment', 'Date']],
      ['documents', 'Documents', ['Document', 'Type', 'Date received']],
      ['contactRecords', 'Contact Records', ['Contact record ID', 'Investigation', 'Date']]];
    var fill = function (id) {
      var p = PATIENTS[id]; if (!p) return false;
      $('#pvName').textContent = p.name;
      $('#pvContext').textContent = 'Patient ID ' + id + '. Read only.';
      $('#pvSummary').innerHTML = [['Patient ID', id], ['Current sex', p.sex], ['Date of birth', p.dob + ' (' + p.age + ')'], ['Address', p.address], ['Phone', p.phone || 'None'], ['Email', p.email || 'None']]
        .map(function (d) { return '<div><dt>' + esc(d[0]) + '</dt><dd>' + esc(d[1]) + '</dd></div>'; }).join('');
      SECTIONS.forEach(function (s) {
        var rows = p[s[0]] || [], body = $('#pv-' + s[0] + '-body');
        $('#pv-' + s[0] + '-count').textContent = '(' + rows.length + ')';
        body.innerHTML = rows.length
          ? '<div class="ds-table-scroll" tabindex="0" role="group" aria-label="' + s[1] + ', scrolls horizontally when zoomed"><table class="table ds-table mb-0"><caption class="visually-hidden">' + s[1] + ' for ' + esc(p.name) + '</caption><thead><tr>' + s[2].map(function (h) { return '<th scope="col">' + h + '</th>'; }).join('') + '</tr></thead><tbody>' +
            rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>'
          : '<p class="mb-0">No ' + s[1].toLowerCase() + '.</p>';
      });
      $$('.accordion-button', dlg).forEach(function (b) { setSection(b, true); }); syncAll(dlg);
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
  }
})();
