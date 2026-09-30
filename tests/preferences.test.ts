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
  saveSemanticReview,
} from '../src/extension/background/preferences';
import { PreviewSession } from '../src/extension/content/preview-session';
import type { WhatsAppAdapter } from '../src/integration/whatsapp/adapter';
import type { WritingPreferences } from '../src/shared/preferences';
import type { ProofGenerator, ProofOutcome } from '../src/extension/content/model-proof-client';

afterEach(() => vi.unstubAllGlobals());

describe('preferência local de revisão', () => {
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
    await Promise.all([saveSemanticReview(true), saveProfile('qualidade')]);
    expect(await readPreferences()).toEqual({
      version: 2,
      semanticReview: true,
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
      setSemanticReview: vi.fn(),
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
    changed?.({ version: 2, semanticReview: false, profile: 'equilibrado' });
    expect(session.getState()).toMatchObject({ kind: 'menu', profile: 'equilibrado' });
    session.startModelProof();
    expect(prove.mock.calls[0]?.slice(2)).toEqual([false, 'equilibrado']);
    done?.({ ok: false, code: 'DOWNLOAD_REQUIRED', message: 'Sem cache' });
    expect(session.getState()).toMatchObject({ kind: 'download-confirm', profile: 'equilibrado' });
    changed?.({ version: 2, semanticReview: false, profile: 'qualidade' });
    session.confirmDownload();
    expect(session.getState().kind).toBe('notice');
    expect(prove).toHaveBeenCalledOnce();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it('sugere um perfil menor em erro de recursos sem alterar a escolha ou baixar outro modelo', async () => {
    const preferences = {
      read: () =>
        Promise.resolve({
          version: 2 as const,
          semanticReview: false,
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
    if (state.kind === 'notice') expect(state.message).toContain('Equilibrado');
    expect(preferences.setProfile).not.toHaveBeenCalled();
    expect(prove.mock.calls[0]?.slice(2)).toEqual([false, 'qualidade']);
    expect(prove).toHaveBeenCalledOnce();
  });
  it('começa desligada, persiste apenas o esquema versionado e recusa dados inválidos', async () => {
    let stored: unknown;
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn(() =>
            Promise.resolve(stored === undefined ? {} : { writingPreferences: stored }),
          ),
          set: vi.fn((value: { writingPreferences: unknown }) => {
            stored = value.writingPreferences;
            return Promise.resolve();
          }),
        },
      },
    });
    expect(await readPreferences()).toEqual(DEFAULT_PREFERENCES);
    expect(await saveSemanticReview(true)).toEqual({
      version: 2,
      semanticReview: true,
      profile: 'economico',
    });
    expect(await readPreferences()).toEqual({
      version: 2,
      semanticReview: true,
      profile: 'economico',
    });
    expect(await saveProfile('qualidade')).toEqual({
      version: 2,
      semanticReview: true,
      profile: 'qualidade',
    });
    expect(await saveSemanticReview(false)).toEqual({
      version: 2,
      semanticReview: false,
      profile: 'qualidade',
    });
    stored = { version: 1, semanticReview: true };
    expect(await readPreferences()).toEqual({
      version: 2,
      semanticReview: true,
      profile: 'economico',
    });
    stored = { version: 2, semanticReview: true };
    await expect(readPreferences()).rejects.toThrow();
    expect(() => parsePreferences({ version: 1, semanticReview: 'true' })).toThrow();
    expect(isPreferenceCommand({ target: 'preferences', type: 'set', semanticReview: true })).toBe(
      true,
    );
    expect(isPreferenceCommand({ target: 'preferences', type: 'set', semanticReview: 1 })).toBe(
      false,
    );
    expect(
      isPreferenceCommand({ target: 'preferences', type: 'profile', profile: 'equilibrado' }),
    ).toBe(true);
    expect(
      isPreferenceCommand({
        target: 'preferences',
        type: 'profile',
        profile: 'https://example.com/model',
      }),
    ).toBe(false);
  });

  it('mostra o valor salvo e ignora retorno atrasado de menu encerrado', async () => {
    let resolveRead:
      ((value: { version: 2; semanticReview: boolean; profile: 'economico' }) => void) | undefined;
    const preferences = {
      read: vi.fn(
        () =>
          new Promise<{ version: 2; semanticReview: boolean; profile: 'economico' }>((resolve) => {
            resolveRead = resolve;
          }),
      ),
      setSemanticReview: vi.fn((semanticReview: boolean) =>
        Promise.resolve({
          version: 2 as const,
          semanticReview,
          profile: 'economico' as const,
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
      semanticReview: false,
      preferenceStatus: 'loading',
    });
    resolveRead?.({ version: 2, semanticReview: true, profile: 'economico' });
    await Promise.resolve();
    expect(session.getState()).toMatchObject({
      kind: 'menu',
      semanticReview: true,
      preferenceStatus: 'ready',
    });
    session.setSemanticReview(false);
    await Promise.resolve();
    expect(preferences.setSemanticReview).toHaveBeenCalledWith(false);
    expect(session.getState()).toMatchObject({ kind: 'menu', semanticReview: false });
    session.close();
    session.open();
    session.close();
    resolveRead?.({ version: 2, semanticReview: true, profile: 'economico' });
    await Promise.resolve();
    expect(session.getState()).toEqual({ kind: 'closed' });
  });
});
