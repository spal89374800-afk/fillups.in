import compression from 'compression';
import express from 'express';
import { apiRouter } from './routes/index.ts';
import { botShieldMiddleware } from './middleware/botShieldMiddleware.ts';

export function createExpressApp() {
  const app = express();

  // 🛡️ Cloudflare Proxy & DDoS Mitigation Support
  app.set('trust proxy', 1);

  app.use(compression());

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
