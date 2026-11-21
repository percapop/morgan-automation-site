/* =========================================================
   Translations (no libraries, no cookies, no storage)

   - English in index.html is the source text.
   - Each other language lives in lang/<code>.js and is loaded only when chosen:
       maI18n.register('nl', { "English text": "Nederlandse tekst", ... })
     Keys are the English text exactly as it appears in the page (inner HTML,
     whitespace collapsed). If you change English text in index.html, update the
     key in every lang file too; anything without a translation stays in English
     and is listed in the console as "missing".
   - The chosen language is kept in the address (?lang=nl), so links can be shared.
   ========================================================= */

(function () {
  'use strict';

  var LANGS = {
    en: { html: 'en', label: 'English', short: 'EN' },
    nl: { html: 'nl', label: 'Nederlands', short: 'NL' },
    de: { html: 'de', label: 'Deutsch', short: 'DE' },
    fr: { html: 'fr', label: 'Français', short: 'FR' },
    ja: { html: 'ja', label: '日本語', short: 'JA' },
    zh: { html: 'zh-Hans', label: '中文（简体）', short: 'ZH' }
  };

  // Blocks of text that are translated as one unit (their inline tags included)
  var UNITS = [
    'title', '.skip-link', '.site-nav a', '.flow-text', 'h1 .line', '.hero-sub',
    'h2', 'h3:not(:has(.acc-btn))', '.acc-title', 'p', 'li:not(:has(a))', 'dt', 'dd',
    'summary', 'label', '.card-num', '.drag-cursor', '.footer-col li a'
  ].join(',');
  var SKIP = '[data-i18n-skip], [data-lang], [data-lang] *';
  var ATTRS = ['aria-label'];

  var dicts = {};
  var current = 'en';
  var units = [];       // { el, key, svgAfter }
  var attrs = [];       // { el, name, key }
  var meta = document.querySelector('meta[name="description"]');
  var metaKey = meta ? meta.getAttribute('content') : '';

  function norm(s) { return s.replace(/\s+/g, ' ').trim(); }

  function contentNodes(el) {
    return Array.prototype.filter.call(el.childNodes, function (n) {
      return !(n.nodeType === 1 && n.tagName.toLowerCase() === 'svg') && n.nodeType !== 8;
    });
  }
  function serialize(nodes) {
    var div = document.createElement('div');
    nodes.forEach(function (n) { div.appendChild(n.cloneNode(true)); });
    return norm(div.innerHTML);
  }

  function collect() {
    document.querySelectorAll(UNITS).forEach(function (el) {
      if (el.matches(SKIP)) return;
      if (el.querySelector(UNITS)) return;   // contains smaller units: translate those instead
      var nodes = contentNodes(el);
      var key = serialize(nodes);
      if (!key || !/[A-Za-z]/.test(key)) return;
      var svg = el.querySelector(':scope > svg');
      var svgAfter = !!(svg && nodes.length && (svg.compareDocumentPosition(nodes[0]) & Node.DOCUMENT_POSITION_PRECEDING));
      units.push({ el: el, key: key, svgAfter: svgAfter });
    });
    ATTRS.forEach(function (name) {
      document.querySelectorAll('[' + name + ']').forEach(function (el) {
        if (el.matches(SKIP)) return;
        attrs.push({ el: el, name: name, key: el.getAttribute(name) });
      });
    });
  }

  function t(en) {
    var d = dicts[current];
    return (d && d[norm(en)]) || en;
  }

  function apply() {
    var d = current === 'en' ? null : dicts[current];
    var missing = [];
    units.forEach(function (u) {
      var html = d ? d[u.key] : u.key;
      if (html == null) { missing.push(u.key); html = u.key; }
      if (u.el.tagName.toLowerCase() === 'title') { document.title = html.replace(/&amp;/g, '&'); return; }
      contentNodes(u.el).forEach(function (n) { u.el.removeChild(n); });
      var tpl = document.createElement('template');
      tpl.innerHTML = html;
      var svg = u.el.querySelector(':scope > svg');
      if (svg && !u.svgAfter) u.el.insertBefore(tpl.content, svg);
      else u.el.appendChild(tpl.content);
    });
    attrs.forEach(function (a) {
      var v = d ? d[a.key] : a.key;
      if (v == null) { missing.push(a.key); v = a.key; }
      a.el.setAttribute(a.name, v);
    });
    if (meta) meta.setAttribute('content', d && d[metaKey] ? d[metaKey] : metaKey);
    document.documentElement.lang = LANGS[current].html;
    if (missing.length && window.console) console.info('[i18n] missing in "' + current + '":', missing);
    updateSwitcher();
    document.dispatchEvent(new CustomEvent('ma:lang', { detail: { lang: current } }));
  }

  function load(code, done) {
    if (code === 'en' || dicts[code]) { done(); return; }
    var s = document.createElement('script');
    s.src = 'lang/' + code + '.js';
    s.onload = done;
    s.onerror = function () { current = 'en'; done(); };
    document.head.appendChild(s);
  }

  // CJK web fonts: only requested when Japanese or Chinese is chosen
  var FONT_CSS = { ja: 'assets/fonts/noto-sans-jp.css', zh: 'assets/fonts/noto-sans-sc.css' };
  function ensureFont(code) {
    var href = FONT_CSS[code];
    if (!href || document.querySelector('link[href="' + href + '"]')) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    document.head.appendChild(l);
  }

  function set(code, push) {
    if (!LANGS[code]) code = 'en';
    ensureFont(code);
    load(code, function () {
      current = dicts[code] || code === 'en' ? code : 'en';
      apply();
      if (push !== false) {
        var url = new URL(window.location.href);
        if (current === 'en') url.searchParams.delete('lang'); else url.searchParams.set('lang', current);
        history.replaceState(null, '', url.pathname + url.search + url.hash);
      }
    });
  }

  /* ---------- Switcher (top right) ---------- */
  var sw = document.querySelector('[data-lang]');
  var swBtn = sw && sw.querySelector('.lang-btn');
  var swMenu = sw && sw.querySelector('.lang-menu');
  var swCurrent = sw && sw.querySelector('.lang-current');

  function openMenu(open) {
    if (!sw) return;
    swMenu.hidden = !open;
    swBtn.setAttribute('aria-expanded', String(open));
  }
  function updateSwitcher() {
    // Links to other pages of the site (e.g. privacy.html) carry the chosen language along
    document.querySelectorAll('a[data-keep-lang]').forEach(function (a) {
      var base = a.getAttribute('href').split('?')[0];
      a.setAttribute('href', current === 'en' ? base : base + '?lang=' + current);
    });
    if (!sw) return;
    swCurrent.textContent = LANGS[current].short;
    sw.querySelectorAll('[data-lang-option]').forEach(function (a) {
      if (a.getAttribute('data-lang-option') === current) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }
  if (sw) {
    swBtn.addEventListener('click', function () { openMenu(swMenu.hidden); if (!swMenu.hidden) swMenu.querySelector('a').focus(); });
    sw.querySelectorAll('[data-lang-option]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        set(a.getAttribute('data-lang-option'));
        openMenu(false);
        swBtn.focus();
      });
    });
    document.addEventListener('click', function (e) { if (!sw.contains(e.target)) openMenu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !swMenu.hidden) { openMenu(false); swBtn.focus(); }
    });
  }

  /* ---------- Start ---------- */
  collect();
  window.maI18n = {
    t: t,
    set: set,
    register: function (code, dict) {
      var clean = {};
      Object.keys(dict).forEach(function (k) { clean[norm(k)] = dict[k]; });
      dicts[code] = clean;
    },
    keys: function () {
      var seen = {}, out = [];
      units.forEach(function (u) { if (!seen[u.key]) { seen[u.key] = 1; out.push(u.key); } });
      attrs.forEach(function (a) { if (!seen[a.key]) { seen[a.key] = 1; out.push(a.key); } });
      if (metaKey && !seen[metaKey]) out.push(metaKey);
      return out;
    },
    get lang() { return current; }
  };
  var start = new URLSearchParams(window.location.search).get('lang');
  if (start && LANGS[start] && start !== 'en') set(start, false);
  else updateSwitcher();
})();
