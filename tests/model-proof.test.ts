import { afterEach, describe, expect, it, vi } from 'vitest';
import { selectModel, ModelEnvironmentError } from '../src/extension/ai/webllm-engine';
import { runModelProof } from '../src/extension/content/model-proof-client';
import type { ProofOutcome } from '../src/extension/content/model-proof-client';
import { isClientCommand, isEngineCommand } from '../src/shared/protocol';
import { MODEL_PROOF_TEXT } from '../src/shared/model-proof';

function gpu(features: string[], bindingSize = 256 * 1024 * 1024): GPU {
  return {
    requestAdapter: () =>
      Promise.resolve({
        features: new Set(features),
        limits: {
          maxStorageBufferBindingSize: bindingSize,
          maxBufferSize: 512 * 1024 * 1024,
        },
      } as unknown as GPUAdapter),
  } as unknown as GPU;
}

describe('prova do modelo', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('recusa ausência de WebGPU antes de qualquer download', async () => {
    await expect(selectModel(undefined)).rejects.toEqual(
      new ModelEnvironmentError('WEBGPU_UNAVAILABLE'),
    );
    await expect(selectModel(gpu([], 32 * 1024 * 1024))).rejects.toEqual(
      new ModelEnvironmentError('INSUFFICIENT_RESOURCES'),
    );
  });

  it('seleciona q4f16_1 quando shader-f16 existe e q4f32_1 quando falta', async () => {
    expect((await selectModel(gpu(['shader-f16']))).variant).toBe('q4f16_1');
    expect((await selectModel(gpu([]))).variant).toBe('q4f32_1');
  });

  it('aceita somente a frase sintética fixa no caminho de prova', () => {
    const key = { requestId: 'id', editorId: 'model-proof', snapshotId: 'snapshot', revision: 0 };
    const origin = { tabId: 1, frameId: 0, documentId: 'document', connectionId: 'connection' };
    expect(
      isClientCommand({ type: 'start', key, action: 'prova-modelo', text: MODEL_PROOF_TEXT }),
    ).toBe(true);
    expect(isClientCommand({ type: 'start', key, action: 'prova-modelo', text: 'rascunho' })).toBe(
      false,
    );
    expect(
      isEngineCommand({
        type: 'start',
        request: { key, origin, action: 'prova-modelo', text: 'rascunho' },
      }),
    ).toBe(false);
  });

  it('explica falhas de WebGPU, recursos e download sem liberar resultado', () => {
    for (const [code, expected] of [
      ['WEBGPU_UNAVAILABLE', 'precisa de WebGPU'],
      ['INSUFFICIENT_RESOURCES', 'recursos necessários'],
      ['MODEL_DOWNLOAD', 'baixar ou carregar'],
    ] as const) {
      let receive: (value: unknown) => void = () => undefined;
      let sent: unknown;
      const port = {
        onMessage: {
          addListener: (listener: (value: unknown) => void) => (receive = listener),
          removeListener: () => undefined,
        },
        onDisconnect: { addListener: () => undefined, removeListener: () => undefined },
        postMessage: (value: unknown) => (sent = value),
        disconnect: () => undefined,
      };
      vi.stubGlobal('chrome', { runtime: { connect: () => port } });
      let outcome: ProofOutcome | undefined;
      runModelProof(
        () => undefined,
        (value) => (outcome = value),
      );
      if (!isClientCommand(sent) || sent.type !== 'start') throw new Error('Pedido ausente.');
      receive({
        type: 'error',
        binding: {
          key: sent.key,
          origin: { tabId: 1, frameId: 0, documentId: 'document', connectionId: 'connection' },
        },
        code,
      });
      if (!outcome) throw new Error('Resultado da falha ausente.');
      expect(outcome.ok).toBe(false);
      if (!outcome.ok) expect(outcome.message).toContain(expected);
    }
  });
});
