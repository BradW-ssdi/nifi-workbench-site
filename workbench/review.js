/* BA review page: the template list with review status, and one template in a frame with its numbered notes pinned
   on it. Notes and status live in review-notes.js. Pins are drawn into the framed page only here; the templates
   themselves carry no notes. */
(function () {
  'use strict';
  var R = window.REVIEW, $ = function (s, r) { return (r || document).querySelector(s); };
  var BADGE = { draft: 'text-bg-pending', ready: 'text-bg-info', changes: 'text-bg-warning', approved: 'text-bg-success' };
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function badge(st) { return '<span class="badge ' + BADGE[st] + '">' + esc(R.status[st]) + '</span>'; }

  var params = new URLSearchParams(location.search);
  var current = R.templates.filter(function (t) { return t.id === params.get('t'); })[0] || R.templates[0];

  /* ---- template list ---- */
  $('#rvRows').innerHTML = R.templates.map(function (t) {
    var here = t === current;
    return '<tr' + (here ? ' class="is-selected"' : '') + '><th scope="row"><a href="?t=' + t.id + '#review"' + (here ? ' aria-current="page"' : '') + '>' + esc(t.title) + '</a></th>' +
      '<td>' + esc(t.priority) + '</td><td>' + badge(t.status) + '</td><td>' + t.notes.length + '</td>' +
      '<td>' + (t.decision ? esc(t.decision.date + ': ' + t.decision.text) : '<span class="text-body-secondary">None yet</span>') + '</td></tr>';
  }).join('');

  /* ---- the template under review ---- */
  $('#rvTitle').textContent = current.title;
  $('#rvBadge').innerHTML = badge(current.status);
  $('#rvOpen').href = 'screens/' + current.id + '.html';
  var frame = $('#rvFrame'), live = $('#rvStatus');
  frame.title = 'Template: ' + current.title;
  function say(t) { live.textContent = ''; setTimeout(function () { live.textContent = t; }, 30); }

  $('#rvNotes').innerHTML = current.notes.map(function (n, i) {
    return '<li class="rv-note" id="note-' + n.code + '" tabindex="-1">' +
      '<div class="rv-note-head"><span class="rv-num" aria-hidden="true">' + (i + 1) + '</span><h3 class="h6 mb-0">' + esc(n.title) + '</h3><code>' + esc(n.code) + '</code></div>' +
      (n.ask ? '<p class="mb-1"><span class="badge text-bg-warning">Question for BA</span></p>' : '') +
      '<p class="mb-1">' + esc(n.text) + '</p>' +
      (n.after ? '<p class="small text-body-secondary mb-1">Shows after you ' + esc(n.after) + '.</p>' : '') +
      '<div class="rv-note-actions"><button type="button" class="btn btn-sm btn-outline-primary" data-show="' + i + '" aria-label="Show ' + esc(n.code) + ' on the template">Show on template</button>' +
      '<button type="button" class="btn btn-sm btn-light" data-copy="' + i + '" aria-label="Copy reference ' + esc(n.code) + '">Copy reference</button></div></li>';
  }).join('');

  /* ---- pins inside the frame ---- */
  var doc = null, pins = [], raf = 0;
  function target(n) {
    if (!doc) return null;
    var els = Array.prototype.slice.call(doc.querySelectorAll(n.pin.sel));
    if (n.pin.text) els = els.filter(function (e) { return e.textContent.replace(/\s+/g, ' ').trim().indexOf(n.pin.text) === 0; });
    return els.filter(function (e) { return e.getClientRects().length; })[0] || els[0] || null;
  }
  /* A target under something else, such as the sticky header after scrolling, gets no pin. */
  function covered(el, r, vw, vh) {
    var x = Math.min(Math.max(r.left + Math.min(r.width / 2, 24), 1), vw - 1), y = Math.min(Math.max(r.top + Math.min(r.height / 2, 12), 1), vh - 1);
    var top = doc.elementsFromPoint(x, y).filter(function (n) { return !n.classList.contains('rv-pin'); })[0];
    return !!top && top !== el && !el.contains(top) && !top.contains(el);
  }
  function place() {
    raf = 0;
    if (!doc) return;
    var on = $('#rvPins').checked, used = {};
    pins.forEach(function (p) {
      var el = target(p.note), r = el && el.getClientRects().length ? el.getBoundingClientRect() : null;
      var vw = doc.documentElement.clientWidth, vh = doc.documentElement.clientHeight;
      if (!on || !r || r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw || covered(el, r, vw, vh)) { p.pin.hidden = true; return; }
      var key = Math.round(r.left) + ',' + Math.round(r.top), k = used[key] = (used[key] || 0) + 1;
      p.pin.hidden = false;
      p.pin.style.left = Math.max(2, Math.min(vw - 30, r.left - 12 + (k - 1) * 28)) + 'px';
      p.pin.style.top = Math.max(2, r.top - 12) + 'px';
    });
  }
  function later() { if (!raf) raf = frame.contentWindow.requestAnimationFrame(place); }
  frame.addEventListener('load', function () {
    doc = frame.contentDocument;
    var css = doc.createElement('style');
    css.textContent = '.rv-pin{position:fixed;z-index:3000;width:26px;height:26px;border-radius:50%;background:#B35C00;color:#fff;font:700 13px/26px Inter,system-ui,sans-serif;text-align:center;box-shadow:0 0 0 2px #fff,0 2px 6px rgba(0,0,0,.35);cursor:pointer;user-select:none}' +
      '.rv-pin[hidden]{display:none}.rv-flash{outline:3px solid #B35C00!important;outline-offset:3px!important}' +
      '@media (forced-colors:active){.rv-pin{border:2px solid CanvasText}.rv-flash{outline-color:Highlight!important}}';
    doc.head.appendChild(css);
    pins = current.notes.map(function (n, i) {
      var p = doc.createElement('div');
      p.className = 'rv-pin'; p.textContent = String(i + 1); p.title = n.code + ': ' + n.title; p.hidden = true;
      p.setAttribute('aria-hidden', 'true'); /* keyboard and screen reader users use the list of notes beside the frame */
      p.addEventListener('click', function () { var li = $('#note-' + n.code); li.scrollIntoView({ block: 'nearest' }); li.focus(); });
      doc.body.appendChild(p);
      return { note: n, pin: p };
    });
    /* ring the frame while focus is inside the template */
    doc.addEventListener('focusin', function () { frame.classList.add('has-focus'); });
    frame.contentWindow.addEventListener('blur', function () { frame.classList.remove('has-focus'); });
    doc.addEventListener('scroll', later, true);
    frame.contentWindow.addEventListener('resize', later);
    doc.addEventListener('click', function () { setTimeout(later, 50); }, true);
    doc.addEventListener('keyup', later, true);
    new frame.contentWindow.MutationObserver(later).observe(doc.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'class', 'style', 'aria-selected'] });
    later();
  });
  frame.src = 'screens/' + current.id + '.html';
  $('#rvPins').addEventListener('change', function () { place(); say(this.checked ? 'Note markers shown.' : 'Note markers hidden.'); });

  /* ---- width ---- */
  $('#rvWidth').addEventListener('change', function () {
    frame.style.width = this.value ? this.value + 'px' : '100%';
    say('Template shown at ' + (this.value ? this.value + ' pixels wide.' : 'full width.'));
  });

  /* ---- note actions ---- */
  $('#rvNotes').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-show')) {
      var n = current.notes[+b.getAttribute('data-show')], msg = '';
      if (n.pin.tab && doc) { var tab = doc.querySelector(n.pin.tab); if (tab && tab.getAttribute('aria-selected') !== 'true') { tab.click(); msg = 'Opened the ' + tab.textContent.trim() + ' tab. '; } }
      var el = target(n);
      if (!el || !el.getClientRects().length) { say(n.code + ' shows after you ' + (n.after || 'take an action on the template') + '.'); return; }
      /* a target taller than most of the view: bring its top in, clear of the template's sticky header */
      if (el.getBoundingClientRect().height > frame.contentWindow.innerHeight * 0.6) {
        var keep = el.style.scrollMarginTop; el.style.scrollMarginTop = '140px'; el.scrollIntoView({ block: 'start' }); el.style.scrollMarginTop = keep;
      } else el.scrollIntoView({ block: 'center' });
      el.classList.add('rv-flash'); setTimeout(function () { el.classList.remove('rv-flash'); }, 2500);
      $('#rvStage').scrollIntoView({ block: 'nearest' });
      later();
      say(msg + n.code + ' is highlighted on the template.');
    }
    if (b.hasAttribute('data-copy')) {
      var m = current.notes[+b.getAttribute('data-copy')], text = current.title + ', note ' + m.code + ' (' + m.title + '): ';
      var done = function () { say('Copied "' + text.trim() + '". Paste it into your comment on the Jira story.'); };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
      function fallback() { var t = document.createElement('textarea'); t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); done(); } catch (x) { say('Copy is not available here. The reference is ' + m.code + '.'); } t.remove(); b.focus(); }
    }
  });
})();
