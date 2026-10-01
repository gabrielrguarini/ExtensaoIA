import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { Script } from 'node:vm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const temporaryRoot = path.resolve(tmpdir());
const canary = 'BUILD_TEST_VALUE_MUST_NOT_REACH_THE_BROWSER';
let outputDirectory: string | undefined;
let html = '';
let outputFiles: string[] = [];
let scriptContents: string[] = [];

beforeAll(async () => {
  outputDirectory = await mkdtemp(path.join(temporaryRoot, 'extensao-ia-build-'));
  const viteCli = path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js');

  // O processo separado evita herdar o modo de transformação do próprio Vitest.
  await execFileAsync(process.execPath, [viteCli, 'build', '--outDir', outputDirectory], {
    cwd: projectRoot,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      VITE_BUILD_TEST_SECRET: canary,
    },
    windowsHide: true,
    timeout: 25_000,
  });

  html = await readFile(path.join(outputDirectory, 'index.html'), 'utf8');
  outputFiles = await readdir(outputDirectory, { recursive: true });
  const outputRoot = outputDirectory;
  scriptContents = await Promise.all(
    outputFiles
      .filter((file) => file.endsWith('.js'))
      .map((file) => readFile(path.join(outputRoot, file), 'utf8')),
  );
});

afterAll(async () => {
  if (!outputDirectory) return;

  const resolvedOutput = path.resolve(outputDirectory);
  if (
    path.dirname(resolvedOutput) !== temporaryRoot ||
    !path.basename(resolvedOutput).startsWith('extensao-ia-build-')
  ) {
    throw new Error('Diretório temporário fora do limite esperado; limpeza cancelada.');
  }

  await rm(resolvedOutput, { recursive: true, force: true });
});

describe('pacote de produção', () => {
  it('gera Manifest MV3 com dados de modelo restritos e código local', async () => {
    if (!outputDirectory) throw new Error('Build ausente.');
    const manifest: unknown = JSON.parse(
      await readFile(path.join(outputDirectory, 'manifest.json'), 'utf8'),
    );
    expect(manifest).toMatchObject({
      manifest_version: 3,
      minimum_chrome_version: '116',
      permissions: ['storage', 'offscreen', 'sidePanel'],
      action: { default_popup: 'popup.html' },
      side_panel: { default_path: 'sidepanel.html' },
      host_permissions: [
        'https://web.whatsapp.com/*',
        'https://huggingface.co/*',
        'https://us.aws.cdn.hf.co/*',
      ],
      background: { service_worker: 'service-worker.js', type: 'module' },
      content_scripts: [
        {
          matches: ['https://web.whatsapp.com/*'],
          js: ['content.js'],
          all_frames: false,
          world: 'ISOLATED',
        },
      ],
      content_security_policy: {
        extension_pages:
          "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; object-src 'none'; connect-src 'self' https://huggingface.co https://us.aws.cdn.hf.co; base-uri 'none'; frame-ancestors 'none'",
      },
    });
    for (const file of [
      'service-worker.js',
      'content.js',
      'offscreen.html',
      'diagnostic.html',
      'popup.html',
      'sidepanel.html',
    ])
      expect(outputFiles).toContain(file);
    for (const file of [
      'NOTICE.txt',
      'licenses/LLAMA-3.2-LICENSE',
      'licenses/QWEN3-LICENSE',
      'licenses/WEBLLM-LICENSE',
      'licenses/NOBLE-HASHES-LICENSE',
      'licenses/GEMMA-4-LICENSE',
      'licenses/TRANSFORMERS-JS-LICENSE',
      'licenses/ONNXRUNTIME-LICENSE',
      'licenses/ONNXRUNTIME-THIRD-PARTY-NOTICES',
      'runtime/ort-wasm-simd-threaded.asyncify.mjs',
      'runtime/ort-wasm-simd-threaded.asyncify.wasm',
    ])
      expect((await readFile(path.join(outputDirectory, file))).length).toBeGreaterThan(100);
    const content = await readFile(path.join(outputDirectory, 'content.js'), 'utf8');
    expect((await stat(path.join(outputDirectory, 'content.js'))).size).toBeLessThan(1_000_000);
    expect(() => new Script(content)).not.toThrow(); // Script clássico, sem imports ESM.
    expect(content).not.toContain('process.env');
    expect(outputFiles.some((file) => /worker-.*\.js$/.test(file))).toBe(true);
    expect(
      scriptContents.some((script) => script.startsWith('/* WebLLM 0.2.82 modified locally:')),
    ).toBe(true);
    for (const [model, variant, expectedHash] of [
      [
        'Llama-3.2-3B',
        'q4f16_1',
        '34de0d60ab598c6a85ae882b48474f250193076f902057a21070bb2daae96d5b',
      ],
      [
        'Llama-3.2-3B',
        'q4f32_1',
        '224e4cd5c235621684257aad3ebfdaf6e337d50f783614d1e7ed63e78d693ad6',
      ],
      ['Qwen3-4B', 'q4f16_1', '5ddf44e49b03e53e24fd29a45591850924346140452f60c29280190388571340'],
      ['Qwen3-4B', 'q4f32_1', '6484148ff499c15433ab85e4d2c376aef453a6d797f48047e6bd6fd495a59e39'],
      ['Qwen3-8B', 'q4f16_1', 'fd0b332c81212e484ba56c15aac5af2548f14f849d3352039ad68d3c4663b6dd'],
      ['Qwen3-8B', 'q4f32_1', '4705cca63950fca8a8bb50279ccc44a1233b41a75318ec87fd9395f46e77358f'],
    ] as const) {
      const file = outputFiles.find(
        (item) => item.includes(model) && item.includes(variant) && item.endsWith('.wasm'),
      );
      expect(file).toBeDefined();
      const data = await readFile(path.join(outputDirectory, file ?? ''));
      expect(createHash('sha256').update(data).digest('hex')).toBe(expectedHash);
    }
    for (const page of ['offscreen.html', 'diagnostic.html', 'popup.html', 'sidepanel.html']) {
      const pageHtml = await readFile(path.join(outputDirectory, page), 'utf8');
      expect(pageHtml).not.toMatch(/(?:src|href)="(?:https?:|data:|blob:)/);
      for (const match of pageHtml.matchAll(/(?:src|href)="([^"]+)"/g)) {
        expect(match[1]).toMatch(/^\.\/assets\//);
        expect((await readFile(path.join(outputDirectory, match[1] ?? ''))).length).toBeGreaterThan(
          0,
        );
      }
      for (const match of pageHtml.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))
        expect(match[1]?.trim()).toBe('');
    }
  });

  it('gera HTML pt-BR que referencia JavaScript e CSS locais existentes', async () => {
    expect(html).toContain('lang="pt-BR"');
    const references = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]);
    expect(references.some((reference) => reference?.endsWith('.js'))).toBe(true);
    expect(references.some((reference) => reference?.endsWith('.css'))).toBe(true);

    for (const reference of references) {
      expect(reference).toMatch(/^\.\/assets\//);
      if (!reference || !outputDirectory) throw new Error('Referência de saída ausente.');
      const content = await readFile(path.join(outputDirectory, reference));
      expect(content.byteLength).toBeGreaterThan(0);
    }
  });

  it('inclui as dependências e dispensa o servidor de desenvolvimento', () => {
    expect(scriptContents.length).toBeGreaterThan(0);
    const scripts = scriptContents.join('\n');

    expect(html).not.toContain('/src/');
    expect(scripts).not.toMatch(/@vite\/client|@react-refresh|localhost:5173|127\.0\.0\.1:5173/);
    expect(scripts).not.toMatch(/(?:from|import)\s*['"](?:react|react-dom)(?:\/[^'"]*)?['"]/);
    expect(outputFiles.some((file) => file.endsWith('.map'))).toBe(false);
  });

  it('não incorpora valores do ambiente nem scripts inline no HTML', () => {
    expect([html, ...scriptContents].join('\n')).not.toContain(canary);
    const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
    expect(scripts.length).toBeGreaterThan(0);
    for (const script of scripts) {
      expect(script[1]).toContain('src="./assets/');
      expect(script[2]?.trim()).toBe('');
    }
  });
});
