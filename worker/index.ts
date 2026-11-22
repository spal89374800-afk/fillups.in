// @ts-nocheck — Cloudflare Workers runtime types are provided by wrangler at deploy time.
// SEO pages are generated at the edge so crawlers always get crawlable HTML on the
// canonical domain, even when the origin app is asleep or not in production mode.

const SITE_URL = 'https://fillupo.in';
const ORIGIN = 'https://fillups-in.onrender.com';
const CATALOG_TTL_MS = 60_000;
const EDGE_TTL_SECONDS = 300;

let catalogCache: { at: number; services: any[] } | null = null;

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeXml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function getServices(): Promise<any[]> {
  const now = Date.now();
  if (catalogCache && now - catalogCache.at < CATALOG_TTL_MS) return catalogCache.services;
  try {
    const res = await fetch(`${ORIGIN}/api/public/services`, {
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; fillupo.in SEO worker)' }
    });
    if (!res.ok) throw new Error(`catalog ${res.status}`);
    const data = await res.json();
    const services = Array.isArray(data?.services) ? data.services : [];
    catalogCache = { at: now, services };
    return services;
  } catch {
    return catalogCache?.services || [];
  }
}

function seoHtml(options: {
  lang: 'en' | 'hi';
  title: string;
  description: string;
  enUrl: string;
  hiUrl: string;
  body: string;
  jsonLd: unknown;
}): string {
  const { lang, title, description, enUrl, hiUrl, body, jsonLd } = options;
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />
<meta name="robots" content="index, follow, max-image-preview:large" />
<link rel="canonical" href="${escapeHtml(lang === 'hi' ? hiUrl : enUrl)}" />
<link rel="alternate" hreflang="en-IN" href="${escapeHtml(enUrl)}" />
<link rel="alternate" hreflang="hi-IN" href="${escapeHtml(hiUrl)}" />
<link rel="alternate" hreflang="x-default" href="${escapeHtml(enUrl)}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="fillupo.in" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:url" content="${escapeHtml(lang === 'hi' ? hiUrl : enUrl)}" />
<meta name="twitter:card" content="summary" />
<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>
<style>body{font-family:system-ui,sans-serif;max-width:860px;margin:40px auto;padding:0 20px;color:#0f172a;line-height:1.6}a{color:#0d9488}</style>
</head>
<body>
${body}
<p><a href="${SITE_URL}/">→ Apply / Jan Seva services on fillupo.in</a></p>
</body>
</html>`;
}

function indexBody(services: any[], lang: 'en' | 'hi'): string {
  const heading = lang === 'hi' ? 'सभी सरकारी सेवाएँ और फ़ॉर्म' : 'All government services & online forms';
  const items = services.length
    ? `<ul>${services.map(s => `<li><a href="${SITE_URL}/${lang === 'hi' ? 'hi/' : ''}services/${escapeHtml(s.slug)}">${escapeHtml(s.icon || '📝')} ${escapeHtml(s.name)}</a></li>`).join('')}</ul>`
    : `<p>${lang === 'hi' ? 'सेवाएँ लोड हो रही हैं...' : 'Services are loading...'}</p>`;
  return `<h1>${escapeHtml(heading)}</h1><p>${lang === 'hi' ? 'fillupo.in पर विश्वसनीय जन सेवा ऑपरेटरों के साथ ऑनलाइन फ़ॉर्म और सरकारी सेवाएँ।' : 'Apply online for certificates, forms and government services with verified Jan Seva operators on fillupo.in.'}</p>${items}`;
}

function serviceBody(service: any, lang: 'en' | 'hi'): string {
  const reqs = Array.isArray(service.requirements) ? service.requirements : [];
  const fee = service.fees || {};
  const feeText = [
    fee.govt ? `Govt fee ₹${fee.govt}` : '',
    fee.service ? `Service fee ₹${fee.service}` : '',
    fee.total ? `Total ₹${fee.total}` : ''
  ].filter(Boolean).join(' · ');
  return `<h1>${escapeHtml(service.icon || '📝')} ${escapeHtml(service.name)}</h1>
<p>${escapeHtml(service.description || '')}</p>
<h2>${lang === 'hi' ? 'ज़रूरी दस्तावेज़' : 'Required documents'}</h2>
<ul>${reqs.map((r: string) => `<li>${escapeHtml(r)}</li>`).join('') || `<li>—</li>`}</ul>
<p><strong>${lang === 'hi' ? 'शुल्क' : 'Fees'}:</strong> ${escapeHtml(feeText || '—')}</p>
<p><strong>${lang === 'hi' ? 'क्षेत्र' : 'Scope'}:</strong> ${escapeHtml(service.scope || 'online_form')}</p>`;
}

function robots(): Response {
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    'Disallow: /login',
    'Disallow: /order/',
    'Disallow: /admin',
    'Disallow: /dashboard',
    '',
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    ''
  ].join('\n');
  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': `public, max-age=0, s-maxage=${EDGE_TTL_SECONDS}`,
      'x-worker': 'HIT'
    }
  });
}

async function sitemap(): Promise<Response> {
  const services = await getServices();
  const now = new Date().toISOString();
  const urls = [
    { loc: `${SITE_URL}/`, lastmod: now },
    { loc: `${SITE_URL}/services`, lastmod: now },
    { loc: `${SITE_URL}/hi/services`, lastmod: now },
    ...services.flatMap(s => [
      { loc: `${SITE_URL}/services/${s.slug}`, lastmod: s.updatedAt || now },
      { loc: `${SITE_URL}/hi/services/${s.slug}`, lastmod: s.updatedAt || now }
    ])
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${escapeXml(u.loc)}</loc><lastmod>${escapeXml(u.lastmod)}</lastmod><changefreq>weekly</changefreq></url>`).join('\n')}\n</urlset>`;
  return new Response(body, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': `public, max-age=0, s-maxage=${EDGE_TTL_SECONDS}`,
      'x-worker': 'HIT'
    }
  });
}

export default {
  async fetch(request: Request, _env: unknown, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const isHi = path === '/hi/services' || path.startsWith('/hi/services/');

    if (path === '/robots.txt') return robots();
    if (path === '/sitemap.xml') return await sitemap();

    const isIndex = path === '/services' || path === '/en/services' || path === '/hi/services';
    const detailMatch = path.match(/^\/(?:en\/|hi\/)?services\/([a-z0-9-]+)$/);
    if (!isIndex && !detailMatch) {
      // Pass everything else through to the app origin, but tag the response so
      // it is always obvious whether the Worker route is actually active.
      const originUrl = new URL(path + url.search, ORIGIN);
      const headers = new Headers(request.headers);
      headers.delete('host');
      const init: RequestInit = { method: request.method, headers, redirect: 'manual' };
      if (!['GET', 'HEAD'].includes(request.method)) init.body = request.body;
      const originResponse = await fetch(originUrl, init);
      const response = new Response(originResponse.body, originResponse);
      response.headers.set('x-worker', 'PASS');
      return response;
    }

    const lang: 'en' | 'hi' = isHi ? 'hi' : 'en';
    const services = await getServices();
    const slug = detailMatch?.[1] || '';
    const service = slug ? services.find(s => String(s.slug).toLowerCase() === slug.toLowerCase()) : undefined;

    if (slug && !service) {
      const body = seoHtml({
        lang,
        title: 'Service not found | fillupo.in',
        description: 'The requested service was not found.',
        enUrl: `${SITE_URL}/services/${slug}`,
        hiUrl: `${SITE_URL}/hi/services/${slug}`,
        body: '<h1>Service not found</h1><p><a href="/services">Browse all services</a></p>',
        jsonLd: { '@context': 'https://schema.org', '@type': 'WebPage', name: 'Service not found' }
      });
      return new Response(body, {
        status: 404,
        headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-worker': 'HIT' }
      });
    }

    const enUrl = service ? `${SITE_URL}/services/${service.slug}` : `${SITE_URL}/services`;
    const hiUrl = service ? `${SITE_URL}/hi/services/${service.slug}` : `${SITE_URL}/hi/services`;
    const title = service
      ? `${service.name} — online form & fees | fillupo.in`
      : (lang === 'hi' ? 'सरकारी सेवाएँ और ऑनलाइन फ़ॉर्म | fillupo.in' : 'Government services & online forms | fillupo.in');
    const description = service
      ? `${service.description || service.name}. Required documents and verified Jan Seva operators on fillupo.in.`
      : 'Find government services, online forms, required documents and verified Jan Seva operators on fillupo.in.';

    const body = seoHtml({
      lang,
      title,
      description,
      enUrl,
      hiUrl,
      body: service ? serviceBody(service, lang) : indexBody(services, lang),
      jsonLd: service
        ? {
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: service.name,
            description: service.description || service.name,
            url: enUrl,
            provider: { '@type': 'Organization', name: 'fillupo.in', url: SITE_URL },
            areaServed: service.states?.length ? service.states : 'India'
          }
        : {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: title,
            url: enUrl,
            provider: { '@type': 'Organization', name: 'fillupo.in', url: SITE_URL }
          }
    });

    const response = new Response(request.method === 'HEAD' ? null : body, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': `public, max-age=0, s-maxage=${EDGE_TTL_SECONDS}`,
        'x-worker': 'HIT'
      }
    });
    if (request.method === 'GET') ctx.waitUntil(caches.default.put(request, response.clone()));
    return response;
  }
};
