// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_PREFERENCES,
  isPreferenceCommand,
  parsePreferences,
} from '../src/shared/preferences';
import {
  readPreferences,
  saveProfile,
  updatePreferences,
} from '../src/extension/background/preferences';
import { PreviewSession } from '../src/extension/content/preview-session';
import type { WhatsAppAdapter } from '../src/integration/whatsapp/adapter';
import type { WritingPreferences } from '../src/shared/preferences';
import type { ProofGenerator, ProofOutcome } from '../src/extension/content/model-proof-client';

afterEach(() => vi.unstubAllGlobals());

describe('preferências locais sem análise de conteúdo', () => {
  it('uma confirmação atrasada não desfaz preferências novas recebidas de outra interface', async () => {
    let changed: ((value: WritingPreferences) => void) | undefined;
    let resolveSave: ((value: WritingPreferences) => void) | undefined;
    const preferences = {
      read: () => Promise.resolve({ ...DEFAULT_PREFERENCES }),
      setProfile: vi.fn(),
      update: () =>
        new Promise<WritingPreferences>((resolve) => {
          resolveSave = resolve;
        }),
      subscribe: (listener: (value: WritingPreferences) => void) => {
        changed = listener;
        return vi.fn();
      },
    };
    const session = new PreviewSession(
      {} as WhatsAppAdapter,
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
      preferences,
    );
    session.open();
    await Promise.resolve();
    session.updatePreferences({ theme: 'dark' });
    changed?.({ ...DEFAULT_PREFERENCES, theme: 'dark', defaultAction: 'formal', addEmojis: true });
    resolveSave?.({ ...DEFAULT_PREFERENCES, theme: 'dark' });
    await Promise.resolve();
    expect(session.getState()).toMatchObject({
      kind: 'menu',
      preferenceStatus: 'ready',
      preferences: { theme: 'dark', defaultAction: 'formal', addEmojis: true },
    });
    session.close();
  });
  it('preserva as duas preferências em gravações concorrentes', async () => {
    let stored = { ...DEFAULT_PREFERENCES };
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: () => Promise.resolve({ writingPreferences: stored }),
          set: (value: { writingPreferences: WritingPreferences }) => {
            stored = value.writingPreferences;
            return Promise.resolve();
          },
        },
      },
    });
    await Promise.all([updatePreferences({ theme: 'dark' }), saveProfile('qualidade')]);
    expect(await readPreferences()).toEqual({
      ...DEFAULT_PREFERENCES,
      theme: 'dark',
      profile: 'qualidade',
    });
  });

  it('invalida a confirmação de download quando outra aba muda o perfil', async () => {
    let changed: ((value: WritingPreferences) => void) | undefined;
    let done: ((value: ProofOutcome) => void) | undefined;
    const prove = vi.fn<ProofGenerator>((_progress, callback) => {
      done = callback;
      return vi.fn();
    });
    const unsubscribe = vi.fn();
    const preferences = {
      read: () => Promise.resolve({ ...DEFAULT_PREFERENCES }),
      setProfile: vi.fn(),
      subscribe: (listener: (value: WritingPreferences) => void) => {
        changed = listener;
        return unsubscribe;
      },
    };
    const session = new PreviewSession(
      {} as WhatsAppAdapter,
      vi.fn(),
      vi.fn(),
      prove,
      vi.fn(),
      preferences,
    );
    session.open();
    await Promise.resolve();
    changed?.({ ...DEFAULT_PREFERENCES, profile: 'equilibrado' });
    expect(session.getState()).toMatchObject({ kind: 'menu', profile: 'equilibrado' });
    session.startModelProof();
    expect(prove.mock.calls[0]?.slice(2)).toEqual([false, 'equilibrado']);
    done?.({ ok: false, code: 'DOWNLOAD_REQUIRED', message: 'Sem cache' });
    expect(session.getState()).toMatchObject({ kind: 'download-confirm', profile: 'equilibrado' });
    changed?.({ ...DEFAULT_PREFERENCES, profile: 'qualidade' });
    session.confirmDownload();
    expect(session.getState().kind).toBe('notice');
    expect(prove).toHaveBeenCalledOnce();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it('sugere um perfil menor em erro de recursos sem alterar a escolha ou baixar outro modelo', async () => {
    const preferences = {
      read: () =>
        Promise.resolve({
          ...DEFAULT_PREFERENCES,
          profile: 'qualidade' as const,
        }),
      setSemanticReview: vi.fn(),
      setProfile: vi.fn(),
    };
    const prove = vi.fn<ProofGenerator>((_progress, done) => {
      queueMicrotask(() =>
        done({ ok: false, code: 'INSUFFICIENT_RESOURCES', message: 'GPU insuficiente.' }),
      );
      return vi.fn();
    });
    const session = new PreviewSession(
      {} as WhatsAppAdapter,
      vi.fn(),
      vi.fn(),
      prove,
      vi.fn(),
      preferences,
    );
    session.open();
    await Promise.resolve();
    session.startModelProof();
    await Promise.resolve();
    const state = session.getState();
    expect(state.kind).toBe('notice');
    if (state.kind === 'notice') expect(state.message).toContain('configurações da extensão');
    expect(preferences.setProfile).not.toHaveBeenCalled();
    expect(prove.mock.calls[0]?.slice(2)).toEqual([false, 'qualidade']);
    expect(prove).toHaveBeenCalledOnce();
  });
  it('mostra o valor salvo e ignora retorno atrasado de menu encerrado', async () => {
    let resolveRead: ((value: WritingPreferences) => void) | undefined;
    const preferences = {
      read: vi.fn(
        () =>
          new Promise<WritingPreferences>((resolve) => {
            resolveRead = resolve;
          }),
      ),
      setProfile: vi.fn(),
    };
    const session = new PreviewSession(
      {} as WhatsAppAdapter,
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
      preferences,
    );
    session.open();
    expect(session.getState()).toMatchObject({
      kind: 'menu',
      preferenceStatus: 'loading',
    });
    resolveRead?.({ ...DEFAULT_PREFERENCES, theme: 'dark', profile: 'economico' });
    await Promise.resolve();
    expect(session.getState()).toMatchObject({
      kind: 'menu',
      preferences: { theme: 'dark' },
      preferenceStatus: 'ready',
    });
    session.close();
    session.open();
    session.close();
    resolveRead?.({ ...DEFAULT_PREFERENCES, theme: 'dark', profile: 'economico' });
    await Promise.resolve();
    expect(session.getState()).toEqual({ kind: 'closed' });
  });
});

describe('migração sem avaliação de conteúdo', () => {
  it('descarta análise ligada em v1–v5 e preserva escolhas válidas em v5/v6', async () => {
    for (const version of [1, 2, 3, 4, 5])
      expect(parsePreferences({ version, semanticReview: true })).toEqual(DEFAULT_PREFERENCES);
    let stored: unknown = {
      ...DEFAULT_PREFERENCES,
      version: 5,
      engine: 'local',
      localModel: 'gemma',
      profile: 'qualidade',
      theme: 'dark',
      chromePortuguesePrompt: true,
      semanticReview: true,
    };
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: () => Promise.resolve({ writingPreferences: stored }),
          set: (value: { writingPreferences: unknown }) => {
            stored = value.writingPreferences;
            return Promise.resolve();
          },
        },
      },
    });
    const expected = {
      ...DEFAULT_PREFERENCES,
      engine: 'local',
      localModel: 'gemma',
      profile: 'qualidade',
      theme: 'dark',
    };
    expect(await updatePreferences({})).toEqual(expected);
    expect(stored).toEqual(expected);
    expect(parsePreferences(expected)).toEqual(expected);
    expect(isPreferenceCommand({ target: 'preferences', type: 'set', semanticReview: true })).toBe(
      false,
    );
    expect(
      isPreferenceCommand({
        target: 'preferences',
        type: 'update',
        patch: { semanticReview: true },
      }),
    ).toBe(false);
  });
});
