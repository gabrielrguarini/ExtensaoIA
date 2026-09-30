// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_PREFERENCES,
  isPreferenceCommand,
  parsePreferences,
} from '../src/shared/preferences';
import { readPreferences, saveSemanticReview } from '../src/extension/background/preferences';
import { PreviewSession } from '../src/extension/content/preview-session';
import type { WhatsAppAdapter } from '../src/integration/whatsapp/adapter';

afterEach(() => vi.unstubAllGlobals());

describe('preferência local de revisão', () => {
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
    expect(await saveSemanticReview(true)).toEqual({ version: 1, semanticReview: true });
    expect(await readPreferences()).toEqual({ version: 1, semanticReview: true });
    stored = { version: 2, semanticReview: true };
    await expect(readPreferences()).rejects.toThrow();
    expect(() => parsePreferences({ version: 1, semanticReview: 'true' })).toThrow();
    expect(isPreferenceCommand({ target: 'preferences', type: 'set', semanticReview: true })).toBe(
      true,
    );
    expect(isPreferenceCommand({ target: 'preferences', type: 'set', semanticReview: 1 })).toBe(
      false,
    );
  });

  it('mostra o valor salvo e ignora retorno atrasado de menu encerrado', async () => {
    let resolveRead: ((value: { version: 1; semanticReview: boolean }) => void) | undefined;
    const preferences = {
      read: vi.fn(
        () =>
          new Promise<{ version: 1; semanticReview: boolean }>((resolve) => {
            resolveRead = resolve;
          }),
      ),
      setSemanticReview: vi.fn((semanticReview: boolean) =>
        Promise.resolve({
          version: 1 as const,
          semanticReview,
        }),
      ),
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
    resolveRead?.({ version: 1, semanticReview: true });
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
    resolveRead?.({ version: 1, semanticReview: true });
    await Promise.resolve();
    expect(session.getState()).toEqual({ kind: 'closed' });
  });
});
