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
   - dsErrors.hide(banner) hides it. */
(function () {
  'use strict';
  var FIRST = 3;
  var ICON = '<svg class="ds-icon" aria-hidden="true"><use href="../../icons/sprite.svg#more_horiz"/></svg>';

  function more(toggle, on) {
    document.getElementById(toggle.getAttribute('aria-controls')).classList.toggle('show', on);
    toggle.setAttribute('aria-expanded', String(on));
    toggle.setAttribute('aria-label', on ? 'Show fewer errors' : 'Show more errors');
    toggle.classList.toggle('is-text', on);
    toggle.innerHTML = on ? 'Show less' : ICON;
  }

  function show(banner, errors, go) {
    var first = banner.querySelector('[data-errors]'), rest = banner.querySelector('[data-errors-more]'), toggle = banner.querySelector('[data-errors-toggle]');
    first.innerHTML = ''; rest.innerHTML = '';
    errors.forEach(function (e, i) {
      var li = document.createElement('li'), a = document.createElement('a');
      a.href = '#' + e[0].id; a.className = 'link-primary text-decoration-underline'; a.textContent = e[1];
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

  window.dsErrors = { show: show, hide: function (banner) { banner.hidden = true; } };
})();
