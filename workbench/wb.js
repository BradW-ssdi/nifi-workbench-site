/* Workbench shell: sidebar navigation, per-example code panels with syntax
   highlighting and copy buttons, and a scrollspy that tracks the section in
   view. The HTML tab is the live canvas markup; the CSS tab is pulled from
   the real stylesheets by matching the classes the example uses; the JS tab
   appears when an example declares a script via data-js. */

(function () {
  'use strict';

  var PAGES = [
    { group: 'Start', items: [
      { title: 'Overview', href: 'index.html', icon: 'home' }
    ]},
    { group: 'Foundations', items: [
      { title: 'Tokens & type', href: 'foundations.html', icon: 'tune' },
      { title: 'Icons', href: 'icons.html', icon: 'settings' }
    ]},
    { group: 'Components', items: [
      { title: 'Components', href: 'components.html', icon: 'article' },
      { title: 'Provenance', href: 'provenance.html', icon: 'content_paste_search' }
    ]},
    { group: 'Views', items: [
      { title: 'Home Dashboard', href: 'screens/home.html', ext: true, icon: 'open_in_new' },
      { title: 'System Management', href: 'screens/system-management.html', ext: true, icon: 'open_in_new' },
      { title: 'WDS — Algorithm Library', href: 'screens/wds-algorithm-library.html', ext: true, icon: 'open_in_new' },
      { title: 'WDS — Add Algorithm', href: 'screens/wds-add-algorithm.html', ext: true, icon: 'open_in_new' },
      { title: 'Manage Conditions', href: 'screens/manage-conditions.html', ext: true, icon: 'open_in_new' }
    ]}
  ];

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function dedent(html) {
    var lines = html.replace(/^\n+|\s+$/g, '').split('\n');
    var indents = lines.filter(function (l) { return l.trim(); })
      .map(function (l) { return l.match(/^\s*/)[0].length; });
    var min = indents.length ? Math.min.apply(null, indents) : 0;
    return lines.map(function (l) { return l.slice(min); }).join('\n');
  }

  /* ------------------------- syntax highlighting ------------------------- */
  /* Input is already HTML-escaped; the regexes work on the escaped text. */

  function hlHtml(src) {
    return esc(src)
      .replace(/(&lt;\/?)([a-zA-Z][\w-]*)([^&]*?)(\/?&gt;)/g, function (m, open, tag, rest, close) {
        rest = rest.replace(/([\w-]+)="([^"]*)"/g,
          '<span class="tk-attr">$1</span>=<span class="tk-str">"$2"</span>');
        return open + '<span class="tk-tag">' + tag + '</span>' + rest + close;
      });
  }

  /* cssText from the CSSOM arrives one rule per line: "selector { decls }".
     Selector and declarations are highlighted separately so pseudo-classes
     like :hover never get mistaken for properties. */
  function hlCss(src) {
    return esc(src).split('\n').map(function (line) {
      var i = line.indexOf('{');
      if (i === -1) return line;
      var sel = line.slice(0, i);
      var body = line.slice(i).replace(/([\w-]+)(\s*:\s*)([^;}]+)/g, function (m, p, c, v) {
        v = v.replace(/var\(--[\w-]+(?:,[^)]*)?\)/g, '<span class="tk-var">$&</span>');
        return '<span class="tk-prop">' + p + '</span>' + c + '<span class="tk-val">' + v + '</span>';
      });
      return '<span class="tk-sel">' + sel + '</span>' + body;
    }).join('\n');
  }

  function hlJs(src) {
    return esc(src)
      .replace(/(\/\/[^\n]*)/g, '<span class="tk-com">$1</span>')
      .replace(/('[^']*'|`[^`]*`)/g, '<span class="tk-str">$1</span>')
      .replace(/\b(const|let|var|function|return|if|else|addEventListener|true|false)\b/g, '<span class="tk-tag">$1</span>');
  }

  function classesIn(root) {
    var set = {};
    root.querySelectorAll('[class]').forEach(function (el) {
      String(el.className).split(/\s+/).forEach(function (c) {
        if (c && c.indexOf('wb-') !== 0) set[c] = true;
      });
    });
    return Object.keys(set);
  }

  function cssFor(classes) {
    if (!classes.length) return '';
    var out = [];
    var res = classes.map(function (c) {
      return new RegExp('\\.' + c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\w-])');
    });
    for (var s = 0; s < document.styleSheets.length; s++) {
      var sheet = document.styleSheets[s];
      var href = sheet.href || '';
      if (href.indexOf('fonts.googleapis') !== -1 || href.indexOf('wb.css') !== -1) continue;
      var rules;
      try { rules = sheet.cssRules; } catch (e) { continue; }
      if (!rules) continue;
      for (var r = 0; r < rules.length; r++) {
        var rule = rules[r];
        if (!rule.selectorText) continue;
        for (var i = 0; i < res.length; i++) {
          if (res[i].test(rule.selectorText)) { out.push(rule.cssText); break; }
        }
      }
    }
    return out.join('\n\n');
  }

  function buildCodePanel(example) {
    var canvas = example.querySelector('.wb-canvas');
    if (!canvas) return;

    var html = dedent(canvas.innerHTML);
    var css = cssFor(classesIn(canvas));
    var js = '';
    var jsId = example.getAttribute('data-js');
    if (jsId) {
      var tag = document.getElementById(jsId);
      if (tag) js = dedent(tag.textContent);
    }

    var toggle = document.createElement('button');
    toggle.className = 'wb-toggle';
    toggle.textContent = 'Show code';

    var panel = document.createElement('div');
    panel.className = 'wb-code';
    panel.hidden = true;

    var bar = document.createElement('div');
    bar.className = 'wb-code-bar';
    var tabs = document.createElement('div');
    tabs.className = 'wb-code-tabs';
    var copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'wb-copy';
    copy.textContent = 'Copy';
    bar.appendChild(tabs);
    bar.appendChild(copy);
    panel.appendChild(bar);

    var panes = [];
    var current = null;
    [['HTML', html, hlHtml], ['CSS', css, hlCss], ['JS', js, hlJs]].forEach(function (spec) {
      if (!spec[1]) return;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = spec[0];
      var pre = document.createElement('pre');
      pre.innerHTML = '<code>' + spec[2](spec[1]) + '</code>';
      var pane = { btn: btn, pre: pre, raw: spec[1] };
      if (panes.length) { pre.hidden = true; } else { btn.className = 'is-on'; current = pane; }
      btn.addEventListener('click', function () {
        panes.forEach(function (p) { p.pre.hidden = true; p.btn.className = ''; });
        pre.hidden = false; btn.className = 'is-on'; current = pane;
      });
      tabs.appendChild(btn);
      panel.appendChild(pre);
      panes.push(pane);
    });

    copy.addEventListener('click', function () {
      if (!current) return;
      navigator.clipboard.writeText(current.raw).then(function () {
        copy.textContent = 'Copied';
        setTimeout(function () { copy.textContent = 'Copy'; }, 1400);
      });
    });

    toggle.addEventListener('click', function () {
      panel.hidden = !panel.hidden;
      toggle.textContent = panel.hidden ? 'Show code' : 'Hide code';
    });

    example.appendChild(toggle);
    example.appendChild(panel);
  }

  function buildSidebar() {
    var here = location.pathname.split('/').pop() || 'index.html';
    var aside = document.createElement('aside');
    aside.className = 'wb-sidebar';
    var ic = function (name) {
      return '<svg aria-hidden="true"><use href="../icons/sprite.svg#' + name + '"/></svg>';
    };
    var h = '<div class="wb-brand"><span class="dot">' + ic('account_tree') + '</span><div><b>NIFI Design System</b><span>Texas HHS · workbench</span></div></div>';
    h += '<input class="ds-input wb-filter" type="search" placeholder="Filter" aria-label="Filter navigation">';
    h += '<nav class="wb-nav">';
    PAGES.forEach(function (g) {
      h += '<p>' + g.group + '</p>';
      g.items.forEach(function (it) {
        var isHere = it.href.split('/').pop() === here;
        var cls = (isHere ? 'is-here' : '') + (it.ext ? ' wb-ext' : '');
        h += '<a class="' + cls.trim() + '" href="' + it.href + '"' + (it.ext ? ' target="_blank" rel="noopener"' : '') + '>' + ic(it.icon || 'article') + it.title + '</a>';
        if (isHere) {
          document.querySelectorAll('.wb-section[id]').forEach(function (sec) {
            var t = sec.querySelector('h2');
            if (t) h += '<a class="wb-sub" data-spy="' + sec.id + '" href="#' + sec.id + '">' + t.textContent.replace(/^¶\s*/, '') + '</a>';
          });
        }
      });
    });
    h += '</nav>';
    aside.innerHTML = h;
    document.body.insertBefore(aside, document.body.firstChild);

    var filter = aside.querySelector('.wb-filter');
    filter.addEventListener('input', function () {
      var q = filter.value.trim().toLowerCase();
      aside.querySelectorAll('.wb-nav a').forEach(function (a) {
        a.style.display = !q || a.textContent.toLowerCase().indexOf(q) !== -1 ? '' : 'none';
      });
    });

    /* scrollspy */
    var subs = aside.querySelectorAll('.wb-sub');
    if (subs.length && 'IntersectionObserver' in window) {
      var byId = {};
      subs.forEach(function (a) { byId[a.getAttribute('data-spy')] = a; });
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            subs.forEach(function (a) { a.classList.remove('is-view'); });
            var a = byId[en.target.id];
            if (a) a.classList.add('is-view');
          }
        });
      }, { rootMargin: '-10% 0px -75% 0px' });
      document.querySelectorAll('.wb-section[id]').forEach(function (s) { io.observe(s); });
    }
  }

  function addAnchors() {
    document.querySelectorAll('.wb-section[id] > h2').forEach(function (h2) {
      var a = document.createElement('a');
      a.className = 'wb-anchor';
      a.href = '#' + h2.parentElement.id;
      a.textContent = '#';
      a.setAttribute('aria-label', 'Link to ' + h2.textContent);
      h2.insertBefore(a, h2.firstChild);
    });
  }

  /* Scrollable regions must be keyboard-reachable (WCAG 2.1.1 /
     axe scrollable-region-focusable): any canvas or table wrapper that
     actually clips gets tabindex + a name. Re-checked on resize because
     zoom changes what overflows. */
  function markScrollables() {
    document.querySelectorAll('.wb-canvas, .ds-table-scroll').forEach(function (el) {
      var scrollable = el.scrollWidth > el.clientWidth + 2;
      if (scrollable) {
        if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
        if (!el.hasAttribute('role')) el.setAttribute('role', 'group');
        if (!el.getAttribute('aria-label')) {
          var ex = el.closest('.wb-example');
          var h = ex && ex.querySelector('h3');
          el.setAttribute('aria-label', (h ? h.textContent + ' — ' : '') + 'scrollable content');
        }
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    buildSidebar();
    addAnchors();
    document.querySelectorAll('.wb-example').forEach(buildCodePanel);
    markScrollables();
    var t; window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(markScrollables, 200); });
  });
})();
