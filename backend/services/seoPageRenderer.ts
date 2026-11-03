import type { PublicService } from './publicCatalogService.ts';

/**
 * Server-side SEO shell for /services/:slug.
 *
 * React replaces #root as soon as the bundle loads, so this HTML only needs to
 * be good enough for crawlers, social previews and no-JS visitors. Keeping it
 * independent from the React tree means the public page can ship without a
 * full SSR migration.
 */

type Lang = 'en' | 'hi';

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function inr(value: number): string {
  return `₹${Math.max(0, Math.round(value)).toLocaleString('en-IN')}`;
}

function feeLabel(service: PublicService): string {
  if (!service.fees.totalMin && !service.fees.totalMax) return 'Fee on request';
  if (service.fees.totalMin === service.fees.totalMax) return inr(service.fees.totalMin);
  return `${inr(service.fees.totalMin)} – ${inr(service.fees.totalMax)}`;
}

function serviceTitle(service: PublicService, lang: Lang): string {
  return lang === 'hi'
    ? `${service.name} ऑनलाइन आवेदन — फीस, दस्तावेज़ और प्रक्रिया`
    : `${service.name} Apply Online — Fees, Documents & Process`;
}

function serviceDescription(service: PublicService, lang: Lang): string {
  if (lang === 'hi') {
    return `${service.name} के लिए ऑनलाइन आवेदन करें। सरकारी शुल्क, ज़रूरी दस्तावेज़, प्रक्रिया और सत्यापित जन सेवा केंद्र की जानकारी देखें।`;
  }
  return `Apply online for ${service.name}. Check the government fee, required documents, processing steps and verified Jan Seva Kendra operators before submitting your request.`;
}

function scopeLabel(scope: PublicService['scope'], lang: Lang): string {
  if (scope === 'online_form') return lang === 'hi' ? 'ऑनलाइन फॉर्म' : 'Online form';
  if (scope === 'district') return lang === 'hi' ? 'शहर / जिला स्तर' : 'City / district level';
  return lang === 'hi' ? 'पूरे भारत में उपलब्ध' : 'Available across India';
}

function renderFaqs(service: PublicService, lang: Lang): string {
  return service.faqs.map(faq => `
    <details class="seo-faq">
      <summary>${escapeHtml(lang === 'hi' ? faq.qHi : faq.q)}</summary>
      <p>${escapeHtml(lang === 'hi' ? faq.aHi : faq.a)}</p>
    </details>`).join('');
}

function renderRequirements(service: PublicService, lang: Lang): string {
  const requirements = service.requirements.length > 0
    ? service.requirements
    : (lang === 'hi'
      ? ['आधार कार्ड', 'पासपोर्ट साइज़ फोटो', 'मोबाइल नंबर', 'संबंधित दस्तावेज़']
      : ['Aadhaar Card', 'Passport size photo', 'Mobile number', 'Supporting documents']);
  return requirements.map(item => `<li>${escapeHtml(item)}</li>`).join('');
}

function renderOperators(service: PublicService, lang: Lang): string {
  if (service.operators.length === 0) {
    return `<p class="seo-muted">${escapeHtml(lang === 'hi'
      ? 'इस सेवा के लिए ऑपरेटर की पुष्टि लॉगिन के बाद की जाती है।'
      : 'Operator availability is confirmed after login.')}</p>`;
  }
  return service.operators.slice(0, 6).map(operator => `
    <div class="seo-operator">
      <div>
        <strong>${escapeHtml(operator.name)}</strong>
        <span>${escapeHtml([operator.city, operator.district, operator.state].filter(Boolean).join(', ') || (lang === 'hi' ? 'भारत' : 'India'))}</span>
      </div>
      <span class="seo-badge">${operator.role === 'filler' ? (lang === 'hi' ? 'फॉर्म विशेषज्ञ' : 'Form expert') : (lang === 'hi' ? 'जन सेवा केंद्र' : 'Jan Seva Kendra')}</span>
    </div>`).join('');
}

function renderServiceBody(service: PublicService, lang: Lang): string {
  const applyUrl = `/?service=${encodeURIComponent(service.slug)}&apply=1&name=${encodeURIComponent(service.name)}&scope=${encodeURIComponent(service.scope)}`;
  const heading = lang === 'hi' ? `${service.name} ऑनलाइन आवेदन` : `${service.name} Apply Online`;
  const subtitle = lang === 'hi'
    ? 'सत्यापित जन सेवा केंद्र के माध्यम से आवेदन करें — फीस, दस्तावेज़ और प्रक्रिया एक ही जगह।'
    : 'Apply through a verified Jan Seva Kendra — fees, documents and process in one place.';
  const cta = lang === 'hi' ? 'ऑनलाइन आवेदन करें' : 'Apply Online';
  const loginNote = lang === 'hi'
    ? 'अनुरोध भेजने के लिए लॉगिन आवश्यक है। लॉगिन के बाद आप उसी पेज पर वापस आएंगे।'
    : 'Login is required to send the request. You will return to this page after login.';
  const feeTitle = lang === 'hi' ? 'शुल्क विवरण' : 'Fee details';
  const docsTitle = lang === 'hi' ? 'ज़रूरी दस्तावेज़' : 'Required documents';
  const processTitle = lang === 'hi' ? 'आवेदन प्रक्रिया' : 'Application process';
  const operatorsTitle = lang === 'hi' ? 'उपलब्ध ऑपरेटर' : 'Available operators';
  const faqTitle = lang === 'hi' ? 'अक्सर पूछे जाने वाले प्रश्न' : 'Frequently asked questions';
  const steps = lang === 'hi'
    ? ['लॉगिन करें और अपना शहर / जिला चुनें', 'दस्तावेज़ अपलोड करें और विवरण भरें', 'सत्यापित ऑपरेटर आवेदन स्वीकार करता है', 'डैशबोर्ड से स्थिति ट्रैक करें']
    : ['Login and confirm your city / district', 'Upload documents and fill the details', 'A verified operator accepts your request', 'Track the status from your dashboard'];

  return `
  <div class="seo-page">
    <header class="seo-header">
      <a class="seo-brand" href="/">Fillups<span>.in</span></a>
      <nav>
        <a href="/services">${lang === 'hi' ? 'सभी सेवाएं' : 'All services'}</a>
        <a href="${lang === 'hi' ? `/services/${service.slug}` : `/hi/services/${service.slug}`}">${lang === 'hi' ? 'English' : 'हिंदी'}</a>
      </nav>
    </header>

    <main class="seo-main">
      <nav class="seo-breadcrumb" aria-label="Breadcrumb">
        <a href="/">${lang === 'hi' ? 'होम' : 'Home'}</a>
        <span>›</span>
        <a href="/services">${lang === 'hi' ? 'सेवाएं' : 'Services'}</a>
        <span>›</span>
        <span>${escapeHtml(service.name)}</span>
      </nav>

      <section class="seo-hero">
        <div class="seo-hero-icon">${escapeHtml(service.icon || '📄')}</div>
        <p class="seo-kicker">${escapeHtml(scopeLabel(service.scope, lang))}</p>
        <h1>${escapeHtml(heading)}</h1>
        <p class="seo-lead">${escapeHtml(subtitle)}</p>
        <div class="seo-actions">
          <a class="seo-button" href="${applyUrl}">${escapeHtml(cta)}</a>
          <span class="seo-fee">${escapeHtml(feeTitle)}: <b>${escapeHtml(feeLabel(service))}</b></span>
        </div>
        <p class="seo-note">${escapeHtml(loginNote)}</p>
      </section>

      <section class="seo-grid">
        <div class="seo-card">
          <h2>${escapeHtml(feeTitle)}</h2>
          <table>
            <tbody>
              <tr><td>${lang === 'hi' ? 'कुल शुल्क' : 'Total fee'}</td><td><b>${escapeHtml(feeLabel(service))}</b></td></tr>
              <tr><td>${lang === 'hi' ? 'सरकारी शुल्क' : 'Government fee'}</td><td>${service.fees.govtFeeMin ? escapeHtml(inr(service.fees.govtFeeMin)) : '—'}${service.fees.govtFeeMax && service.fees.govtFeeMax !== service.fees.govtFeeMin ? ` – ${escapeHtml(inr(service.fees.govtFeeMax))}` : ''}</td></tr>
              <tr><td>${lang === 'hi' ? 'सेवा शुल्क' : 'Service fee'}</td><td>${service.fees.serviceFeeMin ? escapeHtml(inr(service.fees.serviceFeeMin)) : '—'}${service.fees.serviceFeeMax && service.fees.serviceFeeMax !== service.fees.serviceFeeMin ? ` – ${escapeHtml(inr(service.fees.serviceFeeMax))}` : ''}</td></tr>
            </tbody>
          </table>
          <p class="seo-muted">${escapeHtml(lang === 'hi'
            ? 'सटीक शुल्क राज्य और ऑपरेटर के अनुसार बदल सकता है।'
            : 'The exact fee can vary by state and selected operator.')}</p>
        </div>

        <div class="seo-card">
          <h2>${escapeHtml(docsTitle)}</h2>
          <ul class="seo-list">${renderRequirements(service, lang)}</ul>
        </div>
      </section>

      <section class="seo-card">
        <h2>${escapeHtml(processTitle)}</h2>
        <ol class="seo-steps">${steps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ol>
      </section>

      <section class="seo-card">
        <h2>${escapeHtml(operatorsTitle)}</h2>
        <div class="seo-operators">${renderOperators(service, lang)}</div>
        <p class="seo-muted">${escapeHtml(lang === 'hi'
          ? `${service.operatorCount} सत्यापित ऑपरेटर इस सेवा के लिए उपलब्ध हैं। लॉगिन के बाद अपने शहर के ऑपरेटर सबसे पहले दिखेंगे।`
          : `${service.operatorCount} verified operator(s) currently offer this service. After login, operators from your city appear first.`)}</p>
      </section>

      <section class="seo-card">
        <h2>${escapeHtml(faqTitle)}</h2>
        ${renderFaqs(service, lang)}
      </section>

      <section class="seo-final">
        <h2>${escapeHtml(lang === 'hi' ? 'अभी आवेदन शुरू करें' : 'Start your application')}</h2>
        <p>${escapeHtml(lang === 'hi'
          ? 'लॉगिन करें, अपना शहर चुनें और सत्यापित ऑपरेटर को अनुरोध भेजें।'
          : 'Login, confirm your city and send the request to a verified operator.')}</p>
        <a class="seo-button" href="${applyUrl}">${escapeHtml(cta)}</a>
      </section>
    </main>

    <footer class="seo-footer">
      <span>© ${new Date().getFullYear()} Fillups.in</span>
      <span>${lang === 'hi' ? 'ऑनलाइन जन सेवा एवं साइबर कैफ़े पोर्टल' : 'Online Jan Seva & Cyber Cafe Portal'}</span>
    </footer>
  </div>`;
}

function baseStyles(): string {
  return `
  <style>
    .seo-page{--ink:#e2e8f0;--muted:#94a3b8;--line:rgba(148,163,184,.18);--amber:#f59e0b;--bg:#020617;background:radial-gradient(900px 420px at 15% -5%,rgba(245,158,11,.16),transparent 60%),radial-gradient(700px 360px at 90% 0%,rgba(56,189,248,.12),transparent 55%),var(--bg);color:var(--ink);font-family:Poppins,Outfit,system-ui,-apple-system,sans-serif;min-height:100vh}
    .seo-page *{box-sizing:border-box}
    .seo-page a{color:inherit;text-decoration:none}
    .seo-header{max-width:1080px;margin:0 auto;padding:22px 20px;display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:1px solid var(--line)}
    .seo-brand{font-weight:900;font-size:20px;letter-spacing:-.02em}
    .seo-brand span{color:var(--amber)}
    .seo-header nav{display:flex;gap:18px;font-size:13px;color:var(--muted);font-weight:600}
    .seo-main{max-width:1080px;margin:0 auto;padding:28px 20px 56px;display:grid;gap:22px}
    .seo-breadcrumb{display:flex;gap:8px;flex-wrap:wrap;font-size:12px;color:var(--muted)}
    .seo-hero{padding:34px 28px;border:1px solid var(--line);border-radius:26px;background:linear-gradient(135deg,rgba(245,158,11,.12),rgba(15,23,42,.86) 45%,rgba(2,6,23,.95));box-shadow:0 30px 60px -30px rgba(0,0,0,.9)}
    .seo-hero-icon{font-size:38px;line-height:1;margin-bottom:12px}
    .seo-kicker{margin:0 0 8px;color:var(--amber);font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.12em}
    .seo-hero h1{margin:0 0 12px;font-size:clamp(28px,4.4vw,48px);line-height:1.08;letter-spacing:-.03em}
    .seo-lead{margin:0 0 22px;color:#cbd5e1;font-size:16px;line-height:1.7;max-width:760px}
    .seo-actions{display:flex;align-items:center;gap:22px;flex-wrap:wrap}
    .seo-button{display:inline-flex;align-items:center;justify-content:center;padding:14px 26px;border-radius:14px;background:linear-gradient(135deg,#f59e0b,#ea580c);color:#0b1120!important;font-weight:900;font-size:15px;box-shadow:0 16px 34px -12px rgba(245,158,11,.6)}
    .seo-fee{font-size:14px;color:#cbd5e1}
    .seo-fee b{color:#fff;font-size:20px}
    .seo-note{margin:16px 0 0;color:var(--muted);font-size:12px}
    .seo-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:22px}
    .seo-card{padding:24px;border:1px solid var(--line);border-radius:22px;background:rgba(15,23,42,.72)}
    .seo-card h2{margin:0 0 16px;font-size:18px;letter-spacing:-.01em}
    .seo-card table{width:100%;border-collapse:collapse;font-size:14px}
    .seo-card td{padding:10px 0;border-bottom:1px solid rgba(148,163,184,.12);color:#cbd5e1}
    .seo-card td:last-child{text-align:right;color:#fff}
    .seo-list,.seo-steps{margin:0;padding-left:20px;color:#cbd5e1;line-height:1.9;font-size:14px}
    .seo-steps{counter-reset:seo-step;padding-left:0;list-style:none}
    .seo-steps li{counter-increment:seo-step;position:relative;padding-left:38px;margin-bottom:12px}
    .seo-steps li:before{content:counter(seo-step);position:absolute;left:0;top:0;width:26px;height:26px;border-radius:9px;background:rgba(245,158,11,.16);border:1px solid rgba(245,158,11,.35);color:var(--amber);font-size:12px;font-weight:900;display:flex;align-items:center;justify-content:center}
    .seo-operators{display:grid;gap:10px;margin-bottom:14px}
    .seo-operator{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 14px;border:1px solid var(--line);border-radius:14px;background:rgba(2,6,23,.5)}
    .seo-operator strong{display:block;font-size:14px}
    .seo-operator span{display:block;color:var(--muted);font-size:12px;margin-top:2px}
    .seo-badge{flex-shrink:0;padding:5px 9px;border-radius:999px;background:rgba(56,189,248,.12);border:1px solid rgba(56,189,248,.28);color:#7dd3fc!important;font-size:10px!important;font-weight:800;text-transform:uppercase;letter-spacing:.05em}
    .seo-muted{margin:0;color:var(--muted);font-size:12px;line-height:1.7}
    .seo-faq{border-bottom:1px solid rgba(148,163,184,.12);padding:12px 0}
    .seo-faq:last-child{border-bottom:0}
    .seo-faq summary{cursor:pointer;font-weight:700;font-size:14px;color:#e2e8f0}
    .seo-faq p{margin:10px 0 0;color:#cbd5e1;font-size:13px;line-height:1.8}
    .seo-final{padding:26px;border:1px solid rgba(245,158,11,.3);border-radius:22px;background:linear-gradient(135deg,rgba(245,158,11,.14),rgba(15,23,42,.9));display:flex;flex-direction:column;align-items:flex-start;gap:12px}
    .seo-final h2{margin:0;font-size:22px}
    .seo-final p{margin:0;color:#cbd5e1;font-size:14px}
    .seo-footer{max-width:1080px;margin:0 auto;padding:22px 20px 40px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;border-top:1px solid var(--line);color:var(--muted);font-size:12px}
    .seo-service-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}
    .seo-service-link{display:flex;gap:12px;align-items:center;padding:16px;border:1px solid var(--line);border-radius:16px;background:rgba(15,23,42,.66);transition:border-color .2s}
    .seo-service-link:hover{border-color:rgba(245,158,11,.5)}
    .seo-service-link .icon{font-size:24px}
    .seo-service-link strong{display:block;font-size:14px}
    .seo-service-link span{display:block;color:var(--muted);font-size:11px;margin-top:3px}
    @media(max-width:640px){.seo-header{padding:16px}.seo-main{padding:20px 14px 40px}.seo-hero{padding:24px 18px}.seo-card{padding:18px}.seo-footer{padding:18px 14px 30px}}
  </style>`;
}

function headTags(options: {
  title: string;
  description: string;
  canonical: string;
  enUrl: string;
  hiUrl: string;
  jsonLd: unknown;
  bootstrap?: { name: string; value: unknown };
}): string {
  const tags = [
    `<title>${escapeHtml(options.title)} | Fillups.in</title>`,
    `<meta name="description" content="${escapeHtml(options.description)}" />`,
    `<meta name="robots" content="index, follow, max-image-preview:large" />`,
    `<link rel="canonical" href="${escapeHtml(options.canonical)}" />`,
    `<link rel="alternate" hreflang="en-IN" href="${escapeHtml(options.enUrl)}" />`,
    `<link rel="alternate" hreflang="hi-IN" href="${escapeHtml(options.hiUrl)}" />`,
    `<link rel="alternate" hreflang="x-default" href="${escapeHtml(options.enUrl)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Fillups.in" />`,
    `<meta property="og:title" content="${escapeHtml(options.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(options.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(options.canonical)}" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${escapeHtml(options.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(options.description)}" />`,
    `<script type="application/ld+json">${escapeJson(options.jsonLd)}</script>`
  ];
  if (options.bootstrap) {
    tags.push(`<script>window.${options.bootstrap.name}=${escapeJson(options.bootstrap.value)};</script>`);
  }
  return tags.join('\n    ');
}

function injectHtml(baseHtml: string, head: string, body: string): string {
  let html = baseHtml
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta\s+name=["']description["'][^>]*>/i, '')
    .replace(/<meta\s+property=["']og:[^"']+["'][^>]*>/gi, '')
    .replace(/<link\s+rel=["']canonical["'][^>]*>/gi, '');
  html = html.replace('</head>', `    ${head}\n  </head>`);
  if (html.includes('<div id="root"></div>')) {
    html = html.replace('<div id="root"></div>', `<div id="root">${body}</div>`);
  } else {
    html = html.replace(/<div id="root">[\s\S]*?<\/div>/, `<div id="root">${body}</div>`);
  }
  return html;
}

export function renderServicePageHtml(
  baseHtml: string,
  service: PublicService,
  lang: Lang,
  siteUrl: string
): string {
  const canonical = lang === 'hi'
    ? `${siteUrl}/hi/services/${service.slug}`
    : `${siteUrl}/services/${service.slug}`;
  const enUrl = `${siteUrl}/services/${service.slug}`;
  const hiUrl = `${siteUrl}/hi/services/${service.slug}`;
  const title = serviceTitle(service, lang);
  const description = serviceDescription(service, lang);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        name: service.name,
        serviceType: service.name,
        description,
        url: canonical,
        areaServed: {
          '@type': 'Country',
          name: 'India'
        },
        provider: {
          '@type': 'Organization',
          name: 'Fillups.in',
          url: siteUrl
        },
        offers: service.fees.totalMin > 0 ? {
          '@type': 'Offer',
          priceCurrency: 'INR',
          price: service.fees.totalMin,
          priceSpecification: {
            '@type': 'PriceSpecification',
            minPrice: service.fees.totalMin,
            maxPrice: service.fees.totalMax || service.fees.totalMin,
            priceCurrency: 'INR'
          },
          availability: 'https://schema.org/InStock'
        } : undefined
      },
      {
        '@type': 'FAQPage',
        mainEntity: service.faqs.map(faq => ({
          '@type': 'Question',
          name: lang === 'hi' ? faq.qHi : faq.q,
          acceptedAnswer: {
            '@type': 'Answer',
            text: lang === 'hi' ? faq.aHi : faq.a
          }
        }))
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: lang === 'hi' ? 'होम' : 'Home', item: siteUrl },
          { '@type': 'ListItem', position: 2, name: lang === 'hi' ? 'सेवाएं' : 'Services', item: `${siteUrl}/services` },
          { '@type': 'ListItem', position: 3, name: service.name, item: canonical }
        ]
      }
    ]
  };

  const head = headTags({
    title,
    description,
    canonical,
    enUrl,
    hiUrl,
    jsonLd,
    bootstrap: { name: '__PUBLIC_SERVICE__', value: service }
  });

  return injectHtml(baseHtml, `${baseStyles()}\n    ${head}`, renderServiceBody(service, lang));
}

export function renderServicesIndexHtml(
  baseHtml: string,
  services: PublicService[],
  lang: Lang,
  siteUrl: string
): string {
  const canonical = lang === 'hi' ? `${siteUrl}/hi/services` : `${siteUrl}/services`;
  const enUrl = `${siteUrl}/services`;
  const hiUrl = `${siteUrl}/hi/services`;
  const title = lang === 'hi' ? 'सभी ऑनलाइन सरकारी सेवाएं और दस्तावेज़' : 'All Online Government Services & Documents';
  const description = lang === 'hi'
    ? 'पैन कार्ड, निवास प्रमाण, आय प्रमाण, जाति प्रमाण, राशन कार्ड और अन्य सरकारी सेवाओं के लिए ऑनलाइन आवेदन करें।'
    : 'Apply online for PAN card, domicile, income, caste, ration card and other government services through verified Jan Seva Kendra operators.';

  const body = `
  <div class="seo-page">
    <header class="seo-header">
      <a class="seo-brand" href="/">Fillups<span>.in</span></a>
      <nav>
        <a href="/services">${lang === 'hi' ? 'सभी सेवाएं' : 'All services'}</a>
        <a href="${lang === 'hi' ? '/services' : '/hi/services'}">${lang === 'hi' ? 'English' : 'हिंदी'}</a>
      </nav>
    </header>
    <main class="seo-main">
      <section class="seo-hero">
        <p class="seo-kicker">${lang === 'hi' ? 'सत्यापित जन सेवा केंद्र' : 'Verified Jan Seva Kendra'}</p>
        <h1>${escapeHtml(title)}</h1>
        <p class="seo-lead">${escapeHtml(description)}</p>
        <div class="seo-actions"><a class="seo-button" href="/">${lang === 'hi' ? 'होम पर जाएं' : 'Go to home'}</a></div>
      </section>
      <section class="seo-service-grid">
        ${services.map(service => `
          <a class="seo-service-link" href="${lang === 'hi' ? `/hi/services/${service.slug}` : `/services/${service.slug}`}">
            <span class="icon">${escapeHtml(service.icon || '📄')}</span>
            <span>
              <strong>${escapeHtml(service.name)}</strong>
              <span>${escapeHtml(scopeLabel(service.scope, lang))} · ${escapeHtml(feeLabel(service))}</span>
            </span>
          </a>`).join('')}
      </section>
    </main>
    <footer class="seo-footer">
      <span>© ${new Date().getFullYear()} Fillups.in</span>
      <span>${lang === 'hi' ? 'ऑनलाइन जन सेवा एवं साइबर कैफ़े पोर्टल' : 'Online Jan Seva & Cyber Cafe Portal'}</span>
    </footer>
  </div>`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description,
    url: canonical,
    hasPart: services.slice(0, 50).map(service => ({
      '@type': 'Service',
      name: service.name,
      url: `${siteUrl}/services/${service.slug}`
    }))
  };

  const head = headTags({
    title,
    description,
    canonical,
    enUrl,
    hiUrl,
    jsonLd,
    bootstrap: { name: '__PUBLIC_SERVICES__', value: services }
  });

  return injectHtml(baseHtml, `${baseStyles()}\n    ${head}`, body);
}

export function renderServiceNotFoundHtml(baseHtml: string, lang: Lang, siteUrl: string): string {
  const title = lang === 'hi' ? 'सेवा नहीं मिली' : 'Service not found';
  const body = `
  <div class="seo-page">
    <header class="seo-header">
      <a class="seo-brand" href="/">Fillups<span>.in</span></a>
      <nav><a href="/services">${lang === 'hi' ? 'सभी सेवाएं' : 'All services'}</a></nav>
    </header>
    <main class="seo-main">
      <section class="seo-hero">
        <h1>${escapeHtml(title)}</h1>
        <p class="seo-lead">${lang === 'hi' ? 'यह सेवा उपलब्ध नहीं है या हटा दी गई है।' : 'This service is not available or has been removed.'}</p>
        <div class="seo-actions"><a class="seo-button" href="/services">${lang === 'hi' ? 'सभी सेवाएं देखें' : 'Browse all services'}</a></div>
      </section>
    </main>
  </div>`;
  const canonical = `${siteUrl}/services`;
  const head = headTags({
    title,
    description: title,
    canonical,
    enUrl: `${siteUrl}/services`,
    hiUrl: `${siteUrl}/hi/services`,
    jsonLd: { '@context': 'https://schema.org', '@type': 'WebPage', name: title }
  });
  return injectHtml(baseHtml, `${baseStyles()}\n    ${head}`, body);
}
