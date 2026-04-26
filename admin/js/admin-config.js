/* ============================================================
   ADMIN CONFIG — admin-config.js
   Translations · Site Editor · Settings
   ============================================================ */
(function () {
  'use strict';

  /* ── Translations editor ───────────────────────────────── */
  // Source language = French (site was written in French).
  // Target languages = EN, AR, ES, DE.
  var _transLang   = 'en';   // default target
  var _transSource = null;   // fr.json  — the original French text
  var _transTarget = null;   // {lang}.json — current translation being edited
  var _transKeys   = [];

  var TRANS_LANGS = ['en', 'ar', 'es', 'de'];
  var TRANS_NAMES = { en: 'English', ar: 'Arabic (RTL)', es: 'Español', de: 'Deutsch' };
  var TRANS_FLAGS = { en: '🇬🇧', ar: '🇸🇦', es: '🇪🇸', de: '🇩🇪' };

  function setTransLang(lang) {
    _transLang = lang;
    document.querySelectorAll('.trans-lang-btn').forEach(function(b) {
      b.classList.toggle('active', b.dataset.lang === lang);
    });
    loadTransEditor();
  }

  async function loadTransEditor() {
    var container = document.getElementById('translationsContent');
    if (!container) return;
    container.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--muted)">Loading…</div>';

    try {
      // Always reload French source
      var frRes = await fetch('../assets/i18n/fr.json?t=' + Date.now());
      _transSource = frRes.ok ? await frRes.json() : {};

      // Load target language (may be empty/missing — that's OK)
      try {
        var tRes = await fetch('../assets/i18n/' + _transLang + '.json?t=' + Date.now());
        _transTarget = tRes.ok ? await tRes.json() : {};
      } catch(e) { _transTarget = {}; }

      _transKeys = flattenKeys(_transSource);
      renderTranslationRows(_transKeys, _transSource, _transTarget);
    } catch (e) {
      container.innerHTML = '<div style="color:#ff6b6b;padding:2rem">Error: ' + e.message + '</div>';
    }
  }

  function flattenKeys(obj, prefix) {
    var keys = [];
    prefix = prefix || '';
    Object.keys(obj).forEach(function(k) {
      var full = prefix ? prefix + '.' + k : k;
      if (obj[k] && typeof obj[k] === 'object' && !Array.isArray(obj[k])) {
        keys = keys.concat(flattenKeys(obj[k], full));
      } else {
        keys.push(full);
      }
    });
    return keys;
  }

  function getNestedVal(obj, path) {
    var parts = path.split('.');
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null) return '';
      cur = cur[parts[i]];
    }
    return (cur == null || typeof cur === 'object') ? '' : String(cur);
  }

  function setNestedVal(obj, path, val) {
    var parts = path.split('.');
    var cur = obj;
    for (var i = 0; i < parts.length - 1; i++) {
      if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = val;
  }

  function renderTranslationRows(keys, source, target) {
    var container = document.getElementById('translationsContent');
    if (!container) return;
    var langName = TRANS_NAMES[_transLang] || _transLang.toUpperCase();
    var langFlag = TRANS_FLAGS[_transLang] || '';

    // Toolbar
    var html = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;padding:.5rem 0;border-bottom:1px solid var(--border)">'
      + '<div style="display:flex;align-items:center;gap:.75rem">'
      + '<span style="font-weight:700;font-size:.9rem">' + langFlag + ' Translating into: ' + langName + '</span>'
      + '<span id="transMissingCount" style="font-size:.78rem;color:var(--muted)"></span>'
      + '</div>'
      + '<button id="transFilterMissing" class="btn btn-outline btn-sm" data-active="0">🔍 Missing only</button>'
      + '</div>';

    // Header row
    html += '<div class="trans-header-row">'
      + '<span style="flex:0 0 200px">Key</span>'
      + '<span style="flex:1">🇫🇷 French (original)</span>'
      + '<span style="flex:1">' + langFlag + ' ' + langName + ' (your translation)</span>'
      + '</div>';

    var missing = 0;
    keys.forEach(function(key) {
      var srcVal    = getNestedVal(source, key) || '';
      var targetVal = getNestedVal(target, key) || '';
      var isEmpty   = !targetVal.trim();
      if (isEmpty) missing++;
      html += '<div class="trans-row' + (isEmpty ? ' trans-missing' : '') + '">'
        + '<span class="trans-key" style="flex:0 0 200px;font-size:.72rem;color:var(--muted);word-break:break-all">' + escapeHtml(key) + '</span>'
        + '<span class="trans-base" style="flex:1">' + escapeHtml(srcVal) + '</span>'
        + '<span class="trans-input" style="flex:1"><input type="text" value="' + escapeHtml(targetVal) + '" data-key="' + key + '" class="trans-field" placeholder="' + escapeHtml(srcVal) + '"></span>'
        + '</div>';
    });

    container.innerHTML = html;

    // Missing count
    var mc = container.querySelector('#transMissingCount');
    if (mc) mc.textContent = missing + ' of ' + keys.length + ' missing';

    // Filter toggle
    var filterBtn = container.querySelector('#transFilterMissing');
    if (filterBtn) {
      filterBtn.addEventListener('click', function() {
        var showMissing = filterBtn.dataset.active !== '1';
        filterBtn.dataset.active = showMissing ? '1' : '0';
        filterBtn.textContent    = showMissing ? '📋 Show all' : '🔍 Missing only';
        container.querySelectorAll('.trans-row').forEach(function(r) {
          r.style.display = showMissing ? (r.classList.contains('trans-missing') ? '' : 'none') : '';
        });
      });
    }
  }

  function escapeHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function collectTranslations() {
    // Start from existing target translations, apply edits on top
    var result = JSON.parse(JSON.stringify(_transTarget || {}));
    document.querySelectorAll('.trans-field').forEach(function(inp) {
      var key = inp.dataset.key;
      var val = inp.value.trim();
      if (val) setNestedVal(result, key, val);
    });
    return result;
  }

  async function saveTranslations() {
    if (!_transLang) { WEAdmin.toast('Select a language first.', 'error'); return; }
    var btns = document.querySelectorAll('[onclick="saveTranslations()"],[onclick="pushTranslations()"]');
    btns.forEach(function(b){ b.disabled = true; });
    try {
      var data = collectTranslations();
      var json = JSON.stringify(data, null, 2);
      await WEAdmin.pushFile('assets/i18n/' + _transLang + '.json', json, 'Update ' + _transLang + ' translations');
      _transTarget = data;
      WEAdmin.toast('✅ ' + (TRANS_NAMES[_transLang]||_transLang) + ' translations saved & pushed!', 'success');
    } catch (e) {
      WEAdmin.toast(e.message, 'error');
    } finally {
      btns.forEach(function(b){ b.disabled = false; });
    }
  }

  window.WEAdmin.setTransLang      = setTransLang;
  window.WEAdmin.loadTransEditor   = loadTransEditor;
  window.WEAdmin.loadTranslations  = loadTransEditor;   // alias for glue
  window.WEAdmin.saveTranslations  = saveTranslations;

  /* ── Site Editor ───────────────────────────────────────── */
  var _siteConfig = null;

  async function loadSiteEditor() {
    try {
      if (window.WEConfig && Object.keys(window.WEConfig).length) {
        _siteConfig = JSON.parse(JSON.stringify(window.WEConfig));
      } else {
        var res = await fetch('../site-config.json?t=' + Date.now());
        _siteConfig = await res.json();
      }
      fillSiteEditorForm(_siteConfig);
    } catch (e) {
      WEAdmin.toast('Could not load site config: ' + e.message, 'error');
    }
  }

  function fillSiteEditorForm(cfg) {
    function set(id, val) { var el = document.getElementById(id); if (el && val != null) el.value = val; }
    function setChk(id, val) { var el = document.getElementById(id); if (el) el.checked = !!val; }
    if (!cfg) return;

    // Brand
    set('se-brandName', cfg.brand && cfg.brand.name);
    set('se-tagline',   cfg.brand && cfg.brand.tagline);
    set('se-logoIcon',  cfg.brand && cfg.brand.logoIcon);
    set('se-domain',    cfg.brand && cfg.brand.domain);
    set('se-domain2',   cfg.brand && cfg.brand.domain2);

    // Colors — ids are col-<key>, hex-<key>, preview-<key>
    if (cfg.colors) {
      ['primary','gold','green','bg','text'].forEach(function(key) {
        var v = cfg.colors[key]; if (!v) return;
        set('col-' + key, v);
        set('hex-' + key, v);
        var prev = document.getElementById('preview-' + key);
        if (prev) prev.style.background = v;
      });
    }

    // Author
    set('se-authorName',   cfg.author && cfg.author.name);
    set('se-authorTitle',  cfg.author && cfg.author.title);
    set('se-authorAvatar', cfg.author && cfg.author.avatar);
    set('se-authorBio',    cfg.author && cfg.author.bio);

    // Hero
    if (cfg.hero) {
      set('se-heroBadge',    cfg.hero.badge);
      set('se-heroTitle',    cfg.hero.title);
      set('se-heroSubtitle', cfg.hero.subtitle);
      ['1','2','3'].forEach(function(n) {
        var s = cfg.hero['stat'+n]; if (!s) return;
        set('se-stat' + n + 'num',   s.num);
        set('se-stat' + n + 'label', s.label);
      });
    }

    // Newsletter
    set('se-nlSubscribers', cfg.newsletter && cfg.newsletter.subscribers);
    set('se-formspreeId',   cfg.newsletter && cfg.newsletter.formspreeId);

    // Ads
    if (cfg.ads) {
      set('se-adsenseId', cfg.ads.adsenseId);
      setChk('se-adsEnabled', cfg.ads.enabled);
    }

    // Analytics
    set('se-ga4', cfg.analytics && cfg.analytics.ga4);
    setChk('se-localTrackerEnabled', cfg.analytics ? cfg.analytics.localTracker !== false : true);

    // Social
    if (cfg.brand && cfg.brand.social) {
      ['twitter','linkedin','facebook','instagram'].forEach(function(p) {
        set('se-' + p, cfg.brand.social[p]);
      });
    }

    // Footer
    set('se-footerTagline',    cfg.footer && cfg.footer.tagline);
    set('se-footerDisclaimer', cfg.footer && cfg.footer.disclaimer);
    set('se-copyright',        cfg.footer && cfg.footer.copyright);
    set('se-hosting',          cfg.footer && cfg.footer.hosting);
    set('se-hostingUrl',       cfg.footer && cfg.footer.hostingUrl);
  }

  function collectSiteEditorData() {
    function get(id) { var el = document.getElementById(id); return el ? el.value.trim() : null; }
    function getChk(id) { var el = document.getElementById(id); return el ? el.checked : false; }

    var cfg = JSON.parse(JSON.stringify(_siteConfig || {}));

    cfg.brand = cfg.brand || {};
    cfg.brand.name    = get('se-brandName') || cfg.brand.name;
    cfg.brand.tagline = get('se-tagline')   || cfg.brand.tagline;
    cfg.brand.logoIcon = get('se-logoIcon') || cfg.brand.logoIcon;
    cfg.brand.domain   = get('se-domain')  || cfg.brand.domain;
    cfg.brand.domain2  = get('se-domain2') || cfg.brand.domain2;

    cfg.colors = cfg.colors || {};
    ['primary','gold','green','bg','text'].forEach(function(k) {
      var v = get('hex-' + k) || get('col-' + k);
      if (v) cfg.colors[k] = v;
    });

    cfg.author = cfg.author || {};
    cfg.author.name   = get('se-authorName')   || cfg.author.name;
    cfg.author.title  = get('se-authorTitle')  || cfg.author.title;
    cfg.author.avatar = get('se-authorAvatar') || cfg.author.avatar;
    cfg.author.bio    = get('se-authorBio')    || cfg.author.bio;

    cfg.hero = cfg.hero || {};
    cfg.hero.badge    = get('se-heroBadge')    || cfg.hero.badge;
    cfg.hero.title    = get('se-heroTitle')    || cfg.hero.title;
    cfg.hero.subtitle = get('se-heroSubtitle') || cfg.hero.subtitle;
    ['1','2','3'].forEach(function(n) {
      cfg.hero['stat'+n] = cfg.hero['stat'+n] || {};
      var num   = get('se-stat' + n + 'num');
      var label = get('se-stat' + n + 'label');
      if (num)   cfg.hero['stat'+n].num   = num;
      if (label) cfg.hero['stat'+n].label = label;
    });

    cfg.newsletter = cfg.newsletter || {};
    cfg.newsletter.subscribers = get('se-nlSubscribers') || cfg.newsletter.subscribers;
    cfg.newsletter.formspreeId = get('se-formspreeId')   || cfg.newsletter.formspreeId;

    cfg.ads = cfg.ads || {};
    cfg.ads.adsenseId = get('se-adsenseId') || cfg.ads.adsenseId;
    cfg.ads.enabled   = getChk('se-adsEnabled');

    cfg.analytics = cfg.analytics || {};
    cfg.analytics.ga4          = get('se-ga4')                   || cfg.analytics.ga4;
    cfg.analytics.localTracker = getChk('se-localTrackerEnabled');

    cfg.brand.social = cfg.brand.social || {};
    ['twitter','linkedin','facebook','instagram'].forEach(function(p) {
      var v = get('se-' + p);
      if (v !== null) cfg.brand.social[p] = v;
    });

    cfg.footer = cfg.footer || {};
    cfg.footer.tagline    = get('se-footerTagline')    || cfg.footer.tagline;
    cfg.footer.disclaimer = get('se-footerDisclaimer') || cfg.footer.disclaimer;
    cfg.footer.copyright  = get('se-copyright')        || cfg.footer.copyright;
    cfg.footer.hosting    = get('se-hosting')           || cfg.footer.hosting;
    cfg.footer.hostingUrl = get('se-hostingUrl')        || cfg.footer.hostingUrl;

    return cfg;
  }

  async function saveSiteConfig() {
    var btn = document.getElementById('btnSaveSiteConfig');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    try {
      var cfg  = collectSiteEditorData();
      var json = JSON.stringify(cfg, null, 2);
      await WEAdmin.pushFile('site-config.json', json, 'Update site config');
      _siteConfig = cfg;
      window.WEConfig = cfg;
      // Reload site-config.js in page
      if (window.WESiteConfig) window.WESiteConfig.reload();
      WEAdmin.toast('site-config.json saved!', 'success');
    } catch (e) {
      WEAdmin.toast(e.message, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '💾 Save & Push'; }
    }
  }

  function syncColorPreview(inputId, previewId) {
    var inp  = document.getElementById(inputId);
    var prev = document.getElementById(previewId);
    if (!inp || !prev) return;
    inp.addEventListener('input', function() { prev.style.background = inp.value; });
    inp.addEventListener('change', function() { prev.style.background = inp.value; });
  }

  window.WEAdmin.loadSiteEditor    = loadSiteEditor;
  window.WEAdmin.saveSiteConfig    = saveSiteConfig;
  window.WEAdmin.syncColorPreview  = syncColorPreview;

  /* ── Settings ──────────────────────────────────────────── */
  function loadSettings() {
    var gh = WEAdmin.getGithub();
    function fill(id, val) { var el = document.getElementById(id); if (el && val) el.value = val; }
    fill('settingsGHUser',   gh.user);
    fill('settingsGHRepo',   gh.repo);
    fill('settingsGHBranch', gh.branch || 'main');
    fill('settingsGHPAT',    gh.pat);

    var token = localStorage.getItem('we_access_token') || 'swb2026';
    fill('settingsAccessToken', token);

    var keys = JSON.parse(localStorage.getItem('we_ai_keys') || '{}');
    fill('settingsAnthropicKey', keys.anthropic);
    fill('settingsOpenAIKey',    keys.openai);
  }

  function saveGithubSettings() {
    var gh = {
      user:   ((document.getElementById('settingsGHUser')   || {}).value || '').trim(),
      repo:   ((document.getElementById('settingsGHRepo')   || {}).value || '').trim(),
      branch: ((document.getElementById('settingsGHBranch') || {}).value || 'main').trim(),
      pat:    ((document.getElementById('settingsGHPAT')    || {}).value || '').trim()
    };
    if (!gh.user || !gh.repo || !gh.pat) { WEAdmin.toast('Fill in user, repo, and PAT.', 'error'); return; }
    localStorage.setItem('we_github', JSON.stringify(gh));
    WEAdmin.toast('GitHub settings saved.', 'success');
  }

  function saveAccessToken() {
    var val = ((document.getElementById('settingsAccessToken') || {}).value || '').trim();
    if (val.length < 4) { WEAdmin.toast('Token must be at least 4 characters.', 'error'); return; }
    localStorage.setItem('we_access_token', val);
    sessionStorage.setItem('we_token_ok', '1');
    WEAdmin.toast('Access token updated. New URL: /admin/?access=' + val, 'success');
    // Show new URL
    var hint = document.getElementById('tokenHint');
    if (hint) hint.textContent = 'New admin URL: ' + window.location.origin + '/admin/?access=' + val;
  }

  function changePassword() {
    var cur  = ((document.getElementById('settingsCurPW')  || {}).value || '');
    var next = ((document.getElementById('settingsNewPW')  || {}).value || '').trim();
    var conf = ((document.getElementById('settingsConfPW') || {}).value || '').trim();

    var stored = JSON.parse(localStorage.getItem('we_admin_password') || '"admin2026"');
    if (cur !== stored)  { WEAdmin.toast('Current password incorrect.', 'error'); return; }
    if (next.length < 6) { WEAdmin.toast('New password must be at least 6 characters.', 'error'); return; }
    if (next !== conf)   { WEAdmin.toast('Passwords do not match.', 'error'); return; }

    localStorage.setItem('we_admin_password', JSON.stringify(next));
    WEAdmin.toast('Password changed successfully.', 'success');
    ['settingsCurPW','settingsNewPW','settingsConfPW'].forEach(function(id) {
      var el = document.getElementById(id); if (el) el.value = '';
    });
  }

  function saveAIKeys() {
    var keys = {
      anthropic: ((document.getElementById('settingsAnthropicKey') || {}).value || '').trim(),
      openai:    ((document.getElementById('settingsOpenAIKey')    || {}).value || '').trim()
    };
    localStorage.setItem('we_ai_keys', JSON.stringify(keys));
    WEAdmin.toast('AI keys saved.', 'success');
  }

  function exportData() {
    var data = {
      github:      JSON.parse(localStorage.getItem('we_github')       || '{}'),
      newsletter:  JSON.parse(localStorage.getItem('we_brevo')        || '{}'),
      drafts:      JSON.parse(localStorage.getItem('we_drafts')       || '{}'),
      visits:      JSON.parse(localStorage.getItem('we_visits')       || '[]'),
      sessions:    JSON.parse(localStorage.getItem('we_sessions')     || '[]'),
      exportDate:  new Date().toISOString()
    };
    // Strip sensitive keys
    delete data.github.pat;
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href   = url;
    a.download = 'swb-export-' + new Date().toISOString().split('T')[0] + '.json';
    a.click();
    URL.revokeObjectURL(url);
    WEAdmin.toast('Data exported.', 'success');
  }

  function clearAnalyticsData() {
    WEAdmin.openModal('Clear Analytics', 'This will erase all visit and session data from localStorage. Are you sure?', function() {
      localStorage.removeItem('we_visits');
      localStorage.removeItem('we_sessions');
      WEAdmin.toast('Analytics data cleared.', 'success');
    });
  }

  async function testGitHubConnection() {
    var btn = document.getElementById('btnTestGH');
    if (btn) { btn.disabled = true; btn.textContent = 'Testing…'; }
    try {
      var data = await WEAdmin.ghRequest('');
      var out = document.getElementById('ghTestResult');
      if (out) {
        out.style.color = '#2D9B6F';
        out.textContent = '✅ Connected: ' + data.full_name + ' (' + (data.default_branch || 'main') + ')';
      }
      WEAdmin.toast('GitHub connection OK!', 'success');
    } catch (e) {
      var out = document.getElementById('ghTestResult');
      if (out) { out.style.color = '#ff6b6b'; out.textContent = '❌ ' + e.message; }
      WEAdmin.toast(e.message, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '🔌 Test Connection'; }
    }
  }

  window.WEAdmin.loadSettings         = loadSettings;
  window.WEAdmin.saveGithubSettings   = saveGithubSettings;
  window.WEAdmin.saveAccessToken      = saveAccessToken;
  window.WEAdmin.changePassword       = changePassword;
  window.WEAdmin.saveAIKeys           = saveAIKeys;
  window.WEAdmin.exportData           = exportData;
  window.WEAdmin.clearAnalyticsData   = clearAnalyticsData;
  window.WEAdmin.testGitHubConnection = testGitHubConnection;

  /* ── Wire events ───────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    // Translations: each button carries data-lang
    document.querySelectorAll('.trans-lang-btn').forEach(function(b) {
      b.addEventListener('click', function() { setTransLang(b.dataset.lang || b.getAttribute('data-lang') || 'en'); });
    });

    // Auto-load translations view when it becomes visible (first time)
    var transView = document.getElementById('view-translations');
    if (transView) {
      var transLoaded = false;
      var observer = new MutationObserver(function() {
        if (transView.style.display !== 'none' && !transLoaded) {
          transLoaded = true;
          setTransLang(_transLang); // load default target lang
        }
      });
      observer.observe(transView, { attributes: true });
    }

    // Site editor
    var btnLoadSE  = document.getElementById('btnLoadSiteEditor');
    var btnSaveSE  = document.getElementById('btnSaveSiteConfig');
    if (btnLoadSE) btnLoadSE.addEventListener('click', loadSiteEditor);
    if (btnSaveSE) btnSaveSE.addEventListener('click', saveSiteConfig);

    // Wire color pickers (col-<key> → preview-<key>)
    ['primary','gold','green','bg','text'].forEach(function(k) {
      syncColorPreview('col-' + k, 'preview-' + k);
    });

    // When site-editor view becomes active, auto-load
    var seView = document.getElementById('view-siteeditor');
    if (seView) {
      var seLoaded = false;
      var seObserver = new MutationObserver(function() {
        if (seView.style.display !== 'none' && !seLoaded) {
          seLoaded = true;
          loadSiteEditor();
        }
      });
      seObserver.observe(seView, { attributes: true });
    }

    // Settings
    var btnSaveGH    = document.getElementById('btnSaveGH');
    var btnSaveToken = document.getElementById('btnSaveToken');
    var btnChangePW  = document.getElementById('btnChangePW');
    var btnSaveAI    = document.getElementById('btnSaveAIKeys');
    var btnExport    = document.getElementById('btnExport');
    var btnClearAn   = document.getElementById('btnClearAnalytics');
    var btnTestGH    = document.getElementById('btnTestGH');

    if (btnSaveGH)    btnSaveGH.addEventListener('click',    saveGithubSettings);
    if (btnSaveToken) btnSaveToken.addEventListener('click', saveAccessToken);
    if (btnChangePW)  btnChangePW.addEventListener('click',  changePassword);
    if (btnSaveAI)    btnSaveAI.addEventListener('click',    saveAIKeys);
    if (btnExport)    btnExport.addEventListener('click',    exportData);
    if (btnClearAn)   btnClearAn.addEventListener('click',   clearAnalyticsData);
    if (btnTestGH)    btnTestGH.addEventListener('click',    testGitHubConnection);

    // When settings view becomes active, fill form
    var settingsView = document.getElementById('view-settings');
    if (settingsView) {
      var settObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(m) {
          if (m.attributeName === 'style' && settingsView.style.display !== 'none') {
            loadSettings();
          }
        });
      });
      settObserver.observe(settingsView, { attributes: true });
    }
  });

})();
