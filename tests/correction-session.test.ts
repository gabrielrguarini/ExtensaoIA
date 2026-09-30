// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { PreviewSession } from '../src/extension/content/preview-session';
import type { DraftSnapshot, WhatsAppAdapter } from '../src/integration/whatsapp/adapter';
import type { PreviewOutcome } from '../src/extension/content/preview-client';
import type { ActionGenerator } from '../src/extension/content/action-client';
import type { WritingAction } from '../src/shared/actions';

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
  const fragments: ((text: string) => void)[] = [];
  const requested: WritingAction[] = [];
  const cancel = vi.fn();
  const write: ActionGenerator = (action, _snapshot, _progress, fragment, callback) => {
    requested.push(action);
    fragments.push(fragment);
    done.push(callback);
    return cancel;
  };
  const session = new PreviewSession(
    adapter as unknown as WhatsAppAdapter,
    () => cancel,
    vi.fn(() => Promise.resolve()),
    () => cancel,
    write,
  );
  return { session, adapter, done, fragments, cancel, requested };
}

describe('prévia da correção local', () => {
  it('captura somente após Corrigir e aplica apenas por confirmação', async () => {
    const h = harness();
    h.session.open();
    expect(h.adapter.capture).not.toHaveBeenCalled();
    h.session.startAction('corrigir');
    expect(h.adapter.capture).toHaveBeenCalledOnce();
    expect(h.session.getState().kind).toBe('action-loading');
    expect(h.requested).toEqual(['corrigir']);
    h.done[0]?.({ ok: true, text: 'Você consegue me mandar o relatório hoje?' });
    expect(h.session.getState()).toMatchObject({
      kind: 'preview',
      source: 'action',
      action: 'corrigir',
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
    h.session.startAction('corrigir');
    h.adapter.isCurrent.mockReturnValue(false);
    h.done[0]?.({ ok: true, text: 'Resultado obsoleto' });
    expect(h.session.getState().kind).toBe('notice');
    expect(await h.session.replace()).toBe(false);
    expect(h.adapter.replace).not.toHaveBeenCalled();
  });

  it('não libera resultado vazio, falho ou posterior ao cancelamento', () => {
    const h = harness();
    h.session.open();
    h.session.startAction('corrigir');
    h.done[0]?.({ ok: false, message: 'Modelo falhou.' });
    expect(h.session.getState()).toEqual({ kind: 'notice', message: 'Modelo falhou.' });
    h.session.open();
    h.session.startAction('corrigir');
    h.session.close();
    h.done[1]?.({ ok: true, text: 'Atrasado' });
    expect(h.session.getState()).toEqual({ kind: 'closed' });
    expect(h.cancel).toHaveBeenCalled();
  });

  it('mantém o modo selecionado e descarta resultado anterior ao trocar de ação', () => {
    const h = harness();
    h.session.open();
    h.session.startAction('formal');
    h.session.open();
    h.session.startAction('profissional');
    h.done[0]?.({ ok: true, text: 'Resultado de Formal' });
    expect(h.session.getState()).toMatchObject({
      kind: 'action-loading',
      action: 'profissional',
    });
    h.done[1]?.({ ok: true, text: 'Resultado profissional' });
    expect(h.session.getState()).toMatchObject({
      kind: 'preview',
      action: 'profissional',
      text: 'Resultado profissional',
    });
  });

  it('mostra trecho provisório sem liberar edição e o remove ao cancelar', async () => {
    const h = harness();
    h.session.open();
    h.session.startAction('melhorar');
    h.fragments[0]?.('Texto parcial seguro');
    expect(h.session.getState()).toMatchObject({
      kind: 'action-loading',
      partial: 'Texto parcial seguro',
    });
    expect(await h.session.replace()).toBe(false);
    expect(h.adapter.replace).not.toHaveBeenCalled();
    h.session.close();
    h.fragments[0]?.('Fragmento tardio');
    h.done[0]?.({ ok: true, text: 'Resultado tardio' });
    expect(h.session.getState()).toEqual({ kind: 'closed' });
    expect(h.cancel).toHaveBeenCalledOnce();
  });
});
