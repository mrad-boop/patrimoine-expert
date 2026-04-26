/* ============================================================
   ADMIN CONFIG — admin-config.js
   Translations · Site Editor · Settings
   ============================================================ */
(function () {
  'use strict';

  /* ── Translations editor ───────────────────────────────── */
  var _transLang   = 'fr';
  var _transBase   = null;
  var _transTarget = null;
  var _transKeys   = [];

  var LANGS = ['fr', 'ar', 'es', 'de'];
  var LANG_NAMES = { fr: 'French', ar: 'Arabic (RTL)', es: 'Spanish', de: 'German' };

  function setTransLang(lang) {
    _transLang = lang;
    document.querySelectorAll('.trans-lang-btn').forEach(function(b) {
      b.classList.toggle('active', b.dataset.lang === lang);
    });
    loadTranslations();
  }

  async function loadTranslations() {
    var container = document.getElementById('translationsEditor');
    if (!container) return;
    container.innerHTML = '<div style="text-align:center;padding:2rem;color:rgba(255,255,255,.4)">Loading…</div>';

    try {
      // Load EN base
      if (!_transBase) {
        var enRes = await fetch('../assets/i18n/en.json?t=' + Date.now());
        _transBase = await enRes.json();
      }

      // Load target language
      try {
        var targetRes = await fetch('../assets/i18n/' + _transLang + '.json?t=' + Date.now());
        _transTarget = await targetRes.json();
      } catch(e) {
        _transTarget = {};
      }

      // Flatten keys
      _transKeys = flattenKeys(_transBase);
      renderTranslationRows(_transKeys, _transBase, _transTarget);
    } catch (e) {
      container.innerHTML = '<div style="color:#ff6b6b">Error: ' + e.message + '</div>';
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
    return cur == null ? '' : cur;
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

  function renderTranslationRows(keys, base, target) {
    var container = document.getElementById('translationsEditor');
    if (!container) return;
    var langName = LANG_NAMES[_transLang] || _transLang.toUpperCase();

    var html = '<div class="trans-header-row">'
      + '<span>Key</span>'
      + '<span>English (base)</span>'
      + '<span>' + langName + '</span>'
      + '</div>';

    keys.forEach(function(key) {
      var baseVal   = getNestedVal(base, key)   || '';
      var targetVal = getNestedVal(target, key) || '';
      var isEmpty   = !targetVal.trim();
      html += '<div class="trans-row' + (isEmpty ? ' trans-missing' : '') + '">'
        + '<span class="trans-key">' + key + '</span>'
        + '<span class="trans-base">' + escapeHtml(baseVal) + '</span>'
        + '<span class="trans-input"><input type="text" value="' + escapeHtml(targetVal) + '" data-key="' + key + '" class="trans-field" placeholder="' + escapeHtml(baseVal) + '"></span>'
        + '</div>';
    });

    container.innerHTML = html;

    // Filter missing only
    var filterBtn = document.getElementById('transFilterMissing');
    if (filterBtn) {
      filterBtn.onclick = function() {
        var rows = container.querySelectorAll('.trans-row');
        var showMissingOnly = filterBtn.dataset.active === '1';
        filterBtn.dataset.active = showMissingOnly ? '0' : '1';
        filterBtn.textContent = showMissingOnly ? '🔍 Show missing only' : '🔍 Show all';
        rows.forEach(function(r) {
          if (!showMissingOnly) r.style.display = '';
          else r.style.display = r.classList.contains('trans-missing') ? '' : 'none';
        });
      };
    }
  }

  function escapeHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function collectTranslations() {
    var result = JSON.parse(JSON.stringify(_transBase || {})); // start from base structure
    var fields = document.querySelectorAll('.trans-field');
    fields.forEach(function(inp) {
      var key = inp.dataset.key;
      var val = inp.value;
      if (val) setNestedVal(result, key, val);
    });
    return result;
  }

  async function saveTranslations() {
    var btn = document.getElementById('btnSaveTrans');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    try {
      var data = collectTranslations();
      var json = JSON.stringify(data, null, 2);
      await WEAdmin.pushFile('assets/i18n/' + _transLang + '.json', json, 'Update ' + _transLang + ' translations');
      _transTarget = data;
      WEAdmin.toast('Translations saved!', 'success');
    } catch (e) {
      WEAdmin.toast(e.message, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '💾 Save & Push'; }
    }
  }

  window.WEAdmin.setTransLang      = setTransLang;
  window.WEAdmin.loadTranslations  = loadTranslations;
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
    if (!cfg) return;

    // Brand
    set('seBrandName',    cfg.brand && cfg.brand.name);
    set('seBrandTagline', cfg.brand && cfg.brand.tagline);
    set('seBrandLogo',    cfg.brand && cfg.brand.logoIcon);
    set('seBrandDomain',  cfg.brand && cfg.brand.domain);

    // Colors
    if (cfg.colors) {
      Object.keys(cfg.colors).forEach(function(key) {
        set('seColor-' + key, cfg.colors[key]);
        var preview = document.getElementById('seColorPreview-' + key);
        if (preview) preview.style.background = cfg.colors[key];
      });
    }

    // Author
    set('seAuthorName',   cfg.author && cfg.author.name);
    set('seAuthorTitle',  cfg.author && cfg.author.title);
    set('seAuthorAvatar', cfg.author && cfg.author.avatar);
    set('seAuthorBio',    cfg.author && cfg.author.bio);

    // Hero
    if (cfg.hero) {
      set('seHeroBadge', cfg.hero.badge);
      ['1','2','3'].forEach(function(n) {
        set('seHeroStat' + n + 'Num',   cfg.hero['stat'+n] && cfg.hero['stat'+n].num);
        set('seHeroStat' + n + 'Label', cfg.hero['stat'+n] && cfg.hero['stat'+n].label);
      });
    }

    // Stats band
    if (cfg.statsBand && Array.isArray(cfg.statsBand)) {
      cfg.statsBand.forEach(function(s, i) {
        set('seStat' + (i+1) + 'Num',   s.num);
        set('seStat' + (i+1) + 'Label', s.label);
      });
    }

    // Newsletter
    set('seNlSubscribers', cfg.newsletter && cfg.newsletter.subscribers);
    set('seNlFormspree',   cfg.newsletter && cfg.newsletter.formspreeId);

    // Ads
    if (cfg.ads) {
      set('seAdsenseId', cfg.ads.adsenseId);
      var adsEnabled = document.getElementById('seAdsEnabled');
      if (adsEnabled) adsEnabled.checked = !!cfg.ads.enabled;
    }

    // Analytics
    set('seGA4', cfg.analytics && cfg.analytics.ga4);

    // Social
    if (cfg.brand && cfg.brand.social) {
      ['twitter','linkedin','facebook','instagram'].forEach(function(p) {
        set('seSocial-' + p, cfg.brand.social[p]);
      });
    }

    // Footer
    set('seFooterTagline',    cfg.footer && cfg.footer.tagline);
    set('seFooterDisclaimer', cfg.footer && cfg.footer.disclaimer);
  }

  function collectSiteEditorData() {
    function get(id) { var el = document.getElementById(id); return el ? el.value.trim() : null; }
    function getBool(id) { var el = document.getElementById(id); return el ? el.checked : false; }

    var cfg = JSON.parse(JSON.stringify(_siteConfig || {}));

    cfg.brand = cfg.brand || {};
    cfg.brand.name    = get('seBrandName')    || cfg.brand.name;
    cfg.brand.tagline = get('seBrandTagline') || cfg.brand.tagline;
    cfg.brand.logoIcon = get('seBrandLogo')   || cfg.brand.logoIcon;
    cfg.brand.domain   = get('seBrandDomain') || cfg.brand.domain;

    cfg.colors = cfg.colors || {};
    var colorKeys = ['primary','primaryDark','primaryLight','gold','goldLight','green','greenLight','bg','text'];
    colorKeys.forEach(function(k) {
      var v = get('seColor-' + k);
      if (v) cfg.colors[k] = v;
    });

    cfg.author = cfg.author || {};
    cfg.author.name   = get('seAuthorName')   || cfg.author.name;
    cfg.author.title  = get('seAuthorTitle')  || cfg.author.title;
    cfg.author.avatar = get('seAuthorAvatar') || cfg.author.avatar;
    cfg.author.bio    = get('seAuthorBio')    || cfg.author.bio;

    cfg.hero = cfg.hero || {};
    cfg.hero.badge = get('seHeroBadge') || cfg.hero.badge;
    ['1','2','3'].forEach(function(n) {
      cfg.hero['stat'+n] = cfg.hero['stat'+n] || {};
      var num   = get('seHeroStat' + n + 'Num');
      var label = get('seHeroStat' + n + 'Label');
      if (num)   cfg.hero['stat'+n].num   = num;
      if (label) cfg.hero['stat'+n].label = label;
    });

    cfg.statsBand = cfg.statsBand || [{},{},{},{}];
    for (var i = 0; i < 4; i++) {
      cfg.statsBand[i] = cfg.statsBand[i] || {};
      var num   = get('seStat' + (i+1) + 'Num');
      var label = get('seStat' + (i+1) + 'Label');
      if (num)   cfg.statsBand[i].num   = num;
      if (label) cfg.statsBand[i].label = label;
    }

    cfg.newsletter = cfg.newsletter || {};
    cfg.newsletter.subscribers = get('seNlSubscribers') || cfg.newsletter.subscribers;
    cfg.newsletter.formspreeId = get('seNlFormspree')   || cfg.newsletter.formspreeId;

    cfg.ads = cfg.ads || {};
    cfg.ads.adsenseId = get('seAdsenseId') || cfg.ads.adsenseId;
    cfg.ads.enabled   = getBool('seAdsEnabled');

    cfg.analytics = cfg.analytics || {};
    cfg.analytics.ga4 = get('seGA4') || cfg.analytics.ga4;

    cfg.brand.social = cfg.brand.social || {};
    ['twitter','linkedin','facebook','instagram'].forEach(function(p) {
      var v = get('seSocial-' + p);
      if (v !== null) cfg.brand.social[p] = v;
    });

    cfg.footer = cfg.footer || {};
    cfg.footer.tagline    = get('seFooterTagline')    || cfg.footer.tagline;
    cfg.footer.disclaimer = get('seFooterDisclaimer') || cfg.footer.disclaimer;

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
    // Translations
    document.querySelectorAll('.trans-lang-btn').forEach(function(b) {
      b.addEventListener('click', function() { setTransLang(b.dataset.lang); });
    });
    var btnSaveTrans = document.getElementById('btnSaveTrans');
    if (btnSaveTrans) btnSaveTrans.addEventListener('click', saveTranslations);

    // When translations view becomes active, load
    var transView = document.getElementById('view-translations');
    if (transView) {
      var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(m) {
          if (m.attributeName === 'style' && transView.style.display !== 'none' && !_transBase) {
            loadTranslations();
          }
        });
      });
      observer.observe(transView, { attributes: true });
    }

    // Site editor
    var btnLoadSE  = document.getElementById('btnLoadSiteEditor');
    var btnSaveSE  = document.getElementById('btnSaveSiteConfig');
    if (btnLoadSE) btnLoadSE.addEventListener('click', loadSiteEditor);
    if (btnSaveSE) btnSaveSE.addEventListener('click', saveSiteConfig);

    // Wire color pickers
    var colorKeys = ['primary','primaryDark','primaryLight','gold','goldLight','green','greenLight','bg','text'];
    colorKeys.forEach(function(k) {
      syncColorPreview('seColor-' + k, 'seColorPreview-' + k);
    });

    // When site-editor view becomes active, auto-load
    var seView = document.getElementById('view-site-editor');
    if (seView) {
      var seObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(m) {
          if (m.attributeName === 'style' && seView.style.display !== 'none' && !_siteConfig) {
            loadSiteEditor();
          }
        });
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
