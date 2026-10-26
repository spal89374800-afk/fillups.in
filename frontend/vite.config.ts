import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const rootDir = import.meta.dirname;
  return {
    root: rootDir,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': rootDir,
      },
    },
    build: {
      // Build to the repository root `dist/` so the existing Render static-site
      // publish directory keeps working. `npm run build` also mirrors it into
      // `frontend/dist/` for static hosts configured with that publish path.
      outDir: path.resolve(rootDir, '..', 'dist'),
      emptyOutDir: true,
    },
    server: {
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
