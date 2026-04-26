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
    var gh       = getGithub();
    var domain   = (window.WEConfig && window.WEConfig.brand && window.WEConfig.brand.domain) || 'https://smartwealthblog.com';
    var authorName  = (window.WEConfig && window.WEConfig.author && window.WEConfig.author.name) || 'Thomas Mercier';
    var authorTitle = (window.WEConfig && window.WEConfig.author && window.WEConfig.author.title) || 'Wealth Advisor';
    var siteName    = (window.WEConfig && window.WEConfig.brand && window.WEConfig.brand.name)   || 'Smart Wealth Blog';
    var category    = data.category || 'investments';
    var lang        = data.lang || 'en';
    var slug        = data.slug;
    var title       = escapeHtml(data.title);
    var metaDesc    = escapeHtml(data.metaDesc || data.title);
    var readTime    = data.readTime || '8';
    var dateStr     = new Date().toISOString().split('T')[0];
    var content     = data.content || '';
    var tags        = (data.tags || '').split(',').map(function(t){return t.trim();}).filter(Boolean);
    var canonical   = domain + '/articles/' + slug + '.html';
    var tagsHtml    = tags.map(function(t){ return '<span class="article-tag">' + escapeHtml(t) + '</span>'; }).join('');
    var schemaJson  = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": data.title,
      "description": data.metaDesc || data.title,
      "author": { "@type": "Person", "name": authorName },
      "publisher": { "@type": "Organization", "name": siteName, "url": domain },
      "datePublished": dateStr,
      "dateModified": dateStr,
      "mainEntityOfPage": { "@type": "WebPage", "@id": canonical },
      "inLanguage": lang
    }, null, 2);

    return `<!DOCTYPE html>
<html lang="${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — ${escapeHtml(siteName)}</title>
  <meta name="description" content="${metaDesc}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${canonical}">
  <!-- Open Graph -->
  <meta property="og:type"        content="article">
  <meta property="og:title"       content="${title}">
  <meta property="og:description" content="${metaDesc}">
  <meta property="og:url"         content="${canonical}">
  <meta property="og:site_name"   content="${escapeHtml(siteName)}">
  <!-- Twitter Card -->
  <meta name="twitter:card"        content="summary_large_image">
  <meta name="twitter:title"       content="${title}">
  <meta name="twitter:description" content="${metaDesc}">
  <!-- Schema.org -->
  <script type="application/ld+json">${schemaJson}</script>
  <!-- Styles -->
  <link rel="stylesheet" href="../assets/css/style.css">
  <link rel="stylesheet" href="../assets/css/article.css">
</head>
<body class="page-article" data-lang="${lang}">

  <!-- ── Nav (populated by site-config.js) ── -->
  <header id="siteHeader">
    <nav class="navbar container">
      <a href="../" class="logo">
        <span class="logo-icon">💰</span>
        <span class="logo-brand-name">${escapeHtml(siteName)}</span>
      </a>
      <div class="nav-links" id="navLinks"></div>
      <div class="nav-actions">
        <div class="lang-switcher" id="langSwitcher"></div>
      </div>
    </nav>
  </header>

  <main class="article-main container">
    <article class="article-content" itemscope itemtype="https://schema.org/Article">

      <header class="article-header">
        <div class="article-meta-top">
          <span class="article-category cat-${category}" data-i18n="categories.${category}">${category}</span>
          <span class="article-reading-time">${readTime} <span data-i18n="article.min-read">min read</span></span>
        </div>
        <h1 class="article-title" itemprop="headline">${title}</h1>
        <div class="article-byline">
          <span class="author-avatar-val">👨‍💼</span>
          <div>
            <span class="author-name-val" itemprop="author">${escapeHtml(authorName)}</span>
            <span class="article-date">
              <span data-i18n="article.updated">Updated</span>
              <time datetime="${dateStr}" itemprop="datePublished">${formatDate(dateStr)}</time>
            </span>
          </div>
        </div>
        ${tagsHtml ? '<div class="article-tags">' + tagsHtml + '</div>' : ''}
      </header>

      <!-- ── AdSense top ── -->
      <div class="ad-slot ad-top" aria-label="Advertisement">
        <ins class="adsbygoogle" style="display:block" data-ad-format="auto" data-full-width-responsive="true"></ins>
      </div>

      <!-- ── Article body ── -->
      <div class="article-body" itemprop="articleBody">
        ${content}
      </div>

      <!-- ── Disclaimer ── -->
      <div class="article-disclaimer" data-i18n-html="article.disclaimer">
        ⚠️ Disclaimer: This content is for informational purposes only and does not constitute investment advice.
      </div>

      <!-- ── Share ── -->
      <div class="article-share">
        <span data-i18n="article.share">Share:</span>
        <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(canonical)}&text=${encodeURIComponent(data.title)}" target="_blank" rel="noopener" class="share-btn twitter" data-i18n="article.twitter">🐦 Twitter</a>
        <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(canonical)}" target="_blank" rel="noopener" class="share-btn linkedin" data-i18n="article.linkedin">💼 LinkedIn</a>
        <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonical)}" target="_blank" rel="noopener" class="share-btn facebook" data-i18n="article.facebook">📘 Facebook</a>
        <button onclick="navigator.clipboard.writeText('${canonical}').then(function(){WEAdmin&&WEAdmin.toast('Link copied!','success')})" class="share-btn copy" data-i18n="article.copy">🔗 Copy link</button>
      </div>

      <!-- ── AdSense bottom ── -->
      <div class="ad-slot ad-bottom" aria-label="Advertisement">
        <ins class="adsbygoogle" style="display:block" data-ad-format="auto" data-full-width-responsive="true"></ins>
      </div>

    </article>

    <!-- ── Sidebar ── -->
    <aside class="article-sidebar">
      <div class="toc-box">
        <h3 data-i18n="article.toc">Table of Contents</h3>
        <nav id="articleToc"></nav>
      </div>
    </aside>
  </main>

  <!-- ── Footer (same as home) ── -->
  <footer id="siteFooter"></footer>

  <!-- ── Cookie banner ── -->
  <div id="cookieBanner" style="display:none"></div>

  <script src="../assets/js/site-config.js"></script>
  <script src="../assets/js/i18n.js"></script>
  <script src="../assets/js/tracker.js"></script>
  <script src="../assets/js/article.js"></script>
</body>
</html>`;
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
      await updateManifest({
        slug:     data.slug,
        title:    data.title,
        category: data.category,
        lang:     data.lang,
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
    var titleEl = document.getElementById('edTitle');
    var slugEl  = document.getElementById('edSlug');
    if (titleEl && slugEl && !slugEl.dataset.manual) {
      slugEl.value = slugify(titleEl.value);
    }
  }

  function updatePreview() {
    var frame = document.getElementById('edPreviewFrame');
    if (!frame) return;
    var title   = (document.getElementById('edTitle')   || {}).value || '';
    var content = (document.getElementById('edContent') || {}).value || '';
    frame.srcdoc = '<html><body style="font-family:Georgia,serif;max-width:800px;margin:2rem auto;padding:0 1rem;line-height:1.7">'
      + '<h1>' + escapeHtml(title) + '</h1>'
      + content
      + '</body></html>';
  }

  function insertTag(open, close) {
    var ta = document.getElementById('edContent');
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
    var ta = document.getElementById('edContent');
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
      title:    val('edTitle'),
      slug:     val('edSlug'),
      category: val('edCategory'),
      lang:     val('edLang'),
      emoji:    val('edEmoji'),
      readTime: val('edReadTime'),
      metaDesc: val('edMetaDesc'),
      keyword:  val('edKeyword'),
      tags:     val('edTags'),
      content:  val('edContent')
    };
  }

  function editArticle(slug) {
    // Try drafts first
    var drafts = ls(STORAGE_KEYS.drafts) || {};
    if (drafts[slug]) {
      loadIntoEditor(drafts[slug]);
    } else {
      toast('Loading from GitHub…', 'success');
      ghRequest('/contents/articles/' + slug + '.html').then(function (data) {
        var html = decodeURIComponent(escape(atob(data.content.replace(/\n/g,''))));
        // Extract body content between article-body divs
        var m = html.match(/<div class="article-body"[^>]*>([\s\S]*?)<\/div>\s*<!-- ── Disclaimer/);
        var content = m ? m[1].trim() : '';
        var titleM = html.match(/<h1 class="article-title"[^>]*>([\s\S]*?)<\/h1>/);
        var title = titleM ? titleM[1].replace(/<[^>]+>/g,'').trim() : slug;
        loadIntoEditor({ slug: slug, title: title, content: content });
      }).catch(function (e) { toast(e.message, 'error'); });
    }
    showView('editor');
  }

  function loadIntoEditor(data) {
    function set(id, val) { var el = document.getElementById(id); if (el) el.value = val || ''; }
    set('edTitle',    data.title);
    set('edSlug',     data.slug);
    set('edCategory', data.category);
    set('edLang',     data.lang);
    set('edEmoji',    data.emoji);
    set('edReadTime', data.readTime);
    set('edMetaDesc', data.metaDesc);
    set('edKeyword',  data.keyword);
    set('edTags',     data.tags);
    set('edContent',  data.content);
    var slugEl = document.getElementById('edSlug');
    if (slugEl) slugEl.dataset.manual = '1';
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
    var edTitle = document.getElementById('edTitle');
    var edSlug  = document.getElementById('edSlug');
    var edContent = document.getElementById('edContent');
    if (edTitle)   edTitle.addEventListener('input', updateSlug);
    if (edSlug)    edSlug.addEventListener('input', function(){ edSlug.dataset.manual = '1'; });
    if (edContent) edContent.addEventListener('input', updatePreview);

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
