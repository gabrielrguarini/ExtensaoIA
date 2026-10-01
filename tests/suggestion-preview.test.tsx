// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { PreviewSession } from '../src/extension/content/preview-session';
import { PreviewPanel } from '../src/extension/content/PreviewPanel';
import { DEFAULT_PREFERENCES } from '../src/shared/preferences';
import type { PreviewOutcome } from '../src/extension/content/preview-client';
import type { WhatsAppAdapter, DraftSnapshot } from '../src/integration/whatsapp/adapter';
import { suggestionResult } from '../src/extension/ai/suggestion-assessment';
import { suggestionMetadata } from './fixtures';

vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
const snapshot: DraftSnapshot = {
  editorId: 'editor',
  snapshotId: 'snapshot',
  revision: 1,
  text: 'Não envie R$ 25 para João.',
  replacementAllowed: true,
};
function harness() {
  let done: ((value: PreviewOutcome) => void) | undefined;
  const cancel = vi.fn();
  const adapter = {
    capture: () => snapshot,
    isCurrent: vi.fn(() => true),
    matches: () => true,
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
  let reviewed: ((value: PreviewOutcome) => void) | undefined;
  const review = vi.fn(
    (_snapshot: DraftSnapshot, _text: string, callback: (value: PreviewOutcome) => void) => {
      reviewed = callback;
      return cancel;
    },
  );
  const values = { ...DEFAULT_PREFERENCES, semanticReview: true };
  const prefs = {
    read: () => Promise.resolve(values),
    setSemanticReview: () => Promise.resolve(values),
    setProfile: () => Promise.resolve(values),
    update: () => Promise.resolve(values),
  };
  const clipboard = vi.fn(() => Promise.resolve());
  const session = new PreviewSession(
    adapter as unknown as WhatsAppAdapter,
    () => cancel,
    clipboard,
    () => cancel,
    write,
    prefs,
    review,
  );
  return {
    session,
    adapter,
    write,
    review,
    cancel,
    clipboard,
    finish: (value: PreviewOutcome) => done?.(value),
    reviewed: (value: PreviewOutcome) => reviewed?.(value),
  };
}
describe('prévia com riscos e análise explícita', () => {
  it('renderiza avisos, permite copiar/substituir e não gera análise automática', async () => {
    const h = harness();
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(<PreviewPanel session={h.session} onClose={() => h.session.close()} />);
      h.session.open();
      await Promise.resolve();
    });
    const result = suggestionResult(
      snapshot.text,
      'Envie R$ 50 para Maria.',
      suggestionMetadata.engine,
    );
    await act(async () => {
      h.session.startAction('corrigir');
      h.finish({ ok: true, ...result });
      await Promise.resolve();
    });
    expect(container.textContent).toContain('Possível mudança de negação');
    expect(container.textContent).toContain('Substituir mesmo assim');
    expect(container.textContent).toContain('Analisar sentido');
    expect(h.review).not.toHaveBeenCalled();
    await act(async () => {
      await h.session.copy();
    });
    expect(h.clipboard).toHaveBeenCalledWith(result.text);
    await act(async () => {
      await h.session.replace();
    });
    expect(h.adapter.replace).toHaveBeenCalledOnce();
    await act(async () => {
      root.unmount();
      h.session.close();
      await Promise.resolve();
    });
    container.remove();
  });
  it('mantém a sugestão durante análise e descarta avaliação atrasada após edição', async () => {
    const h = harness();
    h.session.open();
    await Promise.resolve();
    await Promise.resolve();
    h.session.startAction('corrigir');
    const result = suggestionResult(
      snapshot.text,
      'Envie R$ 50 para Maria.',
      suggestionMetadata.engine,
    );
    h.finish({ ok: true, ...result });
    h.session.reviewMeaning();
    expect(h.review).toHaveBeenCalledOnce();
    expect(h.write).toHaveBeenCalledOnce();
    expect(h.session.getState()).toMatchObject({
      kind: 'preview',
      text: result.text,
      busy: 'review',
    });
    expect(await h.session.replace()).toBe(false);
    h.adapter.isCurrent.mockReturnValue(false);
    h.session.validate();
    expect(h.cancel).toHaveBeenCalled();
    h.reviewed({ ok: true, ...result });
    expect(h.session.getState().kind).toBe('notice');
    expect(h.adapter.replace).not.toHaveBeenCalled();
    h.session.close();
  });
  it('conserva riscos anteriores após falha técnica da análise adicional', async () => {
    const h = harness();
    h.session.open();
    await Promise.resolve();
    await Promise.resolve();
    h.session.startAction('corrigir');
    const result = suggestionResult(
      snapshot.text,
      'Envie R$ 50 para Maria.',
      suggestionMetadata.engine,
    );
    h.finish({ ok: true, ...result });
    h.session.reviewMeaning();
    h.reviewed({ ok: false, message: 'Análise indisponível.' });
    expect(h.session.getState()).toMatchObject({
      kind: 'preview',
      text: result.text,
      assessment: result.assessment,
      busy: null,
      message: 'Análise indisponível.',
    });
    h.session.close();
  });
});
