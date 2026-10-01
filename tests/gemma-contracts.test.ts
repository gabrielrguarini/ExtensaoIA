import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PREFERENCES,
  isPreferencePatch,
  parsePreferences,
} from '../src/shared/preferences';
import { GEMMA_FILES, GEMMA_MODEL } from '../src/extension/ai/gemma-catalog';
import { gemmaBytes, gemmaFiles, gemmaURL } from '../src/extension/ai/gemma-cache';
import { isGemmaCommand } from '../src/shared/gemma-management';
import { isClientEvent } from '../src/shared/protocol';
import { binding } from './fixtures';
describe('Gemma e preferências v5', () => {
  it('migra escolha manual WebLLM preservando perfil e opção experimental de português', () => {
    expect(
      parsePreferences({
        version: 4,
        engine: 'webllm',
        profile: 'qualidade',
        chromePortuguesePrompt: true,
        localModel: 'gemma',
      }),
    ).toEqual({
      ...DEFAULT_PREFERENCES,
      engine: 'local',
      profile: 'qualidade',
      chromePortuguesePrompt: true,
    });
    expect(parsePreferences({ version: 3, profile: 'equilibrado' }).localModel).toBe('webllm');
    expect(
      parsePreferences({ version: 5, engine: 'local', localModel: 'gemma', profile: 'qualidade' }),
    ).toMatchObject({ engine: 'local', localModel: 'gemma', profile: 'qualidade' });
    expect(isPreferencePatch({ localModel: 'gemma' })).toBe(true);
    expect(isPreferencePatch({ localModel: 'remote' })).toBe(false);
    expect(isPreferencePatch({ engine: 'transformers' })).toBe(false);
  });
  it('catálogo só registra texto, revisões e integridade completas; não admite pesos de outro modelo', () => {
    expect(GEMMA_MODEL.revision).toMatch(/^[a-f0-9]{40}$/);
    expect(GEMMA_MODEL.runtime).toBe('4.2.0');
    expect(new Set(GEMMA_FILES.map((f) => f.name)).size).toBe(GEMMA_FILES.length);
    for (const variant of ['q4', 'q4f16'] as const) {
      expect(gemmaFiles(variant)).toHaveLength(9);
      expect(gemmaBytes(variant)).toBeGreaterThan(3_000_000_000);
      for (const file of gemmaFiles(variant)) {
        expect(file.sha256).toMatch(/^[a-f0-9]{64}$/);
        expect(file.bytes).toBeGreaterThan(0);
        expect(file.name).not.toMatch(/(?:audio|vision|processor|\.\.)(?:\/|_|\.)/);
        expect(gemmaURL(file)).toContain('/resolve/' + GEMMA_MODEL.revision + '/');
      }
    }
  });
  it('controle estrito separa a gestão Gemma de WebLLM e Chrome', () => {
    expect(isGemmaCommand({ target: 'gemma-cache', type: 'remove', variant: 'q4f16' })).toBe(true);
    expect(isGemmaCommand({ target: 'gemma-cache', type: 'unload' })).toBe(true);
    for (const bad of [
      { target: 'gemma-cache', type: 'status', variant: 'q4f16_1' },
      { target: 'gemma-cache', type: 'remove', variant: 'q4', url: 'https://example.com' },
      { target: 'gemma-cache', type: 'unload', variant: 'q4' },
      { target: 'model-cache', type: 'remove', variant: 'q4' },
    ])
      expect(isGemmaCommand(bad)).toBe(false);
  });
  it('protocolo aceita progresso das duas famílias e recusa valor disfarçado de string', () => {
    for (const variant of ['q4', 'q4f16', 'q4f16_1', 'q4f32_1'])
      expect(
        isClientEvent({ type: 'model-progress', binding, phase: 'loading', percent: 20, variant }),
      ).toBe(true);
    expect(
      isClientEvent({
        type: 'model-progress',
        binding,
        phase: 'loading',
        percent: 20,
        variant: { toString: () => 'q4' },
      }),
    ).toBe(false);
  });
});
