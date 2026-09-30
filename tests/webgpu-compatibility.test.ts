import { readFile } from 'node:fs/promises';
import { Script } from 'node:vm';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { gpuAdapterOptions } from '../src/shared/webgpu-adapter';
import { probeHardware } from '../src/extension/content/model-hardware';
import { selectModel } from '../src/extension/ai/webllm-engine';
import { patchWebLlmGpuPreference } from '../build/webgpu-compatibility';

afterEach(() => vi.unstubAllGlobals());

describe('WebGPU no Windows', () => {
  it('consulta hardware e seleciona variante sem enviar a opção ignorada', async () => {
    const adapter = {
      features: new Set(['shader-f16']),
      limits: {
        maxStorageBufferBindingSize: 256 * 1024 * 1024,
        maxBufferSize: 512 * 1024 * 1024,
      },
    };
    const requestAdapter = vi.fn(() => Promise.resolve(adapter));
    const gpu = { requestAdapter } as unknown as GPU;
    vi.stubGlobal('navigator', { platform: 'Win32', gpu });
    expect(await probeHardware()).toMatchObject({ state: 'available', shaderF16: true });
    expect((await selectModel(gpu)).variant).toBe('q4f16_1');
    expect(requestAdapter.mock.calls).toEqual([[{}], [{}]]);
  });

  it('preserva a preferência de desempenho em outras plataformas', () => {
    for (const platform of ['MacIntel', 'Linux x86_64'])
      expect(gpuAdapterOptions(platform)).toEqual({ powerPreference: 'high-performance' });
  });

  it('adapta a chamada do pacote real e exige revisão se ela mudar ou se repetir', async () => {
    const source = await readFile(
      new URL('../node_modules/@mlc-ai/web-llm/lib/index.js', import.meta.url),
      'utf8',
    );
    const patched = patchWebLlmGpuPreference(source);
    const call = patched.match(/navigator\.gpu\.requestAdapter\([^;]+\)/u)?.[0];
    expect(call).toBeDefined();
    if (!call) throw new Error('Chamada do runtime ausente.');
    for (const [platform, preference] of [
      ['Win32', 'high-performance'],
      ['MacIntel', 'low-power'],
    ]) {
      const requestAdapter = vi.fn();
      new Script(call).runInNewContext({
        navigator: { platform, gpu: { requestAdapter } },
        powerPreference: preference,
      });
      expect(requestAdapter).toHaveBeenCalledWith(
        platform === 'Win32' ? {} : { powerPreference: preference },
      );
    }
    expect(() => patchWebLlmGpuPreference('')).toThrow('mudou');
    expect(() => patchWebLlmGpuPreference(source + source)).toThrow('mudou');
  });
});
