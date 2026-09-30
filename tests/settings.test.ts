import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_PREFERENCES,
  parsePreferences,
  isPreferenceCommand,
} from '../src/shared/preferences';
import { migratePreferences, updatePreferences } from '../src/extension/background/preferences';
import { isModelCommand } from '../src/shared/model-management';
import { isSettingsPage } from '../src/shared/senders';

afterEach(() => vi.unstubAllGlobals());
describe('interfaces auxiliares e migração', () => {
  it('recupera preferências individualmente, sem propagar conteúdo ou versões desconhecidas', () => {
    expect(
      parsePreferences({
        version: 2,
        profile: 'qualidade',
        semanticReview: true,
        prompt: 'fixture',
      }),
    ).toEqual({ ...DEFAULT_PREFERENCES, profile: 'qualidade', semanticReview: true });
    expect(
      parsePreferences({
        version: 3,
        profile: 'equilibrado',
        theme: 'dark',
        defaultAction: 'formal',
        semanticReview: 'true',
        addEmojis: 1,
        history: ['fixture'],
      }),
    ).toEqual({
      ...DEFAULT_PREFERENCES,
      profile: 'equilibrado',
      theme: 'dark',
      defaultAction: 'formal',
    });
    for (const invalid of [
      null,
      [],
      'fixture',
      { version: 99, theme: 'dark' },
      { version: '3', theme: 'dark' },
    ])
      expect(parsePreferences(invalid)).toEqual(DEFAULT_PREFERENCES);
  });
  it('persiste migração limpa e combina alterações de três interfaces concorrentes', async () => {
    let stored: unknown = {
      version: 2,
      profile: 'equilibrado',
      semanticReview: true,
      text: 'fixture',
    };
    const set = vi.fn((value: { writingPreferences: unknown }) => {
      stored = value.writingPreferences;
      return Promise.resolve();
    });
    vi.stubGlobal('chrome', {
      storage: { local: { get: () => Promise.resolve({ writingPreferences: stored }), set } },
    });
    await migratePreferences();
    expect(stored).toEqual({
      ...DEFAULT_PREFERENCES,
      profile: 'equilibrado',
      semanticReview: true,
    });
    await Promise.all([
      updatePreferences({ theme: 'dark' }),
      updatePreferences({ defaultAction: 'formal', preserveSlang: false }),
      updatePreferences({ addEmojis: true }),
    ]);
    expect(stored).toEqual({
      ...DEFAULT_PREFERENCES,
      profile: 'equilibrado',
      semanticReview: true,
      theme: 'dark',
      defaultAction: 'formal',
      preserveSlang: false,
      addEmojis: true,
    });
    expect(Object.keys(set.mock.calls[0]![0])).toEqual(['writingPreferences']);
  });
  it('restringe preferências e manutenção a comandos e páginas conhecidas', () => {
    expect(
      isPreferenceCommand({
        target: 'preferences',
        type: 'update',
        patch: { theme: 'dark', addEmojis: true },
      }),
    ).toBe(true);
    for (const patch of [
      {},
      { theme: 'cloud' },
      { profile: 'url' },
      { addEmojis: 1 },
      { text: 'fixture' },
      { language: 'en-US' },
      { version: 3 },
    ])
      expect(isPreferenceCommand({ target: 'preferences', type: 'update', patch })).toBe(false);
    expect(isModelCommand({ target: 'model-cache', type: 'unload' })).toBe(true);
    expect(
      isModelCommand({
        target: 'model-cache',
        type: 'status',
        profile: 'qualidade',
        variant: 'q4f32_1',
      }),
    ).toBe(true);
    expect(
      isModelCommand({ target: 'model-cache', type: 'remove', profile: 'url', variant: 'q4f16_1' }),
    ).toBe(false);
    expect(isModelCommand({ target: 'model-cache', type: 'unload', text: 'fixture' })).toBe(false);
    expect(isSettingsPage({ id: 'ext', url: 'chrome-extension://ext/popup.html' }, 'ext')).toBe(
      true,
    );
    expect(isSettingsPage({ id: 'ext', url: 'chrome-extension://ext/sidepanel.html' }, 'ext')).toBe(
      true,
    );
    expect(
      isSettingsPage({ id: 'ext', url: 'chrome-extension://ext/diagnostic.html' }, 'ext'),
    ).toBe(false);
    expect(isSettingsPage({ id: 'other', url: 'chrome-extension://ext/popup.html' }, 'ext')).toBe(
      false,
    );
  });
});
