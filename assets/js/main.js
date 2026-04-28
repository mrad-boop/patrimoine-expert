/* ============================================================
   PATRIMOINE EXPERT — main.js (vanilla JS, pas de dépendances)
   ============================================================ */

(function () {
  'use strict';

  /* ---- Burger menu ---- */
  const burger = document.getElementById('burger');
  const mobileNav = document.getElementById('mobileNav');
  if (burger && mobileNav) {
    burger.addEventListener('click', () => {
      const open = burger.classList.toggle('open');
      mobileNav.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
    });
  }

  /* ---- Dropdown nav (click on touch) ---- */
  document.querySelectorAll('.nav-dropdown > .nav-link').forEach(link => {
    link.addEventListener('click', e => {
      if (window.innerWidth < 768) e.preventDefault();
    });
  });

  /* ============================================================
     COOKIE CONSENT (RGPD)
     ============================================================ */
  const COOKIE_KEY = 'pe_cookie_consent';
  const banner = document.getElementById('cookieBanner');

  function getConsent() {
    try { return localStorage.getItem(COOKIE_KEY); } catch { return null; }
  }
  function setConsent(value) {
    try { localStorage.setItem(COOKIE_KEY, value); } catch {}
  }

  function initAdSense() {
    /*
      ┌─────────────────────────────────────────────────────────┐
      │ ADSENSE INTEGRATION — à activer après approbation       │
      │                                                         │
      │ 1. Remplacez ca-pub-XXXXXXXXXX par votre ID éditeur     │
      │ 2. Décommentez le bloc ci-dessous                       │
      │                                                         │
      │ (function() {                                           │
      │   var s = document.createElement('script');             │
      │   s.src = 'https://pagead2.googlesyndication.com/       │
      │            pagead/js/adsbygoogle.js?client=             │
      │            ca-pub-XXXXXXXXXXXXXXXXXX';                   │
      │   s.async = true;                                       │
      │   s.crossOrigin = 'anonymous';                          │
      │   document.head.appendChild(s);                         │
      │ })();                                                   │
      └─────────────────────────────────────────────────────────┘
    */
    console.info('[AdSense] Consentement accordé — chargement autorisé.');
  }

  function showBanner() {
    if (banner) banner.classList.add('visible');
  }

  function hideBanner() {
    if (banner) banner.classList.remove('visible');
  }

  /* Bouton Tout accepter */
  const btnAccept = document.getElementById('cookieAccept');
  if (btnAccept) {
    btnAccept.addEventListener('click', () => {
      setConsent('all');
      hideBanner();
      initAdSense();
    });
  }

  /* Bouton Refuser */
  const btnRefuse = document.getElementById('cookieRefuse');
  if (btnRefuse) {
    btnRefuse.addEventListener('click', () => {
      setConsent('none');
      hideBanner();
    });
  }

  /* Bouton Personnaliser */
  const btnCustomize = document.getElementById('cookieCustomize');
  if (btnCustomize) {
    btnCustomize.addEventListener('click', () => {
      window.location.href = '/privacy-policy.html#cookies';
    });
  }

  /* Init au chargement */
  const consent = getConsent();
  if (!consent) {
    setTimeout(showBanner, 1200);
  } else if (consent === 'all') {
    initAdSense();
  }

  /* ============================================================
     BARRE DE PROGRESSION DE LECTURE
     ============================================================ */
  const progressBar = document.getElementById('readingProgress');
  if (progressBar) {
    window.addEventListener('scroll', () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;
      progressBar.style.width = pct + '%';
    }, { passive: true });
  }

  /* ---- Back to top ---- */
  (function () {
    const btn = document.getElementById('backToTop');
    if (!btn) return;
    window.addEventListener('scroll', () => {
      btn.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });
    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  })();

  /* ============================================================
     TEMPS DE LECTURE ESTIMÉ
     ============================================================ */
  function estimateReadingTime() {
    const article = document.querySelector('.article-content');
    const badge = document.getElementById('readingTime');
    if (!article || !badge) return;
    const words = article.textContent.trim().split(/\s+/).length;
    const minutes = Math.max(1, Math.ceil(words / 220));
    badge.textContent = minutes + ' min de lecture';
  }
  estimateReadingTime();

  /* ============================================================
     TABLE DES MATIÈRES DYNAMIQUE (surlignage au scroll)
     ============================================================ */
  const tocLinks = document.querySelectorAll('.toc-link');
  if (tocLinks.length) {
    const headings = Array.from(
      document.querySelectorAll('.article-content h2, .article-content h3')
    );

    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY + 120;
      let active = null;
      headings.forEach(h => {
        if (h.offsetTop <= scrollY) active = h;
      });
      tocLinks.forEach(l => l.classList.remove('active'));
      if (active) {
        const link = document.querySelector('.toc-link[href="#' + active.id + '"]');
        if (link) link.classList.add('active');
      }
    }, { passive: true });
  }

  /* ============================================================
     PARTAGE SOCIAL
     ============================================================ */
  function setupShare() {
    const url   = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(document.title);

    document.querySelectorAll('[data-share]').forEach(btn => {
      btn.addEventListener('click', () => {
        const net = btn.dataset.share;
        let shareUrl = '';
        if (net === 'twitter')  shareUrl = 'https://twitter.com/intent/tweet?url=' + url + '&text=' + title;
        if (net === 'linkedin') shareUrl = 'https://www.linkedin.com/sharing/share-offsite/?url=' + url;
        if (net === 'facebook') shareUrl = 'https://www.facebook.com/sharer/sharer.php?u=' + url;
        if (net === 'copy') {
          navigator.clipboard.writeText(decodeURIComponent(url))
            .then(() => { btn.textContent = '✓ Copié !'; setTimeout(() => { btn.textContent = '🔗 Copier'; }, 2000); })
            .catch(() => {});
          return;
        }
        if (shareUrl) window.open(shareUrl, '_blank', 'width=600,height=450,noopener');
      });
    });
  }
  setupShare();

  /* ============================================================
     BANDEAU ANCHOR MOBILE
     ============================================================ */
  const anchorAd = document.getElementById('adAnchor');
  const anchorClose = document.getElementById('adAnchorClose');
  if (anchorAd && anchorClose) {
    anchorClose.addEventListener('click', () => {
      anchorAd.style.display = 'none';
      document.body.style.paddingBottom = '0';
    });
  }

  /* ============================================================
     RECHERCHE (filtre articles côté client)
     ============================================================ */
  const searchInput = document.getElementById('searchInput');
  const searchOverlay = document.getElementById('searchOverlay');
  const searchClose = document.getElementById('searchClose');
  const searchResults = document.getElementById('searchResults');

  const ARTICLES = [
    { title: 'Investir en bourse pour les débutants : le guide complet 2026', url: 'stock-market-beginners-2026.html', cat: 'Placements' },
    { title: 'Assurance-vie : comparatif des meilleurs contrats en ligne', url: 'life-insurance-comparison.html', cat: 'Placements' },
    { title: 'ETF : comment investir sans se ruiner et sans stress', url: 'etf-investing-2026.html', cat: 'Placements' },
    { title: 'Crédit immobilier : négocier son taux comme un pro en 2026', url: 'mortgage-rates-france-2026.html', cat: 'Immobilier' },
    { title: 'Fiscalité des crypto-monnaies : déclaration et optimisations', url: 'crypto-tax-france-2026.html', cat: 'Fiscalité' },
    { title: 'Peut-on encore défiscaliser avec la loi Pinel en 2026 ?', url: 'property-tax-breaks-2026.html', cat: 'Fiscalité' },
    { title: 'PER (Plan d\'Épargne Retraite) : avantages fiscaux et pièges', url: 'per-retirement-plan-2026.html', cat: 'Fiscalité' },
    { title: 'Comment déclarer ses revenus locatifs (micro-foncier vs réel)', url: 'declaring-rental-income-2026.html', cat: 'Immobilier' },
    { title: 'Succession et donation : optimiser la transmission du patrimoine', url: 'inheritance-gifts-france-2026.html', cat: 'Fiscalité' },
    { title: 'Crowdfunding immobilier : rendement, risques et avis complet', url: 'real-estate-crowdfunding-2026.html', cat: 'Immobilier' },
    { title: 'Livret A, LDDS, LEP : le match des livrets réglementés 2026', url: 'livret-a-ldds-lep-2026.html', cat: 'Placements' },
    { title: 'Devenir rentier avec les dividendes : stratégie et portefeuille', url: 'living-off-dividends-2026.html', cat: 'Placements' },
  ];

  function renderResults(query) {
    if (!searchResults) return;
    const q = query.toLowerCase().trim();
    if (q.length < 2) { searchResults.innerHTML = ''; return; }
    const matches = ARTICLES.filter(a => a.title.toLowerCase().includes(q));
    if (!matches.length) {
      searchResults.innerHTML = '<p style="padding:.75rem;color:var(--text-muted);font-size:.875rem;">Aucun résultat trouvé.</p>';
      return;
    }
    searchResults.innerHTML = matches.map(a =>
      `<a href="/${a.url}" class="search-result-item" style="display:block;text-decoration:none;color:var(--text);">
        <span style="font-size:.72rem;text-transform:uppercase;color:var(--text-muted);font-weight:700;">${a.cat}</span>
        <div style="font-weight:600;font-size:.9rem;margin-top:.2rem;color:var(--primary);">${a.title}</div>
      </a>`
    ).join('');
  }

  document.querySelectorAll('[data-open-search]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (searchOverlay) { searchOverlay.classList.add('open'); searchInput && searchInput.focus(); }
    });
  });
  if (searchClose) {
    searchClose.addEventListener('click', () => searchOverlay && searchOverlay.classList.remove('open'));
  }
  if (searchOverlay) {
    searchOverlay.addEventListener('click', e => { if (e.target === searchOverlay) searchOverlay.classList.remove('open'); });
  }
  if (searchInput) {
    searchInput.addEventListener('input', () => renderResults(searchInput.value));
    searchInput.addEventListener('keydown', e => { if (e.key === 'Escape') searchOverlay && searchOverlay.classList.remove('open'); });
  }

  /* ============================================================
     FORMULAIRES — feedback UX simple
     ============================================================ */
  document.querySelectorAll('form[data-feedback]').forEach(form => {
    form.addEventListener('submit', () => {
      const btn = form.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = 'Envoi en cours…'; }
    });
  });

  /* ============================================================
     ANIMATION D'ENTRÉE (IntersectionObserver)
     ============================================================ */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    document.querySelectorAll('.card, .section-header').forEach(el => io.observe(el));
  }

  /* ============================================================
     SMOOTH ANCHOR SCROLL
     ============================================================ */
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const id = link.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (target) {
        e.preventDefault();
        window.scrollTo({ top: target.offsetTop - 80, behavior: 'smooth' });
      }
    });
  });

  /* ============================================================
     LAZY LOADING images (fallback JS pour navigateurs anciens)
     ============================================================ */
  if ('loading' in HTMLImageElement.prototype) {
    document.querySelectorAll('img[data-src]').forEach(img => {
      img.src = img.dataset.src;
    });
  } else if ('IntersectionObserver' in window) {
    const imgIO = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          imgIO.unobserve(img);
        }
      });
    });
    document.querySelectorAll('img[data-src]').forEach(img => imgIO.observe(img));
  }

})();
