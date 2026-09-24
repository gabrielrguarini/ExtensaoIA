import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [react()],
  // Nenhuma variável do ambiente do desenvolvedor é exposta automaticamente ao navegador.
  envPrefix: [],
  publicDir: false,
  server: {
    host: '127.0.0.1',
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    strictPort: true,
  },
  build: {
    target: 'chrome116',
    outDir: 'dist',
    assetsInlineLimit: 0,
    sourcemap: false,
    modulePreload: { polyfill: false },
    license: true,
    rolldownOptions: {
      input: {
        development: fileURLToPath(new URL('./index.html', import.meta.url)),
      },
    },
  },
  worker: {
    format: 'es',
  },
});
