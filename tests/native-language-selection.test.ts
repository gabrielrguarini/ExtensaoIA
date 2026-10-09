import { describe, expect, it, vi } from 'vitest';
import { WRITING_ACTIONS } from '../src/shared/actions';
import { ChromeEngine } from '../src/extension/ai/chrome-engine';
import { nativeConfig } from '../src/extension/ai/chrome-api';
import { selectNativeQuery } from '../src/extension/ai/native-choice';

describe('seleção nativa sem consultas incompatíveis com português', () => {
  it('as nove ações consultam/criam apenas a configuração compatível, sem provocar os erros nativos', async () => {
    const errors: string[] = [];
    const invalid = (message: string) => {
      errors.push(message);
      return Promise.reject(new DOMException(message, 'NotSupportedError'));
    };
    const prompt = {
      availability: vi.fn((options: LanguageModelCreateOptions) =>
        options.expectedOutputs?.some((output) => output.languages?.includes('pt-BR'))
          ? invalid('Unsupported LanguageModel API languages were specified')
          : Promise.resolve<Availability>('available'),
      ),
      create: vi.fn(() => Promise.resolve({ destroy: vi.fn(), clone: vi.fn() })),
    };
    const specialized = {
      availability: vi.fn(() => invalid('The requested language options are not supported.')),
      create: vi.fn(),
    };
    const engine = new ChromeEngine({
      prompt: prompt as unknown as typeof LanguageModel,
      rewriter: specialized as unknown as typeof Rewriter,
      proofreader: specialized as unknown as typeof Proofreader,
    });
    for (const { id: action } of WRITING_ACTIONS) {
      const selected = await selectNativeQuery({ action, language: 'pt-BR' }, (query) =>
        engine.availability(query),
      );
      expect(selected.availability.state).toBe('ready');
      const config = nativeConfig(selected.query);
      expect(config.api).toBe('prompt');
      expect(config.options).toMatchObject({
        expectedInputs: [{ type: 'text' }],
        expectedOutputs: [{ type: 'text', languages: ['en'] }],
      });
      await engine.initialize({ query: selected.query });
      expect(prompt.create).toHaveBeenLastCalledWith(expect.objectContaining(config.options));
      await engine.unload();
    }
    expect(errors).toEqual([]);
    expect(specialized.availability).not.toHaveBeenCalled();
    expect(specialized.create).not.toHaveBeenCalled();
  });
  it('uma consulta compatível indisponível não retorna à declaração rejeitada', async () => {
    const probe = vi.fn(() =>
      Promise.resolve({
        state: 'unavailable' as const,
        nativeAvailability: 'unavailable' as const,
      }),
    );
    const selected = await selectNativeQuery({ action: 'corrigir', language: 'pt-BR' }, probe);
    expect(selected.availability.state).toBe('unavailable');
    expect(probe).toHaveBeenCalledExactlyOnceWith({
      action: 'corrigir',
      language: 'pt-BR',
      chromePortuguesePrompt: true,
    });
  });
});
