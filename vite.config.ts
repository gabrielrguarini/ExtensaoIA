import { fileURLToPath } from 'node:url';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { build, defineConfig } from 'vite';
import type { Plugin } from 'vite';
import { webGpuCompatibility } from './build/webgpu-compatibility.ts';

function extensionPackage(): Plugin {
  let outDir = '';
  return {
    name: 'local-extension-package',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    async closeBundle() {
      // Content scripts do Manifest não aceitam imports ESM. Uma segunda compilação isolada
      // incorpora todas as dependências em um único IIFE, sem apagar os demais contextos.
      await build({
        configFile: false,
        plugins: [react()],
        // Bibliotecas não substituem process.env automaticamente; content scripts não têm Node.
        define: { 'process.env.NODE_ENV': '"production"' },
        envPrefix: [],
        publicDir: false,
        build: {
          outDir,
          emptyOutDir: false,
          target: 'chrome116',
          sourcemap: false,
          lib: {
            entry: 'src/extension/content/index.ts',
            name: 'LocalWritingContent',
            formats: ['iife'],
            fileName: () => 'content.js',
          },
        },
      });
      const manifest = await readFile(new URL('./manifest.json', import.meta.url));
      await writeFile(path.join(outDir, 'manifest.json'), manifest);
      await mkdir(path.join(outDir, 'icons'), { recursive: true });
      for (const size of [16, 32, 48, 128])
        await copyFile(
          new URL(`./assets/icons/icon-${size}.png`, import.meta.url),
          path.join(outDir, 'icons', `icon-${size}.png`),
        );
      await copyFile(new URL('./NOTICE.txt', import.meta.url), path.join(outDir, 'NOTICE.txt'));
      await mkdir(path.join(outDir, 'licenses'), { recursive: true });
      await mkdir(path.join(outDir, 'runtime'), { recursive: true });
      for (const executable of [
        'ort-wasm-simd-threaded.asyncify.mjs',
        'ort-wasm-simd-threaded.asyncify.wasm',
      ])
        await copyFile(
          new URL('./node_modules/onnxruntime-web/dist/' + executable, import.meta.url),
          path.join(outDir, 'runtime', executable),
        );
      for (const license of [
        'LLAMA-3.2-LICENSE',
        'QWEN3-LICENSE',
        'WEBLLM-LICENSE',
        'NOBLE-HASHES-LICENSE',
        'GEMMA-4-LICENSE',
        'TRANSFORMERS-JS-LICENSE',
        'ONNXRUNTIME-LICENSE',
        'ONNXRUNTIME-THIRD-PARTY-NOTICES',
        'HUGGINGFACE-JINJA-LICENSE',
        'HUGGINGFACE-TOKENIZERS-LICENSE',
        'FLATBUFFERS-LICENSE',
        'LONG-LICENSE',
        'PROTOBUFJS-LICENSE',
        'PLATFORM-LICENSE',
      ])
        await copyFile(
          new URL(`./licenses/${license}`, import.meta.url),
          path.join(outDir, 'licenses', license),
        );
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), webGpuCompatibility(), extensionPackage()],
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
        diagnostic: fileURLToPath(new URL('./diagnostic.html', import.meta.url)),
        popup: fileURLToPath(new URL('./popup.html', import.meta.url)),
        sidepanel: fileURLToPath(new URL('./sidepanel.html', import.meta.url)),
        offscreen: fileURLToPath(new URL('./offscreen.html', import.meta.url)),
        'service-worker': fileURLToPath(
          new URL('./src/extension/background/index.ts', import.meta.url),
        ),
      },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === 'service-worker' ? 'service-worker.js' : 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
  worker: {
    format: 'es',
    plugins: () => [webGpuCompatibility()],
  },
});
