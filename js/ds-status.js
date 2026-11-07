/* Make Inactive / Make Active on a view screen: confirm in a dialog, then change the status in place.

   Markup (one per page):
   - a button [data-status-toggle] with data-status-name="<what it is, as shown>" and aria-haspopup="dialog"
   - the status badge #statusBadge, whose text is Active or Inactive
   - a message #statusDone (class alert, role="status", tabindex="-1", hidden) at the top of the page
   - the dialog #statusDialog (js/ds-dialog.js markup) with #statusTitle, #statusText, and the confirm button #statusYes

   The button names the change ("Make Inactive"); the dialog asks "Make this <noun> inactive?" and says "<name> will be
   inactive." Confirming updates the badge, the button, and the message, and moves focus to the message. Cancel, Close,
   and Escape return focus to the button; Tab stays in the dialog. DEV: the server changes the status.

   Options (WDS View Algorithm, BA review 2026-11-06):
   - data-confirm-inactive / data-confirm-active on the button: the dialog's text for each change, {name} for the name
     (the legacy confirm wording).
   - #statusDone as a toast (class toast, without data-ds-toast so it does not show on load): its .toast-body gets the
     message and js/ds-toast.js shows it; focus stays on the button, whose label has changed. data-done-inactive /
     data-done-active on the button give the message, {name} for the name.
   - [data-hide-when-active]: hidden while the status is Active (WDS hides Edit on an active algorithm). */
(function () {
  'use strict';
  var btn = document.querySelector('[data-status-toggle]');
  if (!btn) return;
  function $(id) { return document.getElementById(id); }
  var dlg = $('statusDialog'), badge = $('statusBadge'), done = $('statusDone');
  var noun = btn.getAttribute('data-status-noun') || 'item', name = btn.getAttribute('data-status-name') || '';
  function active() { return badge.textContent.trim() === 'Active'; }
  function close() { dsDialog.hide(dlg); btn.focus(); }
  function label(state) { return 'Make ' + state; }
  function fill(attr, fallback) { var t = btn.getAttribute(attr); return t ? t.replace(/\{name\}/g, name) : fallback; }
  function sync() { Array.prototype.forEach.call(document.querySelectorAll('[data-hide-when-active]'), function (el) { el.hidden = active(); }); }
  var toast = done.classList.contains('toast');
  sync();
  btn.addEventListener('click', function () {
    var next = active() ? 'Inactive' : 'Active';
    $('statusTitle').textContent = 'Make this ' + noun + ' ' + next.toLowerCase() + '?';
    $('statusText').textContent = fill('data-confirm-' + next.toLowerCase(), name + ' will be ' + next.toLowerCase() + '.');
    $('statusYes').textContent = label(next);
    done.hidden = true;
    dsDialog.show(dlg);
  });
  Array.prototype.forEach.call(dlg.querySelectorAll('[data-close]'), function (b) { b.addEventListener('click', close); });
  $('statusYes').addEventListener('click', function () {
    var now = active() ? 'Inactive' : 'Active';
    dsDialog.hide(dlg);
    badge.textContent = now;
    badge.className = 'badge ' + (now === 'Active' ? 'text-bg-success' : 'text-bg-secondary');
    btn.textContent = label(now === 'Active' ? 'Inactive' : 'Active');
    sync();
    var msg = fill('data-done-' + now.toLowerCase(), 'The ' + noun + ' is now ' + now.toLowerCase() + '.');
    if (toast) { done.querySelector('.toast-body').textContent = msg; window.dsToast.show(done); btn.focus(); return; }
    done.textContent = msg;
    done.hidden = false;
    done.focus();
  });
  window.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !dlg.hidden) { e.stopPropagation(); close(); } }, true);
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab' || dlg.hidden) return;
    var f = Array.prototype.slice.call(dlg.querySelectorAll('button')).filter(function (el) { return el.offsetParent; });
    if (e.shiftKey && (document.activeElement === f[0] || document.activeElement === dlg)) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });
})();
