/* BA review feedback: notes and actions from BAs, saved as comments on the template's Jira story through the review
   proxy (tools/ba-review-proxy). Settings are REVIEW.jira in review-notes.js. Each note gets Add feedback and the
   feedback already on it; the whole template gets the same at the top of the notes. Actions carry an owner and a due
   date and can be marked done. The reviewer's name and the review passcode are kept in this browser only. */
(function () {
  'use strict';
  var R = window.REVIEW, cfg = R.jira || {}, current = R.current, say = R.say;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k) || ''; if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (x) { /* storage blocked */ } return ''; }

  /* On this machine only, a test setup can point the page at a local proxy without changing the settings. */
  if (/^(127\.0\.0\.1|localhost)$/.test(location.hostname)) {
    try { var dev = JSON.parse(store('rvFeedbackDev') || 'null'); if (dev) cfg = Object.assign({}, cfg, dev); } catch (x) { /* ignore */ }
  }
  var issueOf = function (id) { return (cfg.issues && cfg.issues[id]) || cfg.defaultIssue || ''; };
  var issue = issueOf(current.id);
  var TYPES = ['Comment', 'Question', 'Change request', 'Action'];
  var TYPE_BADGE = { Comment: 'text-bg-light', Question: 'text-bg-warning', 'Change request': 'text-bg-danger', Action: 'text-bg-info', Approval: 'text-bg-success' };

  /* ---- the panel above the notes ---- */
  var notesBox = $('#rvNotes'), panel = document.createElement('div');
  panel.className = 'rv-fb'; panel.id = 'rvFb';
  notesBox.parentNode.insertBefore(panel, notesBox);
  var items = [];

  function call(method, path, body) {
    return fetch(cfg.proxy + path, {
      method: method, headers: { 'Content-Type': 'application/json', 'x-review-key': store('rvReviewKey') },
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) { var e = new Error(j.error || ('The review service answered ' + r.status + '.')); e.status = r.status; throw e; }
        return j;
      });
    }, function () { throw new Error('The review service could not be reached.'); });
  }

  function drawPanel(message) {
    var link = issue ? '<a href="' + esc(cfg.site + '/browse/' + issue) + '" target="_blank" rel="noopener">' + esc(issue) + '<span class="visually-hidden"> (opens in a new tab)</span></a>' : '';
    if (!cfg.proxy || !issue) {
      panel.innerHTML = '<p class="small mb-0">Feedback here is not connected to Jira yet. Use Copy reference on a note and comment on the template\'s Jira story.</p>';
      return;
    }
    if (!store('rvReviewer') || !store('rvReviewKey')) {
      panel.innerHTML = '<form class="rv-fb-who" id="rvWho" novalidate>' +
        '<h3 class="h6">Give feedback</h3><p class="small">Your feedback is saved as a comment on ' + link + '. Enter your name and the review passcode once; this browser remembers them.</p>' +
        (message ? '<p class="small text-danger-emphasis" id="rvWhoMsg">' + esc(message) + '</p>' : '') +
        '<div class="mb-2"><label class="form-label" for="rvWhoName">Your name</label><input class="form-control" id="rvWhoName" autocomplete="name" maxlength="80" value="' + esc(store('rvReviewer')) + '"></div>' +
        '<div class="mb-2"><label class="form-label" for="rvWhoKey">Review passcode</label><input class="form-control" id="rvWhoKey" type="password" autocomplete="off"></div>' +
        '<button type="submit" class="btn btn-sm btn-primary">Continue</button></form>';
      return;
    }
    var open = items.filter(function (i) { return i.type === 'Action' && i.status === 'Open'; }).length;
    panel.innerHTML = '<p class="small mb-2">Feedback goes to ' + link + ' as ' + esc(store('rvReviewer')) +
      '. <button type="button" class="btn btn-link btn-sm p-0 align-baseline" id="rvWhoChange">Change name</button></p>' +
      '<div class="rv-note-actions mt-0"><button type="button" class="btn btn-sm btn-primary" data-fb-add="template" aria-expanded="false">Add feedback on the whole template</button></div>' +
      '<p class="small mt-2 mb-0" id="rvFbCount">' + (open ? open + ' open action' + (open > 1 ? 's' : '') : 'No open actions') + '</p>' +
      '<ul class="rv-fb-list" data-fb-list="template"></ul><div data-fb-slot="template"></div>';
    draw();
  }

  /* ---- feedback under each note ---- */
  current.notes.forEach(function (n) {
    var li = document.getElementById('note-' + n.code); if (!li) return;
    var acts = $('.rv-note-actions', li);
    if (cfg.proxy && issue) acts.insertAdjacentHTML('beforeend', '<button type="button" class="btn btn-sm btn-light" data-fb-add="' + esc(n.code) + '" aria-expanded="false" aria-label="Add feedback on ' + esc(n.code) + '">Add feedback</button>');
    li.insertAdjacentHTML('beforeend', '<ul class="rv-fb-list" data-fb-list="' + esc(n.code) + '"></ul><div data-fb-slot="' + esc(n.code) + '"></div>');
  });

  function itemHtml(i) {
    var when = i.created ? new Date(i.created) : null;
    var date = when && !isNaN(when) ? when.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';
    var done = i.type === 'Action' && i.status === 'Done';
    return '<li class="rv-fb-item' + (done ? ' is-done' : '') + '" id="fb-' + esc(i.id) + '" tabindex="-1">' +
      '<div class="rv-fb-meta"><span class="badge ' + (TYPE_BADGE[i.type] || 'text-bg-light') + '">' + esc(i.type) + '</span>' +
      (done ? '<span class="badge text-bg-success">Done</span>' : '') +
      '<strong>' + esc(i.from) + '</strong>' + (date ? '<span class="text-body-secondary">' + esc(date) + '</span>' : '') + '</div>' +
      '<p class="rv-fb-text mb-1">' + esc(i.text) + '</p>' +
      (i.type === 'Action' ? '<p class="small mb-1">Owner: ' + esc(i.owner || 'not set') + (i.due ? '. Due ' + esc(i.due) + '.' : '') + '</p>' +
        '<button type="button" class="btn btn-sm btn-outline-primary" data-fb-status="' + esc(i.id) + '" data-to="' + (done ? 'Open' : 'Done') + '">' +
        (done ? 'Reopen' : 'Mark done') + '<span class="visually-hidden">: ' + esc(i.text.slice(0, 60)) + '</span></button>' : '') + '</li>';
  }

  function draw() {
    var by = {};
    items.forEach(function (i) { (by[i.note] = by[i.note] || []).push(i); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-fb-list]'), function (ul) {
      var list = by[ul.getAttribute('data-fb-list')] || [];
      ul.innerHTML = list.map(itemHtml).join('');
      ul.hidden = !list.length;
      ul.setAttribute('aria-label', 'Feedback' + (ul.getAttribute('data-fb-list') === 'template' ? ' on the whole template' : ' on ' + ul.getAttribute('data-fb-list')));
    });
    var open = items.filter(function (i) { return i.type === 'Action' && i.status === 'Open'; }).length, c = $('#rvFbCount');
    if (c) c.textContent = open ? open + ' open action' + (open > 1 ? 's' : '') : 'No open actions';
  }

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
    if (!store('rvReviewer') || !store('rvReviewKey')) {   /* not signed in yet: the name and passcode come first */
      var who = $('#rvWhoName'); if (who) { who.scrollIntoView({ block: 'nearest' }); who.focus(); }
      say('Enter your name and the review passcode first.');
      return;
    }
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
        '<textarea class="form-control" id="fbText" rows="4" maxlength="4000" required></textarea>' +
        '<div class="invalid-feedback" id="fbTextErr" hidden>Enter your feedback.</div></div>' +
      '<div class="rv-fb-action" hidden>' +
        '<div class="mb-2"><label class="form-label ds-required" for="fbOwner">Owner</label><input class="form-control form-control-sm" id="fbOwner" maxlength="80">' +
          '<div class="invalid-feedback" id="fbOwnerErr" hidden>Enter who owns this action.</div></div>' +
        '<div class="mb-2"><label class="form-label" for="fbDue">Due date</label><input class="form-control form-control-sm" id="fbDue" type="date"></div></div>' +
      '<p class="small text-danger-emphasis" id="fbErr" tabindex="-1" hidden></p>' +
      '<div class="rv-note-actions"><button type="submit" class="btn btn-sm btn-primary">Save to ' + esc(issue) + '</button><button type="button" class="btn btn-sm btn-outline-primary" data-fb-cancel>Cancel</button></div>';
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
    var msg = document.getElementById(f.id + 'Err');
    f.classList.toggle('is-invalid', bad);
    if (bad) { f.setAttribute('aria-invalid', 'true'); f.setAttribute('aria-describedby', msg.id); }
    else { f.removeAttribute('aria-invalid'); f.removeAttribute('aria-describedby'); }
    msg.hidden = !bad;
  }

  function submit(note) {
    var t = $('#fbType', form).value, text = $('#fbText', form), owner = $('#fbOwner', form), bad = [];
    if (!text.value.trim()) bad.push(text);
    if (t === 'Action' && !owner.value.trim()) bad.push(owner);
    bad.forEach(function (f) { mark(f, true); });
    if (bad.length) { bad[0].focus(); return; }
    var btn = $('button[type=submit]', form), err = $('#fbErr', form);
    btn.disabled = true; err.hidden = true;
    call('POST', '', {
      issue: issue, template: current.id, title: current.title, note: note, type: t, from: store('rvReviewer'),
      text: text.value.trim(), owner: t === 'Action' ? owner.value.trim() : '', due: t === 'Action' ? $('#fbDue', form).value : ''
    }).then(function (j) {
      items.push(j.item);
      closeForm(false); draw(); counts();
      var li = document.getElementById('fb-' + j.item.id); if (li) li.focus();
      say(t + ' saved to ' + issue + '.');
    }, function (x) {
      btn.disabled = false;
      if (x.status === 401) { store('rvReviewKey', null); closeForm(false); drawPanel('The review passcode was not accepted. Enter it again.'); var k = $('#rvWhoKey'); if (k) k.focus(); return; }
      err.textContent = x.message + ' Your feedback is still in the form.'; err.hidden = false; err.focus();
    });
  }

  function load() {
    return call('GET', '?issue=' + encodeURIComponent(issue)).then(function (j) {
      items = j.items.filter(function (i) { return i.template === current.id; });
      draw();
      return j.items;
    }, function (x) {
      if (x.status === 401) { store('rvReviewKey', null); drawPanel('The review passcode was not accepted. Enter it again.'); var k = $('#rvWhoKey'); if (k) k.focus(); return []; }
      panel.insertAdjacentHTML('beforeend', '<p class="small text-danger-emphasis mt-2 mb-0">' + esc(x.message) + ' Feedback already saved is not shown.</p>');
      return [];
    });
  }

  /* Open actions per template in the table: one read per story */
  function counts() {
    var cells = document.querySelectorAll('[data-open-actions]');
    if (!cfg.proxy || !store('rvReviewKey')) { Array.prototype.forEach.call(cells, function (td) { td.innerHTML = '<span class="text-body-secondary">Not connected</span>'; }); return; }
    var keys = {};
    R.templates.forEach(function (t) { var k = issueOf(t.id); if (k) keys[k] = 1; });
    Object.keys(keys).forEach(function (k) {
      call('GET', '?issue=' + encodeURIComponent(k)).then(function (j) {
        R.templates.forEach(function (t) {
          if (issueOf(t.id) !== k) return;
          var n = j.items.filter(function (i) { return i.template === t.id && i.type === 'Action' && i.status === 'Open'; }).length;
          var td = document.querySelector('[data-open-actions="' + t.id + '"]'); if (td) td.textContent = String(n);
        });
      }, function () { /* the cell stays empty */ });
    });
  }

  /* ---- events ---- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-fb-add')) { if (b.getAttribute('aria-expanded') === 'true') closeForm(true); else openForm(b); }
    else if (b.hasAttribute('data-fb-cancel')) closeForm(true);
    else if (b.id === 'rvWhoChange') { store('rvReviewKey', null); drawPanel(); $('#rvWhoName').focus(); }
    else if (b.hasAttribute('data-fb-status')) {
      var id = b.getAttribute('data-fb-status'), to = b.getAttribute('data-to');
      b.disabled = true;
      call('PATCH', '/' + encodeURIComponent(issue) + '/' + id, { status: to }).then(function (j) {
        items = items.map(function (i) { return i.id === id ? j.item : i; });
        draw(); counts();
        var again = document.querySelector('[data-fb-status="' + id + '"]'); if (again) again.focus();
        say(to === 'Done' ? 'Action marked done.' : 'Action reopened.');
      }, function (x) { b.disabled = false; say(x.message); });
    }
  });
  panel.addEventListener('submit', function (e) {
    if (e.target.id !== 'rvWho') return;
    e.preventDefault();
    var name = $('#rvWhoName').value.trim(), key = $('#rvWhoKey').value;
    if (!name || !key) { (name ? $('#rvWhoKey') : $('#rvWhoName')).focus(); say('Enter your name and the review passcode.'); return; }
    store('rvReviewer', name); store('rvReviewKey', key);
    drawPanel();
    load().then(function () {
      counts();
      if (!store('rvReviewKey')) return;   /* the passcode was refused; load() put focus back on it */
      var b = $('[data-fb-add="template"]'); if (b) b.focus(); say('Connected. Feedback goes to ' + issue + '.');
    });
  });

  drawPanel();
  if (cfg.proxy && issue && store('rvReviewer') && store('rvReviewKey')) load().then(counts); else counts();
})();
