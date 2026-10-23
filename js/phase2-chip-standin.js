/*
 * Stands in for Phase 2's chip.js and filtering-sorting-pagination.js in the design system templates, which are
 * public and do not carry Phase 2's code. It defines only the functions the Phase 3 queue markup calls
 * (templates/phase3/fragments/queueFilters.html and the results fragment), with Phase 2's behavior, and writes the
 * same hidden queue state: #filtering (the chips' JSON), #sorting, #paginationNbr, #size. In the app chip.js and
 * filtering-sorting-pagination.js are loaded instead; any function they already define is left alone.
 *
 * Where Phase 2 has a known problem that the markup cannot avoid, this follows the Phase 3 behavior instead and says
 * so (see docs/queue-component.md, "Phase 2 shared library changes").
 */
(function () {
    "use strict";

    function byId(id) { return document.getElementById(id); }
    function chipWrapper(id) { var c = byId(id); return c && c.closest(".chipsWithSubMenu"); }
    function options(id) {
        var inner = byId(id + "-divcheckboxlistInner");
        return inner ? Array.prototype.slice.call(inner.querySelectorAll(".form-check input")) : [];
    }
    function maxShown() {
        var m = byId("maxNumberCodedFilterDisplay");
        var n = m ? parseInt(m.value, 10) : 10;
        return n > 0 ? n : 10;
    }
    function inForm(formId, sel) { var f = byId(formId); return f ? f.querySelector(sel) : null; }

    /* ---------------------------------------------------------------- menus */

    function setExpanded(id, open) {
        var w = chipWrapper(id);
        var expand = w && (w.querySelector(".chip-expand[aria-controls='" + id + "-subMenu']") || w.querySelector(".chip-expand"));
        if (expand) { expand.setAttribute("aria-expanded", String(open)); }
    }
    function closeAllMenus(except) {
        document.querySelectorAll(".chipsWithSubMenu .custom-dropdown.show").forEach(function (m) {
            if (m.id === except) { return; }
            m.classList.remove("show");
            setExpanded(m.id.replace(/-subMenu$/, ""), false);
        });
    }

    /* chip.js toggleSubMenuFromChip: opens or closes the chip's menu; on open, focus goes to its first control. */
    function toggleSubMenuFromChip(id, evt) {
        if (evt && evt.target && evt.target.closest && evt.target.closest("select, .remove-filter") && !evt.target.closest(".chip-expand")) { return; }
        var menu = byId(id + "-subMenu");
        if (!menu) { return; }
        var open = !menu.classList.contains("show");
        closeAllMenus(menu.id);
        menu.classList.toggle("show", open);
        setExpanded(id, open);
        if (open) {
            var first = menu.querySelector("select, input, button");
            if (first) { first.focus(); }
        }
    }

    /* chip.js copyOperatorCodedValueSubMenuAction: before the menu opens, it shows what is applied. With nothing
       applied, Select All, Blanks and every value are checked. */
    function copyOperatorCodedValueSubMenuAction(id) {
        var hidden = byId(id + "-hiddenFilter"), chipOp = byId(id + "-chipOperator"), op = byId(id + "-operator");
        if (hidden && hidden.value) {
            if (chipOp && op && chipOp.value) { op.value = chipOp.value; }
        } else {
            var all = byId(id + "-selectAllRadio"), blanks = byId(id + "-blanksCheckbox");
            if (all) { all.checked = true; }
            if (blanks) { blanks.checked = true; }
            options(id).forEach(function (o) { o.checked = true; });
            if (op) { op.value = "="; }
        }
        codedRadioButtonsChange(id);
    }

    /* chip.js copyOperatorCodedValue: the operator changed on the chip itself goes into the menu too. */
    function copyOperatorCodedValue(select, id) {
        var op = byId(id + "-operator");
        if (op) { op.value = select.value; }
    }

    /* chip.js resizeSelect: the chip's operator select is as wide as its selected text. */
    function resizeSelect(select, id) {
        var sizer = byId(id + "-selectSizer");
        if (!select || !sizer || select.selectedIndex < 0) { return; }
        var cs = getComputedStyle(select);
        sizer.style.font = cs.font;
        sizer.textContent = select.options[select.selectedIndex].text;
        select.style.width = (sizer.getBoundingClientRect().width + 34) + "px";
    }

    /* ---------------------------------------------------------------- the checkbox list */

    function codedRadioButtonsChange(id) {
        var any = (byId(id + "-selectAllRadio") || {}).checked || (byId(id + "-blanksCheckbox") || {}).checked ||
            options(id).some(function (o) { return o.checked; });
        var update = byId(id + "-updateButton");
        if (update) { update.disabled = !any; }
    }
    function selectAllCodedFilter(id) {
        var on = (byId(id + "-selectAllRadio") || {}).checked;
        options(id).forEach(function (o) { o.checked = on; });
        var blanks = byId(id + "-blanksCheckbox");
        if (blanks) { blanks.checked = on; }
    }
    function checkUncheckSelectAllCodedFilter(el, id) {
        var all = byId(id + "-selectAllRadio");
        if (!all) { return; }
        var blanks = byId(id + "-blanksCheckbox");
        all.checked = options(id).every(function (o) { return o.checked; }) && (!blanks || blanks.checked);
    }
    function cancelEnterKey(evt) { if (evt.key === "Enter") { evt.preventDefault(); } }

    /* Shows the first values (the queue's maximum), hides the rest behind "expand". Phase 2's version also counts
       and hides the Select All and Blanks rows; here they always stay. */
    function resetCheckboxes(id) {
        var n = maxShown(), rows = byId(id + "-divcheckboxlistInner");
        if (!rows) { return; }
        var list = rows.querySelectorAll(".form-check");
        list.forEach(function (r, i) { r.classList.toggle("hiddenDynamicFilter", i >= n); });
        var more = byId(id + "-expandLink");
        if (more) { more.style.display = list.length > n ? "" : "none"; }
    }
    function filterCheckboxList(value, listId) {
        var id = listId.replace(/-divcheckboxlist$/, "");
        var q = String(value || "").trim().toLowerCase();
        if (listId === "checkbox-list") {   // the Filter button's column list
            byId("checkbox-list").querySelectorAll(".form-check").forEach(function (r) {
                r.classList.toggle("hiddenDynamicFilter", !!q && r.textContent.toLowerCase().indexOf(q) === -1);
            });
            return;
        }
        if (!q) { resetCheckboxes(id); return; }
        var inner = byId(id + "-divcheckboxlistInner");
        if (!inner) { return; }
        inner.querySelectorAll(".form-check").forEach(function (r) {
            r.classList.toggle("hiddenDynamicFilter", r.textContent.toLowerCase().indexOf(q) === -1);
        });
        var more = byId(id + "-expandLink");
        if (more) { more.style.display = "none"; }
    }
    function filterCheckboxListBackspace(evt, value, listId) {
        if (evt.key === "Backspace" || evt.key === "Delete") { setTimeout(function () { filterCheckboxList(evt.target.value, listId); }, 0); }
    }
    function showMoreDynamicFilters(innerId, n, id) {
        var inner = byId(innerId);
        if (inner) { inner.querySelectorAll(".form-check").forEach(function (r) { r.classList.remove("hiddenDynamicFilter"); }); }
        var more = byId(id + "-expandLink");
        if (more) { more.style.display = "none"; }
        var first = inner && inner.querySelectorAll(".form-check input")[n];
        if (first) { first.focus(); }
    }
    function clearTypeAhead0ValueFromFilterChip() {
        var t = byId("typeaheadFilters-typeahead");
        if (t) { t.value = ""; filterCheckboxList("", "checkbox-list"); }
    }

    /* ---------------------------------------------------------------- applying a filter */

    function labelText(input) { var l = input && document.querySelector("label[for='" + input.id + "']"); return l ? l.textContent.replace(/\s+/g, " ").trim() : ""; }

    /* chip.js updateCodedChipWithSelectionFromMenu: the chip's JSON, operator and text from the menu. */
    function updateCodedChipWithSelectionFromMenu(id, label) {
        var op = (byId(id + "-operator") || {}).value || "=";
        var all = (byId(id + "-selectAllRadio") || {}).checked;
        var blanks = !!(byId(id + "-blanksCheckbox") || {}).checked;
        var checked = options(id).filter(function (o) { return o.checked; });
        if (!all && !blanks && !checked.length) { return; }   // nothing chosen: Update is disabled, nothing changes
        var json = { columnName: id, dataType: "CODED", type: byId(id + "-removeFilter") ? "D" : "S" };
        var text;
        if (all) {
            json.selectedOperator = op === "!=" ? "NOTALL" : "ALL";
            text = "All" + (blanks ? ", Blanks" : "");
        } else {
            json.selectedOperator = op;
            json.selectedCoded = checked.length ? checked.map(function (o) { return o.value; }) : [""];
            text = checked.length > 1 ? "Multiple (" + checked.length + ")" : checked.length ? labelText(checked[0]) : "";
            text = checked.length ? text + (blanks ? ", Blanks" : "") : "Blanks";
        }
        json.blanks = blanks ? "true" : "false";
        byId(id + "-hiddenFilter").value = JSON.stringify(json);
        var chipOp = byId(id + "-chipOperator");
        if (chipOp) { chipOp.value = op; chipOp.disabled = false; chipOp.style.display = ""; resizeSelect(chipOp, id); }
        var value = byId(id + "-chipValue");
        if (value) { value.textContent = text; value.style.display = ""; }
        var lab = byId(id + "-chipLabel");
        if (lab) { lab.textContent = label; }
    }
    function updateFilterColor(id) {
        var chip = byId(id), hidden = byId(id + "-hiddenFilter");
        if (!chip) { return; }
        var applied = !!(hidden && hidden.value);
        chip.classList.toggle("chip-filtered", applied);
        chip.classList.toggle("chip-not-filtered", !applied);
        var clear = byId(id + "-clearSelection");
        if (clear) { clear.classList.toggle("chip-not-filtered", !applied); }
    }
    function closeMenu(id) {
        var menu = byId(id + "-subMenu");
        if (menu) { menu.classList.remove("show"); }
        setExpanded(id, false);
    }

    function codedFilterUpdateButton(id, label, formId) {
        resetPagination(formId);
        updateCodedChipWithSelectionFromMenu(id, label);
        updateHiddenFilteringVariable(formId);
        updateFilterColor(id);
        closeMenu(id);
        return false;
    }

    function clearSelectionCoded(id, label, formId) {
        var lab = byId(id + "-chipLabel");
        if (lab) { lab.textContent = label; }
        var chipOp = byId(id + "-chipOperator");
        if (chipOp) { chipOp.value = "="; chipOp.style.display = "none"; }
        var value = byId(id + "-chipValue");
        if (value) { value.textContent = ""; value.style.display = "none"; }
        byId(id + "-hiddenFilter").value = "";
        resetPagination(formId);
        var op = byId(id + "-operator");
        if (op) { op.value = "="; }
        var t = byId(id + "-typeahead");
        if (t) { t.value = ""; }
        resetCheckboxes(id);
        var all = byId(id + "-selectAllRadio");
        if (all) { all.checked = true; selectAllCodedFilter(id); }
        updateHiddenFilteringVariable(formId);
        updateFilterColor(id);
        closeMenu(id);
    }

    function triggerClickClearSelection(formId, id) {
        var b = inForm(formId, "#" + id + "-clearSelection");
        if (b) { b.click(); }
    }

    /* chip.js updateHiddenFilteringVariable and showHideResetLink, scoped to the form. */
    function updateHiddenFilteringVariable(formId) {
        var f = byId(formId);
        if (!f) { return; }
        var values = Array.prototype.map.call(f.querySelectorAll(".hiddenFilter"), function (h) { return h.value; }).filter(Boolean);
        var filtering = f.querySelector("#filtering");
        if (filtering) { filtering.value = "[" + values.join(",") + "]"; }
        var sorting = f.querySelector("#sorting"), original = f.querySelector("#originalSorting");
        var sorted = sorting && original && original.value && sorting.value !== original.value;
        var reset = f.querySelector("#clearFiltersDiv");
        if (reset) { reset.style.display = values.length || sorted ? "" : "none"; }
    }
    function resetPagination(formId) {
        var f = byId(formId);
        if (f && f.querySelector("#previousSearch")) { f.querySelector("#paginationNbr").value = "{'page':'0'}"; }
    }

    /* ---------------------------------------------------------------- paging (filtering-sorting-pagination.js) */

    function setActivePage(button) {
        var n = parseInt(button.textContent, 10) - 1;
        var f = button.closest("form");
        if (f && !isNaN(n)) { f.querySelector("#paginationNbr").value = "{'page':'" + n + "'}"; }
    }
    function step(link, formId, dir) {
        var f = byId(formId);
        var active = f && f.querySelector(".pagination li.page-item.active");
        var target = active && (dir < 0 ? active.previousElementSibling : active.nextElementSibling);
        var b = target && target.querySelector("button");
        if (b && /^\d+$/.test(b.textContent.trim())) { setActivePage(b); }
    }
    function setActivePagePrev(link, formId) { step(link, formId, -1); }
    function setActivePageNext(link, formId) { step(link, formId, 1); }
    /* Phase 2's changePageSize goes back to the first #paginationNbr in the document; this one uses the form's. */
    function changePageSize(select, formId) {
        var f = byId(formId);
        if (!f) { return; }
        f.querySelector("#size").value = select.value;
        var action = f.querySelector("#action");
        if (action) { action.value = "filtersortpage"; }
        f.querySelector("#paginationNbr").value = "{'page':'0'}";
    }

    /* ---------------------------------------------------------------- page-level menu behavior */

    // An outside click closes the open chip menus (chip.js chipOnloadFunctionality), and resets aria-expanded.
    document.addEventListener("click", function (evt) {
        if (!evt.target.closest || evt.target.closest(".chipsWithSubMenu")) { return; }
        closeAllMenus(null);
    });

    var api = {
        toggleSubMenuFromChip: toggleSubMenuFromChip, copyOperatorCodedValueSubMenuAction: copyOperatorCodedValueSubMenuAction,
        copyOperatorCodedValue: copyOperatorCodedValue, resizeSelect: resizeSelect, codedRadioButtonsChange: codedRadioButtonsChange,
        selectAllCodedFilter: selectAllCodedFilter, checkUncheckSelectAllCodedFilter: checkUncheckSelectAllCodedFilter,
        cancelEnterKey: cancelEnterKey, filterCheckboxList: filterCheckboxList, filterCheckboxListBackspace: filterCheckboxListBackspace,
        showMoreDynamicFilters: showMoreDynamicFilters, clearTypeAhead0ValueFromFilterChip: clearTypeAhead0ValueFromFilterChip,
        codedFilterUpdateButton: codedFilterUpdateButton, clearSelectionCoded: clearSelectionCoded,
        triggerClickClearSelection: triggerClickClearSelection, updateHiddenFilteringVariable: updateHiddenFilteringVariable,
        resetPagination: resetPagination, setActivePage: setActivePage, setActivePagePrev: setActivePagePrev,
        setActivePageNext: setActivePageNext, changePageSize: changePageSize
    };
    Object.keys(api).forEach(function (k) { if (typeof window[k] !== "function") { window[k] = api[k]; } });

    // The Filter button's column menu, when Bootstrap's dropdown script is not loaded.
    if (!window.bootstrap) {
        document.addEventListener("click", function (evt) {
            var button = evt.target.closest && evt.target.closest("#filtersId");
            var menu = byId("filterButtonId");
            if (!menu) { return; }
            if (button) {
                var open = !menu.classList.contains("show");
                closeAllMenus(null);
                menu.classList.toggle("show", open);
                button.setAttribute("aria-expanded", String(open));
                if (open) { var first = menu.querySelector("input"); if (first) { first.focus(); } }
            } else if (!evt.target.closest("#filterButtonId")) {
                menu.classList.remove("show");
                var b = byId("filtersId"); if (b) { b.setAttribute("aria-expanded", "false"); }
            }
        });
        window.addEventListener("keydown", function (evt) {
            if (evt.key !== "Escape") { return; }
            var menu = byId("filterButtonId");
            if (!menu || !menu.classList.contains("show") || !(evt.target.closest && evt.target.closest("#filtersButtonDiv"))) { return; }
            evt.preventDefault();
            menu.classList.remove("show");
            var b = byId("filtersId"); if (b) { b.setAttribute("aria-expanded", "false"); b.focus(); }
        }, true);
    }
})();
