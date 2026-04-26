/* ============================================================
   WEALTH EXPERT — site-config.js
   Loads site-config.json and applies settings to DOM/CSS
   ============================================================ */
(function () {
  'use strict';

  var _config = null;

  function getDepthPrefix() {
    var depth = (window.location.pathname.match(/\//g) || []).length - 1;
    return depth > 0 ? '../'.repeat(depth) : '';
  }

  async function loadConfig() {
    try {
      var r = await fetch(getDepthPrefix() + 'site-config.json?t=' + Date.now());
      if (!r.ok) throw new Error('HTTP ' + r.status);
      _config = await r.json();
    } catch (e) {
      console.warn('[site-config] Could not load config:', e.message);
      _config = {};
    }
    return _config;
  }

  function applyColors(colors) {
    if (!colors) return;
    var root = document.documentElement;
    var map = {
      primary: '--primary',
      primaryDark: '--primary-dark',
      primaryLight: '--primary-light',
      gold: '--gold',
      goldLight: '--gold-light',
      green: '--green',
      greenLight: '--green-light',
      bg: '--bg',
      text: '--text'
    };
    Object.keys(map).forEach(function (key) {
      if (colors[key]) root.style.setProperty(map[key], colors[key]);
    });
  }

  function applyBrand(brand) {
    if (!brand) return;
    // Logo text
    document.querySelectorAll('.logo-brand-name').forEach(function (el) {
      el.textContent = brand.name || 'Wealth Expert';
    });
    document.querySelectorAll('.logo-icon').forEach(function (el) {
      el.textContent = brand.logoIcon || '₿';
    });
    // Page title (only on home page — articles have their own titles)
    if (document.body.classList.contains('page-home')) {
      document.title = (brand.name || 'Wealth Expert') + ' — ' + (brand.tagline || 'Smart wealth management');
    }
    // Meta og:site_name
    var ogSite = document.querySelector('meta[property="og:site_name"]');
    if (ogSite) ogSite.setAttribute('content', brand.name || 'Wealth Expert');
    // Schema.org Organization name
    document.querySelectorAll('script[type="application/ld+json"]').forEach(function (s) {
      try {
        var data = JSON.parse(s.textContent);
        if (data['@type'] === 'Organization' || data['@type'] === 'WebSite') {
          data.name = brand.name || 'Wealth Expert';
          if (brand.domain) data.url = brand.domain;
          s.textContent = JSON.stringify(data, null, 2);
        }
      } catch (e) {}
    });
  }

  function applyHero(hero) {
    if (!hero) return;
    var el;
    el = document.getElementById('heroBadge');
    if (el && hero.badge) el.textContent = hero.badge;

    if (hero.stat1) {
      el = document.getElementById('heroStat1Num'); if (el) el.textContent = hero.stat1.num;
      el = document.getElementById('heroStat1Label'); if (el) el.textContent = hero.stat1.label;
    }
    if (hero.stat2) {
      el = document.getElementById('heroStat2Num'); if (el) el.textContent = hero.stat2.num;
      el = document.getElementById('heroStat2Label'); if (el) el.textContent = hero.stat2.label;
    }
    if (hero.stat3) {
      el = document.getElementById('heroStat3Num'); if (el) el.textContent = hero.stat3.num;
      el = document.getElementById('heroStat3Label'); if (el) el.textContent = hero.stat3.label;
    }
  }

  function applyStatsBand(statsBand) {
    if (!Array.isArray(statsBand)) return;
    var items = document.querySelectorAll('.stat-item');
    statsBand.forEach(function (stat, i) {
      if (items[i]) {
        var num = items[i].querySelector('.stat-num');
        var label = items[i].querySelector('.stat-label');
        if (num) num.textContent = stat.num;
        if (label) label.textContent = stat.label;
      }
    });
  }

  function applyNewsletter(nl) {
    if (!nl) return;
    var subEl = document.getElementById('nlSubscribers');
    if (subEl && nl.subscribers) subEl.textContent = nl.subscribers;

    // Update formspree action
    if (nl.formspreeId && nl.formspreeId !== 'VOTRE_FORMSPREE_ID') {
      document.querySelectorAll('form[action*="formspree"]').forEach(function (f) {
        f.action = 'https://formspree.io/f/' + nl.formspreeId;
      });
    }
  }

  function applyAds(ads) {
    if (!ads) return;
    if (ads.adsenseId && ads.enabled) {
      // Inject AdSense script if user has given consent
      var consent = localStorage.getItem('pe_cookie_consent');
      if (consent === 'all') {
        var s = document.createElement('script');
        s.async = true;
        s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + ads.adsenseId;
        s.crossOrigin = 'anonymous';
        document.head.appendChild(s);
      }
    }
  }

  function applyAnalytics(analytics) {
    if (!analytics || !analytics.ga4) return;
    var s1 = document.createElement('script');
    s1.async = true;
    s1.src = 'https://www.googletagmanager.com/gtag/js?id=' + analytics.ga4;
    document.head.appendChild(s1);
    var s2 = document.createElement('script');
    s2.textContent = 'window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js",new Date());gtag("config","' + analytics.ga4 + '");';
    document.head.appendChild(s2);
  }

  function applyAuthor(author) {
    if (!author) return;
    document.querySelectorAll('.author-name-val').forEach(function (el) {
      el.textContent = author.name || '';
    });
    document.querySelectorAll('.author-title-val').forEach(function (el) {
      el.textContent = author.title || '';
    });
    document.querySelectorAll('.author-avatar-val').forEach(function (el) {
      el.textContent = author.avatar || '👨‍💼';
    });
  }

  function applySocial(social) {
    if (!social) return;
    var links = { twitter: '.social-link-twitter', linkedin: '.social-link-linkedin', facebook: '.social-link-facebook', instagram: '.social-link-instagram' };
    Object.keys(links).forEach(function (platform) {
      if (social[platform]) {
        document.querySelectorAll(links[platform]).forEach(function (el) {
          el.href = social[platform];
          el.style.display = '';
        });
      } else {
        document.querySelectorAll(links[platform]).forEach(function (el) {
          el.style.display = 'none';
        });
      }
    });
  }

  async function init() {
    var cfg = await loadConfig();
    if (!cfg || Object.keys(cfg).length === 0) return;

    applyColors(cfg.colors);
    applyBrand(cfg.brand);
    applyHero(cfg.hero);
    applyStatsBand(cfg.statsBand);
    applyNewsletter(cfg.newsletter);
    applyAds(cfg.ads);
    applyAnalytics(cfg.analytics);
    applyAuthor(cfg.author);
    if (cfg.brand) applySocial(cfg.brand.social);

    // Expose config globally for other scripts
    window.WEConfig = cfg;
    document.dispatchEvent(new CustomEvent('siteconfig:ready', { detail: cfg }));
  }

  // Public API
  window.WESiteConfig = {
    get: function () { return _config; },
    reload: init
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
