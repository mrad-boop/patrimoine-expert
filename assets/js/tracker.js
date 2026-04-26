/* ============================================================
   TRACKER — tracker.js
   Privacy-friendly visit tracker. No cookies. localStorage only.
   Writes to we_visits + we_sessions (read by admin dashboard).
   ============================================================ */
(function () {
  'use strict';

  var VISIT_KEY   = 'we_visits';
  var SESSION_KEY = 'we_sessions';
  var MAX_VISITS  = 5000;  // cap to avoid bloat

  function ls(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; } catch(e) { return []; }
  }

  function lsSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {} // quota guard
  }

  function getPath() {
    var p = window.location.pathname;
    // Normalize: strip trailing /index.html
    return p.replace(/\/index\.html$/, '/') || '/';
  }

  function getReferrer() {
    var ref = document.referrer;
    if (!ref) return '';
    try {
      var host = new URL(ref).hostname;
      // Internal referrers (same site) are not useful as traffic sources
      if (host === window.location.hostname) return '';
      return ref;
    } catch(e) { return ref; }
  }

  function getLang() {
    return localStorage.getItem('we_lang') || navigator.language || 'en';
  }

  /* ── Record page visit ─────────────────────────────────── */
  function recordVisit() {
    var visits = ls(VISIT_KEY);
    visits.push({
      ts:       Date.now(),
      path:     getPath(),
      referrer: getReferrer(),
      lang:     getLang(),
      ua:       navigator.userAgent.substring(0, 80) // truncated
    });
    // Rolling cap
    if (visits.length > MAX_VISITS) visits = visits.slice(-MAX_VISITS);
    lsSet(VISIT_KEY, visits);
  }

  /* ── Session tracking ──────────────────────────────────── */
  var SESSION_TIMEOUT = 30 * 60 * 1000; // 30 min inactivity = new session
  var _sessionStart   = Date.now();
  var _lastActivity   = Date.now();
  var _sessionId      = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

  function updateActivity() {
    _lastActivity = Date.now();
  }

  function closeSession() {
    var duration = Math.round((_lastActivity - _sessionStart) / 1000); // seconds
    if (duration < 2) return; // skip bounces under 2s

    var sessions = ls(SESSION_KEY);
    sessions.push({
      id:       _sessionId,
      ts:       _sessionStart,
      duration: duration,
      pages:    _pagesViewed,
      lang:     getLang()
    });
    if (sessions.length > 2000) sessions = sessions.slice(-2000);
    lsSet(SESSION_KEY, sessions);
  }

  var _pagesViewed = 1;

  // SPA-style navigation (for future use)
  window.addEventListener('popstate', function() {
    _pagesViewed++;
    recordVisit();
  });

  ['click','scroll','keydown','touchstart'].forEach(function(evt) {
    document.addEventListener(evt, updateActivity, { passive: true });
  });

  // Save session on page unload (best-effort)
  window.addEventListener('pagehide',  closeSession);
  window.addEventListener('beforeunload', closeSession);

  // Also close stale session periodically
  setInterval(function() {
    if (Date.now() - _lastActivity > SESSION_TIMEOUT) {
      closeSession();
      // Reset for new session
      _sessionStart = Date.now();
      _lastActivity = Date.now();
      _sessionId    = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
      _pagesViewed  = 1;
    }
  }, 60000);

  /* ── Run ───────────────────────────────────────────────── */
  // Don't track admin pages
  if (window.location.pathname.indexOf('/admin') === -1) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', recordVisit);
    } else {
      recordVisit();
    }
  }

})();
