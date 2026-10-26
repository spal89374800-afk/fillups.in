import './backend/env.ts';
import express from 'express';
import { createServer as createHttpServer } from 'node:http';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'url';
import fs from 'node:fs';
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';
import { createExpressApp } from './backend/app.ts';
import { getIceServers, setRealtimeServer } from './backend/services/realtimeService.ts';
import { startDocumentRetentionScheduler } from './backend/services/documentRetentionService.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = createExpressApp();

  const distPath = path.resolve(__dirname, 'dist');
  let hasDist = fs.existsSync(path.join(distPath, 'index.html'));

  // Render does not always set NODE_ENV=production. Detect Render explicitly so
  // the deployed app serves the built frontend instead of the Vite dev server
  // (the dev server blocks unknown hosts and returns HTML for API calls).
  const runningOnRender = Boolean(
    process.env.RENDER ||
    process.env.RENDER_EXTERNAL_URL ||
    process.env.RENDER_SERVICE_ID
  );
  const isProduction = process.env.NODE_ENV === 'production' || runningOnRender;

  // If a production build is missing, build it on startup so the app always
  // serves a real bundle. The repository also ships a prebuilt dist/ as a
  // fallback, so this normally does not run on Render.
  if (isProduction && !hasDist) {
    try {
      console.log('[startup] dist build missing — running npm run build...');
      execSync('npm run build', { stdio: 'inherit', cwd: __dirname });
      hasDist = fs.existsSync(path.join(distPath, 'index.html'));
    } catch (err) {
      console.error('[startup] build failed:', err);
    }
  }

  // Serve the built frontend in production. Vite middleware is used only for
  // local development (or if the production build genuinely failed).
  if (isProduction && hasDist) {
    console.log('[startup] serving built frontend from dist');
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        const normalized = filePath.replace(/\\/g, '/');
        if (normalized.endsWith('.html')) {
          res.setHeader('cache-control', 'no-cache');
        } else if (/\/assets\/.*-[A-Za-z0-9_-]{8,}\.[a-z0-9]+$/.test(normalized)) {
          res.setHeader('cache-control', 'public, max-age=31536000, immutable');
        } else {
          res.setHeader('cache-control', 'public, max-age=3600');
        }
      },
    }));
    app.get('*', (_req, res) => {
      res.setHeader('cache-control', 'no-cache');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    if (isProduction) process.env.DISABLE_HMR = 'true';
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const PORT = Number(process.env.PORT || 5000);
  const httpServer = createHttpServer(app);
  // Voice notes base64 me aate hain — default 1MB buffer bahut chhota hai.
  const socketServer = new SocketIOServer(httpServer, {
    maxHttpBufferSize: 25 * 1024 * 1024
  });
  getIceServers();
  setRealtimeServer(socketServer);
  // 🔒 Zero Data Retention: documents 24 ghante baad apne aap delete.
  startDocumentRetentionScheduler();
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
