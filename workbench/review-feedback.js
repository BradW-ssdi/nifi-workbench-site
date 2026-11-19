/* BA review feedback, filed as GitHub issues in the design system repository (window.WB_GITHUB in wb.js; the form is
   .github/ISSUE_TEMPLATE/workbench-feedback.yml). Each note gets Add feedback and Feedback on GitHub; the whole
   template gets the same at the top of the notes. Add feedback opens a short form here (type, feedback, and for an
   action an owner and a due date); Continue on GitHub opens GitHub's form in a new tab with all of it filled in, and
   the person submits it there. The repository is private: GitHub asks people who are not signed in to sign in, and
   shows people without access a page not found. Nothing is stored in this browser and no token is used. */
(function () {
  'use strict';
  var R = window.REVIEW, GH = window.WB_GITHUB, current = R.current, say = R.say;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  var TYPES = ['Comment', 'Question', 'Change request', 'Action'];
  var MAX = 2000;   /* GitHub's address limit; longer text and screenshots can be added on GitHub */
  var NEW_TAB = '<span class="visually-hidden"> (opens in a new tab)</span>';
  function listLink(note, label) {
    return '<a class="btn btn-sm btn-link" href="' + esc(GH.search(['[' + current.id + ']'].concat(note ? [note] : []))) + '" target="_blank" rel="noopener">' + label + NEW_TAB + '</a>';
  }

  /* ---- the panel above the notes ---- */
  var notesBox = $('#rvNotes'), panel = document.createElement('div');
  panel.className = 'rv-fb'; panel.id = 'rvFb';
  notesBox.parentNode.insertBefore(panel, notesBox);
  panel.innerHTML = '<p class="small mb-2">Feedback is filed as an issue in the design system repository on GitHub. You need to be ' +
    'signed in to GitHub with access to the repository.</p>' +
    '<div class="rv-note-actions mt-0"><button type="button" class="btn btn-sm btn-primary" data-fb-add="template" aria-expanded="false">Add feedback on the whole template</button>' +
    listLink('', 'Feedback on GitHub<span class="visually-hidden">: ' + esc(current.title) + '</span>') + '</div>' +
    '<div data-fb-slot="template"></div>';

  /* ---- under each note ---- */
  current.notes.forEach(function (n) {
    var li = document.getElementById('note-' + n.code); if (!li) return;
    var acts = $('.rv-note-actions', li);
    acts.insertAdjacentHTML('beforeend', '<button type="button" class="btn btn-sm btn-light" data-fb-add="' + esc(n.code) + '" aria-expanded="false" aria-label="Add feedback on ' + esc(n.code) + '">Add feedback</button>' +
      listLink(n.code, 'Feedback on GitHub<span class="visually-hidden">: ' + esc(n.code) + '</span>'));
    li.insertAdjacentHTML('beforeend', '<div data-fb-slot="' + esc(n.code) + '"></div>');
  });

  /* ---- the form, moved under whichever note it is for ---- */
  var form = null, opener = null;
  function closeForm(focusBack) {
    if (!form) return;
    form.remove(); form = null;
    if (opener) { opener.setAttribute('aria-expanded', 'false'); if (focusBack) opener.focus(); }
    opener = null;
  }
  function openForm(btn) {
    var note = btn.getAttribute('data-fb-add');
    closeForm(false);
    opener = btn; btn.setAttribute('aria-expanded', 'true');
    var whole = note === 'template', types = whole ? TYPES.concat(['Approval']) : TYPES;
    form = document.createElement('form');
    form.className = 'rv-fb-form'; form.noValidate = true;
    form.setAttribute('aria-label', 'Feedback on ' + (whole ? 'the whole template' : note));
    form.innerHTML =
      '<div class="mb-2"><label class="form-label" for="fbType">Type</label><select class="form-select form-select-sm" id="fbType">' +
        types.map(function (t) { return '<option>' + t + '</option>'; }).join('') + '</select></div>' +
      '<div class="mb-2"><label class="form-label ds-required" for="fbText">Feedback</label>' +
        '<textarea class="form-control" id="fbText" rows="4" maxlength="' + MAX + '" required aria-describedby="fbTextHint"></textarea>' +
        '<div class="form-text" id="fbTextHint">Up to ' + MAX + ' characters. Longer text and screenshots can be added on GitHub.</div>' +
        '<div class="invalid-feedback" id="fbTextErr" hidden>Enter your feedback.</div></div>' +
      '<div class="rv-fb-action" hidden>' +
        '<div class="mb-2"><label class="form-label ds-required" for="fbOwner">Owner</label><input class="form-control form-control-sm" id="fbOwner" maxlength="80">' +
          '<div class="invalid-feedback" id="fbOwnerErr" hidden>Enter who owns this action.</div></div>' +
        '<div class="mb-2"><label class="form-label" for="fbDue">Due date</label><input class="form-control form-control-sm" id="fbDue" type="date"></div></div>' +
      '<div class="rv-note-actions"><button type="submit" class="btn btn-sm btn-primary">Continue on GitHub' + NEW_TAB + '</button><button type="button" class="btn btn-sm btn-outline-primary" data-fb-cancel>Cancel</button></div>';
    document.querySelector('[data-fb-slot="' + note + '"]').appendChild(form);
    var type = $('#fbType', form);
    type.addEventListener('change', function () { $('.rv-fb-action', form).hidden = type.value !== 'Action'; });
    form.addEventListener('input', function (e) { if (e.target.id === 'fbText' || e.target.id === 'fbOwner') mark(e.target, false); });
    form.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); closeForm(true); } });
    form.addEventListener('submit', function (e) { e.preventDefault(); submit(note); });
    $('#fbText', form).focus();
  }

  /* a field and its message: the message shows, and the field points at it, only while the field is wrong */
  function mark(f, bad) {
    var msg = document.getElementById(f.id + 'Err'), hint = f.id === 'fbText' ? 'fbTextHint' : '';
    f.classList.toggle('is-invalid', bad);
    if (bad) { f.setAttribute('aria-invalid', 'true'); f.setAttribute('aria-describedby', (msg.id + ' ' + hint).trim()); }
    else { f.removeAttribute('aria-invalid'); if (hint) f.setAttribute('aria-describedby', hint); else f.removeAttribute('aria-describedby'); }
    msg.hidden = !bad;
  }

  function submit(note) {
    var t = $('#fbType', form).value, text = $('#fbText', form), owner = $('#fbOwner', form), bad = [];
    if (!text.value.trim()) bad.push(text);
    if (t === 'Action' && !owner.value.trim()) bad.push(owner);
    bad.forEach(function (f) { mark(f, true); });
    if (bad.length) { bad[0].focus(); return; }
    var body = text.value.trim(), first = body.split('\n')[0];
    var href = GH.newIssue({
      screen: current.id, note: note === 'template' ? '' : note, kind: t,
      summary: first.length > 70 ? first.slice(0, 67).trim() + '...' : first,
      feedback: body, owner: t === 'Action' ? owner.value.trim() : '', due: t === 'Action' ? $('#fbDue', form).value : '',
      link: location.href.split('#')[0].replace(/\?.*$/, '') + '?t=' + current.id
    });
    /* a link followed from the person's own click, so the new tab is not blocked */
    var a = document.createElement('a');
    a.href = href; a.target = '_blank'; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    closeForm(true);
    say('GitHub opened in a new tab with your ' + t.toLowerCase() + ' filled in. Submit it there.');
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-fb-add')) { if (b.getAttribute('aria-expanded') === 'true') closeForm(true); else openForm(b); }
    else if (b.hasAttribute('data-fb-cancel')) closeForm(true);
  });
})();
