import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.config';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: './',
  plugins: [react(), crx({ manifest })],
  resolve: {
    alias: {
      '@resume-builder/shared': path.resolve(
        root,
        '../../packages/shared/src/index.ts',
      ),
    },
  },
  server: {
    port: 5174,
    strictPort: true,
    hmr: {
      port: 5174,
    },
    fs: {
      allow: [path.resolve(root, '../..')],
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
