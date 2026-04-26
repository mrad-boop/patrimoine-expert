/* ============================================================
   ADMIN GLUE — admin-glue.js
   Maps inline onclick function names used in HTML → actual implementations.
   Loaded last, after admin-core.js, admin-content.js, admin-config.js.
   ============================================================ */

/* ── Auth ──────────────────────────────────────────────────── */
function adminLogin() {
  var pw  = document.getElementById('passwordInput');
  var err = document.getElementById('loginError');
  if (!pw) return;

  // Self-contained: read password directly from localStorage
  var stored;
  try { stored = JSON.parse(localStorage.getItem('we_admin_password') || '"admin2026"'); }
  catch(e) { stored = 'admin2026'; }

  if (pw.value === stored) {
    localStorage.setItem('we_admin_auth', 'true');
    pw.value = '';
    if (err) err.style.display = 'none';
    // Show app panel
    var login = document.getElementById('loginScreen');
    var app   = document.getElementById('app');
    if (login) login.style.display = 'none';
    if (app)   app.style.display   = 'flex';
    // Init app and show dashboard
    if (window.WEAdmin) {
      if (window.WEAdmin.initApp)  window.WEAdmin.initApp();
      if (window.WEAdmin.showView) window.WEAdmin.showView('dashboard');
    }
  } else {
    if (err) { err.textContent = 'Incorrect password.'; err.style.display = 'block'; }
    pw.value = '';
    pw.focus();
  }
}

// Allow pressing Enter in the password field
document.addEventListener('DOMContentLoaded', function () {
  var pw = document.getElementById('passwordInput');
  if (pw) pw.addEventListener('keydown', function(e){ if (e.key === 'Enter') adminLogin(); });
});

function adminLogout() { WEAdmin.doLogout(); }

/* ── Navigation ─────────────────────────────────────────────── */
function showView(name) { WEAdmin.showView(name); }

/* ── Dashboard ──────────────────────────────────────────────── */
function switchChart(range, el) {
  var days = parseInt(range) || 30;
  WEAdmin.setChartRange(days);
  document.querySelectorAll('.chart-tab').forEach(function(t){ t.classList.remove('active'); });
  if (el) el.classList.add('active');
}

function quickCreate() { WEAdmin.showView('editor'); }
function quickAI()     { WEAdmin.showView('ai'); }

/* ── Editor toolbar ─────────────────────────────────────────── */
function insert(open, close) { WEAdmin.insertTag(open, close); }
function insertTable()        { WEAdmin.insertTable(); }
function insertDisclaimer()   { WEAdmin.insertDisclaimer(); }

function insertTip(type) {
  var icons = { info: '💡', warning: '⚠️', success: '✅' };
  var colors = { info: 'tip-box-info', warning: 'tip-box-warning', success: 'tip-box-success' };
  var icon  = icons[type]  || '💡';
  var cls   = colors[type] || 'tip-box';
  WEAdmin.insertTag('<div class="tip-box ' + cls + '"><strong>' + icon + ' Note:</strong> ', '</div>');
}

/* ── Editor actions ─────────────────────────────────────────── */
function saveDraft()     { WEAdmin.saveDraft(); }
function publishArticle(){ WEAdmin.publishArticle(); }

/* ── AI Generator ───────────────────────────────────────────── */
function generateAI()       { WEAdmin.runAIGenerate(); }
function sendAIToEditor()   { WEAdmin.useGeneratedContent(); }
function publishAIDirect()  { WEAdmin.useGeneratedContent(); WEAdmin.publishArticle(); }

/* ── Newsletter ─────────────────────────────────────────────── */
function saveBrevoCode()        { WEAdmin.saveBrevoConfig(); }
function generateNewsletterHTML(){ WEAdmin.generateNewsletterHTML(); }
function copyNLHTML() {
  var el = document.getElementById('nlHtmlOutput');
  if (!el || !el.value) { WEAdmin.toast('Generate HTML first.', 'error'); return; }
  navigator.clipboard.writeText(el.value).then(function(){ WEAdmin.toast('Copied!', 'success'); });
}

/* ── SEO ────────────────────────────────────────────────────── */
function regenerateSitemap() { WEAdmin.regenerateSitemap(); }
function runSEOAudit()       { WEAdmin.runSEOAudit(); }
function saveRobotsTxt()     { WEAdmin.saveRobotsTxt(); }

/* ── Translations ───────────────────────────────────────────── */
function loadTranslationsEditor(lang, el) {
  document.querySelectorAll('.trans-lang-btn').forEach(function(b){ b.classList.remove('active'); });
  if (el) el.classList.add('active');
  WEAdmin.setTransLang(lang);
}
function saveTranslations()  { WEAdmin.saveTranslations(); }
function pushTranslations()  { WEAdmin.saveTranslations(); }

/* ── Site Editor ────────────────────────────────────────────── */
function showSEPanel(name, el) {
  // Toggle section buttons
  document.querySelectorAll('.se-section-btn').forEach(function(b){ b.classList.remove('active'); });
  if (el) el.classList.add('active');

  // Show the matching panel
  document.querySelectorAll('.se-panel').forEach(function(p){ p.style.display = 'none'; });
  var panel = document.getElementById('se-panel-' + name);
  if (panel) panel.style.display = 'block';
}

function saveSiteConfig()    { WEAdmin.saveSiteConfig(); }
function pushSiteConfig()    { WEAdmin.saveSiteConfig(); }

function applyColorsLive() {
  var colorMap = {
    'seColor-primary':      '--primary',
    'seColor-primaryDark':  '--primary-dark',
    'seColor-primaryLight': '--primary-light',
    'seColor-gold':         '--gold',
    'seColor-goldLight':    '--gold-light',
    'seColor-green':        '--green',
    'seColor-greenLight':   '--green-light',
    'seColor-bg':           '--bg',
    'seColor-text':         '--text'
  };
  Object.keys(colorMap).forEach(function(id) {
    var el = document.getElementById(id);
    if (el && el.value) document.documentElement.style.setProperty(colorMap[id], el.value);
  });
  WEAdmin.toast('Colors applied (not saved yet — click Save to push).', 'success');
}

/* ── Settings ───────────────────────────────────────────────── */
function saveGitHubSettings() { WEAdmin.saveGithubSettings(); }
function testGitHub()         { WEAdmin.testGitHubConnection(); }
function saveAccessToken()    { WEAdmin.saveAccessToken(); }
function changePassword()     { WEAdmin.changePassword(); }
function saveAIKeys()         { WEAdmin.saveAIKeys(); }

function exportSettings() { WEAdmin.exportData(); }

function exportAnalytics() {
  var visits   = JSON.parse(localStorage.getItem('we_visits')   || '[]');
  var sessions = JSON.parse(localStorage.getItem('we_sessions') || '[]');
  var rows = ['date,path,referrer,lang'];
  visits.forEach(function(v) {
    rows.push([
      new Date(v.ts).toISOString(),
      v.path || '',
      v.referrer || '',
      v.lang || ''
    ].map(function(c){ return '"' + String(c).replace(/"/g,'""') + '"'; }).join(','));
  });
  var blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href   = url;
  a.download = 'analytics-' + new Date().toISOString().split('T')[0] + '.csv';
  a.click();
  URL.revokeObjectURL(url);
  WEAdmin.toast('Analytics exported as CSV.', 'success');
}

function confirmReset() {
  WEAdmin.openModal('Reset all settings', 'This will erase all settings, drafts and analytics from this browser. Are you sure?', function() {
    ['we_github','we_admin_password','we_admin_auth','we_access_token',
     'we_ai_keys','we_brevo','we_drafts','we_visits','we_sessions'].forEach(function(k){
      localStorage.removeItem(k);
    });
    sessionStorage.clear();
    WEAdmin.toast('All data cleared. Reloading…', 'success');
    setTimeout(function(){ window.location.reload(); }, 1500);
  });
}

function closeModal() { WEAdmin.closeModal(); }

/* ── Init: show first SE panel on load ──────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
  // Show first site-editor panel by default
  var firstPanel = document.querySelector('.se-panel');
  if (firstPanel) firstPanel.style.display = 'block';
});
