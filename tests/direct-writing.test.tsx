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
  const adapter = {
    capture: vi.fn(() => snapshot),
    isCurrent: vi.fn(() => true),
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
  it('não aplica fragmentos; aplica uma única resposta final sem criar prévia', async () => {
    const h = harness();
    await h.start();
    h.write.mock.calls[0]![3]('Teste');
    expect(h.adapter.replace).not.toHaveBeenCalled();
    h.complete();
    expect(h.session.getState().kind).toBe('applying');
    expect(h.adapter.replace).toHaveBeenCalledWith(
      h.snapshot,
      'Teste sintético.',
      expect.any(AbortSignal),
    );
    // Nossas próprias mutações de inserção não cancelam a aplicação em curso.
    h.adapter.isCurrent.mockReturnValue(false);
    h.session.validate();
    await Promise.resolve();
    expect(h.session.getState().kind).toBe('closed');
    expect(h.adapter.replace).toHaveBeenCalledOnce();
    expect(h.write).toHaveBeenCalledOnce();
  });
  it.each(['cancelar', 'editar'] as const)(
    'não aplica conclusão atrasada após %s',
    async (reason) => {
      const h = harness();
      await h.start();
      if (reason === 'cancelar') h.session.close();
      else {
        h.adapter.isCurrent.mockReturnValue(false);
        h.session.validate();
      }
      h.complete();
      await Promise.resolve();
      expect(h.adapter.replace).not.toHaveBeenCalled();
      expect(h.cancel).toHaveBeenCalledOnce();
    },
  );
  it.each(['idêntica', 'vazia', 'incompatível', 'download', 'desconexão'] as const)(
    'preserva o rascunho para saída %s sem abrir janela',
    async (caseName) => {
      const h = harness();
      await h.start();
      if (caseName === 'incompatível') h.adapter.canReplace.mockReturnValue(false);
      if (caseName === 'download')
        h.write.mock.calls[0]![4]({
          ok: false,
          code: 'DOWNLOAD_REQUIRED',
          message: 'Download ausente.',
        });
      else if (caseName === 'desconexão')
        h.write.mock.calls[0]![4]({ ok: false, message: 'Conexão encerrada.' });
      else
        h.complete(
          caseName === 'idêntica'
            ? h.snapshot.text
            : caseName === 'vazia'
              ? ' '
              : 'Teste sintético.',
        );
      await Promise.resolve();
      expect(h.session.isDirect()).toBe(true);
      expect(h.session.getState().kind).toBe('notice');
      expect(h.adapter.replace).not.toHaveBeenCalled();
    },
  );
  it('trocar modo durante a aplicação aborta sua transação e descarta retorno atrasado', async () => {
    const h = harness();
    let finish: (result: ReplacementResult) => void = () => undefined;
    h.adapter.replace.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    await h.start();
    h.complete();
    const signal = h.adapter.replace.mock.calls[0]![2];
    h.changed({ ...DEFAULT_PREFERENCES, interaction: 'preview' });
    expect(signal?.aborted).toBe(true);
    finish('stale');
    await Promise.resolve();
    const state = h.session.getState();
    expect(state.kind).toBe('notice');
    if (state.kind === 'notice') expect(state.message).toContain('cancelado');
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
