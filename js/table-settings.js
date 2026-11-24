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
 *
 * A page with more than one table (Add and Edit Algorithm: the Resulted Test and Coded Result search dialogs) gives each
 * menu its own ids. The script works on each .ds-table-settings: its dropdown button, its .table-settings menu
 * (data-table), and the switch in it (role="switch").
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
    function parts(wrap) {
        var menu = wrap && wrap.querySelector(".table-settings[data-table]");
        return menu ? { wrap: wrap, menu: menu, btn: wrap.querySelector('[data-bs-toggle="dropdown"]'), sw: menu.querySelector('[role="switch"]') } : null;
    }
    function all() { return Array.prototype.map.call(document.querySelectorAll(".ds-table-settings"), parts).filter(Boolean); }
    function applyAll() {
        all().forEach(function (p) {
            var tableId = p.menu.getAttribute("data-table"), table = document.getElementById(tableId);
            if (!table || !table.classList.contains("tableCompact")) { return; }
            var on = isCompact(tableId);
            table.classList.toggle("table-sm", on);
            if (p.sw) { p.sw.checked = on; }
        });
    }

    function setOpen(p, open, focusButton) {
        if (!p || !p.btn) { return; }
        p.menu.classList.toggle("show", open);
        p.btn.setAttribute("aria-expanded", String(open));
        if (!open && focusButton) { p.btn.focus(); }
    }

    // Where Bootstrap's JS is on the page (the app, and the templates in the Phase 2 layout), its dropdown does all of
    // this. The standalone templates (design-preview) have no Bootstrap JS, so this script opens and closes the menu there.
    function bootstrapDoesIt() { return !!(window.bootstrap && window.bootstrap.Dropdown); }
    document.addEventListener("click", function (evt) {
        if (bootstrapDoesIt() || !evt.target.closest) { return; }
        var here = parts(evt.target.closest(".ds-table-settings"));
        all().forEach(function (p) {
            if (here && p.menu === here.menu) {
                if (evt.target.closest('[data-bs-toggle="dropdown"]')) { setOpen(p, !p.menu.classList.contains("show"), false); }
            } else if (p.menu.classList.contains("show")) { setOpen(p, false, false); }
        });
    });
    window.addEventListener("keydown", function (evt) {
        if (bootstrapDoesIt() || evt.key !== "Escape" || !evt.target.closest) { return; }
        var p = parts(evt.target.closest(".ds-table-settings"));
        if (!p || !p.menu.classList.contains("show")) { return; }
        evt.preventDefault();
        evt.stopPropagation();
        setOpen(p, false, true);
    }, true);
    document.addEventListener("change", function (evt) {
        if (evt.target.getAttribute("role") !== "switch" || !evt.target.closest) { return; }
        var menu = evt.target.closest(".table-settings[data-table]");
        var tableId = menu && menu.getAttribute("data-table");
        if (!tableId) { return; }
        try { sessionStorage.setItem(key(tableId), String(evt.target.checked)); sessionStorage.setItem("compactRows", String(evt.target.checked)); } catch (x) { /* storage blocked: this view only */ }
        applyAll();
        var status = (menu.closest(".modal") || document).querySelector("[data-phase3-queue-status], [data-table-status], #filterStatus");
        if (status) { status.textContent = ""; setTimeout(function () { status.textContent = evt.target.checked ? "Compact rows on." : "Compact rows off."; }, 100); }
    });
    document.addEventListener("htmx:afterSettle", applyAll);
    if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", applyAll); } else { applyAll(); }
})();

/*
 * Only the table scrolls (Phase 3 review, Team B slide 21: no second scroll bar outside the table's). Phase 2's queues.js
 * sizes the results (#myScrollableTable) to 80% of the window less 150px, which fits its queues; a library has a
 * breadcrumb, and some have a banner or a toast above the table, so the page ran past the window and scrolled as well.
 * The table takes Phase 2's size or the space left in the window under it and under what follows it (the porting pages'
 * Save and Continue footer), whichever is less (never under 120px, about three rows), again
 * when the window or anything above the table changes height, at any window height, as Phase 2's (Team B slide 21, again
 * 11/19: a window 600px tall or less, such as a 1080p laptop at 150% in Edge, scrolled the page too). At 992px wide and
 * below the table is not capped and the page scrolls (1.4.10), as Phase 2's.
 * DEV: in the app, run this after queues.js's resizeTableHeight (its window resize handler), or give that function the
 * same rule.
 */
(function () {
    "use strict";
    var box = null, ro = null;
    function fit() {
        box = document.getElementById("myScrollableTable");
        if (!box || !box.closest(".table-wrapper")) { return; }
        if (window.innerWidth <= 992) { box.style.maxHeight = "none"; return; }
        var phase2 = window.innerHeight * 0.8 - 150;
        var scroller = box.closest("main") || document.scrollingElement;
        var top = box.getBoundingClientRect().top + (scroller.scrollTop || 0);
        var foot = box.nextElementSibling, footH = foot && foot.getClientRects().length ? foot.getBoundingClientRect().height : 0;
        var room = window.innerHeight - top - footH - below(box.closest(".table-wrapper"), scroller) - 1;
        box.style.maxHeight = Math.max(120, Math.min(phase2, room)) + "px";
    }
    /* the height of what follows the table in the page: later siblings of the table and its ancestors, and the space
       their containers keep under them */
    function below(wrap, scroller) {
        var wb = wrap.getBoundingClientRect().bottom, end = wb, pad = 0;
        for (var el = wrap; el && el !== scroller && el !== document.body; el = el.parentElement) {
            for (var s = el.nextElementSibling; s; s = s.nextElementSibling) {
                var cs = window.getComputedStyle(s);
                if (!s.getClientRects().length || cs.position === "fixed" || cs.position === "absolute") { continue; }
                end = Math.max(end, s.getBoundingClientRect().bottom + (parseFloat(cs.marginBottom) || 0));
            }
            pad += parseFloat(window.getComputedStyle(el.parentElement).paddingBottom) || 0;
        }
        return end - wb + pad;
    }
    function watch() {
        fit();
        if (!box || !window.ResizeObserver) { return; }
        if (ro) { ro.disconnect(); }
        ro = new ResizeObserver(function () { window.requestAnimationFrame(fit); });
        /* what sits above and below the table: each ancestor's siblings, up to the page body */
        for (var el = box; el && el !== document.body; el = el.parentElement) {
            for (var s = el.previousElementSibling; s; s = s.previousElementSibling) { ro.observe(s); }
            for (var n = el.nextElementSibling; n; n = n.nextElementSibling) { ro.observe(n); }
            if (el.matches && el.matches("main")) { break; }
        }
    }
    window.addEventListener("resize", fit);
    document.addEventListener("htmx:afterSettle", watch);
    if (document.readyState === "complete") { watch(); } else { window.addEventListener("load", watch); }
})();
