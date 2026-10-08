// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { PreviewSession } from '../src/extension/content/preview-session';
import { PreviewPanel } from '../src/extension/content/PreviewPanel';
import { PreferenceFields } from '../src/extension/settings/PreferenceFields';
import {
  DEFAULT_PREFERENCES,
  parsePreferences,
  isPreferencePatch,
} from '../src/shared/preferences';
import type { WritingPreferences } from '../src/shared/preferences';
import type { WhatsAppAdapter } from '../src/integration/whatsapp/adapter';
import { selectNativeQuery } from '../src/extension/ai/native-choice';
import type { ActionGenerator } from '../src/extension/content/action-client';
import { StreamingDraft } from '../src/integration/whatsapp/streaming-draft';

vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
function harness() {
  const snapshot = {
    editorId: 'editor',
    snapshotId: 'snapshot',
    revision: 1,
    text: 'Teste sintético.',
    replacementAllowed: true,
  };
  const adapter = {
    capture: vi.fn(() => snapshot),
    isCurrent: vi.fn(() => true),
    isContextCurrent: vi.fn(() => true),
    beginStream: vi.fn(
      () =>
        new StreamingDraft(
          {
            current: () => true,
            read: () => snapshot.text,
            write: () => Promise.resolve('applied'),
            restore: () => Promise.resolve(true),
          },
          snapshot.text,
          vi.fn(),
        ),
    ),
  };
  let resolve: (value: WritingPreferences) => void = () => undefined;
  let changed: (value: WritingPreferences) => void = () => undefined;
  const cancel = vi.fn();
  const write = vi.fn<ActionGenerator>(() => cancel);
  const session = new PreviewSession(
    adapter as unknown as WhatsAppAdapter,
    () => cancel,
    () => Promise.resolve(),
    () => cancel,
    write,
    {
      read: () =>
        new Promise<WritingPreferences>((done) => {
          resolve = done;
        }),
      setProfile: () => Promise.resolve(DEFAULT_PREFERENCES),
      subscribe: (callback) => {
        changed = callback;
        return vi.fn();
      },
    },
  );
  return {
    session,
    adapter,
    cancel,
    write,
    resolve: (value: WritingPreferences) => resolve(value),
    changed: (value: WritingPreferences) => changed(value),
  };
}
describe('ação salva com um clique', () => {
  it('captura o rascunho no gesto, lê a ação salva e inicia uma geração', async () => {
    const h = harness();
    h.session.executeConfigured();
    expect(h.adapter.capture).toHaveBeenCalledOnce();
    expect(h.write).not.toHaveBeenCalled();
    h.resolve({ ...DEFAULT_PREFERENCES, defaultAction: 'conciso', profile: 'qualidade' });
    await Promise.resolve();
    expect(h.write).toHaveBeenCalledOnce();
    expect(h.write.mock.calls[0]?.[0]).toBe('conciso');
    expect(h.session.getState().kind).toBe('action-loading');
    h.session.close();
  });
  it.each(['troca de conversa', 'cancelamento'])(
    'não gera após %s enquanto lê as configurações',
    async (reason) => {
      const h = harness();
      h.session.executeConfigured();
      if (reason === 'troca de conversa') h.adapter.isContextCurrent.mockReturnValue(false);
      else h.session.close();
      h.resolve(DEFAULT_PREFERENCES);
      await Promise.resolve();
      expect(h.write).not.toHaveBeenCalled();
      expect(h.session.getState().kind).toBe(reason === 'troca de conversa' ? 'notice' : 'closed');
      h.session.close();
    },
  );
  it('prefere uma alteração nova à leitura atrasada e cancela ao mudar a ação em execução', async () => {
    const h = harness();
    h.session.executeConfigured();
    h.changed({ ...DEFAULT_PREFERENCES, defaultAction: 'formal' });
    h.resolve(DEFAULT_PREFERENCES);
    await Promise.resolve();
    expect(h.write.mock.calls[0]?.[0]).toBe('formal');
    h.changed({ ...DEFAULT_PREFERENCES, defaultAction: 'amigavel' });
    expect(h.cancel).toHaveBeenCalledOnce();
    expect(h.session.getState().kind).toBe('notice');
    h.session.close();
  });
  it('não apresenta configurações, modelos ou simulações no editor', async () => {
    const h = harness();
    const container = document.createElement('div');
    const root = createRoot(container);
    try {
      await act(async () => {
        await Promise.resolve();
        root.render(<PreviewPanel session={h.session} onClose={() => h.session.close()} />);
        h.session.executeConfigured();
      });
      expect(container.querySelector('select, input, fieldset')).toBeNull();
      expect(container.textContent).not.toMatch(
        /pt-BR|WebLLM|Transformers|Simulação|Testar IA|Perfil/iu,
      );
      expect(container.children).toHaveLength(0);
    } finally {
      await act(async () => {
        await Promise.resolve();
        root.unmount();
        h.session.close();
      });
    }
  });
  it('configura as nove ações e quatro modelos sem interruptor de idioma ou runtime', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    try {
      await act(async () => {
        await Promise.resolve();
        root.render(
          <PreferenceFields
            value={DEFAULT_PREFERENCES}
            disabled={false}
            onChange={() => undefined}
          />,
        );
      });
      expect(
        container.querySelector('[aria-label="Ação do botão IA"]')?.querySelectorAll('option'),
      ).toHaveLength(9);
      expect(
        [
          ...(container.querySelector('[aria-label="Tipo de IA"]')?.querySelectorAll('option') ??
            []),
        ].map((option) => option.textContent),
      ).toEqual(['IA Nativa', 'Modelo']);
      expect(container.querySelector('[aria-label="Modelo"]')).toBeNull();
      expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(2);
      expect(container.textContent).not.toMatch(
        /WebLLM|Transformers|experimental|shader|VRAM|simula/iu,
      );
      await act(async () => {
        await Promise.resolve();
        root.render(
          <PreferenceFields
            value={{ ...DEFAULT_PREFERENCES, engine: 'local', localModel: 'gemma' }}
            disabled={false}
            onChange={() => undefined}
          />,
        );
      });
      const model = container.querySelector<HTMLSelectElement>('[aria-label="Modelo"]');
      expect(model?.querySelectorAll('option')).toHaveLength(4);
      expect(model?.value).toBe('gemma');
    } finally {
      await act(async () => {
        root.unmount();
        await Promise.resolve();
      });
    }
    const migrated = parsePreferences({
      version: 6,
      chromePortuguesePrompt: true,
      defaultAction: 'natural',
      localModel: 'gemma',
      profile: 'qualidade',
      theme: 'dark',
    });
    expect(migrated).toMatchObject({
      version: 8,
      defaultAction: 'natural',
      localModel: 'gemma',
      profile: 'qualidade',
      theme: 'dark',
    });
    expect(migrated).not.toHaveProperty('chromePortuguesePrompt');
    expect(isPreferencePatch({ chromePortuguesePrompt: true })).toBe(false);
  });
  it('prioriza API especializada pronta e não prepara downloads ao consultar', async () => {
    const probe = vi.fn(() =>
      Promise.resolve({
        state: 'ready' as const,
        nativeAvailability: 'available' as const,
      }),
    );
    const result = await selectNativeQuery({ action: 'formal', language: 'pt-BR' }, probe);
    expect(probe).toHaveBeenCalledOnce();
    expect(result.query.chromePortuguesePrompt).toBe(false);
    const unavailable = vi.fn(() => Promise.resolve({ state: 'unavailable' as const }));
    await selectNativeQuery({ action: 'formal', language: 'en' }, unavailable);
    expect(unavailable).toHaveBeenCalledOnce();
  });
});
