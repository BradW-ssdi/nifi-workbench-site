/*
 * Answers a Phase 3 queue's requests in the design system templates, as the app's controller does: the page's htmx
 * posts the queue form to its rows endpoint (resultsUrl, swapped into tbody.tableData) or its pagination endpoint
 * (paginationUrl, Phase 2's queues/paginationNav, swapped into #paginationNav), and this returns that fragment
 * rendered from the queue description embedded in the page (<script type="application/json" id="queueData">),
 * with the component's filter, search, sort, and page rules (QueueFilters.java, Phase3Queue.java, Phase 2's 5-page window). htmx then
 * swaps it in as it would the server's response, so focus restore, events, and timing are htmx's own.
 *
 * scripts/screens/phase3-queue.py renders the same markup for the first page; tools/checks/queue-check.cjs checks
 * the two match. Only requests to those two endpoints are answered here; every other request goes out as usual.
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

    /* ---------------------------------------------------------------- the fragments (phase3-queue.py rows_html(), nav()) */

    function hx() { return 'hx-post="' + Q.resultsUrl + '" hx-include="#' + Q.formId + '" hx-target="#' + Q.formId + ' .tableData" hx-swap="innerHTML"'; }
    function cell(c, r) {
        if (c.type === "actions") {
            var name = esc(r[Q.actions.name] || "");
            var tip = function (verb) { return ' data-bs-toggle="tooltip" data-bs-custom-class="custom-tooltip" data-bs-title="' + verb + " " + esc(Q.actions.noun) + '"'; };
            return '<td class="ds-row-actions"><button type="button" class="btn btn-light rounded-circle btn-sm" aria-haspopup="dialog" aria-label="View ' + name + '"' + tip("View") +
                '><svg class="ds-icon" aria-hidden="true"><use href="' + ICON + 'description"/></svg></button>' +
                '<a class="btn btn-light rounded-circle btn-sm" href="' + Q.actions.edit + '" aria-label="Edit ' + name + '"' + tip("Edit") +
                '><svg class="ds-icon" aria-hidden="true"><use href="' + ICON + 'edit"/></svg></a></td>';
        }
        var v = r[c.field] || "", none = '<span class="visually-hidden">None</span>';
        if (c.type === "badge") { return '<td><span class="badge ' + (c.badges[v] || c.otherBadge) + '">' + esc(v) + "</span></td>"; }
        if (c.type === "page") {
            var flag = r[Q.flag] === "true" ? '<span class="badge text-bg-warning">Needs publish</span>' : "";
            return "<td>" + (v ? "<span>" + esc(v) + "</span>" : none) + (flag ? " " + flag : "") + "</td>";
        }
        return "<td>" + (v ? esc(v) : none) + "</td>";
    }
    function counts(rows, page, size) {
        var total = rows.length, pages = size > 0 ? Math.ceil(total / size) : 0;
        page = pages ? Math.max(0, Math.min(page, pages - 1)) : 0;
        var start = total ? page * size : 0, end = total ? Math.min(start + size, total) : 0;
        return { total: total, pages: pages, page: page, start: start, end: end };
    }
    /* The rows endpoint: swapped into tbody.tableData. */
    function rowsHtml(rows, page, size) {
        var n = counts(rows, page, size);
        if (!n.total) { return '              <tr class="text-center py-2"><td colspan="' + Q.columns.length + '">' + esc(Q.empty) + "</td></tr>"; }
        return rows.slice(n.start, n.end).map(function (r) {
            return "              <tr" + (r[Q.flag] === "true" ? ' class="is-flagged"' : "") + ">" + Q.columns.map(function (c) { return cell(c, r); }).join("") + "</tr>";
        }).join("\n");
    }
    /* The pagination endpoint: Phase 2's queues/paginationNav, swapped into #paginationNav. */
    function nav(rows, page, size) {
        var n = counts(rows, page, size);
        var tip = function (t) { return ' data-bs-toggle="tooltip" data-bs-custom-class="custom-tooltip" data-bs-title="' + t + '"'; };
        var first = n.page <= 0, last = n.page >= n.pages - 1;
        var out = ['                  <div class="d-flex align-items-center">',
            '                    <span class="ms-3" id="itemsMessage" data-phase3-results-summary>Items ' + (n.total ? n.start + 1 : 0) + " - " + n.end + " of " + n.total + "</span>",
            "                  </div>",
            '                  <nav aria-label="Pagination" class="pagination-container" id="paginationNavBar">',
            '                    <ul class="pagination pagination-sm justify-content-center mb-0">',
            '                      <li class="page-item' + (first ? " disabled" : "") + '" id="previous"' + tip("Previous") + '><button type="button" class="page-link" aria-label="Previous page of results"' +
                (first ? " disabled" : "") + " " + hx() + " onclick=\"setActivePagePrev(this, '" + Q.formId + "')\">Previous</button></li>"];
        pageWindow(n.page, n.pages).forEach(function (i) {
            var cur = i === n.page;
            out.push('                      <li class="page-item number' + (cur ? " active" : "") + '"' + tip("Page " + (i + 1)) + '><button type="button" class="page-link" id="page' + (i + 1) +
                '" aria-label="Page ' + (i + 1) + '"' + (cur ? ' aria-current="page"' : "") + " " + hx() + ' onclick="setActivePage(this)">' + (i + 1) + "</button></li>");
        });
        var sizes = Q.sizes.map(function (s) { return '<option value="' + s + '"' + (s === size ? " selected" : "") + ">" + s + "</option>"; }).join("");
        out.push('                      <li class="page-item' + (last ? " disabled" : "") + '" id="next"' + tip("Next") + '><button type="button" class="page-link" aria-label="Next page of results"' +
                (last ? " disabled" : "") + " " + hx() + " onclick=\"setActivePageNext(this, '" + Q.formId + "')\">Next</button></li>",
            "                    </ul>",
            "                  </nav>",
            '                  <div class="d-flex align-items-center me-3">',
            '                    <div class="btn-group dropup me-2">',
            '                      <select aria-label="Items per page" class="form-select form-select-sm" id="paginationNavBarPageSizeDropdown" hx-trigger="change" ' + hx() +
                " onchange=\"changePageSize(this, '" + Q.formId + "')\">" + sizes + "</select>",
            "                    </div>",
            "                    <span>Items per page</span>",
            "                  </div>");
        return out.join("\n");
    }

    /* The controller's two POSTs. params: the form's fields, as htmx sends them. */
    function query(params) {
        var active = parseFiltering(params.get("filtering"));
        var sorting = params.get("sorting") || Q.defaultSorting;
        var size = parseInt(params.get("size"), 10);
        if (Q.sizes.indexOf(size) < 0) { size = Q.defaultSize; }
        var m = /'page'\s*:\s*'(-?\d+)'/.exec(params.get("paginationNbr") || "");
        return { rows: sortRows(search(apply(Q.rows, active), params.get("localTextFilter")), sorting), page: m ? parseInt(m[1], 10) : 0, size: size };
    }
    function respond(params, pagination) {
        var q = query(params);
        return pagination ? nav(q.rows, q.page, q.size) : rowsHtml(q.rows, q.page, q.size);
    }

    /* ---------------------------------------------------------------- the request shim */

    var Real = window.XMLHttpRequest;
    var routes = {};
    routes[new URL(Q.resultsUrl, location.href).pathname] = false;
    routes[new URL(Q.paginationUrl, location.href).pathname] = true;
    function Shim() {
        var x = new Real();
        var fake = false, pagination = false, url = null;
        var open = x.open, send = x.send, setHeader = x.setRequestHeader, mime = x.overrideMimeType;
        var getAll = x.getAllResponseHeaders, getOne = x.getResponseHeader;
        x.open = function (method, u) {
            url = new URL(u, location.href);
            fake = Object.prototype.hasOwnProperty.call(routes, url.pathname);
            pagination = fake && routes[url.pathname];
            if (!fake) { return open.apply(x, arguments); }
        };
        x.setRequestHeader = function () { if (!fake) { return setHeader.apply(x, arguments); } };
        x.overrideMimeType = function () { if (!fake) { return mime.apply(x, arguments); } };
        x.getAllResponseHeaders = function () { return fake ? "content-type: text/html\r\n" : getAll.apply(x, arguments); };
        x.getResponseHeader = function (n) { return fake ? (/content-type/i.test(n) ? "text/html" : null) : getOne.apply(x, arguments); };
        x.send = function (body) {
            if (!fake) { return send.apply(x, arguments); }
            var html = respond(new URLSearchParams(typeof body === "string" ? body : ""), pagination);
            setTimeout(function () {
                Object.defineProperty(x, "readyState", { value: 4, configurable: true });
                Object.defineProperty(x, "status", { value: 200, configurable: true });
                Object.defineProperty(x, "statusText", { value: "OK", configurable: true });
                Object.defineProperty(x, "response", { value: html, configurable: true });
                Object.defineProperty(x, "responseText", { value: html, configurable: true });
                Object.defineProperty(x, "responseURL", { value: url.href, configurable: true });
                x.dispatchEvent(new ProgressEvent("loadstart"));
                if (typeof x.onload === "function") { x.onload(new ProgressEvent("load")); }
                x.dispatchEvent(new ProgressEvent("loadend"));
            }, 60);
        };
        return x;
    }
    window.XMLHttpRequest = Shim;
    window.queueServerStandin = { respond: respond, rows: rowsHtml, nav: nav, config: Q };
})();
