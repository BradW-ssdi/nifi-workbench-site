/* Bootstrap modal markup, opened and closed by this script instead of
   bootstrap.bundle.js. Bootstrap's modal script does not return focus to the
   opener in every path and its trap misses some controls; the screens keep
   their own tested trap and call these functions.

   Markup: <div class="modal" id="x" tabindex="-1" role="dialog" aria-modal="true"
           aria-labelledby="..." hidden> <div class="modal-dialog"> <div class="modal-content">
   Show:   dsDialog.show(modal)  adds .show and a .modal-backdrop, sets body.modal-open, focuses the modal
   Hide:   dsDialog.hide(modal)  reverses it; the caller returns focus to the opener
   Top:    dsDialog.top()        the dialog on top, or null; dsDialog.depth() how many are open

   Dialogs stack (a dialog opened from a dialog). As in Phase 2, the new dialog replaces the one below: the dialog
   below is hidden while the new one is open and comes back, as it was, when the new one closes (BA review
   2026-10-20). A confirmation (role="alertdialog", or data-ds-overlay) instead opens on top of the dialog below, which
   stays visible but inert, with its own backdrop, so the person sees what they are confirming. Everything outside
   the open dialog is inert. Hiding a dialog also hides any dialog opened above it, and restores only what its own
   level made inert. Keep the dialogs of a page as siblings (not nested in each other's markup). */
(function () {
  'use strict';
  var BASE_BACKDROP = 1050, BASE_MODAL = 1055, STEP = 20;
  var stack = [];   /* { modal, backdrop, marked: [elements this level made inert] } */

  function show(modal) {
    var level = stack.length, below = level ? stack[level - 1] : null;
    var overlay = modal.getAttribute('role') === 'alertdialog' || modal.hasAttribute('data-ds-overlay');
    var replaced = below && !overlay ? below : null;   /* the dialog below hides while this one is open */
    if (replaced) { replaced.modal.classList.remove('show'); replaced.modal.hidden = true; }
    modal.hidden = false;
    modal.classList.add('show');
    modal.setAttribute('aria-modal', 'true');
    /* one backdrop per visible layer: a dialog that replaces the one below keeps that one's backdrop */
    var backdrop = null;
    if (!replaced) {
      backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop show';
      backdrop.setAttribute('data-ds-backdrop', String(level));
      if (level) backdrop.style.zIndex = BASE_BACKDROP + STEP * level;
      document.body.appendChild(backdrop);
    }
    if (level) {
      modal.style.zIndex = BASE_MODAL + STEP * level;
      modal.setAttribute('data-ds-level', String(level));
    }
    document.body.classList.add('modal-open');
    /* A lower level made every sibling of its dialog inert, including this dialog if it is a sibling. Lift that for
       this dialog and its ancestors while it is open; it goes back when this dialog closes. */
    var lifted = [];
    for (var up = modal; up && up !== document.body; up = up.parentElement) {
      if (up.hasAttribute('data-ds-inert')) {
        lifted.push({ el: up, mark: up.getAttribute('data-ds-inert') });
        up.removeAttribute('data-ds-inert');
        up.removeAttribute('inert');
      }
    }
    /* Everything behind the dialog is inert for screen readers and the pointer: the siblings of the dialog and of
       each of its ancestors up to <body>. Inside the Phase 2 frame the dialog sits in <main>, so marking only the
       children of <body> would make the dialog's own container inert. Elements a lower level already made inert
       are left to that level. */
    var marked = [];
    for (var node = modal; node && node !== document.body; node = node.parentElement) {
      Array.prototype.forEach.call(node.parentElement.children, function (el) {
        if (el === node || el.hasAttribute('data-ds-backdrop') || el.tagName === 'SCRIPT' || el.hasAttribute('data-ds-inert')) return;
        el.setAttribute('data-ds-inert', el.hasAttribute('inert') ? 'was' : '');
        el.setAttribute('inert', '');
        marked.push(el);
      });
    }
    stack.push({ modal: modal, backdrop: backdrop, marked: marked, lifted: lifted, replaced: replaced });
    modal.focus();
  }

  function close(entry) {
    entry.modal.classList.remove('show');
    entry.modal.hidden = true;
    entry.modal.style.zIndex = '';
    entry.modal.removeAttribute('data-ds-level');
    entry.marked.forEach(function (el) {
      if (el.getAttribute('data-ds-inert') !== 'was') el.removeAttribute('inert');
      el.removeAttribute('data-ds-inert');
    });
    entry.lifted.forEach(function (l) { l.el.setAttribute('data-ds-inert', l.mark); l.el.setAttribute('inert', ''); });
    if (entry.backdrop) entry.backdrop.remove();
    if (entry.replaced) { entry.replaced.modal.hidden = false; entry.replaced.modal.classList.add('show'); }
  }

  function hide(modal) {
    var i = -1;
    stack.forEach(function (s, n) { if (s.modal === modal) i = n; });
    if (i === -1) { modal.classList.remove('show'); modal.hidden = true; return; }
    while (stack.length > i) close(stack.pop());
    if (!stack.length) document.body.classList.remove('modal-open');
  }

  window.dsDialog = {
    show: show,
    hide: hide,
    top: function () { return stack.length ? stack[stack.length - 1].modal : null; },
    depth: function () { return stack.length; }
  };
})();
