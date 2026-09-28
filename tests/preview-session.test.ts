// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PreviewSession } from '../src/extension/content/preview-session';
import type { PreviewGenerator, PreviewOutcome } from '../src/extension/content/preview-client';
import type { DraftSnapshot, WhatsAppAdapter } from '../src/integration/whatsapp/adapter';

const snapshot: DraftSnapshot = {
  editorId: 'editor',
  snapshotId: 'snapshot',
  revision: 1,
  text: 'Olá 👋\nTeste',
  replacementAllowed: true,
};
function harness() {
  const adapter = {
    capture: vi.fn(() => snapshot),
    isCurrent: vi.fn(() => true),
    matches: vi.fn(() => true),
    canReplace: vi.fn(() => true),
    replace: vi.fn(() => Promise.resolve('applied' as const)),
  };
  const cancel = vi.fn();
  const callbacks: ((outcome: PreviewOutcome) => void)[] = [];
  const generate: PreviewGenerator = (_snapshot, done) => {
    callbacks.push(done);
    return cancel;
  };
  const copy = vi.fn<(text: string) => Promise<void>>(() => Promise.resolve());
  const session = new PreviewSession(adapter as unknown as WhatsAppAdapter, generate, copy);
  const result = (index = 0) =>
    callbacks[index]?.({ ok: true, text: '[Simulação] ' + snapshot.text });
  const ready = () => {
    session.open();
    session.start();
    result();
  };
  return { session, adapter, cancel, copy, result, ready };
}
beforeEach(() => vi.restoreAllMocks());

describe('sessão da prévia', () => {
  it('abre menu sem capturar; captura somente ao pedir a simulação e não aplica automaticamente', () => {
    const h = harness();
    h.session.open();
    expect(h.adapter.capture).not.toHaveBeenCalled();
    h.session.start();
    expect(h.session.getState().kind).toBe('loading');
    h.result();
    expect(h.session.getState().kind).toBe('preview');
    expect(h.adapter.replace).not.toHaveBeenCalled();
    expect(h.copy).not.toHaveBeenCalled();
  });
  it('somente substitui após confirmação e libera o texto em memória ao concluir', async () => {
    const h = harness();
    h.ready();
    expect(await h.session.replace()).toBe(true);
    expect(h.adapter.replace.mock.calls[0]?.slice(0, 2)).toEqual([
      snapshot,
      '[Simulação] ' + snapshot.text,
    ]);
    expect(h.session.getState()).toEqual({ kind: 'closed' });
  });
  it('falha de cópia é visível e mantém o rascunho sem edição', async () => {
    const h = harness();
    h.ready();
    h.copy.mockRejectedValue(new Error('Negado'));
    await h.session.copy();
    const state = h.session.getState();
    expect(state).toMatchObject({ kind: 'preview', busy: null });
    if (state.kind !== 'preview') throw new Error('Prévia esperada.');
    expect(state.message).toContain('Não foi possível copiar');
    expect(h.adapter.replace).not.toHaveBeenCalled();
  });
  it('editor especial oferece cópia mas não substituição', async () => {
    const h = harness();
    h.adapter.canReplace.mockReturnValue(false);
    h.ready();
    expect(await h.session.replace()).toBe(false);
    await h.session.copy();
    expect(h.copy).toHaveBeenCalledWith('[Simulação] ' + snapshot.text);
    expect(h.adapter.replace).not.toHaveBeenCalled();
  });
  it('mudança de revisão remove o resultado e bloqueia copiar/substituir', async () => {
    const h = harness();
    h.ready();
    h.adapter.isCurrent.mockReturnValue(false);
    h.session.validate();
    expect(h.session.getState()).toMatchObject({ kind: 'notice' });
    expect(JSON.stringify(h.session.getState())).not.toContain(snapshot.text);
    await h.session.copy();
    await h.session.replace();
    expect(h.copy).not.toHaveBeenCalled();
    expect(h.adapter.replace).not.toHaveBeenCalled();
  });
  it('cancelamento descarta respostas atrasadas inclusive após abrir outra prévia', () => {
    const h = harness();
    h.session.open();
    h.session.start();
    h.session.close();
    h.session.open();
    h.session.start();
    h.result(0);
    expect(h.session.getState()).toEqual({ kind: 'loading' });
    h.result(1);
    expect(h.session.getState().kind).toBe('preview');
    expect(h.cancel).toHaveBeenCalled();
  });
  it('mudança ocorrida antes da resposta nunca libera uma sugestão antiga', () => {
    const h = harness();
    h.session.open();
    h.session.start();
    h.adapter.isCurrent.mockReturnValue(false);
    h.result();
    expect(h.session.getState().kind).toBe('notice');
  });
  it('copiar pendente não reabre um resultado cancelado', async () => {
    const h = harness();
    h.ready();
    let complete = (): void => {};
    h.copy.mockReturnValue(
      new Promise<void>((resolve) => {
        complete = resolve;
      }),
    );
    const copied = h.session.copy();
    h.session.close();
    complete();
    await copied;
    expect(h.session.getState()).toEqual({ kind: 'closed' });
  });
  it('recusa rascunho vazio e entrada acima do limite da simulação', () => {
    const h = harness();
    for (const text of ['\u200b\n', 'a'.repeat(8_000)]) {
      h.adapter.capture.mockReturnValue({ ...snapshot, text });
      h.session.open();
      h.session.start();
      expect(h.session.getState().kind).toBe('notice');
    }
  });
});
