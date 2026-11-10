/* Cancel confirmation, as Phase 2's (global in its framework; Phase 3 review, Team B slide 12). Every Cancel on a form,
   in a page's form footer or in a dialog that holds a form, asks first:

     title  "Cancel <page or dialog name>"
     text   "Are you sure you want to cancel from <name>? If you continue with the cancel by clicking OK, you will lose
             any information you have entered."
     OK     carries on with the Cancel (follows its link, or runs its button, which closes the dialog)
     Cancel closes the confirmation; the person stays where they were, focus back on the Cancel they pressed

   Loaded by app-frame.js on every page. A Cancel is skipped when it is inside a confirmation (role="alertdialog"), when
   nothing around it takes input, or when it carries data-cancel, data-dismiss or data-no-confirm (a screen that asks
   with its own dialog: Manage Conditions, Manage Questions). The name is the dialog's title, or the page's h1.
   Uses js/ds-dialog.js for the stacking, backdrop and inert background, and loads it when the page has not. */
(function () {
  'use strict';
  if (window.dsCancelConfirm) return;
  window.dsCancelConfirm = true;

  var SELF = (document.currentScript || {}).src || '';
  if (!window.dsDialog && SELF) {
    var s = document.createElement('script');
    s.src = SELF.replace(/ds-cancel-confirm\.js(\?.*)?$/, 'ds-dialog.js');
    document.head.appendChild(s);
  }

  function txt(el) { return el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : ''; }
  var FIELDS = 'input:not([type="hidden"]):not([type="search"]):not([type="button"]):not([type="submit"]), select, textarea';

  /* The Cancel of a form: its label is Cancel, it sits in a footer of a form, and the form takes input. */
  function formCancel(el) {
    var b = el.closest && el.closest('a.btn, button.btn');
    if (!b || txt(b) !== 'Cancel') return null;
    if (b.hasAttribute('data-cancel') || b.hasAttribute('data-dismiss') || b.hasAttribute('data-no-confirm')) return null;
    if (b.closest('[role="alertdialog"], .ds-modal-confirm')) return null;
    var dlg = b.closest('.modal');
    var scope = dlg || b.closest('form') || (b.closest('.ds-form-footer') && (b.closest('main') || document.body));
    if (!scope || !scope.querySelector(FIELDS)) return null;
    return { button: b, dialog: dlg };
  }
  function nameOf(c) {
    var t = c.dialog ? c.dialog.querySelector('.modal-title') : document.querySelector('main h1');
    var n = txt(t);
    return n || 'this page';
  }

  var box = null, pending = null;
  function build() {
    if (box) return box;
    box = document.createElement('div');
    box.className = 'modal ds-modal-confirm';
    box.id = 'dsCancelConfirm';
    box.tabIndex = -1;
    box.setAttribute('role', 'alertdialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-labelledby', 'dsCancelTitle');
    box.setAttribute('aria-describedby', 'dsCancelText');
    box.hidden = true;
    box.innerHTML = '<div class="modal-dialog"><div class="modal-content">' +
      '<div class="modal-header"><h2 class="modal-title h5" id="dsCancelTitle"></h2>' +
      '<button type="button" class="btn-close" data-stay aria-label="Close"></button></div>' +
      '<div class="modal-body"><p class="mb-0" id="dsCancelText"></p></div>' +
      '<div class="modal-footer"><button type="button" class="btn btn-outline-primary" data-stay>Cancel</button>' +
      '<button type="button" class="btn btn-primary" data-go>OK</button></div>' +
      '</div></div>';
    /* beside the page's other dialogs, so it takes the same styles (inside the Phase 2 frame's window) */
    var win = document.querySelector('.ds-window');
    var sib = win ? win.querySelector('.modal') : document.querySelector('main .modal, .ds-app .modal, .modal');
    (sib ? sib.parentNode : (win || document.body)).appendChild(box);
    Array.prototype.forEach.call(box.querySelectorAll('[data-stay]'), function (b) { b.addEventListener('click', stay); });
    box.querySelector('[data-go]').addEventListener('click', go);
    box.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); stay(); return; }
      if (e.key !== 'Tab') return;
      var f = Array.prototype.filter.call(box.querySelectorAll('button'), function (x) { return x.getClientRects().length; });
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    return box;
  }
  function show(c) {
    build();
    var name = nameOf(c);
    box.querySelector('#dsCancelTitle').textContent = 'Cancel ' + name;
    box.querySelector('#dsCancelText').textContent = 'Are you sure you want to cancel from ' + name +
      '? If you continue with the cancel by clicking OK, you will lose any information you have entered.';
    pending = c;
    if (window.dsDialog) window.dsDialog.show(box); else { box.hidden = false; box.classList.add('show'); box.style.display = 'block'; }
    box.querySelector('[data-go]').focus();
  }
  function hide() {
    if (window.dsDialog) window.dsDialog.hide(box); else { box.classList.remove('show'); box.hidden = true; box.style.display = ''; }
  }
  function stay() {
    var c = pending; pending = null; hide();
    if (c) window.setTimeout(function () { c.button.focus(); }, 30);
  }
  function go() {
    var c = pending; pending = null; hide();
    if (!c) return;
    c.button.setAttribute('data-confirmed', '');
    c.button.click();   /* the Cancel runs as it would have: a link navigates, a button closes its dialog */
    c.button.removeAttribute('data-confirmed');
  }

  document.addEventListener('click', function (e) {
    var c = formCancel(e.target);
    if (!c || c.button.hasAttribute('data-confirmed')) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    show(c);
  }, true);
})();
