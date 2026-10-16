/* Turns a rendered workbench element into a compact, builder-ready layout spec.
   tools/figma/build.js rebuilds the spec in Figma as auto layout frames, text on the shared
   text styles, colors bound to the Light/Dark variables, and component instances.

   Load this file in a workbench page, then call:
     figmaExtract.tokens()                     color variables, light and dark values
     figmaExtract.pack(selector, { atoms })    spec for one element, as JSON plus a checksum
   atoms: true  swaps recognised controls for component instances (screens)
   atoms: false descends into them (used to build the components themselves)

   Colors are matched to variables by their light AND dark value, which tells apart
   white text on a teal button (dark theme: near black) from a white page (dark theme: black).

   Spec, short keys:
     frame  n name, d H|V|A (A = children placed by x,y), g gap, p [t,r,b,l], f fill, s {c,w} stroke,
            r radius, W/H number | 'h' hug | 'f' fill, ca counter axis and ma main axis alignment, clip, op, c children, k style class
     text   t chars, ts "size/weight/line", f color, u underline, al C|R, W, runs [{s,e,f,u,fw}]
     inst   i component set, v variant props, o text overrides, icon sprite name, W, H
     icon   ic sprite name, z size, f color */
(function () {
  'use strict';

  var VARS = {
    '--bs-primary': 'Primary', '--ds-primary-hover': 'Primary Hover', '--ds-primary-pressed': 'Primary Pressed',
    '--bs-secondary': 'Secondary', '--bs-success': 'Success', '--bs-success-text-emphasis': 'Success Ink',
    '--bs-info': 'Info', '--bs-warning': 'Warning', '--bs-danger': 'Danger',
    '--ds-danger-hover': 'Danger Hover', '--ds-danger-pressed': 'Danger Pressed',
    '--bs-pending': 'Pending', '--bs-closed': 'Closed',
    '--bs-link-color': 'Link', '--bs-link-hover-color': 'Link Hover', '--bs-focus-ring-color': 'Focus Ring',
    '--bs-body-color': 'Text', '--bs-emphasis-color': 'Text Emphasis', '--bs-secondary-color': 'Text Secondary', '--ds-on-primary': 'On Primary',
    '--bs-body-bg': 'Surface', '--bs-secondary-bg': 'Surface Section', '--bs-tertiary-bg': 'Surface Card',
    '--ds-tint': 'Tint', '--ds-tint-strong': 'Tint Strong', '--ds-table-header-bg': 'Table Header', '--ds-table-outline': 'Table Outline',
    '--bs-border-color': 'Border', '--ds-field-border': 'Field Border', '--ds-field-border-on-gray': 'Field Border On Gray',
    '--ds-nav-bg': 'Nav', '--ds-nav-current-bg': 'Nav Current', '--ds-nav-active-overlay': 'Nav Active', '--ds-bulkbar-bg': 'Bulk Bar', '--ds-flyout-bg': 'Flyout',
    '--bs-info-bg-subtle': 'Info Subtle', '--bs-success-bg-subtle': 'Success Subtle',
    '--bs-warning-bg-subtle': 'Warning Subtle', '--bs-danger-bg-subtle': 'Danger Subtle',
    '--bs-info-border-subtle': 'Info Border', '--bs-success-border-subtle': 'Success Border',
    '--bs-warning-border-subtle': 'Warning Border', '--bs-danger-border-subtle': 'Danger Border',
    '--bs-info-text-emphasis': 'Info Ink', '--bs-warning-text-emphasis': 'Warning Ink', '--bs-danger-text-emphasis': 'Danger Ink',
    '--bs-form-invalid-color': 'Invalid', '--bs-form-valid-color': 'Valid'
  };
  // Component colors whose dark value is set per component in scss/_dark.scss, not by a custom property.
  var EXTRA = {
    'Success Fill': ['#188665', '#2aa585'], 'Warning Fill': ['#996b00', '#e1a23a'], 'Danger Fill': ['#d40032', '#ff4d6d'],
    'Info Fill': ['#0078b4', '#3bb1f0'], 'Pending Fill': ['#7014a5', '#c9a7f2'], 'Closed Fill': ['#546e7a', '#b9bfc3'],
    'Disabled Surface': ['#e9ecef', '#303030'], 'Disabled Text': ['#333333', '#b9bfc3'], 'Text On Disabled': ['#111111', '#b9bfc3'],
    'Table Text': ['#111111', '#e6e8ea'], 'Surface Raised': ['#ffffff', '#414141']
  };
  var root = document.documentElement, probe = document.createElement('span');

  function parse(c) {
    var m = (c || '').match(/rgba?\(([^)]+)\)/); if (!m) return null;
    var p = m[1].split(/[ ,\/]+/).map(Number), a = p.length > 3 ? p[3] : 1;
    if (a === 0) return null;
    return '#' + p.slice(0, 3).map(function (v) { return Math.round(v).toString(16).padStart(2, '0'); }).join('') + (a < 1 ? '@' + Math.round(a * 100) : '');
  }
  function varHex(name) { probe.style.color = 'var(' + name + ')'; document.body.appendChild(probe); var v = parse(getComputedStyle(probe).color); probe.remove(); return v; }
  function theme(t) { if (t) root.setAttribute('data-bs-theme', t); else root.removeAttribute('data-bs-theme'); }
  function tokens() {
    var was = root.getAttribute('data-bs-theme'), out = {};
    theme('light'); Object.keys(VARS).forEach(function (k) { out[VARS[k]] = [varHex(k)]; });
    theme('dark'); Object.keys(VARS).forEach(function (k) { out[VARS[k]].push(varHex(k)); });
    theme(was);
    out.White = ['#ffffff', '#ffffff']; out.Black = ['#000000', '#000000'];
    Object.keys(EXTRA).forEach(function (k) { out[k] = EXTRA[k]; });
    return out;
  }
  var pairIndex = null;
  function tokenFor(light, dark) {
    if (!light) return null;
    if (!pairIndex) { pairIndex = {}; var t = tokens(); Object.keys(t).forEach(function (n) { var k = t[n][0] + '|' + t[n][1]; if (!pairIndex[k]) pairIndex[k] = n; }); }
    return pairIndex[light + '|' + dark] || (light + (dark && dark !== light ? '|' + dark : ''));
  }
  var PROPS = ['color', 'backgroundColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'outlineColor'];
  function paints(els) { return els.map(function (el) { var cs = getComputedStyle(el), o = {}; PROPS.forEach(function (p) { o[p] = parse(cs[p]); }); var af = getComputedStyle(el, '::after'); o.after = parse(af.color); return o; }); }

  function visible(el, cs, r) {
    if (cs.display === 'none' || cs.visibility === 'hidden' || el.hidden) return false;
    if (r.width < 1 || r.height < 1) return false;
    if (el.classList && (el.classList.contains('visually-hidden') || el.classList.contains('visually-hidden-focusable'))) return false;
    if (cs.position === 'absolute' && (r.width <= 2 || r.height <= 2)) return false;
    return true;
  }
  var INLINE = { A: 1, B: 1, STRONG: 1, EM: 1, I: 1, SPAN: 1, CODE: 1, ABBR: 1, SMALL: 1, U: 1, BR: 1 };
  function px(v) { return Math.round(parseFloat(v) * 100) / 100 || 0; }
  function r1(v) { var x = Math.round(v * 10) / 10; return Math.abs(x - Math.round(x)) < 0.06 ? Math.round(x) : x; }
  function clean(s) { return (s || '').replace(/\s+/g, ' ').trim(); }

  function textSpec(cs, chars) {
    var fs = px(cs.fontSize), t = { t: clean(chars), ts: fs + '/' + (parseInt(cs.fontWeight, 10) || 400) + '/' + (px(cs.lineHeight) ? r1(px(cs.lineHeight)) : r1(fs * 1.5)) };
    if (/underline/.test(cs.textDecorationLine)) t.u = 1;
    if (cs.textTransform === 'uppercase') { t.t = t.t.toUpperCase(); t.ts += '/U'; }
    if (px(cs.letterSpacing)) t.ts += '/ls' + px(cs.letterSpacing);
    if (cs.textAlign === 'center') t.al = 'C'; else if (cs.textAlign === 'right' || cs.textAlign === 'end') t.al = 'R';
    if (/monospace/i.test(cs.fontFamily)) t.mono = 1;
    return t;
  }

  // ---- atoms: controls that become component instances on screens ---------------------------
  function iconName(svg) { var u = svg.querySelector('use'); var h = u && (u.getAttribute('href') || u.getAttribute('xlink:href')) || ''; return h.split('#')[1] || ''; }
  function stateOf(el) {
    var c = el.classList;
    if (el.disabled || c.contains('disabled') || el.getAttribute('aria-disabled') === 'true') return 'Disabled';
    if (c.contains('is-hover')) return 'Hover';
    if (c.contains('is-focus')) return 'Focus';
    if (c.contains('is-pressed') || c.contains('is-active')) return 'Pressed';
    return 'Default';
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  // The height a control has with only its base class, outside any page context. A toolbar, the bulk bar, or the
  // table footer can change it; then the instance carries the measured height.
  var NAT = {};
  function naturalH(el) {
    var base = el.classList.contains('form-select') ? 'form-select' : el.classList.contains('form-control') ? 'form-control' : 'btn btn-primary', key = el.tagName + base;
    if (NAT[key] === undefined) { var t = document.createElement(el.tagName === 'A' ? 'button' : el.tagName); t.className = base; if (t.tagName === 'BUTTON') t.textContent = 'X'; t.style.cssText = 'position:absolute;left:-9999px;top:0;width:200px'; document.body.appendChild(t); NAT[key] = t.getBoundingClientRect().height; t.remove(); }
    return NAT[key];
  }
  function atom(el) {
    var c = el.classList, tag = el.tagName; if (!c) return null;
    var svg = el.querySelector && el.querySelector(':scope > svg'), label = clean(el.innerText || el.value || ''), inv = c.contains('is-invalid');
    if (c.contains('breadcrumb')) return { i: 'Breadcrumb', items: Array.prototype.map.call(el.querySelectorAll('.breadcrumb-item'), function (li) { return [clean(li.innerText), li.classList.contains('active') ? 1 : 0]; }), W: 'f' };
    if (c.contains('btn-close')) return { i: 'Close Button' };
    if (c.contains('ds-btn-icon')) return { i: 'Icon Button', v: { State: stateOf(el) }, icon: svg ? iconName(svg) : '' };
    if (c.contains('btn')) {
      var kind = c.contains('btn-primary') ? 'Button Primary' : c.contains('btn-danger') ? 'Button Danger' : c.contains('btn-outline-primary') ? 'Button Outline' : c.contains('btn-link') ? 'Button Link' : null;
      // an open disclosure button (the Filter toggle) shows the hover fill
      if (kind === 'Button Link' && svg && !label) kind = null;   // an icon-only link button has no text layer to override; it is drawn as it renders
      var open = c.contains('ds-filter-toggle') && el.getAttribute('aria-expanded') === 'true';
      if (kind) return { i: kind, v: { State: open ? 'Hover' : stateOf(el), Shape: c.contains('rounded-pill') ? 'Pill' : 'Default' }, o: [label], icon: svg ? iconName(svg) : '' };
    }
    if (c.contains('badge')) return { i: 'Badge', v: { Kind: cap((el.className.match(/text-bg-([a-z]+)/) || [])[1] || 'secondary') }, o: [label] };
    if (c.contains('ds-chip')) return { i: 'Filter Chip', v: { State: c.contains('is-filtered') ? 'Filtered' : stateOf(el) }, o: [label], icon: svg ? iconName(svg) : '' };
    if (c.contains('form-select')) return { i: 'Select', v: { State: inv ? 'Invalid' : stateOf(el) }, o: [el.options && el.selectedIndex >= 0 ? el.options[el.selectedIndex].text : ''], W: 'w' };
    if (c.contains('form-control')) {
      if (tag === 'TEXTAREA') return { i: 'Textarea', v: { State: inv ? 'Invalid' : stateOf(el) }, o: [el.value || el.placeholder || ' '], W: 'w', H: 'x' };
      if (el.type === 'file') return { i: 'File Input', W: 'w' };
      return { i: 'Input Text', v: { State: inv ? 'Invalid' : stateOf(el), Shape: c.contains('rounded-pill') ? 'Pill' : 'Default', Filled: el.value ? 'Yes' : 'No' }, o: [el.value || el.placeholder || ' '], W: 'w' };
    }
    if (c.contains('form-check-input')) return { i: el.type === 'radio' ? 'Radio' : 'Checkbox', v: { State: el.disabled ? 'Disabled' : el.checked ? 'Checked' : c.contains('is-focus') ? 'Focus' : 'Default' } };
    if (c.contains('page-link')) return { i: 'Page Link', v: { State: c.contains('active') ? 'Current' : (el.disabled || c.contains('disabled')) ? 'Disabled' : stateOf(el) }, o: [label] };
    if (c.contains('nav-link') && el.closest('.nav-underline')) return { i: 'Tab', v: { State: el.getAttribute('aria-selected') === 'true' || c.contains('active') ? 'Selected' : stateOf(el) }, o: [label] };
    if (c.contains('nav-link') && el.closest('.nav-pills')) return { i: 'SecNav Link', v: { State: el.hasAttribute('aria-current') || c.contains('active') ? 'Current' : stateOf(el) }, o: [label], W: 'w' };
    if (c.contains('ds-sort-btn')) { var th = el.closest('th'), s = th && th.getAttribute('aria-sort'); var sh = { i: 'Sort Header', v: { Sort: s === 'ascending' ? 'Ascending' : s === 'descending' ? 'Descending' : 'None' }, o: [label] }; if (el.getBoundingClientRect().height > 30) sh.wrap = 1; return sh; }   // a label that wraps in a narrow column wraps in Figma too
    if (c.contains('accordion-button')) return { i: 'Accordion Header', v: { Open: el.getAttribute('aria-expanded') === 'false' ? 'No' : 'Yes' }, o: [label], W: 'w' };
    if (c.contains('ds-avatar')) return { i: 'Avatar', o: [label] };
    return null;
  }

  // ---- DOM to raw boxes ---------------------------------------------------------------------
  var stats, idx, L, D, useAtoms, geo = null;
  // Link and Focus Ring share their values; outlines and focused borders are the ring.
  function tok(i, p, focus) { var t = tokenFor(L[i][p], D[i][p]); return t === 'Link' && (p === 'outlineColor' || focus) ? 'Focus Ring' : t; }

  function box(el, top) {
    var cs = getComputedStyle(el), r = el.getBoundingClientRect();
    // visibility: hidden still takes its space (the unsorted caret in a sort header); Figma drops hidden layers from auto layout, so keep a spacer
    if (cs.visibility === 'hidden' && cs.display !== 'none' && !el.hidden && cs.position !== 'absolute' && cs.position !== 'fixed' && r.width >= 1 && r.height >= 1 && r.width <= 32 && r.height <= 32) return { x: r.left, y: r.top, w: r.width, h: r.height, n: 'Spacer', p: [0, 0, 0, 0], fixW: 1, fixH: 1 };
    if (!visible(el, cs, r)) return null;
    var i = idx.get(el), b = { x: r.left, y: r.top, w: r.width, h: r.height };
    if (el.tagName.toLowerCase() === 'svg') { var nm = iconName(el); stats.icons[nm] = 1; var ico = Object.assign(b, { ic: nm, z: r1(r.width), f: tok(i, 'color') }); if (cs.position === 'absolute') ico.abs = 1; if (/matrix\(-1, 0, 0, -1/.test(cs.transform)) ico.rot = 180; return ico; }
    if (useAtoms && !top) { var a = atom(el); if (a) { if (/^(Button|Select$|Input Text$)/.test(a.i) && !a.H && Math.abs(r.height - naturalH(el)) > 1) a.H = 'x'; stats.atoms[a.i] = (stats.atoms[a.i] || 0) + 1; if (a.icon) stats.icons[a.icon] = 1; return Object.assign(b, a); } }
    if (el.tagName === 'IMG') return Object.assign(b, { img: el.alt || 'image' });

    var n = Object.assign(b, { n: el.getAttribute('data-fig-name') || el.id || (typeof el.className === 'string' && el.className.split(' ')[0]) || el.tagName.toLowerCase() });
    var bg = tok(i, 'backgroundColor'); if (bg) n.f = bg;
    var bst = [cs.borderTopStyle, cs.borderRightStyle, cs.borderBottomStyle, cs.borderLeftStyle];
    var bw = [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth].map(function (w, k) { return bst[k] === 'none' ? 0 : px(w); });
    if (bw.some(Boolean)) { var side = ['Top', 'Right', 'Bottom', 'Left'][bw.findIndex(Boolean)], bc = tok(i, 'border' + side + 'Color', el.classList.contains('is-focus')); if (bc) n.s = { c: bc, w: bw.every(function (w) { return w === bw[0]; }) ? bw[0] : bw }; }
    var rad = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].map(function (v) { return r1(Math.min(px(v), r.height / 2)); });
    if (rad.some(Boolean)) n.r = rad.every(function (v) { return v === rad[0]; }) ? rad[0] : rad;
    if (cs.outlineStyle !== 'none' && px(cs.outlineWidth)) n.ol = { c: tok(i, 'outlineColor'), w: px(cs.outlineWidth), o: px(cs.outlineOffset) };
    if (cs.boxShadow && cs.boxShadow !== 'none') {      // transparent shadows (Bootstrap's table cell trick) are dropped
      var shs = cs.boxShadow.split(/,(?![^(]*\))/).map(function (part) { var col = parse((part.match(/rgba?\([^)]+\)/) || [''])[0]); return col ? part.replace(/rgba?\([^)]+\)/, col).trim() : null; }).filter(Boolean);
      if (shs.length) n.sh = shs.join(', ');
    }
    if (parseFloat(cs.opacity) < 1) n.op = parseFloat(cs.opacity);
    if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') n.clip = 1;
    n.p = [px(cs.paddingTop) + bw[0], px(cs.paddingRight) + bw[1], px(cs.paddingBottom) + bw[2], px(cs.paddingLeft) + bw[3]];
    if (/flex/.test(cs.display)) { n.cssAi = cs.alignItems; n.cssJi = cs.justifyContent; n.col = /column/.test(cs.flexDirection); }
    if (cs.position === 'absolute' || cs.position === 'fixed') n.abs = 1;
    if (px(cs.flexGrow) > 0) n.grow = 1;

    if (el.classList.contains('btn-close')) { stats.icons.close = 1; n.kids = [{ x: r.left + (r.width - 16) / 2, y: r.top + (r.height - 16) / 2, w: 16, h: 16, ic: 'close', z: 16, f: 'Text' }]; return n; }
    if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {   // drawn natively on the component sheet
      if (el.type === 'checkbox' || el.type === 'radio') { n.mark = el.checked ? el.type : ''; n.n = el.type; return n; }
      var val = el.tagName === 'SELECT' ? (el.options[el.selectedIndex] || {}).text : el.type === 'file' ? 'Choose File    No file chosen' : (el.value || el.placeholder || '');
      if (val) n.kids = [Object.assign({ x: r.left + n.p[3], y: r.top + n.p[0], w: r.width - n.p[1] - n.p[3] - (el.tagName === 'SELECT' ? 8 : 0), h: px(cs.lineHeight) || 21 }, textSpec(cs, val), { f: (el.value || el.tagName === 'SELECT' || el.type === 'file') ? tok(i, 'color') : 'Text Secondary', W: 'f' })];
      if (el.tagName === 'SELECT') n.chev = 1;
      n.fixW = 1;
      if (el.tagName !== 'TEXTAREA') n.centerY = 1;   // a single-line field centers its text at any height
      if (el.tagName === 'TEXTAREA') n.fixH = 1;
      return n;
    }

    var inlineOnly = true, hasText = false;
    el.childNodes.forEach(function (ch) {
      if (ch.nodeType === 3) { if (ch.textContent.trim()) hasText = true; return; }
      if (ch.nodeType !== 1) return;
      var d = getComputedStyle(ch).display;
      if (!INLINE[ch.tagName] || d !== 'inline' || (useAtoms && atom(ch)) || ch.querySelector('svg, img, input, button, select')) inlineOnly = false;
    });
    if ((hasText && inlineOnly) || (!el.children.length && clean(el.innerText || el.textContent))) {
      var full = clean(el.innerText || el.textContent), tx = textSpec(cs, full); tx.f = tok(i, 'color');
      var af = getComputedStyle(el, '::after').content;
      if (af && af !== 'none' && af !== 'normal' && /^"/.test(af) && clean(af.replace(/"/g, ''))) { var add = af.replace(/"/g, ''); tx.runs = [{ s: tx.t.length, e: tx.t.length + add.length, f: tokenFor(L[i].after, D[i].after) }]; tx.t += add; }
      var runs = tx.runs || [];
      el.querySelectorAll('a, b, strong, code').forEach(function (s) {
        var piece = clean(s.innerText), st = full.indexOf(piece); if (!piece || st < 0) return;
        var j = idx.get(s), scs = getComputedStyle(s), run = { s: st, e: st + piece.length };
        if (s.tagName === 'A') { run.f = tokenFor(L[j].color, D[j].color); if (/underline/.test(scs.textDecorationLine)) run.u = 1; }
        if ((parseInt(scs.fontWeight, 10) || 400) !== (parseInt(cs.fontWeight, 10) || 400)) run.fw = parseInt(scs.fontWeight, 10);
        if (Object.keys(run).length > 2) runs.push(run);
      });
      if (runs.length) tx.runs = runs;
      var trg = document.createRange(); trg.selectNodeContents(el); var tr = trg.getBoundingClientRect();
      if (!tr.width) tr = { left: r.left + n.p[3], top: r.top + n.p[0], width: r.width - n.p[1] - n.p[3], height: r.height - n.p[0] - n.p[2] };
      var lines = Math.max(1, Math.round(tr.height / (px(cs.lineHeight) || tr.height)));
      var bare = !n.f && !n.s && !n.ol && !n.sh && !n.r;
      var lhh = px(cs.lineHeight) || tr.height, th = lines * lhh;     // a text box is as tall as its lines, as in Figma
      var inner = Object.assign({ x: tr.left, y: tr.top - (th - tr.height) / 2, w: tr.width, h: th, lines: lines }, tx);
      if (lines > 1) { inner.x = r.left + n.p[3]; inner.w = r.width - n.p[1] - n.p[3]; }
      if (el.tagName === 'A') inner.link = 1;
      if (bare && !n.p.some(Boolean)) { inner.abs = n.abs; return inner; }
      n.kids = [inner];
      if (el.classList.contains('accordion-button')) { stats.icons.expand_more = 1; var ch = { x: r.right - n.p[1] - 20, y: r.top + (r.height - 20) / 2, w: 20, h: 20, ic: 'expand_more', z: 20, f: tok(i, 'color') }; if (el.getAttribute('aria-expanded') !== 'false') ch.rot = 180; n.kids.push(ch); }
      return n;
    }
    var kids = [];
    el.childNodes.forEach(function (ch) {
      if (ch.nodeType === 3 && ch.textContent.trim()) {
        var rg = document.createRange(); rg.selectNodeContents(ch); var rr = rg.getBoundingClientRect();
        var ll = Math.max(1, Math.round(rr.height / (px(cs.lineHeight) || rr.height))), lt = ll * (px(cs.lineHeight) || rr.height);
        if (rr.width > 0) kids.push(Object.assign({ x: rr.left, y: rr.top - (lt - rr.height) / 2, w: rr.width, h: lt, lines: ll }, textSpec(cs, ch.textContent), { f: tok(i, 'color') }));
      } else if (ch.nodeType === 1) { var k = box(ch, false); if (k) kids.push(k); }
    });
    if (kids.length) n.kids = kids;
    return n;
  }

  // ---- layout inference: rectangles to auto layout ------------------------------------------
  var EPS = 1.6;
  function near(a, b) { return Math.abs(a - b) <= EPS; }
  function isText(k) { return k.t !== undefined; }
  function isLeafAtom(k) { return k.i || k.ic || k.img; }

  function rowsOf(kids) {
    var sorted = kids.slice().sort(function (a, b) { return a.y - b.y || a.x - b.x; }), rows = [];
    sorted.forEach(function (k) {
      var row = rows[rows.length - 1];
      if (row && k.y < row.bottom - 2) { row.items.push(k); row.bottom = Math.max(row.bottom, k.y + k.h); }
      else rows.push({ items: [k], top: k.y, bottom: k.y + k.h });
    });
    rows.forEach(function (r) { r.items.sort(function (a, b) { return a.x - b.x; }); });
    return rows;
  }
  function group(name, items, extra) {
    var x = Math.min.apply(null, items.map(function (k) { return k.x; })), y = Math.min.apply(null, items.map(function (k) { return k.y; }));
    var rt = Math.max.apply(null, items.map(function (k) { return k.x + k.w; })), bt = Math.max.apply(null, items.map(function (k) { return k.y + k.h; }));
    return Object.assign({ n: name, x: x, y: y, w: rt - x, h: bt - y, p: [0, 0, 0, 0], kids: items, synth: 1 }, extra || {});
  }

  function layout(n) {
    if (isText(n) || isLeafAtom(n) || !n.kids) return n;
    // an icon drawn inside a sibling's box (the calendar in a date field) is placed, not flowed: Figma clamps the negative gap it would need
    n.kids.forEach(function (k) { if (k.ic && !k.abs && n.kids.some(function (o) { return o !== k && !o.abs && o.x <= k.x + 0.5 && o.y <= k.y + 0.5 && o.x + o.w >= k.x + k.w - 0.5 && o.y + o.h >= k.y + k.h - 0.5; })) k.abs = 1; });
    var flow = n.kids.filter(function (k) { return !k.abs; }), abs = n.kids.filter(function (k) { return k.abs; });
    var cx = n.x + n.p[3], cy = n.y + n.p[0], cw = n.w - n.p[1] - n.p[3], chh = n.h - n.p[0] - n.p[2];
    if (flow.length) {
      var rows = rowsOf(flow);
      if (rows.length > 1 && rows.some(function (r) { return r.items.length > 1; })) {
        flow = rows.map(function (r) { return r.items.length === 1 ? r.items[0] : group('Row', r.items, { x: cx, w: cw, rowFill: 1, y: r.top, h: r.bottom - r.top }); });
        rows = rowsOf(flow);
      }
      if (rows.length === 1 && flow.length > 1 || (flow.length === 1 && n.col === false && n.cssJi)) horizontal(n, rows[0].items, cx, cy, cw, chh);
      else vertical(n, flow, cx, cy, cw, chh);
    } else { n.d = 'V'; n.c = []; }
    abs.forEach(function (k) { layout(k); k.ax = r1(k.x - n.x); k.ay = r1(k.y - n.y); n.c.push(k); });
    return n;
  }

  function horizontal(n, items, cx, cy, cw, chh) {
    n.d = 'H';
    var gaps = []; for (var i = 1; i < items.length; i++) gaps.push(items[i].x - (items[i - 1].x + items[i - 1].w));
    var mn = Math.min.apply(null, gaps.concat([0 === gaps.length ? 0 : Infinity])), mx = Math.max.apply(null, gaps.concat([-Infinity]));
    if (gaps.length && mx - mn > EPS) {
      var big = gaps.indexOf(mx), rest = gaps.filter(function (g, k) { return k !== big; });
      var uniform = !rest.length || Math.max.apply(null, rest) - Math.min.apply(null, rest) <= EPS;
      if (uniform && mx - (rest.length ? Math.max.apply(null, rest) : 0) > 8) {
        var left = items.slice(0, big + 1), right = items.slice(big + 1);
        items = [left.length === 1 ? left[0] : group('Left', left), right.length === 1 ? right[0] : group('Right', right)];
        n.ma = 'between'; gaps = [];
      } else { stats.absolute++; n.d = 'A'; n.c = items.map(function (k) { layout(k); k.ax = r1(k.x - n.x); k.ay = r1(k.y - n.y); return k; }); return; }
    }
    // two groups pushed to opposite edges
    if (gaps.length === 1 && gaps[0] > 24 && near(items[0].x, cx) && near(items[1].x + items[1].w, cx + cw)) { n.ma = 'between'; gaps = []; n.keepW = 1; }
    n.g = gaps.length ? r1(gaps.reduce(function (a, b) { return a + b; }, 0) / gaps.length) : 0;
    var first = items[0], last = items[items.length - 1], slackL = first.x - cx, slackR = cx + cw - (last.x + last.w);
    if (!n.ma) n.ma = near(slackL, 0) || slackL < slackR - EPS && slackL < EPS ? 'start' : near(slackL, slackR) ? 'center' : slackR < EPS ? 'end' : 'start';
    if (n.ma === 'start' && slackL > EPS) { n.p[3] += slackL; }
    // Align items against each other, then turn the space above and below them into padding
    // (Bootstrap rows offset their columns with gutter margins, so the container box is not the reference).
    var uTop = Math.min.apply(null, items.map(function (k) { return k.y; })), uBot = Math.max.apply(null, items.map(function (k) { return k.y + k.h; }));
    if (uTop - cy > EPS) n.p[0] += uTop - cy;
    if (cy + chh - uBot > EPS) n.p[2] += cy + chh - uBot;
    cy = uTop; chh = uBot - uTop;
    var tops = items.every(function (k) { return near(k.y, cy); }), bottoms = items.every(function (k) { return near(k.y + k.h, cy + chh); }), mids = items.every(function (k) { return near(k.y + k.h / 2, cy + chh / 2); });
    n.ca = mids && !(tops && bottoms) ? 'center' : tops ? 'start' : bottoms ? 'end' : mids ? 'center' : 'start';
    if (n.ca === 'start' && !tops) { stats.absolute++; n.d = 'A'; n.c = items.map(function (k) { layout(k); k.ax = r1(k.x - n.x); k.ay = r1(k.y - n.y); return k; }); return; }
    items.forEach(function (k) {
      layout(k);
      if (k.grow || (k.W === 'w' && k.grow)) k.W = 'f';
      if (!isText(k) && !k.ic && near(k.h, chh) && items.length > 1 && !k.i) k.H = 'f';
    });
    // Figma splits fill children evenly. Columns that share a row unevenly (a 7 to 5 grid) keep their measured width; the first still fills.
    var fills = items.filter(function (k) { return k.W === 'f'; });
    if (fills.length > 1 && Math.max.apply(null, fills.map(function (k) { return k.w; })) - Math.min.apply(null, fills.map(function (k) { return k.w; })) > 1) fills.slice(1).forEach(function (k) { k.W = undefined; k.keepW = 1; });
    n.c = items;
  }

  function vertical(n, items, cx, cy, cw, chh) {
    n.d = 'V';
    items.sort(function (a, b) { return a.y - b.y; });
    var gaps = []; for (var i = 1; i < items.length; i++) gaps.push(items[i].y - (items[i - 1].y + items[i - 1].h));
    var g = gaps.length ? Math.min.apply(null, gaps) : 0; if (g < -2) g = r1(g); else g = Math.max(0, g);
    n.g = r1(g);
    var topSlack = items[0].y - cy; if (topSlack > EPS) n.p[0] += topSlack;
    else if (topSlack < -EPS) n.p[0] = Math.max(0, n.p[0] + topSlack);   // Bootstrap gutter rows start above the content edge (negative margin); take it out of the padding
    var out = [];
    items.forEach(function (k, i) {
      layout(k);
      var extra = i ? gaps[i - 1] - g : 0;
      if (extra > EPS) {
        if (k.kids !== undefined && !k.f && !k.s && !k.r && !k.clip && !k.i && k.d !== 'A') { k.p[0] += extra; k.h += extra; k.y -= extra; (k.c || []).forEach(function (q) { if (q.ay !== undefined) q.ay = r1(q.ay + extra); }); }   // placed children keep their spot
        else { var wrap = group('Spacer', [k], { p: [extra, 0, 0, 0], d: 'V', g: 0, c: [k] }); wrap.y = k.y - extra; wrap.h = k.h + extra; wrap.x = cx; wrap.w = cw; wrap.W = 'f'; delete wrap.kids; if (!near(k.x, cx) && !near(k.w, cw)) wrap.ca = near(k.x + k.w / 2, cx + cw / 2) ? 'center' : near(k.x + k.w, cx + cw) ? 'end' : 'start'; k = wrap; }
      }
      // Text is measured by its glyphs, so text as wide as the container means the container hugs it.
      if (isText(k)) { if (k.lines > 1) k.W = 'f'; else if (k.al && !near(k.w, cw)) k.W = 'f'; else k.W = undefined; }
      else if (near(k.w, cw) && near(k.x, cx)) k.W = 'f';
      out.push(k);
    });
    var aligned = out.filter(function (k) { return k.W !== 'f'; });
    n.ca = !aligned.length || aligned.every(function (k) { return near(k.x, cx); }) ? 'start' : aligned.every(function (k) { return near(k.x + k.w / 2, cx + cw / 2); }) ? 'center' : aligned.every(function (k) { return near(k.x + k.w, cx + cw); }) ? 'end' : 'start';
    if (n.ca === 'start' && aligned.some(function (k) { return !near(k.x, cx); })) {
      out = out.map(function (k) { if (k.W === 'f' || near(k.x, cx)) return k; var w = { n: 'Align', d: 'H', g: 0, p: [0, 0, 0, r1(k.x - cx)], x: cx, y: k.y, w: cw, h: k.h, W: 'f', H: 'h', ca: 'start', ma: 'start', c: [k] }; return w; });
    }
    n.c = out;
  }

  // ---- sizing and cleanup -------------------------------------------------------------------
  function finish(n, parent) {
    // geometry(): where each text, control, and icon sits in the rendered page, in build order, for checking Figma against the code
    if (geo && (isText(n) || isLeafAtom(n))) geo.push([isText(n) ? 't' : n.i ? 'i' : n.ic ? 'c' : 'm', String(isText(n) ? n.t : n.i || n.ic || n.img).slice(0, 18), r1(n.x), r1(n.y), r1(n.w), r1(n.h), isText(n) ? n.ts : (n.i && n.v ? Object.keys(n.v).map(function (k) { return n.v[k]; }).filter(function (v) { return v !== 'Default' && v !== 'No' && v !== 'None'; }).join(',') : '')]);
    if (isText(n)) {
      var t = { t: n.t, ts: n.ts, f: n.f }; ['u', 'al', 'runs', 'mono', 'link'].forEach(function (k) { if (n[k]) t[k] = n[k]; });
      if (n.W === 'f') t.W = 'f'; else if (n.lines > 1) t.W = r1(n.w);
      if (n.ax !== undefined) { t.ax = n.ax; t.ay = n.ay; }
      return t;
    }
    if (n.ic) { var ic = { ic: n.ic, z: n.z, f: n.f }; if (n.rot) ic.rot = n.rot; if (n.ax !== undefined) { ic.ax = n.ax; ic.ay = n.ay; } return ic; }
    if (n.i) {
      var a = { i: n.i }; ['v', 'o', 'icon', 'items', 'wrap'].forEach(function (k) { if (n[k] !== undefined) a[k] = n[k]; });
      if (a.v) { Object.keys(a.v).forEach(function (k) { if (a.v[k] === 'Default' || a.v[k] === 'No' || a.v[k] === 'None') delete a.v[k]; }); if (!Object.keys(a.v).length) delete a.v; }
      if (n.W === 'f') a.W = 'f'; else if (n.W === 'w') a.W = r1(n.w);
      if (n.H === 'x') a.H = r1(n.h);
      if (n.ax !== undefined) { a.ax = n.ax; a.ay = n.ay; }
      return a;
    }
    if (n.img) return { img: n.img, W: r1(n.w), H: r1(n.h) };
    if (geo) geo.push(['f', String(n.n).slice(0, 18), r1(n.x), r1(n.y), r1(n.w), r1(n.h), '']);
    var o = { n: n.n, d: n.d || 'V' };
    if (n.g) o.g = n.g;
    var p = n.p.map(r1); if (p.some(Boolean)) o.p = p;
    ['f', 's', 'r', 'ol', 'sh', 'op', 'clip', 'mark', 'chev'].forEach(function (k) { if (n[k] !== undefined && n[k] !== '') o[k] = n[k]; });
    if (n.ca && n.ca !== 'start') o.ca = n.ca;
    if (n.ma && n.ma !== 'start') o.ma = n.ma;
    if (n.centerY) { if ((n.d || 'V') === 'V') o.ma = 'center'; else o.ca = 'center'; }
    var kids = n.c || [];
    // width
    if (n.W === 'f' || n.rowFill) o.W = 'f';
    else if (n.fixW) o.W = r1(n.w);
    else {
      var hugW = n.d === 'H' ? kids.reduce(function (s, k) { return s + (k.w || 0); }, 0) + (n.g || 0) * Math.max(0, kids.length - 1) + n.p[1] + n.p[3] : Math.max.apply(null, kids.map(function (k) { return k.w || 0; }).concat([0])) + n.p[1] + n.p[3];
      o.W = kids.length && n.d !== 'A' && !n.keepW && Math.abs(hugW - n.w) <= 0.6 && !kids.some(function (k) { return k.W === 'f'; }) ? 'h' : r1(n.w);
    }
    // a stretched box that is already as tall as its content hugs: in Figma a row of stretch-only children would collapse to its shortest neighbor
    var hugsH = kids.length && n.d !== 'A' && !n.fixH && Math.abs((n.d === 'V' ? kids.reduce(function (s, k) { return s + (k.h || 0); }, 0) + (n.g || 0) * Math.max(0, kids.length - 1) : Math.max.apply(null, kids.map(function (k) { return k.h || 0; }).concat([0]))) + n.p[0] + n.p[2] - n.h) <= 0.6;
    if (n.H === 'f' && !hugsH) o.H = 'f';
    else if (n.fixH) o.H = r1(n.h);
    else {
      var hugH = n.d === 'V' ? kids.reduce(function (s, k) { return s + (k.h || 0); }, 0) + (n.g || 0) * Math.max(0, kids.length - 1) + n.p[0] + n.p[2] : Math.max.apply(null, kids.map(function (k) { return k.h || 0; }).concat([0])) + n.p[0] + n.p[2];
      o.H = kids.length && n.d !== 'A' && Math.abs(hugH - n.h) <= 0.6 ? 'h' : r1(n.h);
    }
    if (n.ax !== undefined) { o.ax = n.ax; o.ay = n.ay; }
    if (kids.length) o.c = kids.map(function (k) { return finish(k, n); });
    // a row whose children stretch needs a height of its own, or in Figma it falls to its shortest child
    if (o.H === 'h' && n.d === 'H' && o.c && o.c.some(function (k) { return k.H === 'f'; })) o.H = r1(n.h);
    return o;
  }

  // repeated frame styles (table cells, rows) move into a class table
  function classes(spec) {
    var seen = {}, order = [];
    (function walk(n) { if (n.d) { var key = JSON.stringify([n.d, n.g, n.p, n.f, n.s, n.r, n.ca, n.ma, n.H, n.clip]); (seen[key] = seen[key] || []).push(n); if (seen[key].length === 1) order.push(key); } (n.c || []).forEach(walk); })(spec);
    var K = {}, id = 0;
    order.forEach(function (key) {
      if (seen[key].length < 3) return;
      var name = 'k' + (id++), s = seen[key][0], def = {}; ['d', 'g', 'p', 'f', 's', 'r', 'ca', 'ma', 'H', 'clip'].forEach(function (p) { if (s[p] !== undefined) def[p] = s[p]; });
      K[name] = def; seen[key].forEach(function (n) { Object.keys(def).forEach(function (p) { delete n[p]; }); n.k = name; });
    });
    return K;
  }

  function run(selector, opts) {
    opts = opts || {}; useAtoms = opts.atoms !== false;
    var el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!el) return { error: 'no element for ' + selector };
    var was = root.getAttribute('data-bs-theme'), els = [el].concat(Array.prototype.slice.call(el.querySelectorAll('*')));
    idx = new Map(); els.forEach(function (e, i) { idx.set(e, i); });
    theme('light'); L = paints(els); theme('dark'); D = paints(els); theme(was);
    stats = { atoms: {}, icons: {}, absolute: 0 };
    var raw = box(el, true); if (!raw) return { error: 'element not visible' };
    var spec = finish(layout(raw)); if (opts.fixedWidth) { spec.W = r1(raw.w); spec.H = 'h'; }
    var K = classes(spec), unbound = {}, styles = {};
    (function walk(n) { [n.f, n.s && n.s.c].forEach(function (c) { if (c && c[0] === '#') unbound[c] = (unbound[c] || 0) + 1; }); if (n.ts) styles[n.ts] = (styles[n.ts] || 0) + 1; (n.c || []).forEach(walk); })(spec);
    Object.keys(K).forEach(function (k) { [K[k].f, K[k].s && K[k].s.c].forEach(function (c) { if (c && c[0] === '#') unbound[c] = (unbound[c] || 0) + 1; }); });
    return { spec: { K: K, root: spec }, atoms: stats.atoms, icons: Object.keys(stats.icons), unbound: unbound, textStyles: styles, absolute: stats.absolute };
  }
  // Repeated siblings (table rows, cards, list items) are stored as differences from the first one like them.
  // The builder expands {"~": index, "d": [[path, value, removed]]} before it builds.
  function compact(n) {
    if (!n.c) return n;
    n.c.forEach(compact);
    for (var i = 1; i < n.c.length; i++) {
      var cur = n.c[i]; if (!cur.c && !cur.i) continue;
      for (var r = 0; r < i; r++) {
        var ref = n.c[r]; if (ref['~'] !== undefined || ref.n !== cur.n || ref.k !== cur.k || ref.i !== cur.i) continue;
        var d = diff(ref, cur, [], []);
        if (JSON.stringify(d).length < JSON.stringify(cur).length * 0.6) { n.c[i] = { '~': r, d: d }; }
        break;
      }
    }
    return n;
  }
  function sum(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h.toString(36); }
  function pack(selector, opts) { var o = run(selector, opts); if (o.error) return o; compact(o.spec.root); var s = JSON.stringify(o.spec); return { json: s, sum: sum(s), bytes: s.length, atoms: o.atoms, icons: o.icons, unbound: o.unbound, textStyles: o.textStyles, absolute: o.absolute }; }

  // every [data-fig] specimen on the build sheet, smallest first so atoms exist before composites
  function sheet() {
    return Array.prototype.map.call(document.querySelectorAll('[data-fig]'), function (el) {
      var composite = el.getAttribute('data-fig-mode') === 'composite', o = run(el, { atoms: composite });
      return { name: el.getAttribute('data-fig'), composite: composite, spec: o.spec, unbound: o.unbound, textStyles: o.textStyles, icons: o.icons, absolute: o.absolute, error: o.error };
    });
  }
  function sprite(names, url) {
    return fetch(url || '../icons/sprite.svg').then(function (r) { return r.text(); }).then(function (txt) {
      var doc = new DOMParser().parseFromString(txt, 'image/svg+xml'), out = {};
      names.forEach(function (n) { var sym = doc.getElementById(n); if (sym) out[n] = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="' + (sym.getAttribute('viewBox') || '0 -960 960 960') + '">' + sym.innerHTML.replace(/\s+/g, ' ') + '</svg>'; });
      return out;
    });
  }
  function diff(a, b, path, out) {
    if (JSON.stringify(a) === JSON.stringify(b)) return out;
    if (a && b && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b) && (!Array.isArray(a) || a.length === b.length)) {
      var keys = {}; Object.keys(a).concat(Object.keys(b)).forEach(function (k) { keys[k] = 1; });
      Object.keys(keys).forEach(function (k) { if (!(k in b)) out.push([path.concat(k).join('.'), null, 1]); else diff(a[k], b[k], path.concat(k), out); });
    } else out.push([path.join('.'), b]);
    return out;
  }
  function packSheet() {
    var fam = {}, order = [];
    sheet().forEach(function (s) { var f = s.name.split('/')[0]; if (!fam[f]) { fam[f] = []; order.push(f); } fam[f].push(s); });
    return order.map(function (f) {
      var list = fam[f];
      return { f: f, composite: list[0].composite, base: [list[0].name, list[0].spec], rest: list.slice(1).map(function (s) { return [s.name, diff(list[0].spec, s.spec, [], [])]; }) };
    });
  }
  function geometry(selector, opts) {
    var el = document.querySelector(selector), r0 = el.getBoundingClientRect(); geo = [];
    var o = run(selector, opts), list = geo; geo = null; if (o.error) return o;
    return { w: r1(r0.width), h: r1(r0.height), items: list.map(function (g) { g[2] = r1(g[2] - r0.left); g[3] = r1(g[3] - r0.top); return g; }) };
  }
  window.figmaExtract = { tokens: tokens, run: run, pack: pack, sum: sum, sheet: sheet, sprite: sprite, packSheet: packSheet, geometry: geometry };
})();
