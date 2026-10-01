import { describe, expect, it } from 'vitest';
import { isChromeCommand, isChromeStatus } from '../src/shared/chrome-management';
import { WRITING_ACTIONS } from '../src/shared/actions';

describe('gestão separada dos artefatos Chrome', () => {
  it('aceita somente status/unload sem remoção de artefatos, idioma ou destino arbitrário', () => {
    expect(isChromeCommand({ target: 'chrome-ai', type: 'status' })).toBe(true);
    expect(isChromeCommand({ target: 'chrome-ai', type: 'unload' })).toBe(true);
    for (const command of [
      { target: 'chrome-ai', type: 'remove' },
      { target: 'chrome-ai', type: 'status', language: 'en' },
      { target: 'chrome-ai', type: 'status', text: 'conteúdo indevido' },
    ])
      expect(isChromeCommand(command)).toBe(false);
  });
  it('preserva consulta desconhecida e recusa ações duplicadas/ausentes ou dados extras', () => {
    const status = {
      ok: true,
      language: 'pt-BR',
      chromePortuguesePrompt: false,
      sessionReady: false,
      actions: [
        ...WRITING_ACTIONS.map(({ id }) => ({ action: id, availability: 'unavailable' })),
        { action: 'semantic-review', availability: null },
      ],
    };
    expect(isChromeStatus(status)).toBe(true);
    expect(isChromeStatus({ ...status, actions: status.actions.slice(1) })).toBe(false);
    expect(
      isChromeStatus({ ...status, actions: [...status.actions.slice(1), status.actions[1]] }),
    ).toBe(false);
    expect(isChromeStatus({ ...status, prompt: 'não persistir' })).toBe(false);
  });
});
