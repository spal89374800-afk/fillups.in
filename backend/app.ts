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

  return app;
}
