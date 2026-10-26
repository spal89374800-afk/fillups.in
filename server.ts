import './backend/env.ts';
import express from 'express';
import { createServer as createHttpServer } from 'node:http';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'url';
import fs from 'node:fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { Server as SocketIOServer } from 'socket.io';
import { createExpressApp } from './backend/app.ts';
import { getIceServers, setRealtimeServer } from './backend/services/realtimeService.ts';
import { startDocumentRetentionScheduler } from './backend/services/documentRetentionService.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = createExpressApp();

  const distPath = path.resolve(__dirname, 'dist');
  let hasDist = fs.existsSync(path.join(distPath, 'index.html'));

  // In production on Render the pre-built dist may be missing. Build it on startup
  // so the app always serves a real production bundle instead of Vite dev server.
  if (process.env.NODE_ENV === 'production' && !hasDist) {
    try {
      console.log('[startup] dist build missing — running npm run build...');
      execSync('npm run build', { stdio: 'inherit', cwd: __dirname });
      hasDist = fs.existsSync(path.join(distPath, 'index.html'));
    } catch (err) {
      console.error('[startup] build failed:', err);
    }
  }

  // Vite middleware only for local development or when build truly failed.
  if (process.env.NODE_ENV !== 'production' || !hasDist) {
    if (process.env.NODE_ENV === 'production') process.env.DISABLE_HMR = 'true';
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
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
