/* ============================================================
   NAV — nav.js
   Builds the shared site header/nav on every page from site-config.json.
   Depends on site-config.js loading first (listens for siteconfig:ready).
   ============================================================ */
(function () {
  'use strict';

  function getDepthPrefix() {
    var depth = (window.location.pathname.match(/\//g) || []).length - 1;
    return depth > 0 ? '../'.repeat(depth) : '';
  }

  var ROOT = getDepthPrefix() || './';

  /* ── Build nav HTML from config ────────────────────────── */
  function buildNav(cfg) {
    var siteHeader = document.getElementById('siteHeader');
    if (!siteHeader) return;

    var brand   = cfg.brand   || {};
    var navCfg  = cfg.nav     || {};
    var links   = navCfg.links || [];
    var name    = brand.name    || 'Smart Wealth Blog';
    var icon    = brand.logoIcon || '💰';

    /* Nav links HTML */
    var linksHtml = links.map(function (link) {
      if (link.children && link.children.length) {
        var childHtml = link.children.map(function (c) {
          return '<a class="dropdown-item" href="' + ROOT + c.href + '">' + c.label + '</a>';
        }).join('');
        return '<div class="nav-item-wrap has-dropdown">'
          + '<button class="nav-link dropdown-toggle">' + link.label + ' <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="m6 9 6 6 6-6"/></svg></button>'
          + '<div class="nav-dropdown">' + childHtml + '</div>'
          + '</div>';
      }
      var href = link.href === '/' ? ROOT + 'index.html' : ROOT + link.href.replace(/^\//, '');
      if (link.href === '/')  href = ROOT || '/';
      return '<a class="nav-link" href="' + href + '">' + link.label + '</a>';
    }).join('');

    /* Full header HTML */
    siteHeader.innerHTML = [
      '<nav class="navbar container">',
      '  <a href="' + (ROOT || '/') + '" class="logo">',
      '    <span class="logo-icon">' + icon + '</span>',
      '    <span class="logo-brand-name">' + name + '</span>',
      '  </a>',
      '  <div class="nav-links" id="navLinks">' + linksHtml + '</div>',
      '  <div class="nav-actions">',
      '    <div class="lang-switcher" id="langSwitcher"></div>',
      '    <button class="search-btn" id="searchBtn" aria-label="Search">',
      '      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>',
      '      <span class="search-placeholder">Search an article…</span>',
      '    </button>',
      '    <button class="burger" id="navBurger" aria-label="Menu" aria-expanded="false">',
      '      <span></span><span></span><span></span>',
      '    </button>',
      '  </div>',
      '</nav>',
      '<!-- Mobile nav -->',
      '<div class="mobile-nav" id="mobileNav">',
      links.filter(function(l){ return l.href !== '/'; }).map(function(l){
        return '<a href="' + ROOT + l.href.replace(/^#/,'index.html#').replace(/^\//,'') + '">' + l.label + '</a>';
      }).join(''),
      '</div>'
    ].join('\n');

    /* Burger toggle */
    var burger  = document.getElementById('navBurger');
    var mobileNav = document.getElementById('mobileNav');
    if (burger && mobileNav) {
      burger.addEventListener('click', function () {
        var open = mobileNav.classList.toggle('open');
        burger.setAttribute('aria-expanded', String(open));
      });
    }

    /* Dropdown toggle (desktop) */
    siteHeader.querySelectorAll('.has-dropdown').forEach(function (wrap) {
      var toggle   = wrap.querySelector('.dropdown-toggle');
      var dropdown = wrap.querySelector('.nav-dropdown');
      if (!toggle || !dropdown) return;
      toggle.addEventListener('click', function (e) {
        e.stopPropagation();
        var isOpen = dropdown.classList.toggle('open');
        toggle.setAttribute('aria-expanded', String(isOpen));
      });
      document.addEventListener('click', function () {
        dropdown.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });

    /* Active nav link highlight */
    var currentPath = window.location.pathname;
    siteHeader.querySelectorAll('.nav-link, .dropdown-item').forEach(function (a) {
      if (a.tagName !== 'A') return;
      try {
        var linkPath = new URL(a.href, window.location.href).pathname;
        if (linkPath === currentPath || (currentPath.endsWith(linkPath) && linkPath !== '/')) {
          a.classList.add('active');
        }
      } catch (e) {}
    });

    /* Re-init lang switcher now that #langSwitcher exists */
    if (window.WEi18n) {
      var switcher = document.getElementById('langSwitcher');
      if (switcher && typeof window._buildI18nSwitcher === 'function') {
        window._buildI18nSwitcher(switcher);
      }
    }
  }

  /* ── Minimal inline CSS for nav (fallback if style.css missing) ─ */
  function injectNavCSS() {
    if (document.getElementById('we-nav-css')) return;
    var s = document.createElement('style');
    s.id = 'we-nav-css';
    s.textContent = [
      /* Navbar layout */
      '#siteHeader { position:sticky; top:0; z-index:100; background:var(--primary,#1B3A6B); box-shadow:0 2px 12px rgba(0,0,0,.2); }',
      '.navbar { display:flex; align-items:center; gap:1.5rem; padding:.75rem 1.5rem; max-width:1280px; margin:0 auto; }',
      '.logo { display:flex; align-items:center; gap:.5rem; text-decoration:none; color:#fff; font-weight:700; font-size:1.1rem; white-space:nowrap; }',
      '.logo-icon { font-size:1.4rem; background:var(--gold,#C9A84C); border-radius:50%; width:36px; height:36px; display:flex; align-items:center; justify-content:center; }',
      '.logo-brand-name { color:#fff; }',
      /* Nav links */
      '.nav-links { display:flex; align-items:center; gap:.25rem; margin-left:auto; }',
      '.nav-link { color:rgba(255,255,255,.85); text-decoration:none; padding:.45rem .75rem; border-radius:6px; font-size:.9rem; font-weight:500; transition:background .15s,color .15s; background:none; border:none; cursor:pointer; display:inline-flex; align-items:center; gap:.3rem; }',
      '.nav-link:hover,.nav-link.active { background:rgba(255,255,255,.12); color:#fff; }',
      /* Dropdown */
      '.nav-item-wrap { position:relative; }',
      '.nav-dropdown { display:none; position:absolute; top:calc(100% + 6px); left:0; background:#fff; border-radius:10px; box-shadow:0 8px 32px rgba(0,0,0,.15); min-width:220px; padding:.4rem; z-index:200; }',
      '.nav-dropdown.open { display:block; }',
      '.dropdown-item { display:block; padding:.55rem .9rem; color:#374151; text-decoration:none; border-radius:6px; font-size:.87rem; white-space:nowrap; }',
      '.dropdown-item:hover { background:#f3f4f6; color:var(--primary,#1B3A6B); }',
      /* Actions */
      '.nav-actions { display:flex; align-items:center; gap:.5rem; margin-left:.5rem; }',
      '.search-btn { display:flex; align-items:center; gap:.4rem; background:rgba(255,255,255,.1); border:1px solid rgba(255,255,255,.2); color:rgba(255,255,255,.7); border-radius:8px; padding:.4rem .75rem; cursor:pointer; font-size:.82rem; }',
      '.search-btn:hover { background:rgba(255,255,255,.18); color:#fff; }',
      '.search-placeholder { display:none; }',
      '@media(min-width:900px){ .search-placeholder { display:inline; } }',
      /* Burger */
      '.burger { display:none; flex-direction:column; gap:5px; background:none; border:none; cursor:pointer; padding:.4rem; }',
      '.burger span { display:block; width:22px; height:2px; background:#fff; border-radius:2px; transition:.2s; }',
      '@media(max-width:768px){ .nav-links { display:none; } .burger { display:flex; } }',
      /* Mobile nav */
      '.mobile-nav { display:none; flex-direction:column; background:var(--primary-dark,#122850); padding:.5rem 1rem 1rem; }',
      '.mobile-nav.open { display:flex; }',
      '.mobile-nav a { color:rgba(255,255,255,.85); text-decoration:none; padding:.6rem .5rem; font-size:.95rem; border-bottom:1px solid rgba(255,255,255,.08); }',
      '.mobile-nav a:last-child { border:none; }',
      /* Lang switcher inside nav */
      '.lang-switcher { position:relative; }',
      '.lang-current { background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.25); color:#fff; border-radius:6px; padding:.35rem .65rem; cursor:pointer; font-size:.82rem; display:inline-flex; align-items:center; gap:.3rem; }',
      '.lang-current:hover { background:rgba(255,255,255,.2); }',
      '.lang-dropdown { display:none; position:absolute; top:calc(100% + 6px); right:0; background:#fff; border-radius:8px; box-shadow:0 8px 24px rgba(0,0,0,.12); z-index:999; min-width:130px; padding:.3rem; }',
      '.lang-dropdown.open { display:block; }',
      '.lang-option { display:flex; align-items:center; gap:.5rem; width:100%; padding:.45rem .75rem; background:none; border:none; cursor:pointer; border-radius:5px; font-size:.85rem; color:#374151; }',
      '.lang-option:hover { background:#f3f4f6; }',
      '.lang-option.active { background:#EEF2FF; color:var(--primary,#1B3A6B); font-weight:600; }',
    ].join('\n');
    document.head.appendChild(s);
  }

  /* ── Expose switcher builder for i18n.js ───────────────── */
  window._buildI18nSwitcher = null; // set by i18n.js

  /* ── Boot ──────────────────────────────────────────────── */
  function boot(cfg) {
    injectNavCSS();
    buildNav(cfg);
    // If i18n already ran, rebuild lang switcher now
    if (window.WEi18n) {
      document.dispatchEvent(new CustomEvent('nav:ready'));
    }
  }

  // Listen for site-config ready event
  document.addEventListener('siteconfig:ready', function (e) {
    boot(e.detail);
  });

  // Fallback: if site-config already loaded before this script
  if (window.WEConfig && Object.keys(window.WEConfig).length) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { boot(window.WEConfig); });
    } else {
      boot(window.WEConfig);
    }
  }

})();
