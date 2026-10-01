import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PREFERENCES } from '../src/shared/preferences';
import { preferenceStore } from '../src/extension/content/preferences-client';

afterEach(() => vi.unstubAllGlobals());
describe('cliente de preferências do produto', () => {
  it('aceita o esquema vigente recebido do coordenador e preserva motor/modelo', async () => {
    const response = { ...DEFAULT_PREFERENCES, engine: 'webllm', profile: 'qualidade' };
    vi.stubGlobal('chrome', {
      runtime: {
        sendMessage: (_command: unknown, callback: (value: unknown) => void) => callback(response),
      },
    });
    expect(await preferenceStore.read()).toEqual(response);
  });
  it('recusa resposta antiga ou erro de comunicação em vez de desbloquear a interface com defaults', async () => {
    vi.stubGlobal('chrome', {
      runtime: {
        sendMessage: (_command: unknown, callback: (value: unknown) => void) =>
          callback({ version: 3, profile: 'economico' }),
      },
    });
    await expect(preferenceStore.read()).rejects.toThrow('Preferências indisponíveis');
  });
});
