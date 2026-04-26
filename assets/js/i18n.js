/* ============================================================
   WEALTH EXPERT — i18n.js
   Multilingual engine: EN (default), FR, AR, ES, DE
   ============================================================ */
(function () {
  'use strict';

  var LANGS = ['en', 'fr', 'ar', 'es', 'de'];
  var DEFAULT_LANG = 'en';
  var RTL_LANGS = ['ar'];
  var LANG_NAMES = { en: 'English', fr: 'Français', ar: 'العربية', es: 'Español', de: 'Deutsch' };
  var LANG_FLAGS = { en: '🇬🇧', fr: '🇫🇷', ar: '🇸🇦', es: '🇪🇸', de: '🇩🇪' };

  var _translations = {};
  var _lang = detectLang();

  function detectLang() {
    // 1. URL ?lang= param
    var urlLang = new URLSearchParams(window.location.search).get('lang');
    if (urlLang && LANGS.includes(urlLang)) return urlLang;
    // 2. localStorage
    var stored = localStorage.getItem('we_lang');
    if (stored && LANGS.includes(stored)) return stored;
    // 3. Browser language
    var browser = (navigator.language || navigator.userLanguage || DEFAULT_LANG).slice(0, 2);
    return LANGS.includes(browser) ? browser : DEFAULT_LANG;
  }

  async function loadTranslations(lang) {
    var base = document.querySelector('base') ? document.querySelector('base').href : '/';
    // Determine path relative to current page depth
    var depth = (window.location.pathname.match(/\//g) || []).length - 1;
    var prefix = depth > 0 ? '../'.repeat(depth) : '';
    try {
      var r = await fetch(prefix + 'assets/i18n/' + lang + '.json?t=' + Date.now());
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch (e) {
      console.warn('[i18n] Could not load', lang, e.message);
      return {};
    }
  }

  function get(key) {
    var keys = key.split('.');
    var v = _translations;
    for (var i = 0; i < keys.length; i++) {
      if (v && typeof v === 'object') v = v[keys[i]];
      else return key;
    }
    return (typeof v === 'string') ? v : key;
  }

  function applyToDOM(t) {
    _translations = t;

    // Text content
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var v = get(el.getAttribute('data-i18n'));
      if (v !== el.getAttribute('data-i18n')) el.textContent = v;
    });

    // HTML content
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var v = get(el.getAttribute('data-i18n-html'));
      if (v !== el.getAttribute('data-i18n-html')) el.innerHTML = v;
    });

    // Placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var v = get(el.getAttribute('data-i18n-placeholder'));
      if (v !== el.getAttribute('data-i18n-placeholder')) el.placeholder = v;
    });

    // aria-label
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      var v = get(el.getAttribute('data-i18n-aria'));
      if (v !== el.getAttribute('data-i18n-aria')) el.setAttribute('aria-label', v);
    });

    // title attr
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      var v = get(el.getAttribute('data-i18n-title'));
      if (v !== el.getAttribute('data-i18n-title')) el.title = v;
    });

    // RTL
    var isRTL = RTL_LANGS.includes(_lang);
    document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', _lang);

    // Switcher active state
    document.querySelectorAll('[data-lang]').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === _lang);
    });

    // hreflang canonical
    updateHreflang();

    // Dispatch event
    document.dispatchEvent(new CustomEvent('i18n:ready', { detail: { lang: _lang, t: t } }));
  }

  function updateHreflang() {
    var canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) return;
    try {
      var url = new URL(canonical.href);
      if (_lang !== DEFAULT_LANG) url.searchParams.set('lang', _lang);
      else url.searchParams.delete('lang');
      canonical.href = url.toString();
    } catch (e) {}

    // Add/update hreflang alternates
    LANGS.forEach(function (l) {
      var existing = document.querySelector('link[hreflang="' + l + '"]');
      if (!existing) {
        existing = document.createElement('link');
        existing.rel = 'alternate';
        existing.hreflang = l;
        document.head.appendChild(existing);
      }
      try {
        var u = new URL(window.location.href);
        if (l !== DEFAULT_LANG) u.searchParams.set('lang', l);
        else u.searchParams.delete('lang');
        existing.href = u.toString();
      } catch (e) {}
    });
  }

  async function setLanguage(lang) {
    if (!LANGS.includes(lang)) return;
    _lang = lang;
    localStorage.setItem('we_lang', lang);

    // Update URL without reload
    try {
      var url = new URL(window.location.href);
      if (lang !== DEFAULT_LANG) url.searchParams.set('lang', lang);
      else url.searchParams.delete('lang');
      window.history.replaceState({}, '', url.toString());
    } catch (e) {}

    var t = await loadTranslations(lang);
    applyToDOM(t);
  }

  function buildSwitcher(container) {
    if (!container) return;
    container.innerHTML = '';

    // Current lang button
    var current = document.createElement('button');
    current.className = 'lang-current';
    current.setAttribute('aria-haspopup', 'true');
    current.setAttribute('aria-expanded', 'false');
    current.innerHTML = LANG_FLAGS[_lang] + ' <span>' + _lang.toUpperCase() + '</span> <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="m6 9 6 6 6-6"/></svg>';
    container.appendChild(current);

    // Dropdown
    var dropdown = document.createElement('div');
    dropdown.className = 'lang-dropdown';
    LANGS.forEach(function (l) {
      var btn = document.createElement('button');
      btn.setAttribute('data-lang', l);
      btn.className = 'lang-option' + (l === _lang ? ' active' : '');
      btn.innerHTML = LANG_FLAGS[l] + ' ' + LANG_NAMES[l];
      btn.addEventListener('click', function () {
        setLanguage(l);
        current.innerHTML = LANG_FLAGS[l] + ' <span>' + l.toUpperCase() + '</span> <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="m6 9 6 6 6-6"/></svg>';
        dropdown.classList.remove('open');
        current.setAttribute('aria-expanded', 'false');
      });
      dropdown.appendChild(btn);
    });
    container.appendChild(dropdown);

    current.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = dropdown.classList.toggle('open');
      current.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', function () {
      dropdown.classList.remove('open');
      current.setAttribute('aria-expanded', 'false');
    });
  }

  // Public API
  window.WEi18n = {
    setLanguage: setLanguage,
    getLang: function () { return _lang; },
    getLangs: function () { return LANGS; },
    t: get,
    flags: LANG_FLAGS,
    names: LANG_NAMES
  };

  // Auto-init when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  async function init() {
    // Build all declared lang switchers
    document.querySelectorAll('.lang-switcher').forEach(buildSwitcher);

    // Load and apply translations
    var t = await loadTranslations(_lang);
    applyToDOM(t);

    // Apply article-level i18n for pages without data-i18n
    applyArticleLabels();

    // Click handlers for any [data-lang] buttons added after
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-lang]');
      if (btn) setLanguage(btn.getAttribute('data-lang'));
    });

    // When nav.js builds the nav after us, rebuild the switcher
    document.addEventListener('nav:ready', function () {
      document.querySelectorAll('.lang-switcher').forEach(buildSwitcher);
    });
  }

  // Expose buildSwitcher so nav.js can call it
  window._buildI18nSwitcher = buildSwitcher;

  function applyArticleLabels() {
    // Apply translations to known structural selectors present in existing articles
    // This lets i18n work even without data-i18n attributes in old HTML files
    var t = _translations;
    if (!t || !Object.keys(t).length) return;

    function tget(key) {
      var parts = key.split('.'), v = t;
      for (var i = 0; i < parts.length; i++) { if (v && typeof v === 'object') v = v[parts[i]]; else return ''; }
      return typeof v === 'string' ? v : '';
    }

    // "Updated" date label
    document.querySelectorAll('.article-date-label, .date-label, .updated-label').forEach(function(el){
      var v = tget('article.updated'); if (v) el.textContent = v;
    });

    // "min read"
    document.querySelectorAll('.reading-time-label, .read-time-unit').forEach(function(el){
      var v = tget('article.min-read'); if (v) el.textContent = v;
    });

    // Disclaimer box — only update if it exists and lang is not EN (keep EN default)
    if (_lang !== 'en') {
      var disc = tget('article.disclaimer');
      document.querySelectorAll('.article-disclaimer').forEach(function(el){
        if (disc) el.innerHTML = disc;
      });
    }

    // Share label
    document.querySelectorAll('.share-label').forEach(function(el){
      var v = tget('article.share'); if (v) el.textContent = v;
    });

    // Cookie banner
    var cookieTitle = document.querySelector('.cookie-title');
    var cookieText  = document.querySelector('.cookie-text');
    var cookieAccept = document.getElementById('cookieAccept');
    var cookieRefuse = document.getElementById('cookieRefuse');
    if (cookieTitle && tget('cookie.title')) cookieTitle.textContent = tget('cookie.title');
    if (cookieAccept && tget('cookie.accept')) cookieAccept.textContent = tget('cookie.accept');
    if (cookieRefuse && tget('cookie.refuse')) cookieRefuse.textContent = tget('cookie.refuse');

    // Nav links — translate known text if data-i18n is present
    // (already handled by main [data-i18n] loop above)
  }
})();
