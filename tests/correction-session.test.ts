// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { PreviewSession } from '../src/extension/content/preview-session';
import type { DraftSnapshot, WhatsAppAdapter } from '../src/integration/whatsapp/adapter';
import type { PreviewOutcome } from '../src/extension/content/preview-client';
import type { CorrectionGenerator } from '../src/extension/content/correction-client';

const draft: DraftSnapshot = {
  editorId: 'editor',
  snapshotId: 'snapshot',
  revision: 2,
  text: 'vc consegue me mandar o relatório hj?',
  replacementAllowed: true,
};

function harness() {
  const adapter = {
    capture: vi.fn(() => draft),
    isCurrent: vi.fn(() => true),
    matches: vi.fn(() => true),
    canReplace: vi.fn(() => true),
    replace: vi.fn(() => Promise.resolve('applied' as const)),
  };
  const done: ((outcome: PreviewOutcome) => void)[] = [];
  const cancel = vi.fn();
  const correct: CorrectionGenerator = (_snapshot, _progress, callback) => {
    done.push(callback);
    return cancel;
  };
  const session = new PreviewSession(
    adapter as unknown as WhatsAppAdapter,
    () => cancel,
    vi.fn(() => Promise.resolve()),
    () => cancel,
    correct,
  );
  return { session, adapter, done, cancel };
}

describe('prévia da correção local', () => {
  it('captura somente após Corrigir e aplica apenas por confirmação', async () => {
    const h = harness();
    h.session.open();
    expect(h.adapter.capture).not.toHaveBeenCalled();
    h.session.startCorrection();
    expect(h.adapter.capture).toHaveBeenCalledOnce();
    expect(h.session.getState().kind).toBe('correction-loading');
    h.done[0]?.({ ok: true, text: 'Você consegue me mandar o relatório hoje?' });
    expect(h.session.getState()).toMatchObject({
      kind: 'preview',
      source: 'correction',
      canReplace: true,
    });
    expect(h.adapter.replace).not.toHaveBeenCalled();
    expect(await h.session.replace()).toBe(true);
    expect(h.adapter.replace.mock.calls[0]?.slice(0, 2)).toEqual([
      draft,
      'Você consegue me mandar o relatório hoje?',
    ]);
  });

  it('descarta resposta atrasada quando rascunho ou contexto muda', async () => {
    const h = harness();
    h.session.open();
    h.session.startCorrection();
    h.adapter.isCurrent.mockReturnValue(false);
    h.done[0]?.({ ok: true, text: 'Resultado obsoleto' });
    expect(h.session.getState().kind).toBe('notice');
    expect(await h.session.replace()).toBe(false);
    expect(h.adapter.replace).not.toHaveBeenCalled();
  });

  it('não libera resultado vazio, falho ou posterior ao cancelamento', () => {
    const h = harness();
    h.session.open();
    h.session.startCorrection();
    h.done[0]?.({ ok: false, message: 'Modelo falhou.' });
    expect(h.session.getState()).toEqual({ kind: 'notice', message: 'Modelo falhou.' });
    h.session.open();
    h.session.startCorrection();
    h.session.close();
    h.done[1]?.({ ok: true, text: 'Atrasado' });
    expect(h.session.getState()).toEqual({ kind: 'closed' });
    expect(h.cancel).toHaveBeenCalled();
  });
});
