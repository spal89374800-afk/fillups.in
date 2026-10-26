import './env.ts';
import express from 'express';
import { createServer as createHttpServer } from 'node:http';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'url';
import fs from 'node:fs';
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';
import { createExpressApp } from './app.ts';
import { getIceServers, setRealtimeServer } from './services/realtimeService.ts';
import { startDocumentRetentionScheduler } from './services/documentRetentionService.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const frontendDir = path.resolve(projectRoot, 'frontend');

async function startServer() {
  const app = createExpressApp();

  // The build is written to the repository root `dist/` and mirrored to
  // `frontend/dist/`. Prefer the root copy, fall back to the mirror.
  const rootDistPath = path.resolve(projectRoot, 'dist');
  const mirroredDistPath = path.resolve(frontendDir, 'dist');
  const distPath = fs.existsSync(path.join(rootDistPath, 'index.html'))
    ? rootDistPath
    : mirroredDistPath;
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
  // serves a real bundle. `frontend/dist` is generated (not committed), so this
  // also acts as a safety net if the Render build step is skipped.
  if (isProduction && fs.existsSync(frontendDir) && !hasDist) {
    try {
      console.log('[startup] dist build missing — running npm run build...');
      execSync('npm run build', { stdio: 'inherit', cwd: projectRoot });
      hasDist = fs.existsSync(path.join(distPath, 'index.html'));
    } catch (err) {
      console.error('[startup] build failed:', err);
    }
  }

  // Serve the built frontend in production. Vite middleware is used only for
  // local development (or if the production build genuinely failed).
  if (fs.existsSync(frontendDir) && isProduction && hasDist) {
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
  } else if (fs.existsSync(frontendDir)) {
    if (isProduction) process.env.DISABLE_HMR = 'true';
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      configFile: path.join(frontendDir, 'vite.config.ts'),
      root: frontendDir,
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('[startup] frontend not present — running as pure API');
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
