/*
 * Phase 3 queue filters: page behavior for templates/phase3/fragments/queueFilters.html, on top of Phase 2's
 * chip.js (which does the chip and menu work itself).
 *
 * - Focus: after Update or Clear selection the menu closes; focus goes back to that chip's expand button instead of
 *   being lost with the closed menu. After Reset it goes to the first chip.
 * - Escape closes an open chip menu and returns focus to its expand button. Phase 2's chip menus have no Escape
 *   handling, and Bootstrap's dropdown key handler (document, capture phase) throws on Escape inside a
 *   .dropdown-menu that has no data-bs-toggle button, so this listens on window in the capture phase, before it.
 * - Chips added from the Filter button (type D) are rendered hidden. Checking a column shows its chip and opens its
 *   menu; unchecking it, or the chip's close button, clears its filter and hides it again.
 * - An applied chip carries .chip-filtered, which chips.css uses to style its operator.
 * - Each change is announced in the chip row's status region, with the result count from the element marked
 *   data-phase3-results-summary.
 * - The queue table is Phase 2's: every request swaps the rows (tbody.tableData) in place, and after each swap this
 *   fires updatePaginationNav on the form's #paginationNav, which fetches Phase 2's queues/paginationNav fragment
 *   (as Phase 2's applyListeners does). Focus and the announcement wait for that second swap, so they use the new
 *   page buttons and the new items message.
 * - phase3Queue.sort(th, formId) for Phase 2's sort headers (th + span + i.bi.sortable-icon) rendered with
 *   data-sort-key and data-sort-next. The header is not swapped, so the sort state (aria-sort, .sorted, the caret,
 *   the next sort) is moved here. Enter or Space on a sort header clicks it, so the keyboard can sort.
 *
 * The same file runs in the app (static/js/phase3-queue.js) and in the design system templates, where
 * js/phase2-chip-standin.js stands in for chip.js and js/queue-server-standin.js answers the requests.
 */
(function () {
    "use strict";

    var pendingFocus = null;
    var pendingMessage = null;
    var pendingSummary = false;
    var lastTrigger = null;
    var awaitingNav = {};

    function form(formId) { return document.getElementById(formId); }
    function chipRow(formId) { var f = form(formId); return f && f.querySelector("[data-phase3-queue-chips]"); }
    function wrapper(formId, id) { var c = document.getElementById(id); return c && c.closest(".chipsWithSubMenu"); }
    function labelOf(id) { var l = document.getElementById(id + "-chipLabel"); return l ? l.textContent.trim() : id; }

    function say(formId, message) {
        var row = chipRow(formId);
        var status = row && row.querySelector("[data-phase3-queue-status]");
        if (!status) { return; }
        status.textContent = "";
        setTimeout(function () { status.textContent = message; }, 150);
    }

    function closeMenu(id) {
        var menu = document.getElementById(id + "-subMenu");
        if (menu) { menu.classList.remove("show"); }
        var w = document.getElementById(id) && document.getElementById(id).closest(".chipsWithSubMenu");
        var expand = w && w.querySelector(".chip-expand");
        if (expand) { expand.setAttribute("aria-expanded", "false"); }
        return expand;
    }

    /*
     * chips.css styles an applied chip's operator through .chip-filtered on the chip. Phase 2 re-renders its chips
     * with that class after a filter; here the chips stay in place, so the class follows each chip's hidden filter.
     */
    function syncChipClasses(row) {
        row.querySelectorAll(".chipsWithSubMenu").forEach(function (w) {
            var chip = w.querySelector(".chip-button");
            var hidden = w.querySelector(".hiddenFilter");
            var applied = !!(hidden && hidden.value);
            chip.classList.toggle("chip-filtered", applied);
            // chip.js sized the operator before the class changed its font; size it again
            var operator = document.getElementById(chip.id + "-chipOperator");
            if (applied && operator && typeof resizeSelect === "function") { resizeSelect(operator, chip.id); }
        });
    }

    function firstChipButton(formId) {
        var row = chipRow(formId);
        if (!row) { return null; }
        var buttons = row.querySelectorAll(".chipsWithSubMenu:not([hidden]) .chip-expand, #filtersId");
        return buttons.length ? buttons[0] : null;
    }

    /*
     * The header shows the sort in the form's #sorting ("column:asc" or "column:desc"): aria-sort and .sorted on the
     * sorted column's th (which show its caret, turned for ascending), and each button's next sort.
     */
    function syncSortHeader(formId) {
        var f = form(formId);
        if (!f) { return; }
        var parts = (f.querySelector("#sorting").value || "").split(":");
        var key = parts[0], desc = (parts[1] || "").toLowerCase() === "desc";
        f.querySelectorAll("thead th[data-sort-next]").forEach(function (th) {
            var id = th.getAttribute("data-sort-key"), on = id === key, icon = th.querySelector(".sortable-icon");
            th.classList.toggle("sorted", on);
            th.setAttribute("aria-sort", on ? (desc ? "descending" : "ascending") : "none");
            if (icon) { icon.className = "bi " + (on ? (desc ? "bi-caret-down-fill " : "bi-caret-up-fill ") : "") + "sortable-icon"; }
            th.setAttribute("data-sort-next", id + (on && !desc ? ":desc" : ":asc"));
        });
    }

    /* Close button of a chip added from Filter, and unchecking it in the Filter menu. */
    function removeChip(formId, id) {
        var w = wrapper(formId, id);
        if (!w) { return; }
        var hadFilter = (document.getElementById(id + "-hiddenFilter") || {}).value;
        if (hadFilter) {
            // Phase 2's own path: Clear selection resets the chip and posts the form
            triggerClickClearSelection(formId, id);
        }
        closeMenu(id);
        w.hidden = true;
        var check = document.getElementById(id + "-check");
        if (check) { check.checked = false; }
        if (!hadFilter) { syncReset(formId); }
        var filterButton = document.getElementById("filtersId");
        if (filterButton) { filterButton.focus(); }
        if (hadFilter) {
            pendingMessage = labelOf(id) + " filter removed.";
        } else {
            say(formId, labelOf(id) + " filter removed.");
        }
    }

    /* Reset shows as soon as a filter is added from Filter, before it has values; otherwise Phase 2's rule decides
       (a value applied, or the sort changed). */
    function syncReset(formId) {
        var f = form(formId), row = chipRow(formId);
        var r = f && f.querySelector("#clearFiltersDiv");
        if (!r) { return; }
        if (row && row.querySelector(".chipsWithSubMenu[data-chip-type='D']:not([hidden])")) { r.style.display = ""; return; }
        if (typeof updateHiddenFilteringVariable === "function") { updateHiddenFilteringVariable(formId); }
    }

    /* The Filter button's column menu: Bootstrap's dropdown when Bootstrap is loaded, otherwise its .show class. */
    function closeFilterMenu() {
        var filterButton = document.getElementById("filtersId");
        if (!filterButton) { return; }
        if (window.bootstrap) { bootstrap.Dropdown.getOrCreateInstance(filterButton).hide(); return; }
        var menu = document.getElementById("filterButtonId");
        if (menu) { menu.classList.remove("show"); }
        filterButton.setAttribute("aria-expanded", "false");
    }

    /* A column checked or unchecked in the Filter menu. */
    function toggleChip(checkbox, formId) {
        var id = checkbox.value;
        if (!checkbox.checked) {
            removeChip(formId, id);
            return;
        }
        var w = wrapper(formId, id);
        if (!w) { return; }
        w.hidden = false;
        syncReset(formId);
        closeFilterMenu();
        var expand = w.querySelector(".chip-expand");
        if (expand) { expand.click(); }
        say(formId, labelOf(id) + " filter added. Its menu is open.");
    }

    /* Reset: clear every filter, the search box, the sort, and the page size. The Reset button then posts the form
       (hx-post on the button). */
    function reset(formId) {
        var row = chipRow(formId);
        if (!row) { return; }
        row.querySelectorAll(".chipsWithSubMenu").forEach(function (w) {
            var chip = w.querySelector(".chip-button");
            var hidden = w.querySelector(".hiddenFilter");
            if (hidden && hidden.value) {
                clearSelectionCoded(chip.id, labelOf(chip.id), formId);
            }
            closeMenu(chip.id);
            if (w.getAttribute("data-chip-type") === "D") {
                w.hidden = true;
                var check = document.getElementById(chip.id + "-check");
                if (check) { check.checked = false; }
            }
        });
        // the sort and the header go back to the page's first order here
        var f = form(formId);
        f.querySelector("#sorting").value = f.querySelector("#originalSorting").value;
        syncSortHeader(formId);
        f.querySelector("#paginationNbr").value = "{'page':'0'}";
        // the queue's search box (a named search input in the form; the chips' own search boxes have no name)
        f.querySelectorAll("input[type='search'][name]").forEach(function (box) { box.value = ""; });
        // and the page size, as Phase 2's Reset does (refreshTable with fullRefresh)
        var size = f.querySelector("#size"), originalSize = f.querySelector("#originalPageSize");
        if (size && originalSize && originalSize.value) { size.value = originalSize.value; }
        updateHiddenFilteringVariable(formId);
        syncChipClasses(row);
        pendingFocus = "first";
        pendingMessage = "Filters and sorting reset.";
    }

    /*
     * A column header's sort button: writes its data-sort-next ("column:asc" or "column:desc", rendered by the
     * server) into the form's #sorting, goes back to page 1, and shows Reset, as Phase 2's sort() does. Its hx-post
     * then requests the results.
     */
    function sort(button, formId) {
        var f = form(formId);
        if (!f) { return; }
        f.querySelector("#sorting").value = button.getAttribute("data-sort-next");
        f.querySelector("#paginationNbr").value = "{'page':'0'}";
        var resetDiv = f.querySelector("#clearFiltersDiv");
        if (resetDiv) { resetDiv.style.display = ""; }
        syncSortHeader(formId);
    }

    /* Enter or Space on a sort header (a th with tabindex) clicks it, as a button would */
    document.addEventListener("keydown", function (evt) {
        var th = evt.target && evt.target.matches && evt.target.matches("th[data-sort-next]") ? evt.target : null;
        if (!th || (evt.key !== "Enter" && evt.key !== " ")) { return; }
        evt.preventDefault();
        th.click();
    });

    /* The control that asked for new results, found again after the pagination bar is replaced: by its id, or for
       Phase 2's Previous and Next (no id on the button) by its li's id. */
    function triggerOf(elt) {
        if (!elt) { return null; }
        if (elt.id) { return "#" + elt.id; }
        var li = elt.closest && elt.closest("li[id]");
        return li ? "#" + li.id + " > button" : null;
    }

    document.addEventListener("htmx:beforeRequest", function (evt) {
        var elt = evt.detail && evt.detail.elt;
        // the pagination bar fetching its own new content is the second half of a request, not a new one
        if (elt && elt.id === "paginationNav") { return; }
        lastTrigger = triggerOf(elt);
        // a sort button: the new order (already in #sorting) is announced with the result count
        if (elt && elt.getAttribute && elt.getAttribute("data-sort-next")) {
            var sorting = elt.closest("form") && elt.closest("form").querySelector("#sorting");
            var dir = sorting && /:desc$/.test(sorting.value) ? "descending" : "ascending";
            pendingMessage = "Sorted by " + elt.textContent.trim().replace(/\s+/g, " ") + ", " + dir + ".";
        }
        // a page button or the page size: the new range is announced
        if (elt && elt.closest && (elt.closest(".pagination") || elt.id === "paginationNavBarPageSizeDropdown")) {
            pendingSummary = true;
        }
        // a control marked data-phase3-announce (for example a search box) has the new result count announced
        if (elt && elt.hasAttribute && elt.hasAttribute("data-phase3-announce")) {
            pendingSummary = true;
        }
        var w = elt && elt.closest && elt.closest("[data-phase3-queue-chips] .chipsWithSubMenu");
        if (!w) { return; }
        syncChipClasses(w.closest("[data-phase3-queue-chips]"));
        var chip = w.querySelector(".chip-button");
        var expand = w.querySelector(".chip-expand");
        var active = document.activeElement;
        // The operator changed on the chip itself: chip.js "closes" the menu by clicking the chip, which opens it
        // when it was closed. Keep it closed; focus stays on the operator.
        if (elt.classList && elt.classList.contains("chip-operator")) {
            closeMenu(chip.id);
            elt.focus();
            active = elt;
        }
        // Update or Clear selection: chip.js has closed the menu that had focus. Focus goes to this chip's expand
        // button, which the results swap does not replace. A change made on the chip itself keeps its focus.
        if (expand && !w.hidden && (!active || active === document.body || (active.closest && active.closest(".custom-dropdown")))) {
            expand.focus();
        }
        var applied = (document.getElementById(chip.id + "-hiddenFilter") || {}).value;
        var value = (document.getElementById(chip.id + "-chipValue") || {}).textContent || "";
        pendingMessage = applied ? "Filter applied: " + labelOf(chip.id) + " " + value.trim() + "." : "Filter cleared: " + labelOf(chip.id) + ".";
    });

    /* New rows: the pagination bar fetches its new content (Phase 2's updatePaginationNav). */
    document.addEventListener("htmx:afterSwap", function (evt) {
        var target = evt.detail && evt.detail.target;
        var f = target && target.classList && target.classList.contains("tableData") && target.closest("form");
        var nav = f && f.querySelector("#paginationNav[hx-trigger]");
        if (!nav || !f.querySelector("[data-phase3-queue-chips]") || typeof htmx === "undefined") { return; }
        awaitingNav[f.id] = true;
        htmx.trigger(nav, "updatePaginationNav");
    });

    document.addEventListener("htmx:afterSettle", function (evt) {
        var target = evt.detail && evt.detail.target;
        var settled = target && target.closest && target.closest("form");
        // the rows are in; wait for the pagination bar, which holds the page buttons and the new items message
        if (settled && awaitingNav[settled.id] && target.classList.contains("tableData")) { return; }
        if (settled && target.id === "paginationNav") { delete awaitingNav[settled.id]; }
        document.querySelectorAll("[data-phase3-queue-chips]").forEach(function (row) {
            var formId = row.getAttribute("data-form-id");
            syncReset(formId);
            if (pendingFocus === "first") {
                var b = firstChipButton(formId);
                if (b) { b.focus(); }
            } else if (lastTrigger && (!document.activeElement || document.activeElement === document.body)) {
                // htmx puts focus back on a replaced control with the same id; Previous and Next have none, and come
                // back disabled at the first or last page, so focus goes to the current page instead of being lost
                var f = form(formId);
                var again = f && f.querySelector(lastTrigger);
                var current = f && f.querySelector(".pagination [aria-current='page']");
                if (again && !again.disabled) { again.focus(); } else if (current) { current.focus(); }
            }
            var summary = "";
            if (pendingMessage || pendingSummary) {
                var f = form(formId);
                var s = f && f.querySelector("[data-phase3-results-summary]");
                summary = s ? s.textContent.trim().replace(/\s+/g, " ") + "." : "";
            }
            if (pendingMessage || (pendingSummary && summary)) {
                say(formId, ((pendingMessage || "") + " " + summary).trim());
            }
        });
        pendingFocus = null;
        pendingMessage = null;
        pendingSummary = false;
        lastTrigger = null;
    });

    window.addEventListener("keydown", function (evt) {
        if (!evt.target.closest) { return; }
        // Bootstrap's dropdown key handler also throws on the arrow keys inside a chip menu (no data-bs-toggle):
        // keep them from it; the keys still do what they do in the field (an operator select changes value)
        if ((evt.key === "ArrowUp" || evt.key === "ArrowDown") && evt.target.closest("[data-phase3-queue-chips] .chipsWithSubMenu .custom-dropdown")) {
            evt.stopPropagation();
            return;
        }
        if (evt.key !== "Escape") { return; }
        var w = evt.target.closest("[data-phase3-queue-chips] .chipsWithSubMenu");
        var menu = w && w.querySelector(".custom-dropdown.show");
        if (!menu) { return; }
        evt.stopPropagation();
        evt.preventDefault();
        var expand = closeMenu(w.querySelector(".chip-button").id);
        if (expand) { expand.focus(); }
    }, true);

    window.phase3Queue = { removeChip: removeChip, toggleChip: toggleChip, reset: reset, sort: sort };
})();
