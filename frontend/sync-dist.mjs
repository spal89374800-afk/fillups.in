// Mirror the Vite build into frontend/dist as well as the repository root dist/.
// The root dist/ is used by the Express server and the existing Render static
// site publish path; frontend/dist/ keeps static hosts configured with that
// publish directory working too.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const source = path.resolve(here, '..', 'dist');
const target = path.resolve(here, 'dist');

if (!fs.existsSync(path.join(source, 'index.html'))) {
  console.error('[sync-dist] root dist/index.html not found — skipping mirror');
  process.exit(0);
}

fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(source, target, { recursive: true });
console.log('[sync-dist] mirrored dist/ to frontend/dist/');
