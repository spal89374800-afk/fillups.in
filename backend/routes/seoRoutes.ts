import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import {
  getPublicServiceBySlug,
  getSiteUrl,
  listPublicServices
} from '../services/publicCatalogService.ts';
import {
  renderServiceNotFoundHtml,
  renderServicePageHtml,
  renderServicesIndexHtml
} from '../services/seoPageRenderer.ts';

type Lang = 'en' | 'hi';

function escapeXml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function detectLang(requestPath: string): Lang {
  return requestPath.startsWith('/hi/') || requestPath === '/hi' ? 'hi' : 'en';
}

function normalizeSlugParam(value: unknown): string {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
}

export function createSeoRouter(options: { distPath: string; isProduction: boolean }) {
  const router = Router();
  const siteUrl = getSiteUrl();
  let cachedIndexFile: { path: string; mtimeMs: number; html: string } | null = null;

  const readBaseHtml = (): string | null => {
    const indexFile = path.join(options.distPath, 'index.html');
    try {
      const stat = fs.statSync(indexFile);
      if (cachedIndexFile && cachedIndexFile.path === indexFile && cachedIndexFile.mtimeMs === stat.mtimeMs) {
        return cachedIndexFile.html;
      }
      const html = fs.readFileSync(indexFile, 'utf8');
      cachedIndexFile = { path: indexFile, mtimeMs: stat.mtimeMs, html };
      return html;
    } catch {
      return null;
    }
  };

  router.get('/robots.txt', (_req, res) => {
    res.type('text/plain').send([
      'User-agent: *',
      'Allow: /',
      'Disallow: /api/',
      'Disallow: /login',
      'Disallow: /order/',
      'Disallow: /admin',
      'Disallow: /dashboard',
      '',
      `Sitemap: ${siteUrl}/sitemap.xml`,
      ''
    ].join('\n'));
  });

  router.get('/sitemap.xml', (_req, res) => {
    const services = listPublicServices();
    const now = new Date().toISOString();
    const staticUrls = [
      `${siteUrl}/`,
      `${siteUrl}/services`,
      `${siteUrl}/hi/services`
    ];
    const serviceUrls = services.flatMap(service => {
      const lastmod = service.updatedAt || now;
      return [
        `${siteUrl}/services/${service.slug}`,
        `${siteUrl}/hi/services/${service.slug}`
      ].map(url => ({ url, lastmod }));
    });
    const urls = [
      ...staticUrls.map(url => ({ url, lastmod: now })),
      ...serviceUrls
    ];
    const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(item => `  <url>
    <loc>${escapeXml(item.url)}</loc>
    <lastmod>${escapeXml(item.lastmod)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${item.url.endsWith('/services') || item.url.endsWith('/hi/services') ? '0.9' : '0.8'}</priority>
  </url>`).join('\n')}
</urlset>`;
    res.type('application/xml').setHeader('cache-control', 'public, max-age=300, s-maxage=600');
    res.send(body);
  });

  const handleHtml = (
    req: Request,
    res: Response,
    next: NextFunction,
    build: (baseHtml: string, lang: Lang) => { status: number; html: string }
  ) => {
    // Local development keeps using Vite's HTML transform + React dev server.
    // Production uses the built index.html and injects SEO tags server-side.
    if (!options.isProduction) return next();
    const baseHtml = readBaseHtml();
    if (!baseHtml) return next();
    const lang = detectLang(req.path);
    const { status, html } = build(baseHtml, lang);
    res.status(status).type('html').setHeader('cache-control', 'public, max-age=120, s-maxage=300');
    res.send(html);
  };

  const serveIndex = (req: Request, res: Response, next: NextFunction) =>
    handleHtml(req, res, next, (baseHtml, lang) => ({
      status: 200,
      html: renderServicesIndexHtml(baseHtml, listPublicServices(), lang, siteUrl)
    }));

  const serveService = (req: Request, res: Response, next: NextFunction) =>
    handleHtml(req, res, next, (baseHtml, lang) => {
      const slug = normalizeSlugParam(req.params.slug);
      const service = getPublicServiceBySlug(slug);
      if (!service) {
        return { status: 404, html: renderServiceNotFoundHtml(baseHtml, lang, siteUrl) };
      }
      return { status: 200, html: renderServicePageHtml(baseHtml, service, lang, siteUrl) };
    });

  router.get(['/services', '/en/services', '/hi/services'], serveIndex);
  router.get(['/services/:slug', '/en/services/:slug', '/hi/services/:slug'], serveService);

  return router;
}
