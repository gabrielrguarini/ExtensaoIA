// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { PreviewSession } from '../src/extension/content/preview-session';
import { PreviewPanel } from '../src/extension/content/PreviewPanel';
import { DEFAULT_PREFERENCES } from '../src/shared/preferences';
import type { PreviewOutcome } from '../src/extension/content/preview-client';
import type { WhatsAppAdapter, DraftSnapshot } from '../src/integration/whatsapp/adapter';
import { createSuggestion } from '../src/extension/ai/suggestion-result';
import { suggestionMetadata } from './fixtures';

vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
const original = 'fazendo o teste da extensao apra ver se funciona de verdade';
const corrected = 'Fazendo o teste da extensão pra ver se funciona de verdade.';
function harness(text = original) {
  const snapshot: DraftSnapshot = {
    editorId: 'editor',
    snapshotId: 'snapshot',
    revision: 1,
    text,
    replacementAllowed: true,
  };
  let done: ((value: PreviewOutcome) => void) | undefined;
  const cancel = vi.fn();
  const adapter = {
    capture: () => snapshot,
    isCurrent: vi.fn(() => true),
    matches: vi.fn(() => true),
    canReplace: () => true,
    replace: vi.fn(() => Promise.resolve('applied' as const)),
  };
  const write = vi.fn(
    (
      _action: unknown,
      _snapshot: unknown,
      _progress: unknown,
      _fragment: unknown,
      callback: (value: PreviewOutcome) => void,
    ) => {
      done = callback;
      return cancel;
    },
  );
  const prefs = {
    read: () => Promise.resolve(DEFAULT_PREFERENCES),
    setProfile: () => Promise.resolve(DEFAULT_PREFERENCES),
  };
  const clipboard = vi.fn(() => Promise.resolve());
  const session = new PreviewSession(
    adapter as unknown as WhatsAppAdapter,
    () => cancel,
    clipboard,
    () => cancel,
    write,
    prefs,
  );
  return {
    session,
    adapter,
    write,
    cancel,
    clipboard,
    finish: (output: string) =>
      done?.({ ok: true, ...createSuggestion(text, output, suggestionMetadata.engine) }),
  };
}
describe('prévia com revisão pelo usuário', () => {
  it.each([
    [original, corrected, 'Sugestão gerada.'],
    ['Não envie R$ 25 para João.', 'Envie R$ 50 para Maria.', 'Sugestão gerada.'],
    ['Pode revisar? 🙂', 'Pode revisar? 🙂', 'Sem alterações.'],
  ])(
    'apresenta a resposta sem julgamento e permite copiar/substituir: caso %#',
    async (input, output, status) => {
      const h = harness(input);
      const container = document.createElement('div');
      document.body.append(container);
      const root = createRoot(container);
      try {
        await act(async () => {
          root.render(<PreviewPanel session={h.session} onClose={() => h.session.close()} />);
          h.session.open();
          await Promise.resolve();
        });
        expect(container.textContent).not.toContain('Analisar sentido');
        await act(async () => {
          h.session.startAction('corrigir');
          h.finish(output);
          await Promise.resolve();
        });
        expect(container.querySelector('pre')?.textContent).toBe(output);
        expect(container.textContent).toContain(status);
        expect(container.textContent).toContain('Revise o texto antes de usar a sugestão.');
        expect(container.textContent).not.toMatch(
          /risco|Possível|mesmo assim|Analisar sentido|avisos/iu,
        );
        const replace = [...container.querySelectorAll('button')].find(
          (b) => b.textContent === 'Substituir',
        );
        expect(replace?.disabled).toBe(false);
        expect(h.write).toHaveBeenCalledOnce();
        expect(h.adapter.replace).not.toHaveBeenCalled();
        await act(async () => {
          await h.session.copy();
        });
        expect(h.clipboard).toHaveBeenCalledWith(output);
        await act(async () => {
          await h.session.replace();
        });
        expect(h.adapter.replace).toHaveBeenCalledOnce();
        expect(h.session.getState()).toEqual({ kind: 'closed' });
      } finally {
        await act(async () => {
          root.unmount();
          h.session.close();
          await Promise.resolve();
        });
        container.remove();
      }
    },
  );
  it('descarta resposta atrasada depois de edição ou cancelamento', async () => {
    for (const stale of [true, false]) {
      const h = harness();
      h.session.open();
      await Promise.resolve();
      h.session.startAction('corrigir');
      if (stale) {
        h.adapter.isCurrent.mockReturnValue(false);
        h.adapter.matches.mockReturnValue(false);
        h.session.validate();
      } else h.session.close();
      h.finish(corrected);
      expect(h.session.getState().kind).toBe(stale ? 'notice' : 'closed');
      expect(await h.session.replace()).toBe(false);
      await h.session.copy();
      expect(h.adapter.replace).not.toHaveBeenCalled();
      expect(h.clipboard).not.toHaveBeenCalled();
      expect(h.cancel).toHaveBeenCalled();
      h.session.close();
    }
  });
});
