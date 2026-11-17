/*
 * Table Settings on a queue: Phase 2's settings menu with Compact Rows (Phase 2: the Table Settings dropdown on its
 * queues, and js/compact-rows.js). Same contract as Phase 2, so the two share the setting:
 * - the menu's switch is #compactSwitch; the queue table carries .tableCompact; Compact Rows adds Bootstrap's
 *   .table-sm to it
 * - the choice is kept for the session per table, under compactRows__<table id>
 * - a table replaced by a results request (htmx) gets the setting again
 * Markup (scripts/screens/phase3-queue.py table_settings()), as the dev team's (Slack 11-14): the wrapper
 * .ds-table-settings carries the Settings tooltip, the button #tableSettingsBtn carries data-bs-toggle="dropdown", and the
 * menu is #tableSettingsMenu[data-table="<table id>"] right after the button, so Tab goes from the button into the switch.
 * Bootstrap's dropdown opens and closes the menu, sets aria-expanded, closes it on Escape or a click outside, and Escape
 * puts focus back on the button; on a page without Bootstrap's JS this script does the same.
 *
 * Tables start compact, as Phase 2's (Phase 3 review, Team B slide 2, 11/11: compact rows on by default).
 */
(function () {
    "use strict";
    var START_COMPACT = true;

    function key(tableId) { return "compactRows__" + tableId; }
    function isCompact(tableId) {
        var v = null;
        try { v = sessionStorage.getItem(key(tableId)); } catch (x) { v = null; }
        return v === null ? START_COMPACT : v === "true";
    }
    function applyAll() {
        var menu = document.getElementById("tableSettingsMenu");
        var tableId = menu && menu.getAttribute("data-table");
        var table = tableId && document.getElementById(tableId);
        if (!table || !table.classList.contains("tableCompact")) { return; }
        var on = isCompact(tableId);
        table.classList.toggle("table-sm", on);
        var sw = document.getElementById("compactSwitch");
        if (sw) { sw.checked = on; }
    }

    function setOpen(open, focusButton) {
        var menu = document.getElementById("tableSettingsMenu"), btn = document.getElementById("tableSettingsBtn");
        if (!menu || !btn) { return; }
        menu.classList.toggle("show", open);
        btn.setAttribute("aria-expanded", String(open));
        if (!open && focusButton) { btn.focus(); }
    }

    // Where Bootstrap's JS is on the page (the app, and the templates in the Phase 2 layout), its dropdown does all of
    // this. The standalone templates (design-preview) have no Bootstrap JS, so this script opens and closes the menu there.
    function bootstrapDoesIt() { return !!(window.bootstrap && window.bootstrap.Dropdown); }
    document.addEventListener("click", function (evt) {
        if (bootstrapDoesIt()) { return; }
        var btn = evt.target.closest && evt.target.closest("#tableSettingsBtn");
        var menu = document.getElementById("tableSettingsMenu");
        if (!menu) { return; }
        if (btn) { setOpen(!menu.classList.contains("show"), false); }
        else if (!evt.target.closest("#tableSettingsMenu") && menu.classList.contains("show")) { setOpen(false, false); }
    });
    window.addEventListener("keydown", function (evt) {
        if (bootstrapDoesIt()) { return; }
        var menu = document.getElementById("tableSettingsMenu");
        if (!menu || !evt.target.closest || !evt.target.closest(".ds-table-settings")) { return; }
        if (evt.key !== "Escape" || !menu.classList.contains("show")) { return; }
        evt.preventDefault();
        evt.stopPropagation();
        setOpen(false, true);
    }, true);
    document.addEventListener("change", function (evt) {
        if (evt.target.id !== "compactSwitch") { return; }
        var menu = document.getElementById("tableSettingsMenu");
        var tableId = menu && menu.getAttribute("data-table");
        if (!tableId) { return; }
        try { sessionStorage.setItem(key(tableId), String(evt.target.checked)); sessionStorage.setItem("compactRows", String(evt.target.checked)); } catch (x) { /* storage blocked: this view only */ }
        applyAll();
        var status = document.querySelector("[data-phase3-queue-status], #filterStatus");
        if (status) { status.textContent = ""; setTimeout(function () { status.textContent = evt.target.checked ? "Compact rows on." : "Compact rows off."; }, 100); }
    });
    document.addEventListener("htmx:afterSettle", applyAll);
    if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", applyAll); } else { applyAll(); }
})();
