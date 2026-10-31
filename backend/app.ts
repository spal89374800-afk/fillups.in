import compression from 'compression';
import express from 'express';
import { apiRouter } from './routes/index.ts';
import { botShieldMiddleware } from './middleware/botShieldMiddleware.ts';

// The app can be opened from more than one Render URL (the web service and a
// separate frontend/static service). API calls from those origins must be
// allowed, otherwise the browser reports a CORS/HTTP error on login.
const EXTRA_ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || '')
  .split(',')
  .map(value => value.trim().replace(/\/+$/, ''))
  .filter(Boolean);

export function isAllowedCorsOrigin(origin: string): boolean {
  try {
    const parsed = new URL(origin);
    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return true;
    if (host.endsWith('.onrender.com')) return true;
    if (EXTRA_ALLOWED_ORIGINS.includes(parsed.origin)) return true;
    const appUrl = process.env.APP_URL || process.env.VITE_APP_URL;
    if (appUrl) {
      try {
        if (new URL(appUrl).origin === parsed.origin) return true;
      } catch {
        // Ignore malformed APP_URL.
      }
    }
  } catch {
    // Ignore malformed Origin headers.
  }
  return false;
}

export function createExpressApp() {
  const app = express();

  // 🛡️ Cloudflare Proxy & DDoS Mitigation Support
  app.set('trust proxy', 1);

  app.use(compression());

  // 🌐 CORS: allow the frontend Render URL to call this backend directly.
  app.use((req, res, next) => {
    const origin = typeof req.headers.origin === 'string' ? req.headers.origin : '';
    if (origin && isAllowedCorsOrigin(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token, x-file-name, x-file-type');
    res.setHeader('Access-Control-Max-Age', '86400');
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    next();
  });

  // 🛡️ Bot Shield + Attack Logger
  // Body parse se PEHLE taaki bot ka bada payload parse hi na ho.
  // Cloudflare ke pehle layer ke saath do-layer protection milta hai.
  app.use(botShieldMiddleware);

  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Mount all backend API routes under /api
  app.use('/api', apiRouter);

  // 🛡️ Ensure every error (including async/JSON parse errors) returns JSON instead
  // of an empty/HTML response, so the frontend can parse it reliably.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error('[Express] Unhandled error:', err?.stack || err?.message || err);
    if (res.headersSent) return;
    const status = Number(err?.status || err?.statusCode) || 500;
    res.status(status).json({
      success: false,
      error: err?.message || 'Internal server error. Please try again.'
    });
  });

  return app;
}
