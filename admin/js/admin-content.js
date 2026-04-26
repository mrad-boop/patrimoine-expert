/* ============================================================
   ADMIN CONTENT — admin-content.js
   AI Generator · Newsletter · SEO
   ============================================================ */
(function () {
  'use strict';

  /* ── AI Generator ──────────────────────────────────────── */
  var _aiAbortCtrl = null;

  function getAIKeys() {
    return JSON.parse(localStorage.getItem('we_ai_keys') || '{}');
  }

  function buildSystemPrompt(opts) {
    return [
      'You are an expert personal finance writer for ' + ((window.WEConfig && window.WEConfig.brand && window.WEConfig.brand.name) || 'Smart Wealth Blog') + '.',
      'Write in ' + (opts.lang === 'fr' ? 'French' : opts.lang === 'ar' ? 'Arabic' : opts.lang === 'es' ? 'Spanish' : opts.lang === 'de' ? 'German' : 'English') + '.',
      '',
      '## SEO Requirements',
      '- Target keyword: "' + (opts.keyword || opts.topic) + '"',
      '- Include keyword in H1, first paragraph, at least two H2s, meta description',
      '- Use semantic HTML: <h2>, <h3>, <ul>, <ol>, <table>, <strong>',
      '- Internal link opportunities: use placeholder <a href="#">related article</a>',
      '- Aim for ' + (opts.length === 'short' ? '800–1200' : opts.length === 'long' ? '2500–3500' : '1500–2500') + ' words',
      '',
      '## Google AdSense Policy — MANDATORY',
      '- Do NOT promote: get-rich-quick schemes, guaranteed returns, unrealistic profit claims',
      '- Do NOT include: explicit leverage/margin trading instructions, unregulated crypto promotions',
      '- Always include balanced risk warnings',
      '- Use hedged language: "may", "historically", "past performance is not indicative of future results"',
      '- Recommend consulting a qualified financial advisor for major decisions',
      '',
      '## Content Requirements',
      '- Tone: ' + (opts.tone || 'professional, educational'),
      '- Target audience: ' + (opts.audience || 'investors aged 25–45'),
      '- Category: ' + (opts.category || 'investments'),
      opts.seoChecked  ? '- Include: FAQ section with schema-ready Q&A markup' : '',
      opts.adsChecked  ? '- Ensure full AdSense policy compliance — no prohibited content' : '',
      '',
      '## Output Format',
      'Return ONLY the article body HTML (no <html>, <head>, <body> tags).',
      'Start directly with an engaging <h2> or introductory paragraph after the H1 (which will be added separately).',
      'Use proper HTML: <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <table>, <blockquote>.',
      'End with a conclusion section and a disclaimer paragraph wrapped in <div class="disclaimer-box">.</div>',
    ].filter(function(l){ return l !== undefined; }).join('\n');
  }

  async function generateWithAnthropic(opts) {
    var keys   = getAIKeys();
    var apiKey = (document.getElementById('aiApiKey') || {}).value || keys.anthropic || '';
    if (!apiKey) throw new Error('Anthropic API key required. Enter it above or save in Settings.');

    var model = (document.getElementById('aiModel') || {}).value || 'claude-opus-4-7';

    var body = {
      model:      model,
      max_tokens: 4096,
      system:     buildSystemPrompt(opts),
      messages: [{
        role: 'user',
        content: 'Write a comprehensive article about: ' + opts.topic
          + (opts.keywords ? '\nAdditional keywords to include: ' + opts.keywords : '')
          + '\n\nRemember: AdSense-safe, no guaranteed returns, balanced risk information.'
      }]
    };

    _aiAbortCtrl = new AbortController();
    var res = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      signal:  _aiAbortCtrl.signal,
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      var err = await res.json().catch(function(){ return {}; });
      throw new Error(err.error ? err.error.message : 'Anthropic API error ' + res.status);
    }
    var data = await res.json();
    return data.content && data.content[0] ? data.content[0].text : '';
  }

  async function generateWithOpenAI(opts) {
    var keys   = getAIKeys();
    var apiKey = (document.getElementById('aiApiKey') || {}).value || keys.openai || '';
    if (!apiKey) throw new Error('OpenAI API key required. Enter it above or save in Settings.');

    var model = (document.getElementById('aiModel') || {}).value || 'gpt-4o';

    var body = {
      model:      model,
      max_tokens: 4096,
      messages: [
        { role: 'system', content: buildSystemPrompt(opts) },
        { role: 'user',   content: 'Write a comprehensive article about: ' + opts.topic
          + (opts.keywords ? '\nAdditional keywords to include: ' + opts.keywords : '')
          + '\n\nRemember: AdSense-safe, no guaranteed returns, balanced risk information.' }
      ]
    };

    _aiAbortCtrl = new AbortController();
    var res = await fetch('https://api.openai.com/v1/chat/completions', {
      method:  'POST',
      signal:  _aiAbortCtrl.signal,
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      var err = await res.json().catch(function(){ return {}; });
      throw new Error(err.error ? err.error.message : 'OpenAI API error ' + res.status);
    }
    var data = await res.json();
    return data.choices && data.choices[0] ? data.choices[0].message.content : '';
  }

  async function runAIGenerate() {
    var btn        = document.getElementById('btnGenerate');
    var stopBtn    = document.getElementById('btnStopGenerate');
    var output     = document.getElementById('aiOutput');
    var preview    = document.getElementById('aiPreview');
    var spinner    = document.getElementById('aiSpinner');

    var provider = (document.getElementById('aiProvider') || {}).value || 'anthropic';
    var opts = {
      topic:      ((document.getElementById('aiTopic')    || {}).value || '').trim(),
      category:   ((document.getElementById('aiCategory') || {}).value || 'investments'),
      lang:       ((document.getElementById('aiLang')     || {}).value || 'en'),
      tone:       ((document.getElementById('aiTone')     || {}).value || 'professional'),
      length:     ((document.getElementById('aiLength')   || {}).value || 'medium'),
      keywords:   ((document.getElementById('aiKeywords') || {}).value || '').trim(),
      audience:   ((document.getElementById('aiAudience') || {}).value || '').trim(),
      keyword:    ((document.getElementById('aiKeywords') || {}).value || '').split(',')[0].trim(),
      seoChecked: (document.getElementById('aiSEO')     || {}).checked,
      adsChecked: (document.getElementById('aiAdSense') || {}).checked
    };

    if (!opts.topic) { WEAdmin.toast('Enter a topic first.', 'error'); return; }

    if (btn)     { btn.disabled = true; btn.style.display = 'none'; }
    if (stopBtn) stopBtn.style.display = 'inline-flex';
    if (spinner) spinner.style.display = 'flex';
    if (output)  output.textContent = '';
    if (preview) preview.innerHTML  = '';

    try {
      var content = provider === 'openai'
        ? await generateWithOpenAI(opts)
        : await generateWithAnthropic(opts);

      if (output)  output.textContent = content;
      if (preview) preview.innerHTML  = content;
      WEAdmin.toast('Article generated!', 'success');

      // Auto-fill editor
      var slug = WEAdmin ? (function(s){ return s.toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''); })(opts.topic) : opts.topic;
      document.getElementById('aiUseContent') && (document.getElementById('aiUseContent').dataset.content = content);
      document.getElementById('aiUseContent') && (document.getElementById('aiUseContent').dataset.topic   = opts.topic);
      document.getElementById('aiUseContent') && (document.getElementById('aiUseContent').dataset.cat     = opts.category);
      document.getElementById('aiUseContent') && (document.getElementById('aiUseContent').dataset.lang    = opts.lang);

    } catch (e) {
      if (e.name === 'AbortError') {
        WEAdmin.toast('Generation stopped.', 'success');
      } else {
        WEAdmin.toast(e.message, 'error');
        if (output) output.textContent = 'Error: ' + e.message;
      }
    } finally {
      if (btn)     { btn.disabled = false; btn.style.display = 'inline-flex'; }
      if (stopBtn) stopBtn.style.display = 'none';
      if (spinner) spinner.style.display = 'none';
    }
  }

  function stopAIGenerate() {
    if (_aiAbortCtrl) { _aiAbortCtrl.abort(); _aiAbortCtrl = null; }
  }

  function useGeneratedContent() {
    var btn = document.getElementById('aiUseContent');
    if (!btn) return;
    var content  = btn.dataset.content || '';
    var topic    = btn.dataset.topic   || '';
    var category = btn.dataset.cat     || 'investments';
    var lang     = btn.dataset.lang    || 'en';
    if (!content) { WEAdmin.toast('Generate content first.', 'error'); return; }

    WEAdmin.editArticle && WEAdmin.editArticle('__new__');

    function slugify(t) { return t.toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''); }
    function set(id, val) { var el = document.getElementById(id); if (el) el.value = val; }

    set('edTitle',    topic);
    set('edSlug',     slugify(topic));
    set('edCategory', category);
    set('edLang',     lang);
    set('edContent',  content);

    var slugEl = document.getElementById('edSlug');
    if (slugEl) slugEl.dataset.manual = '1';

    WEAdmin.showView('editor');
    WEAdmin.toast('Content loaded into editor.', 'success');
  }

  function copyAIOutput() {
    var out = document.getElementById('aiOutput');
    if (!out || !out.textContent) { WEAdmin.toast('Nothing to copy.', 'error'); return; }
    navigator.clipboard.writeText(out.textContent).then(function() {
      WEAdmin.toast('Copied to clipboard!', 'success');
    });
  }

  function updateAIModels() {
    var provider = (document.getElementById('aiProvider') || {}).value;
    var modelSel = document.getElementById('aiModel');
    if (!modelSel) return;
    modelSel.innerHTML = '';
    var models = provider === 'openai'
      ? [['gpt-4o','GPT-4o (recommended)'],['gpt-4o-mini','GPT-4o Mini'],['gpt-4-turbo','GPT-4 Turbo']]
      : [['claude-opus-4-7','Claude Opus 4.7 (best)'],['claude-sonnet-4-6','Claude Sonnet 4.6'],['claude-haiku-4-5-20251001','Claude Haiku 4.5']];
    models.forEach(function(m) {
      var opt = document.createElement('option');
      opt.value = m[0]; opt.textContent = m[1];
      modelSel.appendChild(opt);
    });
  }

  window.WEAdmin.runAIGenerate       = runAIGenerate;
  window.WEAdmin.stopAIGenerate      = stopAIGenerate;
  window.WEAdmin.useGeneratedContent = useGeneratedContent;
  window.WEAdmin.copyAIOutput        = copyAIOutput;
  window.WEAdmin.updateAIModels      = updateAIModels;

  /* ── Newsletter (Brevo) ────────────────────────────────── */
  function saveBrevoConfig() {
    var key    = ((document.getElementById('brevoKey')    || {}).value || '').trim();
    var listId = ((document.getElementById('brevoListId') || {}).value || '').trim();
    var senderEmail = ((document.getElementById('brevoSender') || {}).value || '').trim();
    var senderName  = ((document.getElementById('brevoSenderName') || {}).value || '').trim();
    if (!key) { WEAdmin.toast('Brevo API key required.', 'error'); return; }
    localStorage.setItem('we_brevo', JSON.stringify({ key, listId, senderEmail, senderName }));
    WEAdmin.toast('Brevo config saved.', 'success');
  }

  function loadBrevoConfig() {
    try {
      var cfg = JSON.parse(localStorage.getItem('we_brevo') || '{}');
      function fill(id, val) { var el = document.getElementById(id); if (el && val) el.value = val; }
      fill('brevoKey',        cfg.key);
      fill('brevoListId',     cfg.listId);
      fill('brevoSender',     cfg.senderEmail);
      fill('brevoSenderName', cfg.senderName);
    } catch(e){}
  }

  function generateNewsletterHTML() {
    var subject = ((document.getElementById('nlSubject') || {}).value || '').trim();
    var intro   = ((document.getElementById('nlIntro')   || {}).value || '').trim();
    var articlesRaw = ((document.getElementById('nlArticles') || {}).value || '').trim();
    var siteName = (window.WEConfig && window.WEConfig.brand && window.WEConfig.brand.name) || 'Smart Wealth Blog';
    var domain   = (window.WEConfig && window.WEConfig.brand && window.WEConfig.brand.domain) || 'https://smartwealthblog.com';
    var primary  = '#1B3A6B';
    var gold     = '#C9A84C';

    var articleLinks = articlesRaw ? articlesRaw.split('\n').filter(Boolean).map(function(line) {
      var parts = line.split('|');
      var title = (parts[0] || '').trim();
      var url   = (parts[1] || domain).trim();
      return '<tr><td style="padding:8px 0"><a href="' + url + '" style="color:' + gold + ';text-decoration:none;font-weight:600">→ ' + title + '</a></td></tr>';
    }).join('') : '';

    var html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:30px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:600px">

  <!-- Header -->
  <tr><td style="background:${primary};padding:30px 40px;text-align:center">
    <h1 style="margin:0;color:#ffffff;font-size:24px">💰 ${siteName}</h1>
    <p style="margin:8px 0 0;color:rgba(255,255,255,.7);font-size:14px">${subject || 'Your weekly wealth digest'}</p>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:40px">
    ${intro ? '<p style="color:#333;line-height:1.7;margin:0 0 24px">' + intro + '</p>' : ''}
    ${articleLinks ? '<table width="100%" style="margin:24px 0">' + articleLinks + '</table>' : ''}
    <p style="color:#888;font-size:13px;line-height:1.6">
      These insights are for informational purposes only and do not constitute investment advice.
      Past performance does not guarantee future results.
    </p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f9f9f9;padding:24px 40px;border-top:1px solid #eee;text-align:center">
    <p style="margin:0;color:#999;font-size:12px">
      You're receiving this because you subscribed on <a href="${domain}" style="color:${primary}">${domain}</a>.<br>
      <a href="{{unsubscribe}}" style="color:#999">Unsubscribe</a>
    </p>
  </td></tr>

</table>
</td></tr></table>
</body>
</html>`;

    var out = document.getElementById('nlHtmlOutput');
    if (out) {
      out.value = html;
      out.style.display = 'block';
    }
    WEAdmin.toast('Newsletter HTML generated!', 'success');
  }

  async function sendBrevoNewsletter() {
    var cfg = JSON.parse(localStorage.getItem('we_brevo') || '{}');
    if (!cfg.key)         { WEAdmin.toast('Configure Brevo API key first.', 'error'); return; }
    if (!cfg.senderEmail) { WEAdmin.toast('Configure sender email first.', 'error'); return; }

    var subject = ((document.getElementById('nlSubject')   || {}).value || '').trim();
    var html    = ((document.getElementById('nlHtmlOutput') || {}).value || '').trim();
    if (!subject) { WEAdmin.toast('Subject required.', 'error'); return; }
    if (!html)    { WEAdmin.toast('Generate HTML first.', 'error'); return; }

    var btn = document.getElementById('btnSendNewsletter');
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

    try {
      var body = {
        name:    subject,
        subject: subject,
        htmlContent: html,
        sender:  { email: cfg.senderEmail, name: cfg.senderName || 'Smart Wealth Blog' },
        recipients: cfg.listId ? { listIds: [parseInt(cfg.listId)] } : undefined,
        scheduledAt: new Date(Date.now() + 60000).toISOString() // 1 min from now
      };

      var res = await fetch('https://api.brevo.com/v3/emailCampaigns', {
        method:  'POST',
        headers: { 'api-key': cfg.key, 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body:    JSON.stringify(body)
      });

      if (!res.ok) {
        var err = await res.json().catch(function(){ return {}; });
        throw new Error(err.message || 'Brevo error ' + res.status);
      }

      WEAdmin.toast('Campaign created in Brevo!', 'success');
    } catch (e) {
      WEAdmin.toast(e.message, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '📤 Send Campaign'; }
    }
  }

  window.WEAdmin.saveBrevoConfig         = saveBrevoConfig;
  window.WEAdmin.loadBrevoConfig         = loadBrevoConfig;
  window.WEAdmin.generateNewsletterHTML  = generateNewsletterHTML;
  window.WEAdmin.sendBrevoNewsletter     = sendBrevoNewsletter;

  /* ── SEO ───────────────────────────────────────────────── */
  async function regenerateSitemap() {
    var btn = document.getElementById('btnSitemap');
    if (btn) { btn.disabled = true; btn.textContent = 'Generating…'; }
    try {
      var manifest = await WEAdmin.loadManifest();
      var cfg    = window.WEConfig || {};
      var domain = (cfg.brand && cfg.brand.domain) || 'https://smartwealthblog.com';
      var today  = new Date().toISOString().split('T')[0];
      var langs  = ['en','fr','ar','es','de'];

      var urls = [];

      // Home page
      urls.push({ loc: domain + '/', priority: '1.0', changefreq: 'weekly', date: today });
      langs.forEach(function(l) {
        if (l !== 'en') urls.push({ loc: domain + '/?lang=' + l, priority: '0.8', changefreq: 'weekly', date: today });
      });

      // Articles
      manifest.forEach(function(a) {
        var loc = domain + '/articles/' + a.slug + '.html';
        urls.push({ loc: loc, priority: '0.9', changefreq: 'monthly', date: a.date || today });
      });

      // Static pages
      ['about','contact','legal','privacy'].forEach(function(p) {
        urls.push({ loc: domain + '/' + p + '.html', priority: '0.5', changefreq: 'yearly', date: today });
      });

      var xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
        + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n'
        + '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
        + urls.map(function(u) {
            return '  <url>\n'
              + '    <loc>' + u.loc + '</loc>\n'
              + '    <lastmod>' + u.date + '</lastmod>\n'
              + '    <changefreq>' + u.changefreq + '</changefreq>\n'
              + '    <priority>' + u.priority + '</priority>\n'
              + '  </url>';
          }).join('\n')
        + '\n</urlset>';

      await WEAdmin.pushFile('sitemap.xml', xml, 'Regenerate sitemap');
      WEAdmin.toast('sitemap.xml updated!', 'success');

      var out = document.getElementById('sitemapOutput');
      if (out) out.value = xml;

    } catch (e) {
      WEAdmin.toast(e.message, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '🗺️ Regenerate Sitemap'; }
    }
  }

  async function saveRobotsTxt() {
    var ta = document.getElementById('robotsTxtEditor');
    if (!ta) return;
    var btn = document.getElementById('btnSaveRobots');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    try {
      await WEAdmin.pushFile('robots.txt', ta.value, 'Update robots.txt');
      WEAdmin.toast('robots.txt saved!', 'success');
    } catch (e) {
      WEAdmin.toast(e.message, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '💾 Save robots.txt'; }
    }
  }

  async function loadRobotsTxt() {
    var ta = document.getElementById('robotsTxtEditor');
    if (!ta) return;
    try {
      var data = await WEAdmin.ghRequest('/contents/robots.txt');
      ta.value = decodeURIComponent(escape(atob(data.content.replace(/\n/g,''))));
    } catch(e) {
      var domain = (window.WEConfig && window.WEConfig.brand && window.WEConfig.brand.domain) || 'https://smartwealthblog.com';
      ta.value = 'User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: ' + domain + '/sitemap.xml\n';
    }
  }

  async function runSEOAudit() {
    var out = document.getElementById('seoAuditOutput');
    if (!out) return;
    out.innerHTML = '<div style="color:rgba(255,255,255,.5)">Running audit…</div>';
    try {
      var manifest = await WEAdmin.loadManifest();
      var issues   = [];
      var passed   = [];

      manifest.forEach(function(a) {
        if (!a.metaDesc)           issues.push('❌ Missing meta description: ' + a.slug);
        else if (a.metaDesc.length < 120) issues.push('⚠️ Short meta desc (' + a.metaDesc.length + ' chars): ' + a.slug);
        else passed.push('✅ Meta desc OK: ' + a.slug);

        if (!a.tags || !a.tags.trim()) issues.push('⚠️ No tags: ' + a.slug);
        if (!a.readTime)           issues.push('⚠️ Missing read time: ' + a.slug);
        if (!a.emoji)              issues.push('ℹ️ No emoji for card: ' + a.slug);
      });

      if (!manifest.length) issues.push('⚠️ No articles in manifest yet.');

      var html = '';
      if (issues.length) {
        html += '<h4 style="color:#ff6b6b;margin:0 0 .5rem">Issues (' + issues.length + ')</h4>'
          + '<ul style="margin:0 0 1rem;padding-left:1.2rem;color:rgba(255,255,255,.8)">'
          + issues.map(function(i){ return '<li style="margin:.25rem 0">' + i + '</li>'; }).join('')
          + '</ul>';
      }
      if (passed.length) {
        html += '<h4 style="color:#2D9B6F;margin:0 0 .5rem">Passed (' + passed.length + ')</h4>'
          + '<ul style="margin:0;padding-left:1.2rem;color:rgba(255,255,255,.6)">'
          + passed.slice(0, 10).map(function(i){ return '<li style="margin:.25rem 0">' + i + '</li>'; }).join('')
          + (passed.length > 10 ? '<li style="color:rgba(255,255,255,.4)">…and ' + (passed.length-10) + ' more</li>' : '')
          + '</ul>';
      }
      out.innerHTML = html || '<div style="color:#2D9B6F">No issues found!</div>';
    } catch (e) {
      out.innerHTML = '<div style="color:#ff6b6b">Error: ' + e.message + '</div>';
    }
  }

  window.WEAdmin.regenerateSitemap = regenerateSitemap;
  window.WEAdmin.saveRobotsTxt     = saveRobotsTxt;
  window.WEAdmin.loadRobotsTxt     = loadRobotsTxt;
  window.WEAdmin.runSEOAudit       = runSEOAudit;

  /* ── Wire up events when DOM is ready ──────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    // AI provider change → update model list
    var providerSel = document.getElementById('aiProvider');
    if (providerSel) {
      providerSel.addEventListener('change', updateAIModels);
      updateAIModels(); // init
    }

    // AI buttons
    var btnGen   = document.getElementById('btnGenerate');
    var btnStop  = document.getElementById('btnStopGenerate');
    var btnUse   = document.getElementById('aiUseContent');
    var btnCopy  = document.getElementById('btnCopyAI');
    if (btnGen)  btnGen.addEventListener('click',  runAIGenerate);
    if (btnStop) btnStop.addEventListener('click', stopAIGenerate);
    if (btnUse)  btnUse.addEventListener('click',  useGeneratedContent);
    if (btnCopy) btnCopy.addEventListener('click', copyAIOutput);

    // Newsletter buttons
    var btnBrevoSave = document.getElementById('btnSaveBrevo');
    var btnNlGen     = document.getElementById('btnGenerateNL');
    var btnNlSend    = document.getElementById('btnSendNewsletter');
    if (btnBrevoSave) btnBrevoSave.addEventListener('click', saveBrevoConfig);
    if (btnNlGen)     btnNlGen.addEventListener('click',     generateNewsletterHTML);
    if (btnNlSend)    btnNlSend.addEventListener('click',    sendBrevoNewsletter);
    loadBrevoConfig();

    // SEO buttons
    var btnSitemap   = document.getElementById('btnSitemap');
    var btnRobots    = document.getElementById('btnSaveRobots');
    var btnAudit     = document.getElementById('btnSEOAudit');
    var btnLoadRob   = document.getElementById('btnLoadRobots');
    if (btnSitemap) btnSitemap.addEventListener('click', regenerateSitemap);
    if (btnRobots)  btnRobots.addEventListener('click',  saveRobotsTxt);
    if (btnAudit)   btnAudit.addEventListener('click',   runSEOAudit);
    if (btnLoadRob) btnLoadRob.addEventListener('click', loadRobotsTxt);
  });

})();
