import { execFile } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
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
