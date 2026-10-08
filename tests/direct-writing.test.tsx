// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PreviewSession } from '../src/extension/content/preview-session';
import { PreviewPanel } from '../src/extension/content/PreviewPanel';
import {
  DEFAULT_PREFERENCES,
  parsePreferences,
  isPreferencePatch,
} from '../src/shared/preferences';
import type { WritingPreferences } from '../src/shared/preferences';
import type { ActionGenerator } from '../src/extension/content/action-client';
import type { WhatsAppAdapter, ReplacementResult } from '../src/integration/whatsapp/adapter';
import { StreamingDraft } from '../src/integration/whatsapp/streaming-draft';
import type { StreamEditor, StreamWriteResult } from '../src/integration/whatsapp/streaming-draft';

vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
const sessions: PreviewSession[] = [];
afterEach(() => {
  for (const session of sessions.splice(0)) session.close();
});
function harness(interaction: WritingPreferences['interaction'] = 'direct') {
  const snapshot = {
    editorId: 'editor',
    snapshotId: 'snapshot',
    revision: 1,
    text: 'teste sintetico',
    replacementAllowed: true,
  };
  let content = snapshot.text;
  const nativeWrite = vi.fn<StreamEditor['write']>((text, append, _expected, active) => {
    if (!active()) return Promise.resolve('stale');
    content = append ? content + text : text;
    return Promise.resolve('applied');
  });
  const nativeRestore = vi.fn<StreamEditor['restore']>(async (expected, original, active) => {
    await Promise.resolve();
    if (!active() || content !== expected || !adapter.isContextCurrent()) return false;
    content = original;
    return true;
  });
  const adapter = {
    capture: vi.fn(() => snapshot),
    isCurrent: vi.fn(() => true),
    isContextCurrent: vi.fn(() => true),
    beginStream: vi.fn(
      (_snapshot: unknown, failed: (reason: StreamWriteResult) => void) =>
        new StreamingDraft(
          {
            current: () => adapter.isContextCurrent(),
            read: () => content,
            write: nativeWrite,
            restore: nativeRestore,
          },
          snapshot.text,
          failed,
        ),
    ),
    canReplace: vi.fn(() => true),
    replace: vi.fn<
      (snapshot: unknown, text: string, signal?: AbortSignal) => Promise<ReplacementResult>
    >(() => Promise.resolve('applied')),
  };
  let changed: (value: WritingPreferences) => void = () => undefined;
  const cancel = vi.fn();
  const write = vi.fn<ActionGenerator>(() => cancel);
  const session = new PreviewSession(
    adapter as unknown as WhatsAppAdapter,
    vi.fn(),
    vi.fn(),
    vi.fn(),
    write,
    {
      read: () => Promise.resolve({ ...DEFAULT_PREFERENCES, interaction }),
      setProfile: () => Promise.resolve(DEFAULT_PREFERENCES),
      subscribe: (listener) => {
        changed = listener;
        return vi.fn();
      },
    },
  );
  sessions.push(session);
  return {
    session,
    snapshot,
    adapter,
    write,
    cancel,
    nativeWrite,
    nativeRestore,
    read: () => content,
    edit: (text: string) => {
      content = text;
    },
    changed: (value: WritingPreferences) => changed(value),
    complete: (text = 'Teste sintético.') => write.mock.calls[0]![4]({ ok: true, text }),
    start: async () => {
      session.executeConfigured();
      await Promise.resolve();
    },
  };
}
describe('substituição direta autorizada pelo clique em IA', () => {
  it('migra para direto preservando a ação anterior e aceita seleção explícita de prévia', () => {
    expect(DEFAULT_PREFERENCES).toMatchObject({
      version: 8,
      interaction: 'direct',
      defaultAction: 'corrigir',
    });
    expect(
      parsePreferences({
        version: 7,
        defaultAction: 'formal',
        profile: 'qualidade',
        theme: 'dark',
        interaction: 'preview',
      }),
    ).toMatchObject({
      version: 8,
      interaction: 'direct',
      defaultAction: 'formal',
      profile: 'qualidade',
      theme: 'dark',
    });
    expect(parsePreferences({ version: 8, interaction: 'preview' }).interaction).toBe('preview');
    expect(isPreferencePatch({ interaction: 'send' })).toBe(false);
  });
  it('aplica fragmentos diretamente e acrescenta somente o restante ao concluir', async () => {
    const h = harness();
    await h.start();
    h.write.mock.calls[0]![3]('Teste');
    await vi.waitFor(() => expect(h.read()).toBe('Teste'));
    expect(h.adapter.replace).not.toHaveBeenCalled();
    h.complete();
    // Nossas próprias mutações de inserção não cancelam a aplicação em curso.
    h.adapter.isCurrent.mockReturnValue(false);
    h.session.validate();
    await vi.waitFor(() => expect(h.session.getState().kind).toBe('closed'));
    expect(h.read()).toBe('Teste sintético.');
    expect(h.nativeWrite.mock.calls.map(([text, append]) => [text, append])).toEqual([
      ['Teste', false],
      [' sintético.', true],
    ]);
    expect(h.write).toHaveBeenCalledOnce();
  });
  it.each(['cancelar', 'trocar de conversa'] as const)(
    'não aplica conclusão atrasada após %s',
    async (reason) => {
      const h = harness();
      await h.start();
      if (reason === 'cancelar') h.session.close();
      else {
        h.adapter.isContextCurrent.mockReturnValue(false);
        h.session.validate();
      }
      h.complete();
      await Promise.resolve();
      expect(h.adapter.replace).not.toHaveBeenCalled();
      expect(h.nativeWrite).not.toHaveBeenCalled();
      expect(h.cancel).toHaveBeenCalledOnce();
    },
  );
  it.each(['vazia', 'download', 'desconexão'] as const)(
    'preserva o rascunho para saída %s sem abrir janela',
    async (caseName) => {
      const h = harness();
      await h.start();
      if (caseName === 'download')
        h.write.mock.calls[0]![4]({
          ok: false,
          code: 'DOWNLOAD_REQUIRED',
          message: 'Download ausente.',
        });
      else if (caseName === 'desconexão')
        h.write.mock.calls[0]![4]({ ok: false, message: 'Conexão encerrada.' });
      else h.complete(' ');
      await Promise.resolve();
      expect(h.session.isDirect()).toBe(true);
      expect(h.session.getState().kind).toBe('notice');
      expect(h.adapter.replace).not.toHaveBeenCalled();
    },
  );
  it('trocar modo durante a aplicação aborta sua transação e descarta retorno atrasado', async () => {
    const h = harness();
    let finish: (result: StreamWriteResult) => void = () => undefined;
    h.nativeWrite.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    await h.start();
    h.complete();
    const active = h.nativeWrite.mock.calls[0]![3];
    h.changed({ ...DEFAULT_PREFERENCES, interaction: 'preview' });
    expect(active?.()).toBe(false);
    finish('stale');
    await Promise.resolve();
    const state = h.session.getState();
    expect(state.kind).toBe('notice');
    if (state.kind === 'notice') expect(state.message).toContain('cancelado');
  });
  it('tolera digitação antes da resposta e preserva edição nos trechos já recebidos', async () => {
    const h = harness();
    await h.start();
    h.adapter.isCurrent.mockReturnValue(false);
    h.edit('Digitado durante a espera');
    h.session.validate();
    h.write.mock.calls[0]![3]('Teste');
    await vi.waitFor(() => expect(h.read()).toBe('Teste'));
    h.edit('Minha edição');
    h.session.validate();
    h.complete();
    await vi.waitFor(() => expect(h.session.getState().kind).toBe('closed'));
    expect(h.read()).toBe('Minha edição sintético.');
  });
  it('recupera o original em falha, ou mantém edição e oferece recuperação explícita', async () => {
    for (const edited of [false, true]) {
      const h = harness();
      await h.start();
      h.write.mock.calls[0]![3]('Parcial');
      await vi.waitFor(() => expect(h.read()).toBe('Parcial'));
      if (edited) h.edit('Minha edição');
      h.write.mock.calls[0]![4]({ ok: false, message: 'Falha sintética.' });
      await vi.waitFor(() => expect(h.read()).toBe(edited ? 'Minha edição' : h.snapshot.text));
      if (edited) {
        await vi.waitFor(() => expect(h.session.getState().kind).toBe('recovery'));
        await h.session.restoreOriginal();
        expect(h.read()).toBe(h.snapshot.text);
      }
    }
  });
  it('ação manual de envio aborta também uma recuperação que ainda espera antes de escrever', async () => {
    const h = harness();
    let resume: () => void = () => undefined;
    h.nativeRestore.mockImplementation(async (_expected, original, active) => {
      await new Promise<void>((resolve) => {
        resume = resolve;
      });
      if (!active()) return false;
      h.edit(original);
      return true;
    });
    await h.start();
    h.write.mock.calls[0]![3]('Parcial');
    await vi.waitFor(() => expect(h.read()).toBe('Parcial'));
    h.session.close();
    await vi.waitFor(() => expect(h.nativeRestore).toHaveBeenCalledOnce());
    h.session.close(false);
    resume();
    await Promise.resolve();
    await Promise.resolve();
    expect(h.read()).toBe('Parcial');
    expect(h.session.getState().kind).toBe('closed');
  });
  it('selecionar Revisar sugestão mantém aplicação manual e nunca aplica sozinho', async () => {
    const h = harness('preview');
    await h.start();
    h.complete();
    expect(h.session.isDirect()).toBe(false);
    expect(h.session.getState()).toMatchObject({ kind: 'preview', text: 'Teste sintético.' });
    expect(h.adapter.replace).not.toHaveBeenCalled();
    expect(await h.session.replace()).toBe(true);
  });
  it('não monta dialog no modo direto, inclusive em aplicação e erro', async () => {
    const h = harness();
    const node = document.createElement('div');
    const root = createRoot(node);
    try {
      await act(async () => {
        root.render(<PreviewPanel session={h.session} onClose={() => h.session.close()} />);
        await h.start();
      });
      expect(node.children).toHaveLength(0);
      await act(async () => {
        h.write.mock.calls[0]![4]({ ok: false, message: 'Falha sintética.' });
        await Promise.resolve();
      });
      expect(node.children).toHaveLength(0);
    } finally {
      await act(async () => {
        root.unmount();
        await Promise.resolve();
      });
    }
  });
});
