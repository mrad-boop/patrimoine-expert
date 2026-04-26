/* ============================================================
   ADMIN CORE — admin-core.js
   Auth · Navigation · Dashboard · Articles · Editor · GitHub API
   ============================================================ */
(function () {
  'use strict';

  /* ── Constants ─────────────────────────────────────────── */
  var STORAGE_KEYS = {
    auth:        'we_admin_auth',
    token:       'we_admin_token',
    password:    'we_admin_password',
    github:      'we_github',
    drafts:      'we_drafts',
    aiKeys:      'we_ai_keys',
    visits:      'we_visits',         // written by tracker.js
    sessions:    'we_sessions',
    accessToken: 'we_access_token'
  };

  var DEFAULT_PASSWORD = 'admin2026';
  var DEFAULT_TOKEN    = 'swb2026';

  /* ── Utilities ─────────────────────────────────────────── */
  window.WEAdmin = window.WEAdmin || {};

  function slugify(text) {
    return text.toString().toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function formatDate(d) {
    var date = d ? new Date(d) : new Date();
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function ls(key, val) {
    if (val === undefined) {
      try { return JSON.parse(localStorage.getItem(key)); } catch(e) { return null; }
    }
    localStorage.setItem(key, JSON.stringify(val));
  }

  /* ── Toast ─────────────────────────────────────────────── */
  function toast(msg, type) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast show ' + (type || 'success');
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.className = 'toast'; }, 3500);
  }
  window.WEAdmin.toast = toast;

  /* ── Modal ─────────────────────────────────────────────── */
  function openModal(title, html, onConfirm) {
    var m = document.getElementById('modal');
    var mTitle = document.getElementById('modalTitle');
    var mBody  = document.getElementById('modalBody');
    var mOk    = document.getElementById('modalOk');
    if (!m) return;
    mTitle.textContent = title;
    mBody.innerHTML = html;
    mOk.onclick = function () { closeModal(); if (onConfirm) onConfirm(); };
    m.style.display = 'flex';
  }

  function closeModal() {
    var m = document.getElementById('modal');
    if (m) m.style.display = 'none';
  }
  window.WEAdmin.openModal  = openModal;
  window.WEAdmin.closeModal = closeModal;

  document.addEventListener('DOMContentLoaded', function () {
    var mClose = document.getElementById('modalClose');
    var mCancel = document.getElementById('modalCancel');
    if (mClose)  mClose.onclick  = closeModal;
    if (mCancel) mCancel.onclick = closeModal;
    var m = document.getElementById('modal');
    if (m) m.addEventListener('click', function (e) { if (e.target === m) closeModal(); });
  });

  /* ── Access-token security ─────────────────────────────── */
  function checkAccessToken() {
    var stored = ls(STORAGE_KEYS.accessToken) || DEFAULT_TOKEN;
    var param  = getParam('access');
    // If a valid token is in the URL → mark session as token-granted and clean URL
    if (param && param === stored) {
      sessionStorage.setItem('we_token_ok', '1');
      // Replace URL to hide token (show just /admin/)
      var clean = window.location.pathname;
      history.replaceState(null, '', clean);
      return true;
    }
    // Already granted in this session
    if (sessionStorage.getItem('we_token_ok') === '1') return true;
    // No valid token → block everything, show blank
    document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#888;font-size:1.1rem;">403 — Access denied</div>';
    return false;
  }

  /* ── Auth ──────────────────────────────────────────────── */
  function isLoggedIn() {
    return ls(STORAGE_KEYS.auth) === true;
  }

  function showLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('app').style.display        = 'none';
  }

  function showApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('app').style.display        = 'flex';
  }

  function doLogin(password) {
    var stored = ls(STORAGE_KEYS.password) || DEFAULT_PASSWORD;
    if (password === stored) {
      ls(STORAGE_KEYS.auth, true);
      showApp();
      initApp();
      return true;
    }
    return false;
  }

  function doLogout() {
    ls(STORAGE_KEYS.auth, false);
    showLogin();
  }
  window.WEAdmin.doLogin  = doLogin;
  window.WEAdmin.doLogout = doLogout;

  /* ── Navigation ────────────────────────────────────────── */
  var _currentView = 'dashboard';

  function showView(name) {
    document.querySelectorAll('.view').forEach(function (v) {
      v.style.display = 'none';
    });
    var target = document.getElementById('view-' + name);
    if (target) target.style.display = 'block';
    _currentView = name;

    document.querySelectorAll('.nav-item').forEach(function (li) {
      li.classList.remove('active');
    });
    var activeNav = document.getElementById('nav-' + name);
    if (activeNav) activeNav.classList.add('active');

    // Lazy-init views
    if (name === 'dashboard')    renderDashboard();
    if (name === 'articles')     renderArticlesList();
  }
  window.WEAdmin.showView = showView;

  /* ── GitHub config ─────────────────────────────────────── */
  function getGithub() {
    return ls(STORAGE_KEYS.github) || { user: '', repo: '', branch: 'main', pat: '' };
  }
  window.WEAdmin.getGithub = getGithub;

  /* ── GitHub API helpers ────────────────────────────────── */
  async function ghRequest(path, method, body) {
    var gh = getGithub();
    if (!gh.pat || !gh.user || !gh.repo) throw new Error('GitHub not configured. Check Settings.');
    var url = 'https://api.github.com/repos/' + gh.user + '/' + gh.repo + path;
    var opts = {
      method: method || 'GET',
      headers: {
        'Authorization': 'token ' + gh.pat,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      }
    };
    if (body) opts.body = JSON.stringify(body);
    var res = await fetch(url, opts);
    if (!res.ok) {
      var err = await res.json().catch(function () { return {}; });
      throw new Error(err.message || 'GitHub API error ' + res.status);
    }
    return res.status === 204 ? null : res.json();
  }

  async function getFileSHA(filePath) {
    try {
      var data = await ghRequest('/contents/' + filePath);
      return data.sha;
    } catch (e) {
      return null; // file doesn't exist yet
    }
  }

  async function pushFile(filePath, content, commitMsg) {
    var sha = await getFileSHA(filePath);
    var body = {
      message: commitMsg || 'Update ' + filePath,
      content: btoa(unescape(encodeURIComponent(content))),
      branch:  getGithub().branch || 'main'
    };
    if (sha) body.sha = sha;
    return ghRequest('/contents/' + filePath, 'PUT', body);
  }
  window.WEAdmin.pushFile    = pushFile;
  window.WEAdmin.getFileSHA  = getFileSHA;
  window.WEAdmin.ghRequest   = ghRequest;

  /* ── Manifest helpers ──────────────────────────────────── */
  async function loadManifest() {
    // Try direct fetch first — works without GitHub PAT
    try {
      var r = await fetch('../articles/manifest.json?t=' + Date.now());
      if (r.ok) return await r.json();
    } catch (e) {}
    // Fallback: GitHub API (requires PAT)
    try {
      var data = await ghRequest('/contents/articles/manifest.json');
      var json = decodeURIComponent(escape(atob(data.content.replace(/\n/g,''))));
      return JSON.parse(json);
    } catch (e) {
      return [];
    }
  }

  async function updateManifest(article) {
    var manifest = await loadManifest();
    var idx = manifest.findIndex(function (a) { return a.slug === article.slug; });
    if (idx >= 0) {
      manifest[idx] = Object.assign(manifest[idx], article);
    } else {
      manifest.unshift(article);
    }
    await pushFile('articles/manifest.json', JSON.stringify(manifest, null, 2), 'Update manifest: ' + article.slug);
    return manifest;
  }
  window.WEAdmin.loadManifest   = loadManifest;
  window.WEAdmin.updateManifest = updateManifest;

  /* ── Article HTML generator ────────────────────────────── */
  function generateArticleHTML(data) {
    var domain      = (window.WEConfig && window.WEConfig.brand && window.WEConfig.brand.domain) || 'https://smartwealthblog.com';
    var authorName  = (window.WEConfig && window.WEConfig.author && window.WEConfig.author.name)  || 'Thomas Mercier';
    var authorTitle = (window.WEConfig && window.WEConfig.author && window.WEConfig.author.title) || 'Independent Wealth Management Advisor (CGPI) · AMF Certified';
    var siteName    = (window.WEConfig && window.WEConfig.brand && window.WEConfig.brand.name)    || 'Smart Wealth Blog';
    var lang        = data.lang || 'fr';
    var slug        = data.slug;
    // Base slug = slug without language suffix
    var baseSlug    = slug.replace(/-(en|fr|ar|es|de)$/, '');
    var category    = data.category || 'investments';
    var catSlug     = category.toLowerCase().replace(/\s+/g,'-').replace('é','e');
    var title       = data.title || '';
    var metaDesc    = data.metaDesc || title;
    var readTime    = data.readTime || '8';
    var dateStr     = new Date().toISOString().split('T')[0];
    var content     = data.content || '';
    var tags        = (data.tags || '').split(',').map(function(t){return t.trim();}).filter(Boolean);
    var canonical   = domain + '/articles/' + slug + '.html';
    var tagsHtml    = tags.map(function(t){ return '<span class="article-tag">' + escHtml(t) + '</span>'; }).join('');
    var dir         = lang === 'ar' ? 'rtl' : 'ltr';

    function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    var schemaJson = JSON.stringify({
      "@context": "https://schema.org", "@type": "Article",
      "headline": title, "description": metaDesc,
      "author": {"@type":"Person","name":authorName},
      "publisher": {"@type":"Organization","name":siteName,"url":domain},
      "datePublished": dateStr, "dateModified": dateStr,
      "mainEntityOfPage": {"@type":"WebPage","@id":canonical},
      "inLanguage": lang
    }, null, 2);

    // hreflang alternates for other language versions
    var hreflangLinks = ['fr','en','ar','es','de'].map(function(l) {
      var lSlug = l === 'fr' ? baseSlug : baseSlug + '-' + l;
      return '  <link rel="alternate" hreflang="' + l + '" href="' + domain + '/articles/' + lSlug + '.html">';
    }).join('\n');

    return '<!DOCTYPE html>\n'
+ '<html lang="' + lang + '" dir="' + dir + '">\n'
+ '<head>\n'
+ '  <meta charset="UTF-8">\n'
+ '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
+ '  <title>' + escHtml(title) + ' | ' + escHtml(siteName) + '</title>\n'
+ '  <meta name="description" content="' + escHtml(metaDesc) + '">\n'
+ '  <link rel="canonical" href="' + canonical + '">\n'
+ hreflangLinks + '\n'
+ '  <meta property="og:type" content="article">\n'
+ '  <meta property="og:title" content="' + escHtml(title) + '">\n'
+ '  <meta property="og:description" content="' + escHtml(metaDesc) + '">\n'
+ '  <meta property="og:url" content="' + canonical + '">\n'
+ '  <meta name="twitter:card" content="summary_large_image">\n'
+ '  <script type="application/ld+json">' + schemaJson + '</script>\n'
+ '  <link rel="preconnect" href="https://fonts.googleapis.com">\n'
+ '  <link href="https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700;900&family=Open+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">\n'
+ '  <link rel="stylesheet" href="../assets/css/style.css">\n'
+ '</head>\n'
+ '<body data-lang="' + lang + '" data-slug="' + slug + '" data-base-slug="' + baseSlug + '">\n'
+ '\n'
+ '<header class="site-header" role="banner" id="siteHeader">\n'
+ '  <div class="container"><div class="header-inner">\n'
+ '    <a href="../" class="logo" aria-label="' + escHtml(siteName) + ' — Home">\n'
+ '      <div class="logo-icon">💰</div> Smart Wealth<span>Blog</span>\n'
+ '    </a>\n'
+ '    <nav class="main-nav" aria-label="Main navigation">\n'
+ '      <a href="../" class="nav-link" data-i18n="nav.home">Home</a>\n'
+ '      <div class="nav-dropdown"><a href="../#investments" class="nav-link" data-i18n="nav.investments">Investments ▾</a>\n'
+ '        <div class="nav-dropdown-menu">\n'
+ '          <a href="../articles/investir-bourse-debutants.html" data-i18n="nav.sub.beginners">Stock Market for Beginners</a>\n'
+ '          <a href="../articles/etf-investir.html" data-i18n="nav.sub.etf">ETF — How to Invest</a>\n'
+ '          <a href="../articles/assurance-vie-comparatif.html" data-i18n="nav.sub.life-insurance">Life Insurance</a>\n'
+ '          <a href="../articles/livret-a-ldds-lep.html" data-i18n="nav.sub.savings">Savings Accounts 2026</a>\n'
+ '          <a href="../articles/devenir-rentier-dividendes.html" data-i18n="nav.sub.dividends">Dividend Income</a>\n'
+ '        </div></div>\n'
+ '      <div class="nav-dropdown"><a href="../#real-estate" class="nav-link" data-i18n="nav.real-estate">Real Estate ▾</a>\n'
+ '        <div class="nav-dropdown-menu">\n'
+ '          <a href="../articles/credit-immobilier-negocier.html" data-i18n="nav.sub.mortgage">Mortgage &amp; Rates</a>\n'
+ '          <a href="../articles/revenus-locatifs-declaration.html" data-i18n="nav.sub.rental">Rental Income</a>\n'
+ '          <a href="../articles/crowdfunding-immobilier.html" data-i18n="nav.sub.crowdfunding">Real Estate Crowdfunding</a>\n'
+ '        </div></div>\n'
+ '      <div class="nav-dropdown"><a href="../#taxation" class="nav-link" data-i18n="nav.taxation">Taxation ▾</a>\n'
+ '        <div class="nav-dropdown-menu">\n'
+ '          <a href="../articles/fiscalite-cryptomonnaies.html" data-i18n="nav.sub.crypto">Crypto Tax Guide</a>\n'
+ '          <a href="../articles/loi-pinel-2026.html" data-i18n="nav.sub.tax-breaks">Tax Breaks 2026</a>\n'
+ '          <a href="../articles/per-plan-epargne-retraite.html" data-i18n="nav.sub.retirement">Retirement Savings Plan</a>\n'
+ '          <a href="../articles/succession-donation.html" data-i18n="nav.sub.inheritance">Inheritance &amp; Gifts</a>\n'
+ '        </div></div>\n'
+ '      <a href="../a-propos.html" class="nav-link" data-i18n="nav.about">About</a>\n'
+ '    </nav>\n'
+ '    <div class="header-right">\n'
+ '      <div class="lang-switcher" id="langSwitcher" aria-label="Language selector"></div>\n'
+ '      <button id="burger" class="burger" aria-label="Mobile menu" aria-expanded="false" aria-controls="mobileNav"><span class="burger-line"></span><span class="burger-line"></span><span class="burger-line"></span></button>\n'
+ '    </div>\n'
+ '  </div></div>\n'
+ '  <nav id="mobileNav" class="mobile-nav" aria-label="Mobile menu">\n'
+ '    <a href="../">Home</a>\n'
+ '    <a href="../articles/investir-bourse-debutants.html">Stock Market for Beginners</a>\n'
+ '    <a href="../articles/etf-investir.html">ETF</a>\n'
+ '    <a href="../articles/assurance-vie-comparatif.html">Life Insurance</a>\n'
+ '    <a href="../articles/livret-a-ldds-lep.html">Savings Accounts</a>\n'
+ '    <a href="../articles/devenir-rentier-dividendes.html">Dividend Income</a>\n'
+ '    <a href="../articles/credit-immobilier-negocier.html">Mortgage</a>\n'
+ '    <a href="../articles/revenus-locatifs-declaration.html">Rental Income</a>\n'
+ '    <a href="../articles/crowdfunding-immobilier.html">Crowdfunding</a>\n'
+ '    <a href="../articles/fiscalite-cryptomonnaies.html">Crypto Tax</a>\n'
+ '    <a href="../articles/loi-pinel-2026.html">Tax Breaks 2026</a>\n'
+ '    <a href="../articles/per-plan-epargne-retraite.html">Retirement Plan</a>\n'
+ '    <a href="../articles/succession-donation.html">Inheritance</a>\n'
+ '    <a href="../a-propos.html">About</a>\n'
+ '  </nav>\n'
+ '</header>\n'
+ '\n'
+ '<div class="reading-progress" id="readingProgress"></div>\n'
+ '\n'
+ '<main>\n'
+ '  <div class="container article-layout">\n'
+ '    <article class="article-main">\n'
+ '      <header class="article-header">\n'
+ '        <span class="card-category cat-' + catSlug + '" data-i18n="categories.' + catSlug + '">' + escHtml(category) + '</span>\n'
+ '        <h1 class="article-title">' + escHtml(title) + '</h1>\n'
+ '        <div class="article-meta">\n'
+ '          <span>✍️ <a href="../a-propos.html">' + escHtml(authorName) + '</a></span>\n'
+ '          <span>📅 ' + dateStr + '</span>\n'
+ '          <span>⏱️ ' + readTime + ' <span data-i18n="article.min-read">min read</span></span>\n'
+ '        </div>\n'
+ (tagsHtml ? '        <div class="article-tags">' + tagsHtml + '</div>\n' : '')
+ '      </header>\n'
+ '\n'
+ '      <div class="article-content">\n'
+ content + '\n'
+ '      </div>\n'
+ '\n'
+ '      <div class="article-disclaimer" data-i18n-html="article.disclaimer">\n'
+ '        ⚠️ Disclaimer: This content is for informational purposes only and does not constitute investment advice.\n'
+ '      </div>\n'
+ '\n'
+ '      <div class="article-share">\n'
+ '        <span data-i18n="article.share">Share:</span>\n'
+ '        <a href="https://twitter.com/intent/tweet?url=' + encodeURIComponent(canonical) + '" target="_blank" rel="noopener" data-i18n="article.twitter">🐦 Twitter</a>\n'
+ '        <a href="https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(canonical) + '" target="_blank" rel="noopener" data-i18n="article.linkedin">💼 LinkedIn</a>\n'
+ '        <button onclick="navigator.clipboard.writeText(\'' + canonical + '\')" data-i18n="article.copy">🔗 Copy link</button>\n'
+ '      </div>\n'
+ '    </article>\n'
+ '\n'
+ '    <aside class="article-sidebar">\n'
+ '      <div class="sidebar-toc"><h3 data-i18n="article.toc">Table of Contents</h3><nav id="tocNav"></nav></div>\n'
+ '    </aside>\n'
+ '  </div>\n'
+ '</main>\n'
+ '\n'
+ '<footer class="site-footer">\n'
+ '  <div class="container">\n'
+ '    <div class="footer-bottom"><span>© 2026 ' + escHtml(siteName) + '.</span>\n'
+ '      <span><a href="../mentions-legales.html">Legal Notice</a> · <a href="../politique-confidentialite.html">Privacy</a></span></div>\n'
+ '  </div>\n'
+ '</footer>\n'
+ '\n'
+ '<script src="../assets/js/site-config.js"></script>\n'
+ '<script src="../assets/js/i18n.js"></script>\n'
+ '<script src="../assets/js/tracker.js"></script>\n'
+ '<script src="../assets/js/main.js"></script>\n'
+ '</body>\n'
+ '</html>';
  }
  window.WEAdmin.generateArticleHTML = generateArticleHTML;

  /* ── Publish article ───────────────────────────────────── */
  async function publishArticle() {
    var btn = document.getElementById('btnPublish');
    if (btn) { btn.disabled = true; btn.textContent = 'Publishing…'; }
    try {
      var data = collectEditorData();
      if (!data.title) throw new Error('Title is required.');
      if (!data.slug)  throw new Error('Slug is required.');

      var html = generateArticleHTML(data);
      var path = 'articles/' + data.slug + '.html';
      await pushFile(path, html, 'Publish article: ' + data.slug);
      var baseSlug = data.slug.replace(/-(en|fr|ar|es|de)$/, '');
      await updateManifest({
        slug:     data.slug,
        baseSlug: baseSlug,
        title:    data.title,
        category: data.category,
        lang:     data.lang || 'fr',
        date:     new Date().toISOString().split('T')[0],
        readTime: data.readTime,
        emoji:    data.emoji,
        metaDesc: data.metaDesc,
        tags:     data.tags
      });
      // Remove from drafts
      var drafts = ls(STORAGE_KEYS.drafts) || {};
      delete drafts[data.slug];
      ls(STORAGE_KEYS.drafts, drafts);

      toast('Article published successfully!', 'success');
      showView('articles');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '🚀 Publish'; }
    }
  }

  async function saveDraft() {
    var data = collectEditorData();
    if (!data.slug) { toast('Slug required to save draft.', 'error'); return; }
    var drafts = ls(STORAGE_KEYS.drafts) || {};
    drafts[data.slug] = data;
    ls(STORAGE_KEYS.drafts, drafts);
    toast('Draft saved locally.', 'success');
  }

  /* ── Editor helpers ────────────────────────────────────── */
  function updateSlug() {
    var titleEl = document.getElementById('artTitle');
    var slugEl  = document.getElementById('artSlug');
    if (titleEl && slugEl && !slugEl.dataset.manual) {
      slugEl.value = slugify(titleEl.value);
    }
  }

  function updatePreview() {
    var div   = document.getElementById('previewContent');
    if (!div) return;
    var title   = (document.getElementById('artTitle')    || {}).value || '';
    var content = (document.getElementById('articleBody') || {}).value || '';
    div.innerHTML = '<h1 style="font-size:1.5rem;font-weight:800;margin-bottom:1rem">'
      + escapeHtml(title) + '</h1>' + content;
  }

  function insertTag(open, close) {
    var ta = document.getElementById('articleBody');
    if (!ta) return;
    var start = ta.selectionStart, end = ta.selectionEnd;
    var sel = ta.value.substring(start, end);
    ta.value = ta.value.substring(0, start) + open + sel + close + ta.value.substring(end);
    ta.selectionStart = start + open.length;
    ta.selectionEnd   = start + open.length + sel.length;
    ta.focus();
    updatePreview();
  }

  function insertTable() {
    var tbl = '<table>\n  <thead><tr><th>Column 1</th><th>Column 2</th><th>Column 3</th></tr></thead>\n  <tbody>\n    <tr><td>Data</td><td>Data</td><td>Data</td></tr>\n    <tr><td>Data</td><td>Data</td><td>Data</td></tr>\n  </tbody>\n</table>';
    var ta = document.getElementById('articleBody');
    if (!ta) return;
    var pos = ta.selectionStart;
    ta.value = ta.value.substring(0, pos) + tbl + ta.value.substring(pos);
    updatePreview();
  }

  function insertTip() {
    insertTag('<div class="tip-box"><strong>💡 Tip:</strong> ', '</div>');
  }

  function insertDisclaimer() {
    insertTag('<div class="disclaimer-box"><strong>⚠️ Disclaimer:</strong> ', '</div>');
  }

  function collectEditorData() {
    function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
    return {
      title:    val('artTitle'),
      slug:     val('artSlug'),
      category: val('artCategory'),
      lang:     val('artLang'),
      emoji:    val('artEmoji'),
      readTime: val('artReadingTime'),
      metaDesc: val('artMeta'),
      keyword:  val('artFocusKw'),
      tags:     val('artTags'),
      content:  val('articleBody')
    };
  }

  function extractArticleBody(html) {
    // Try both class names used across articles
    var si = html.indexOf('class="article-content"');
    if (si === -1) si = html.indexOf('class="article-body"');
    if (si === -1) return '';
    var tagEnd = html.indexOf('>', si) + 1;
    var depth = 1, i = tagEnd;
    while (i < html.length && depth > 0) {
      var no = html.indexOf('<div', i);
      var nc = html.indexOf('</div', i);
      if (nc === -1) break;
      if (no !== -1 && no < nc) { depth++; i = no + 4; }
      else { depth--; if (depth === 0) return html.substring(tagEnd, nc).trim(); i = nc + 5; }
    }
    return html.substring(tagEnd).trim();
  }

  function extractFields(html, slug) {
    var content = extractArticleBody(html);
    var titleM  = html.match(/<h1[^>]*class="article-title"[^>]*>([\s\S]*?)<\/h1>/);
    var title   = titleM ? titleM[1].replace(/<[^>]+>/g,'').trim() : slug;
    var descM   = html.match(/<meta\s+name="description"\s+content="([^"]+)"/);
    var emojiM  = html.match(/<span[^>]*class="[^"]*article-emoji[^"]*"[^>]*>([^<]+)<\/span>/);
    var catM    = html.match(/class="[^"]*cat-([\w-]+)"/);
    var rtM     = html.match(/(\d+)\s*min/i);
    return {
      slug:     slug,
      title:    title,
      content:  content || '',
      metaDesc: descM  ? descM[1]  : '',
      emoji:    emojiM ? emojiM[1].trim() : '📄',
      category: catM   ? catM[1]   : '',
      readTime: rtM    ? rtM[1]    : ''
    };
  }

  function editArticle(slug) {
    showView('editor');
    // Try drafts first
    var drafts = ls(STORAGE_KEYS.drafts) || {};
    if (drafts[slug]) {
      loadIntoEditor(drafts[slug]);
      return;
    }

    // Hide reference panel while loading
    var panel = document.getElementById('refPanel');
    if (panel) panel.style.display = 'none';
    toast('Loading article…', 'success');

    function doLoad(html) {
      var fields = extractFields(html, slug);
      // Store French original for reference panel
      fields.lang       = 'fr';
      fields.originalFr = fields.content;
      fields.originalTitle = fields.title;
      loadIntoEditor(fields);
      toast('✅ Article loaded — edit or translate below.', 'success');
    }

    // 1. Direct fetch (no PAT needed)
    fetch('../articles/' + slug + '.html?t=' + Date.now())
      .then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(doLoad)
      .catch(function() {
        // 2. Fallback: GitHub API
        ghRequest('/contents/articles/' + slug + '.html')
          .then(function(data) {
            var html = decodeURIComponent(escape(atob(data.content.replace(/\n/g,''))));
            doLoad(html);
          })
          .catch(function(e) { toast('Could not load article: ' + e.message, 'error'); });
      });
  }

  function loadIntoEditor(data) {
    function set(id, val) { var el = document.getElementById(id); if (el) el.value = val || ''; }
    function setOpt(id, val) {
      var el = document.getElementById(id);
      if (!el || !val) return;
      var opt = Array.from(el.options).find(function(o){ return o.value.toLowerCase() === val.toLowerCase() || o.value === val; });
      if (opt) el.value = opt.value;
    }
    set('artTitle',       data.title);
    set('artSlug',        data.slug);
    setOpt('artCategory', data.category);
    setOpt('artLang',     data.lang || 'fr');
    set('artEmoji',       data.emoji);
    set('artReadingTime', data.readTime);
    set('artMeta',        data.metaDesc);
    set('artFocusKw',     data.keyword);
    set('artTags',        data.tags);
    set('articleBody',    data.content);

    var slugEl = document.getElementById('artSlug');
    if (slugEl) slugEl.dataset.manual = '1';

    // Show reference panel with original French content
    if (data.originalFr) {
      var panel = document.getElementById('refPanel');
      var body  = document.getElementById('refBody');
      var title = document.getElementById('refTitle');
      if (panel) panel.style.display = '';
      if (title) title.textContent = data.originalTitle || data.title || '';
      if (body)  body.innerHTML = data.originalFr || '';
    }

    updatePreview();
  }

  window.WEAdmin.updateSlug       = updateSlug;
  window.WEAdmin.updatePreview    = updatePreview;
  window.WEAdmin.insertTag        = insertTag;
  window.WEAdmin.insertTable      = insertTable;
  window.WEAdmin.insertTip        = insertTip;
  window.WEAdmin.insertDisclaimer = insertDisclaimer;
  window.WEAdmin.saveDraft        = saveDraft;
  window.WEAdmin.publishArticle   = publishArticle;
  window.WEAdmin.editArticle      = editArticle;

  /* ── Dashboard ─────────────────────────────────────────── */
  var _chartRange = 30;
  var _chartInstance = null;

  function getVisitData(days) {
    var raw  = ls(STORAGE_KEYS.visits)   || [];
    var sess = ls(STORAGE_KEYS.sessions) || [];
    var cutoff = Date.now() - days * 86400000;
    var filtered  = raw.filter(function(v){ return v.ts >= cutoff; });
    var fSessions = sess.filter(function(s){ return s.ts >= cutoff; });

    // Aggregate by day
    var byDay = {};
    for (var i = days - 1; i >= 0; i--) {
      var d = new Date(Date.now() - i * 86400000);
      var key = d.toISOString().split('T')[0];
      byDay[key] = 0;
    }
    filtered.forEach(function(v) {
      var key = new Date(v.ts).toISOString().split('T')[0];
      if (byDay.hasOwnProperty(key)) byDay[key]++;
    });

    // Top pages
    var pages = {};
    filtered.forEach(function(v) {
      var p = v.path || '/';
      pages[p] = (pages[p] || 0) + 1;
    });
    var topPages = Object.entries(pages).sort(function(a,b){return b[1]-a[1];}).slice(0,5);

    // Referrers
    var refs = {};
    filtered.forEach(function(v) {
      var r = v.referrer || 'Direct';
      try { r = new URL(r).hostname; } catch(e) { r = r || 'Direct'; }
      refs[r] = (refs[r] || 0) + 1;
    });
    var topRefs = Object.entries(refs).sort(function(a,b){return b[1]-a[1];}).slice(0,5);

    // Avg session duration
    var totalDur = fSessions.reduce(function(s,x){ return s + (x.duration || 0); }, 0);
    var avgDur   = fSessions.length ? Math.round(totalDur / fSessions.length) : 0;

    return {
      labels:   Object.keys(byDay),
      values:   Object.values(byDay),
      total:    filtered.length,
      sessions: fSessions.length,
      avgTime:  avgDur,
      topPages: topPages,
      topRefs:  topRefs
    };
  }

  function drawChart(canvas, labels, values) {
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = canvas.width  = canvas.offsetWidth  || 800;
    var H = canvas.height = canvas.offsetHeight || 220;
    var pad = { top: 20, right: 20, bottom: 40, left: 50 };
    var cW = W - pad.left - pad.right;
    var cH = H - pad.top  - pad.bottom;
    var max = Math.max.apply(null, values) || 1;

    ctx.clearRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (var gi = 0; gi <= 4; gi++) {
      var gy = pad.top + cH - (gi / 4) * cH;
      ctx.beginPath(); ctx.moveTo(pad.left, gy); ctx.lineTo(pad.left + cW, gy); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(max * gi / 4), pad.left - 8, gy + 4);
    }

    // Fill
    var grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + cH);
    grad.addColorStop(0,   'rgba(201,168,76,0.5)');
    grad.addColorStop(1,   'rgba(201,168,76,0.02)');
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top + cH);
    values.forEach(function(v, i) {
      var x = pad.left + (i / (values.length - 1 || 1)) * cW;
      var y = pad.top  + cH - (v / max) * cH;
      if (i === 0) ctx.lineTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.lineTo(pad.left + cW, pad.top + cH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.strokeStyle = '#C9A84C';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    values.forEach(function(v, i) {
      var x = pad.left + (i / (values.length - 1 || 1)) * cW;
      var y = pad.top  + cH - (v / max) * cH;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Dots
    values.forEach(function(v, i) {
      var x = pad.left + (i / (values.length - 1 || 1)) * cW;
      var y = pad.top  + cH - (v / max) * cH;
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#C9A84C';
      ctx.fill();
    });

    // X labels (show every N)
    var step = Math.ceil(labels.length / 8);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    labels.forEach(function(l, i) {
      if (i % step !== 0 && i !== labels.length - 1) return;
      var x = pad.left + (i / (labels.length - 1 || 1)) * cW;
      var parts = l.split('-');
      ctx.fillText(parts[1] + '/' + parts[2], x, H - 10);
    });
  }

  function renderDashboard() {
    var data = getVisitData(_chartRange);

    // Stat cards
    function setCard(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }

    // Article count from manifest (async)
    loadManifest().then(function(m){ setCard('statArticles', m.length); }).catch(function(){ setCard('statArticles', '—'); });
    setCard('statViews',    data.total.toLocaleString());
    setCard('statSessions', data.sessions.toLocaleString());
    var mins = Math.floor(data.avgTime / 60), secs = data.avgTime % 60;
    setCard('statAvgTime',  mins + 'm ' + (secs < 10 ? '0' : '') + secs + 's');

    // Chart
    var canvas = document.getElementById('analyticsChart');
    if (canvas) drawChart(canvas, data.labels, data.values);

    // Top pages
    var tpEl = document.getElementById('topPagesList');
    if (tpEl) {
      if (!data.topPages.length) {
        tpEl.innerHTML = '<tr><td colspan="2" style="text-align:center;color:rgba(255,255,255,0.4);padding:1rem">No data yet</td></tr>';
      } else {
        tpEl.innerHTML = data.topPages.map(function(p) {
          return '<tr><td>' + escapeHtml(p[0]) + '</td><td style="text-align:right">' + p[1] + '</td></tr>';
        }).join('');
      }
    }

    // Traffic sources
    var tsEl = document.getElementById('trafficSourcesList');
    if (tsEl) {
      var total = data.topRefs.reduce(function(s,r){return s+r[1];},0) || 1;
      if (!data.topRefs.length) {
        tsEl.innerHTML = '<div style="color:rgba(255,255,255,0.4);font-size:.9rem;text-align:center;padding:1rem">No data yet</div>';
      } else {
        tsEl.innerHTML = data.topRefs.map(function(r) {
          var pct = Math.round(r[1] / total * 100);
          return '<div class="source-row">'
            + '<span class="source-name">' + escapeHtml(r[0]) + '</span>'
            + '<div class="source-bar-wrap"><div class="source-bar" style="width:' + pct + '%"></div></div>'
            + '<span class="source-pct">' + pct + '%</span>'
            + '</div>';
        }).join('');
      }
    }
  }

  window.WEAdmin.renderDashboard = renderDashboard;

  function setChartRange(days) {
    _chartRange = days;
    document.querySelectorAll('.chart-tab').forEach(function(t){
      t.classList.toggle('active', parseInt(t.dataset.days) === days);
    });
    renderDashboard();
  }
  window.WEAdmin.setChartRange = setChartRange;

  /* ── Articles list ─────────────────────────────────────── */
  var _manifest = [];

  async function renderArticlesList() {
    var container = document.getElementById('articlesTableBody');
    if (!container) return;
    container.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--muted)">Loading articles…</div>';
    try {
      _manifest = await loadManifest();
      filterArticles();
    } catch (e) {
      container.innerHTML = '<div style="text-align:center;padding:2rem;color:#ff6b6b">' + escapeHtml(e.message) + '</div>';
    }
  }

  /* Normalize category values from old French names to English slugs */
  function normalizeCat(cat) {
    var map = { 'Placements':'investments','placements':'investments','Investments':'investments',
                'Immobilier':'real-estate','immobilier':'real-estate','Real Estate':'real-estate',
                'Fiscalité':'taxation','fiscalite':'taxation','fiscalité':'taxation','Taxation':'taxation' };
    return map[cat] || (cat || 'investments').toLowerCase().replace(/\s+/g,'-');
  }

  function filterArticles(query) {
    var search = (query !== undefined ? query : ((document.getElementById('searchArticles') || {}).value || '')).toLowerCase();
    var cat    = ((document.getElementById('filterCat')  || {}).value || '');
    var lang   = ((document.getElementById('filterLang') || {}).value || '');
    var container = document.getElementById('articlesTableBody');
    if (!container) return;

    var drafts   = ls(STORAGE_KEYS.drafts) || {};
    var draftList = Object.values(drafts);

    var filtered = _manifest.filter(function(a) {
      var matchSearch = !search || (a.title || '').toLowerCase().includes(search) || (a.slug || '').includes(search);
      var catNorm     = normalizeCat(a.category || a.categorySlug || '');
      var matchCat    = !cat  || catNorm === cat.toLowerCase().replace(/\s+/g,'-') || (a.category||'') === cat;
      var matchLang   = !lang || (a.lang || 'fr') === lang;
      return matchSearch && matchCat && matchLang;
    });

    if (!filtered.length && !draftList.length) {
      container.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--muted)">No articles found.</div>';
      return;
    }

    var html = '';

    // Drafts
    draftList.forEach(function(d) {
      var slug = escapeHtml(d.slug || '');
      html += '<div class="table-row">'
        + '<div><span class="article-emoji-sm">' + (d.emoji||'📄') + '</span> <strong>' + escapeHtml(d.title||'Untitled') + '</strong>'
        + ' <span class="badge badge-draft">DRAFT</span></div>'
        + '<div>' + (d.category||'—') + '</div>'
        + '<div>' + (d.lang||'—').toUpperCase() + '</div>'
        + '<div>—</div>'
        + '<div class="row-actions">'
        + '<button class="btn btn-primary btn-sm" onclick="editArticle(\'' + slug + '\')">✏️ Edit</button>'
        + '<button class="btn btn-outline btn-sm" onclick="deleteDraft(\'' + slug + '\')">🗑️</button>'
        + '</div></div>';
    });

    filtered.forEach(function(a) {
      var slug    = escapeHtml(a.slug || '');
      var catNorm = normalizeCat(a.category || a.categorySlug || '');
      var lang    = (a.lang || 'fr').toUpperCase();
      var date    = a.date || '';
      var rt      = a.readingTime || a.readTime || '?';
      html += '<div class="table-row">'
        + '<div><span class="article-emoji-sm">' + (a.emoji||'📄') + '</span> '
        + '<a href="../articles/' + slug + '.html" target="_blank" style="color:var(--primary);font-weight:600">' + escapeHtml(a.title||slug) + '</a></div>'
        + '<div><span class="badge badge-' + catNorm + '">' + (a.category||catNorm) + '</span></div>'
        + '<div>' + lang + '</div>'
        + '<div style="font-size:.8rem;color:var(--muted)">' + date + ' · ' + rt + ' min</div>'
        + '<div class="row-actions">'
        + '<button class="btn btn-primary btn-sm" onclick="editArticle(\'' + slug + '\')">✏️</button>'
        + '<a class="btn btn-outline btn-sm" href="../articles/' + slug + '.html" target="_blank">👁️</a>'
        + '<button class="btn btn-outline btn-sm" onclick="deleteArticle(\'' + slug + '\')">🗑️</button>'
        + '</div></div>';
    });

    container.innerHTML = html;
  }

  function deleteDraft(slug) {
    openModal('Delete draft', 'Delete draft <strong>' + escapeHtml(slug) + '</strong>? This cannot be undone.', function() {
      var drafts = ls(STORAGE_KEYS.drafts) || {};
      delete drafts[slug];
      ls(STORAGE_KEYS.drafts, drafts);
      filterArticles();
      toast('Draft deleted.', 'success');
    });
  }

  function deleteArticle(slug) {
    openModal('Delete article', 'Delete <strong>' + escapeHtml(slug) + '</strong> from GitHub? This cannot be undone.', async function() {
      try {
        var sha = await getFileSHA('articles/' + slug + '.html');
        if (sha) await ghRequest('/contents/articles/' + slug + '.html', 'DELETE', {
          message: 'Delete article: ' + slug,
          sha:     sha,
          branch:  getGithub().branch || 'main'
        });
        var manifest = await loadManifest();
        manifest = manifest.filter(function(a){ return a.slug !== slug; });
        await pushFile('articles/manifest.json', JSON.stringify(manifest, null, 2), 'Remove from manifest: ' + slug);
        _manifest = manifest;
        filterArticles();
        toast('Article deleted.', 'success');
      } catch (e) {
        toast(e.message, 'error');
      }
    });
  }

  window.WEAdmin.filterArticles = filterArticles;
  window.WEAdmin.deleteDraft    = deleteDraft;
  window.WEAdmin.deleteArticle  = deleteArticle;

  /* ── Quick publish from dashboard ─────────────────────── */
  function quickPublishFromDashboard() {
    var titleEl = document.getElementById('quickTitle');
    var catEl   = document.getElementById('quickCat');
    var langEl  = document.getElementById('quickLang');
    if (!titleEl || !titleEl.value.trim()) { toast('Enter a title first.', 'error'); return; }
    loadIntoEditor({
      title:    titleEl.value.trim(),
      slug:     slugify(titleEl.value.trim()),
      category: catEl  ? catEl.value  : 'investments',
      lang:     langEl ? langEl.value : 'en'
    });
    titleEl.value = '';
    showView('editor');
  }
  window.WEAdmin.quickPublishFromDashboard = quickPublishFromDashboard;
  window.WEAdmin.initApp = function() { initApp(); };

  /* ── Init ──────────────────────────────────────────────── */
  function initApp() {
    // Nav items use inline onclick="showView(...)" — nothing to wire here

    // Wire editor events
    var artTitle = document.getElementById('artTitle');
    var artSlug  = document.getElementById('artSlug');
    var articleBody = document.getElementById('articleBody');
    if (artTitle)   artTitle.addEventListener('input', updateSlug);
    if (artSlug)    artSlug.addEventListener('input', function(){ artSlug.dataset.manual = '1'; });
    if (articleBody) articleBody.addEventListener('input', updatePreview);

    // Wire chart tabs
    document.querySelectorAll('.chart-tab').forEach(function(t) {
      t.addEventListener('click', function() { setChartRange(parseInt(t.dataset.days)); });
    });

    // Wire article filters
    ['articleSearch','articleCatFilter','articleLangFilter'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('input', filterArticles);
    });

    // Logout is wired via inline onclick="adminLogout()"

    // Show default view
    showView('dashboard');
  }

  /* ── Boot ──────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    if (!checkAccessToken()) return;

    // Login is handled by global adminLogin() called via inline onclick

    if (isLoggedIn()) {
      showApp();
      initApp();
    } else {
      showLogin();
    }
  });

})();
