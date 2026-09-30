import { describe, expect, it } from 'vitest';
import {
  isClientCommand,
  isClientEvent,
  isEngineCommand,
  isEngineEvent,
  MAX_TEXT_LENGTH,
} from '../src/shared/protocol';
import { contentOrigin, isCoordinator, isExtensionPage } from '../src/shared/senders';
import { isDiagnosticCommand, isProbe } from '../src/shared/diagnostic';
import { binding, start } from './fixtures';
import { WRITING_ACTIONS } from '../src/shared/actions';

describe('contratos nas fronteiras dos contextos', () => {
  it('aceita todos os comandos e eventos discriminados válidos', () => {
    for (const value of [start, { type: 'cancel', key: binding.key }, { type: 'status' }])
      expect(isClientCommand(value)).toBe(true);
    for (const value of [
      { type: 'progress', binding, percent: 50 },
      { type: 'fragment', binding, text: 'Teste' },
      { type: 'action-fragment', binding, action: 'corrigir', text: 'Teste provisório' },
      { type: 'result', binding, text: 'Teste', simulated: true },
      { type: 'action-rejected', binding, action: 'corrigir', code: 'PRESERVATION_RISK' },
      { type: 'cancelled', binding },
      { type: 'error', binding, code: 'TIMEOUT' },
    ]) {
      expect(isClientEvent(value)).toBe(true);
      expect(isEngineEvent(value)).toBe(true);
    }
    expect(isClientEvent({ type: 'status', state: 'idle', simulated: true })).toBe(true);
    expect(isClientEvent({ type: 'rejected', key: null, code: 'BUSY' })).toBe(true);
    expect(isEngineEvent({ type: 'ready', simulated: true })).toBe(true);
    expect(
      isEngineCommand({
        type: 'start',
        request: { ...binding, text: 'teste', action: 'corrigir', semanticReview: false },
      }),
    ).toBe(true);
    expect(isEngineCommand({ type: 'cancel', binding })).toBe(true);
    for (const action of WRITING_ACTIONS) {
      expect(isClientCommand({ ...start, action: action.id })).toBe(true);
      expect(
        isEngineCommand({
          type: 'start',
          request: { ...binding, text: 'teste', action: action.id, semanticReview: true },
        }),
      ).toBe(true);
      expect(
        isClientEvent({ type: 'action-result', binding, action: action.id, text: 'teste' }),
      ).toBe(true);
    }
  });
  it.each([
    null,
    [],
    'start',
    {},
    { type: 'unknown' },
    { ...start, tabId: 999 },
    { ...start, key: { ...binding.key, revision: -1 } },
    { ...start, key: { ...binding.key, revision: 0.5 } },
    { ...start, key: { ...binding.key, requestId: '<script>' } },
    { ...start, text: '' },
    { ...start, text: '  ' },
    { ...start, text: 'x'.repeat(MAX_TEXT_LENGTH + 1) },
    { ...start, action: 'enviar' },
  ])('rejeita comandos malformados ou campos extras: caso %#', (value) => {
    expect(isClientCommand(value)).toBe(false);
  });
  it('rejeita resultados sem simulação, origens inválidas e progresso fora do intervalo', () => {
    expect(isEngineEvent({ type: 'result', binding, text: 'x', simulated: false })).toBe(false);
    expect(isEngineEvent({ type: 'progress', binding, percent: NaN })).toBe(false);
    expect(isEngineEvent({ type: 'progress', binding, percent: 101 })).toBe(false);
    expect(
      isEngineEvent({
        type: 'result',
        binding: { ...binding, origin: { ...binding.origin, frameId: 2 } },
        text: 'x',
        simulated: true,
      }),
    ).toBe(false);
    expect(
      isEngineCommand({
        type: 'start',
        request: { ...binding, text: 'x', action: 'corrigir', endpoint: 'https://example.com' },
      }),
    ).toBe(false);
    expect(isClientEvent({ type: 'action-result', binding, action: 'enviar', text: 'x' })).toBe(
      false,
    );
    expect(isClientEvent({ type: 'action-fragment', binding, action: 'enviar', text: 'x' })).toBe(
      false,
    );
    expect(isClientEvent({ type: 'action-fragment', binding, action: 'formal', text: '' })).toBe(
      false,
    );
    expect(
      isClientEvent({ type: 'action-rejected', binding, action: 'formal', code: 'UNKNOWN' }),
    ).toBe(false);
  });
  it('restringe os comandos de diagnóstico à lista conhecida', () => {
    expect(isDiagnosticCommand({ target: 'diagnostic', type: ['run'], tabId: 5 })).toBe(false);
    expect(isProbe({ target: 'probe', type: ['run'] })).toBe(false);
    expect(isClientEvent({ type: 'status', state: ['idle'], simulated: true })).toBe(false);
    expect(isDiagnosticCommand({ target: 'diagnostic', type: 'list' })).toBe(true);
    expect(isDiagnosticCommand({ target: 'diagnostic', type: 'run', tabId: 5 })).toBe(true);
    expect(isDiagnosticCommand({ target: 'diagnostic', type: 'run', tabId: -1 })).toBe(false);
    expect(isProbe({ target: 'probe', type: 'run', text: 'texto arbitrário' })).toBe(false);
  });
});

describe('remetentes do Chrome', () => {
  const sender = {
    id: 'extension',
    url: 'https://web.whatsapp.com/',
    origin: 'https://web.whatsapp.com',
    frameId: 0,
    documentId: 'document-a',
    documentLifecycle: 'active',
    tab: { id: 1 },
  };
  it('deriva a origem do remetente confiável, incluindo o documento', () => {
    expect(contentOrigin(sender, 'extension', 'connection-a')).toEqual(binding.origin);
  });
  it.each([
    { id: 'other-extension' },
    { url: 'https://web.whatsapp.com.evil.example/' },
    { url: 'http://web.whatsapp.com/' },
    { origin: 'null' },
    { frameId: 1 },
    { documentId: '' },
    { documentLifecycle: 'cached' },
    { tab: { id: -1 } },
  ])('recusa origem indevida: caso %#', (change) => {
    expect(contentOrigin({ ...sender, ...change }, 'extension', 'connection-a')).toBeNull();
  });
  it('distingue página local, coordenador e content script', () => {
    expect(
      isExtensionPage(
        { id: 'extension', url: 'chrome-extension://extension/diagnostic.html' },
        'extension',
        'diagnostic.html',
      ),
    ).toBe(true);
    expect(
      isExtensionPage(
        { ...sender, url: 'chrome-extension://other/diagnostic.html' },
        'extension',
        'diagnostic.html',
      ),
    ).toBe(false);
    expect(isCoordinator(sender, 'extension')).toBe(false);
    expect(
      isCoordinator(
        { id: 'extension', url: 'chrome-extension://extension/diagnostic.html' },
        'extension',
      ),
    ).toBe(false);
    expect(isCoordinator({ id: 'extension' }, 'extension')).toBe(true);
  });
});
