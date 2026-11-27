/* Error banner: Phase 2's validation summary in a dialog (pbp-modal-support.js renderValidationSummary), BA review
   2026-11-03 ("mirror text and layout similar to Phase 2; support Show more when 4 or more errors exist").

   <div class="alert alert-danger ds-error-banner" id="xErrors" role="alert" aria-labelledby="xErrorsTitle" tabindex="-1" hidden>
     <h3 class="d-flex align-items-center gap-1 h6 fw-normal mb-1" id="xErrorsTitle">(error icon)Please fix the following errors:</h3>
     <ul class="small mb-0 ps-3" data-errors></ul>
     <div class="collapse" id="xErrorsMore"><ul class="small mb-0 ps-3" data-errors-more></ul></div>
     <button type="button" class="btn btn-more alert-link" data-errors-toggle aria-controls="xErrorsMore" aria-expanded="false"
             aria-label="Show more errors" hidden>(more_horiz icon)</button>
   </div>

   - dsErrors.show(banner, errors, go): errors is a list of [field, label, rest]; each becomes "<a>label</a>rest"
     ("Label on Screen is required."). The first three show; the rest sit behind Show more, which becomes Show less.
     A link calls go(field) (open its section, focus it). The banner shows, scrolls into view, and takes focus.
   - dsErrors.forFields(banner, problems, go): the same for a form, from its fields. Each problem is
     { field, msg, required, label }: a required field reads "<label> is required.", any other "<label> <msg>"
     (Phase 2: "Reporting Facility is required.", "Entity ID Information You have entered ..."). The label is the
     field's own (its <label for>, aria-labelledby, aria-label, or fieldset legend, without the star or a colon)
     unless the problem names one.
   - dsErrors.hide(banner) hides it.
   - Every field marked aria-invalid="true" gets its label in the error color (.ds-label-invalid) and .is-invalid (on the
     field, or on the wrapper before its message), as Phase 2, on any page that loads this script (app-frame.js loads it
     on every page). Bootstrap then shows the field's .invalid-feedback; no rule of ours does. */
(function () {
  'use strict';
  if (window.dsErrors) return;
  var FIRST = 3;
  var ICON = '<span class="ds-icon material-symbols-rounded" aria-hidden="true">more_horiz</span>';

  function more(toggle, on) {
    document.getElementById(toggle.getAttribute('aria-controls')).classList.toggle('show', on);
    toggle.setAttribute('aria-expanded', String(on));
    toggle.setAttribute('aria-label', on ? 'Show fewer errors' : 'Show more errors');
    toggle.classList.toggle('is-text', on);
    toggle.innerHTML = on ? 'Show less' : ICON;
  }

  function txt(el) { return el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : ''; }
  function labelsFor(f) {
    if (!f || !f.id) return [];
    var id = window.CSS && CSS.escape ? CSS.escape(f.id) : f.id;
    /* Tom Select points the label at its own control (<id>-ts-control) */
    return Array.prototype.slice.call(document.querySelectorAll('label[for="' + id + '"], label[for="' + id + '-ts-control"]'));
  }
  function labelOf(f) {
    var l = labelsFor(f)[0], t = '';
    /* a radio or check box in a group (Phase 2's role="radiogroup" aria-labelledby, or a fieldset) is named by the group,
       not by its own option */
    var grp = f && (f.type === 'radio' || f.type === 'checkbox') && f.closest('[role="radiogroup"][aria-labelledby], [role="group"][aria-labelledby], fieldset');
    if (grp) l = null;
    if (grp && !grp.matches('fieldset')) {
      var c0 = document.createElement('div');
      grp.getAttribute('aria-labelledby').split(' ').forEach(function (i) { var n = document.getElementById(i); if (n) c0.appendChild(n.cloneNode(true)); });
      Array.prototype.forEach.call(c0.querySelectorAll('.is-required, .req, .ds-required-mark, .visually-hidden'), function (x) { x.remove(); });
      t = txt(c0);
    }
    if (l) { var c = l.cloneNode(true); Array.prototype.forEach.call(c.querySelectorAll('.req, .ds-required-mark, .visually-hidden'), function (x) { x.remove(); }); t = txt(c); }
    if (!t && f.getAttribute('aria-labelledby')) t = f.getAttribute('aria-labelledby').split(' ').map(function (i) { return txt(document.getElementById(i)); }).join(' ');
    if (!t) t = f.getAttribute('aria-label') || '';
    if (!t && f.closest('fieldset')) t = txt(f.closest('fieldset').querySelector('legend'));
    if (/\?$/.test(t)) return t.replace(/^\*\s*/, '').trim();
    return t.replace(/^\*\s*/, '').replace(/\s*\*$/, '').replace(/:\s*$/, '').trim();
  }
  function forFields(banner, problems, go) {
    show(banner, problems.map(function (p) {
      return [p.field, p.label || labelOf(p.field), p.required ? ' is required.' : ' ' + p.msg];
    }), go);
  }
  /* An invalid field: its label in the error color, and .is-invalid as Phase 2 (validations.js addClassIfInvalid), so
     Bootstrap shows the .invalid-feedback after it. A radio or check box (and a field inside a wrapper: a radio group, a
     lookup, a date field) marks the wrapper that comes before its message instead; the radios keep their own look. */
  function messagesOf(f) {
    var ids = (f.getAttribute('aria-describedby') || '').split(' ').concat(f.id ? [f.id + '-error'] : []);
    return ids.map(function (i) { return i && document.getElementById(i); })
      .filter(function (m, i, a) { return m && m.classList.contains('invalid-feedback') && a.indexOf(m) === i; });
  }
  function syncLabel(f) {
    if (!f || f.nodeType !== 1) return;
    var on = f.getAttribute('aria-invalid') === 'true';
    labelsFor(f).forEach(function (l) { l.classList.toggle('ds-label-invalid', on); });
    if (!/^(checkbox|radio)$/.test(f.type || '')) f.classList.toggle('is-invalid', on);
    messagesOf(f).forEach(function (m) {
      var a = f;
      while (a && a.parentElement !== m.parentElement) a = a.parentElement;
      if (a && a !== f && (a.compareDocumentPosition(m) & 4)) a.classList.toggle('is-invalid', on);
    });
  }
  if (window.MutationObserver) {
    new MutationObserver(function (list) { list.forEach(function (m) { syncLabel(m.target); }); })
      .observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['aria-invalid'] });
  }
  Array.prototype.forEach.call(document.querySelectorAll('[aria-invalid="true"]'), syncLabel);

  function show(banner, errors, go) {
    var first = banner.querySelector('[data-errors]'), rest = banner.querySelector('[data-errors-more]'), toggle = banner.querySelector('[data-errors-toggle]');
    first.innerHTML = ''; rest.innerHTML = '';
    errors.forEach(function (e, i) {
      var li = document.createElement('li'), a = document.createElement('a');
      var to = e[0] && (e[0].id ? e[0] : e[0].closest('[id]')); a.href = to ? '#' + to.id : '#';   /* a control without an id (a row's checkbox) links to the nearest part that has one */ a.className = 'link-primary text-decoration-underline'; a.textContent = e[1];
      a.addEventListener('click', function (ev) { ev.preventDefault(); if (go) go(e[0]); else e[0].focus(); });
      li.appendChild(a); li.appendChild(document.createTextNode(e[2]));
      (i < FIRST ? first : rest).appendChild(li);
    });
    if (!toggle.__dsErrors) { toggle.__dsErrors = true; toggle.addEventListener('click', function () { more(toggle, toggle.getAttribute('aria-expanded') !== 'true'); }); }
    toggle.hidden = errors.length <= FIRST;
    more(toggle, false);
    banner.hidden = false;
    var body = banner.closest('.modal-body');
    if (body) body.scrollTop = 0; else banner.scrollIntoView({ block: 'nearest' });
    banner.focus();
  }

  window.dsErrors = { show: show, forFields: forFields, hide: function (banner) { banner.hidden = true; } };
})();
