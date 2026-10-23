/*
 * Answers a Phase 3 queue's results requests in the design system templates, as the app's controller does: the
 * page's htmx posts the queue form to its results endpoint, and this returns the results fragment rendered from the
 * queue description embedded in the page (<script type="application/json" id="queueData">), with the component's
 * filter, search, sort, and page rules (QueueFilters.java, Phase3Queue.java, Phase 2's 5-page window). htmx then
 * swaps it in as it would the server's response, so focus restore, events, and timing are htmx's own.
 *
 * scripts/screens/phase3-queue.py renders the same markup for the first page; tools/checks/queue-check.cjs checks
 * the two match. Only requests to the queue's resultsUrl are answered here; every other request goes out as usual.
 */
(function () {
    "use strict";
    var el = document.getElementById("queueData");
    if (!el) { return; }
    var Q = JSON.parse(el.textContent);
    var ICON = "../../icons/sprite.svg#";

    function esc(s) {
        return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    /* ---------------------------------------------------------------- the component's rules */

    function parseFiltering(text) {
        var active = {};
        var list = [];
        try { list = JSON.parse(text || "[]"); } catch (x) { list = []; }
        (Array.isArray(list) ? list : []).forEach(function (c) {
            if (!c || !Q.filters.some(function (f) { return f.id === c.columnName; })) { return; }
            var op = String(c.selectedOperator || "").trim().toUpperCase();
            if (["=", "!=", "ALL", "NOTALL"].indexOf(op) < 0) { return; }
            var values = (c.selectedCoded || []).filter(function (v) { return v != null; }).map(function (v) { return String(v).trim(); })
                .filter(function (v, i, a) { return v && a.indexOf(v) === i; });
            var blanks = String(c.blanks).toLowerCase() === "true";
            if ((op === "=" || op === "!=") && !values.length && !blanks) { return; }
            active[c.columnName] = { operator: op, values: values, blanks: blanks };
        });
        return active;
    }
    function matches(value, f) {
        if (!f) { return true; }
        value = String(value || "").trim();
        if (!value) { return f.blanks; }
        var selected = f.values.some(function (v) { return v.toLowerCase() === value.toLowerCase(); });
        return f.operator === "ALL" ? true : f.operator === "NOTALL" ? false : f.operator === "!=" ? !selected : selected;
    }
    function apply(rows, active) {
        return rows.filter(function (r) { return Q.filters.every(function (f) { return matches(r[f.field], active[f.id]); }); });
    }
    function search(rows, text) {
        var t = String(text || "").trim().toLowerCase();
        return !t ? rows : rows.filter(function (r) { return Q.search.some(function (k) { return String(r[k] || "").toLowerCase().indexOf(t) !== -1; }); });
    }
    function sortRows(rows, sorting) {
        var parts = String(sorting).split(":"), key = parts[0], desc = (parts[1] || "").toLowerCase() === "desc";
        var col = Q.columns.filter(function (c) { return c.sort === key; })[0];
        if (!col) { return rows; }
        function k(r) {
            var v = String(r[col.field] || "");
            if (col.numeric) { return /^\d+(\.\d+)?$/.test(v) ? [0, parseFloat(v)] : [1, v.toLowerCase()]; }
            return [0, v.toLowerCase()];
        }
        // a stable sort, reversed by the comparison (ties keep their order), as Java's comparator.reversed() does
        return rows.slice().sort(function (a, b) {
            var x = k(a), y = k(b);
            var c = x[0] !== y[0] ? x[0] - y[0] : (x[1] < y[1] ? -1 : x[1] > y[1] ? 1 : 0);
            return desc ? -c : c;
        });
    }
    function pageWindow(page, pages) {
        if (pages <= 0) { return [0]; }
        var lo = Math.max(0, page - 2), hi = Math.min(pages - 1, page + 2);
        if (hi - lo + 1 < 5) {
            if (lo === 0) { hi = Math.min(pages - 1, lo + 4); } else if (hi === pages - 1) { lo = Math.max(0, hi - 4); }
        }
        var out = [];
        for (var i = lo; i <= Math.max(hi, 0); i++) { out.push(i); }
        return out;
    }

    /* ---------------------------------------------------------------- the results fragment (phase3-queue.py results()) */

    function hx() { return 'hx-post="' + Q.resultsUrl + '" hx-include="#' + Q.formId + '" hx-target="#' + Q.resultsId + '" hx-swap="outerHTML"'; }
    function cell(c, r) {
        if (c.type === "actions") {
            var name = esc(r[Q.actions.name] || "");
            return '<td class="ds-row-actions"><a href="' + Q.actions.view + '" aria-label="View ' + name + '"><svg class="ds-icon"><use href="' + ICON + 'visibility"/></svg></a>' +
                '<a href="' + Q.actions.edit + '" aria-label="Edit ' + name + '"><svg class="ds-icon"><use href="' + ICON + 'edit"/></svg></a></td>';
        }
        var v = r[c.field] || "", none = '<span class="visually-hidden">None</span>';
        if (c.type === "badge") { return '<td><span class="badge ' + (c.badges[v] || c.otherBadge) + '">' + esc(v) + "</span></td>"; }
        if (c.type === "page") {
            var flag = r[Q.flag] === "true" ? '<span class="badge text-bg-warning">Needs publish</span>' : "";
            return "<td>" + (v ? "<span>" + esc(v) + "</span>" : none) + (flag ? " " + flag : "") + "</td>";
        }
        return "<td>" + (v ? esc(v) : none) + "</td>";
    }
    function results(rows, sorting, page, size) {
        var total = rows.length, pages = size > 0 ? Math.ceil(total / size) : 0;
        page = pages ? Math.max(0, Math.min(page, pages - 1)) : 0;
        var start = total ? page * size : 0, end = total ? Math.min(start + size, total) : 0;
        var parts = String(sorting).split(":"), key = parts[0], direction = (parts[1] || "").toLowerCase();
        var heads = Q.columns.map(function (c) {
            if (c.type === "actions") { return '<th scope="col"><span class="visually-hidden">Actions</span></th>'; }
            if (c.sort) {
                var st = key === c.sort ? (direction === "desc" ? "descending" : "ascending") : null;
                var next = c.sort + (st === "ascending" ? ":desc" : ":asc");
                return '<th scope="col"' + (st ? ' aria-sort="' + st + '"' : "") + '><button type="button" class="ds-sort-btn" id="' + c.sort + '" data-sort-next="' + next +
                    '" onclick="phase3Queue.sort(this, \'' + Q.formId + '\')" ' + hx() + ">" + esc(c.label) + ' <svg class="ds-icon" aria-hidden="true"><use href="' + ICON + 'arrow_drop_down"/></svg></button></th>';
            }
            return '<th scope="col">' + esc(c.label) + "</th>";
        }).join("");
        var body = !total ? ['              <tr><td colspan="' + Q.columns.length + '">' + esc(Q.empty) + "</td></tr>"] :
            rows.slice(start, end).map(function (r) {
                return "              <tr" + (r[Q.flag] === "true" ? ' class="is-flagged"' : "") + ">" + Q.columns.map(function (c) { return cell(c, r); }).join("") + "</tr>";
            });
        function pg(label, aria, id, dis, onclick) {
            return '                <li class="page-item"><button type="button" class="page-link' + (dis ? " disabled" : "") + '" id="' + id + '" aria-label="' + aria + '"' +
                (dis ? " disabled" : "") + " " + hx() + ' onclick="' + onclick + '">' + label + "</button></li>";
        }
        var nav = [pg("Previous", "Previous page", "pagePrevious", page <= 0, "setActivePagePrev(this, '" + Q.formId + "')")];
        pageWindow(page, pages).forEach(function (i) {
            var cur = i === page;
            nav.push('                <li class="page-item' + (cur ? " active" : "") + '"><button type="button" class="page-link' + (cur ? " active" : "") + '" id="page' + (i + 1) + '"' +
                (cur ? ' aria-current="page"' : "") + ' aria-label="Page ' + (i + 1) + '" ' + hx() + ' onclick="setActivePage(this)">' + (i + 1) + "</button></li>");
        });
        nav.push(pg("Next", "Next page", "pageNext", page >= pages - 1, "setActivePageNext(this, '" + Q.formId + "')"));
        var sizes = Q.sizes.map(function (s) { return '<option value="' + s + '"' + (s === size ? " selected" : "") + ">" + s + "</option>"; }).join("");
        return '      <div id="' + Q.resultsId + '" class="ds-table-frame">\n' +
            '        <div class="ds-table-scroll" tabindex="0" role="group" aria-label="' + esc(Q.scrollLabel) + '">\n' +
            '          <table class="table ds-table tableCompact" id="' + Q.tableId + '">\n' +
            '            <caption class="visually-hidden">' + esc(Q.caption) + "</caption>\n" +
            "            <thead><tr>" + heads + "</tr></thead>\n" +
            '            <tbody id="' + Q.tbodyId + '">\n' + body.join("\n") + "\n            </tbody>\n" +
            "          </table>\n        </div>\n" +
            '        <div class="ds-table-footer">\n' +
            '          <span class="ds-page-summary" id="pageSummary" data-phase3-results-summary>Items ' + (total ? start + 1 : 0) + " - " + end + " of " + total + "</span>\n" +
            '          <nav aria-label="Pagination">\n            <ul class="pagination mb-0" id="paginationNav">\n' + nav.join("\n") + "\n            </ul>\n          </nav>\n" +
            '          <div class="ds-page-size">\n            <select class="form-select" id="pageSize" hx-trigger="change" ' + hx() + ' onchange="changePageSize(this, \'' + Q.formId + '\')">' + sizes + "</select>\n" +
            '            <label for="pageSize">Items per page</label>\n          </div>\n        </div>\n      </div>';
    }

    /* The controller's results POST. params: the form's fields, as htmx sends them. */
    function respond(params) {
        var active = parseFiltering(params.get("filtering"));
        var sorting = params.get("sorting") || Q.defaultSorting;
        var size = parseInt(params.get("size"), 10);
        if (Q.sizes.indexOf(size) < 0) { size = Q.defaultSize; }
        var m = /'page'\s*:\s*'(-?\d+)'/.exec(params.get("paginationNbr") || "");
        var page = m ? parseInt(m[1], 10) : 0;
        var rows = sortRows(search(apply(Q.rows, active), params.get("localTextFilter")), sorting);
        // The response starts at the element, as a Thymeleaf fragment does: with htmx 2.0.0 an outerHTML swap whose
        // response starts with whitespace or a comment fires no htmx:afterSwap or htmx:afterSettle (swapOuterHTML
        // stops at the first text node), and js/phase3-queue.js would never announce or place focus.
        return results(rows, sorting, page, size).trim();
    }

    /* ---------------------------------------------------------------- the request shim */

    var Real = window.XMLHttpRequest;
    var route = new URL(Q.resultsUrl, location.href).pathname;
    function Shim() {
        var x = new Real();
        var fake = false;
        var open = x.open, send = x.send, setHeader = x.setRequestHeader, mime = x.overrideMimeType;
        var getAll = x.getAllResponseHeaders, getOne = x.getResponseHeader;
        x.open = function (method, url) {
            fake = new URL(url, location.href).pathname === route;
            if (!fake) { return open.apply(x, arguments); }
        };
        x.setRequestHeader = function () { if (!fake) { return setHeader.apply(x, arguments); } };
        x.overrideMimeType = function () { if (!fake) { return mime.apply(x, arguments); } };
        x.getAllResponseHeaders = function () { return fake ? "content-type: text/html\r\n" : getAll.apply(x, arguments); };
        x.getResponseHeader = function (n) { return fake ? (/content-type/i.test(n) ? "text/html" : null) : getOne.apply(x, arguments); };
        x.send = function (body) {
            if (!fake) { return send.apply(x, arguments); }
            var html = respond(new URLSearchParams(typeof body === "string" ? body : ""));
            setTimeout(function () {
                Object.defineProperty(x, "readyState", { value: 4, configurable: true });
                Object.defineProperty(x, "status", { value: 200, configurable: true });
                Object.defineProperty(x, "statusText", { value: "OK", configurable: true });
                Object.defineProperty(x, "response", { value: html, configurable: true });
                Object.defineProperty(x, "responseText", { value: html, configurable: true });
                Object.defineProperty(x, "responseURL", { value: new URL(Q.resultsUrl, location.href).href, configurable: true });
                x.dispatchEvent(new ProgressEvent("loadstart"));
                if (typeof x.onload === "function") { x.onload(new ProgressEvent("load")); }
                x.dispatchEvent(new ProgressEvent("loadend"));
            }, 60);
        };
        return x;
    }
    window.XMLHttpRequest = Shim;
    window.queueServerStandin = { respond: respond, results: results, config: Q };
})();
