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

  function updateNavLinks(lang) {
    // Add ?lang=XX to all internal links (same origin) so language is preserved when navigating
    var origin = window.location.origin;
    document.querySelectorAll('a[href]').forEach(function (a) {
      var href = a.getAttribute('href');
      // Skip: anchors, external, mailto, javascript, admin, already has data-no-lang
      if (!href || href.startsWith('#') || href.startsWith('mailto') || href.startsWith('javascript') || a.hasAttribute('data-no-lang')) return;
      // Skip external links
      try {
        var abs = new URL(href, window.location.href);
        if (abs.origin !== origin) return;
        // Skip admin pages
        if (abs.pathname.includes('/admin/')) return;
        // Set or remove lang param
        if (lang !== DEFAULT_LANG) abs.searchParams.set('lang', lang);
        else abs.searchParams.delete('lang');
        a.setAttribute('href', abs.pathname + (abs.search || '') + (abs.hash || ''));
      } catch (e) {}
    });
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

    // Update all internal nav links to carry ?lang=XX
    updateNavLinks(_lang);
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

  async function tryArticleRedirect(lang) {
    if (!window.location.pathname.includes('/articles/')) return;
    var match = window.location.pathname.match(/\/articles\/([^.]+)\.html/);
    if (!match) return;
    var currentSlug = match[1];
    // Use data-base-slug on <body> if available, otherwise strip suffix
    var baseSlug = document.body.getAttribute('data-base-slug')
                   || currentSlug.replace(/-(en|fr|ar|es|de)$/, '');
    var targetSlug = (lang === 'fr') ? baseSlug : baseSlug + '-' + lang;
    if (targetSlug === currentSlug) return; // already on correct version
    try {
      var r = await fetch(targetSlug + '.html', { method: 'HEAD' });
      if (r.ok) { window.location.href = targetSlug + '.html'; }
    } catch (e) {}
  }

  async function setLanguage(lang) {
    if (!LANGS.includes(lang)) return;
    _lang = lang;
    localStorage.setItem('we_lang', lang);

    // On article pages, redirect to translated version if it exists
    await tryArticleRedirect(lang);

    // Update URL without reload
    try {
      var url = new URL(window.location.href);
      if (lang !== DEFAULT_LANG) url.searchParams.set('lang', lang);
      else url.searchParams.delete('lang');
      window.history.replaceState({}, '', url.toString());
    } catch (e) {}

    var t = await loadTranslations(lang);
    applyToDOM(t);
    applyArticleLabels();
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

    // Stamp nav links with current lang on first load
    updateNavLinks(_lang);

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
    var t = _translations;
    if (!t || !Object.keys(t).length) return;

    function tget(key) {
      var parts = key.split('.'), v = t;
      for (var i = 0; i < parts.length; i++) {
        if (v && typeof v === 'object') v = v[parts[i]]; else return '';
      }
      return typeof v === 'string' ? v : '';
    }

    function setText(sel, key) {
      var v = tget(key); if (!v) return;
      document.querySelectorAll(sel).forEach(function(el){ el.textContent = v; });
    }
    function setHTML(sel, key) {
      var v = tget(key); if (!v) return;
      document.querySelectorAll(sel).forEach(function(el){ el.innerHTML = v; });
    }
    function setAttr(sel, attr, key) {
      var v = tget(key); if (!v) return;
      document.querySelectorAll(sel).forEach(function(el){ el.setAttribute(attr, v); });
    }

    /* ── Nav labels (catch any that don't use data-i18n) ── */
    var navMap = {
      'a[href="/"], a[href="../"], a[href="./"]':       'nav.home',
      'a[href="#investments"], a[href="../#investments"]': 'nav.investments',
      'a[href="#real-estate"], a[href="../#real-estate"]': 'nav.real-estate',
      'a[href="#taxation"],    a[href="../#taxation"]':    'nav.taxation'
    };
    Object.keys(navMap).forEach(function(sel) {
      var v = tget(navMap[sel]); if (!v) return;
      document.querySelectorAll('.main-nav ' + sel + ', .mobile-nav ' + sel).forEach(function(el){
        // Only replace if not a logo
        if (!el.classList.contains('logo')) el.textContent = v;
      });
    });

    /* ── Category chips ── */
    var catMap = {
      '.cat-placements, .cat-investments':              'categories.investments',
      '.cat-immobilier, .cat-real-estate':              'categories.real-estate',
      '.cat-fiscalite, .cat-taxation':                  'categories.taxation'
    };
    Object.keys(catMap).forEach(function(sel) {
      setText(sel, catMap[sel]);
    });

    /* ── Article chrome ── */
    setText('.article-updated, .updated-label',            'article.updated');
    setText('.reading-time-label, .read-time-unit',        'article.min-read');
    setText('.share-label, .social-share-label',           'article.share');
    setText('.toc-title, .sidebar-toc-title',              'article.toc');
    setText('.article-disclaimer-label',                   'article.disclaimer');

    // Full disclaimer box (only non-EN since FR articles have French disclaimer)
    if (_lang !== 'en' && _lang !== 'fr') {
      setHTML('.article-disclaimer:not([data-i18n-html])', 'article.disclaimer');
    }

    // Share buttons
    var shareMap = {
      '.share-twitter, .social-twitter':  'article.twitter',
      '.share-linkedin, .social-linkedin': 'article.linkedin',
      '.share-facebook, .social-facebook': 'article.facebook',
      '.share-copy, .copy-link-btn':      'article.copy'
    };
    Object.keys(shareMap).forEach(function(sel) {
      setText(sel, shareMap[sel]);
    });

    /* ── Footer columns ── */
    setText('.footer-col-investments h4, .f-col-invest', 'footer.col-investments');
    setText('.footer-col-realestate h4, .f-col-re',      'footer.col-realestate');
    setText('.footer-col-site h4, .f-col-site',          'footer.col-site');
    setText('.footer-tagline p',                          'footer.tagline');

    /* ── Cookie banner ── */
    setText('.cookie-title',                              'cookie.title');
    setText('#cookieAccept',                              'cookie.accept');
    setText('#cookieRefuse',                              'cookie.refuse');
    setText('#cookieCustomize',                           'cookie.customize');

    /* ── Search placeholder ── */
    setAttr('.header-search input, input[type="search"]', 'placeholder', 'nav.search');

    /* ── HTML dir for RTL ── */
    document.documentElement.setAttribute('lang', _lang);
    document.documentElement.setAttribute('dir', RTL_LANGS.includes(_lang) ? 'rtl' : 'ltr');

    /* ── Update lang switcher button face ── */
    document.querySelectorAll('.lang-current').forEach(function(btn) {
      btn.innerHTML = LANG_FLAGS[_lang] + ' <span>' + _lang.toUpperCase() + '</span>'
        + ' <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="m6 9 6 6 6-6"/></svg>';
    });
    document.querySelectorAll('.lang-option').forEach(function(btn) {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === _lang);
    });
  }
})();
