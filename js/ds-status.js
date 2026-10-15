/* Make Inactive / Make Active on a view screen: confirm in a dialog, then change the status in place.

   Markup (one per page):
   - a button [data-status-toggle] with data-status-name="<what it is, as shown>" and aria-haspopup="dialog"
   - the status badge #statusBadge, whose text is Active or Inactive
   - a message #statusDone (class alert, role="status", tabindex="-1", hidden) at the top of the page
   - the dialog #statusDialog (js/ds-dialog.js markup) with #statusTitle, #statusText, and the confirm button #statusYes

   The button names the change ("Make Inactive"); the dialog asks "Make this <noun> inactive?" and says "<name> will be
   inactive." Confirming updates the badge, the button, and the message, and moves focus to the message. Cancel, Close,
   and Escape return focus to the button; Tab stays in the dialog. DEV: the server changes the status. */
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
  btn.addEventListener('click', function () {
    var next = active() ? 'Inactive' : 'Active';
    $('statusTitle').textContent = 'Make this ' + noun + ' ' + next.toLowerCase() + '?';
    $('statusText').textContent = name + ' will be ' + next.toLowerCase() + '.';
    $('statusYes').textContent = label(next);
    done.hidden = true;
    dsDialog.show(dlg);
  });
  Array.prototype.forEach.call(dlg.querySelectorAll('[data-close]'), function (b) { b.addEventListener('click', close); });
  $('statusYes').addEventListener('click', function () {
    var now = active() ? 'Inactive' : 'Active';
    dsDialog.hide(dlg);
    badge.textContent = now;
    badge.className = 'badge ' + (now === 'Active' ? 'text-bg-success' : 'text-bg-closed');
    btn.textContent = label(now === 'Active' ? 'Inactive' : 'Active');
    done.textContent = 'The ' + noun + ' is now ' + now.toLowerCase() + '.';
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
