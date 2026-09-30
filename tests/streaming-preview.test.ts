import { describe, expect, it } from 'vitest';
import { protectDraft } from '../src/extension/ai/entities';
import { restoredStreamingPrefix } from '../src/extension/ai/streaming-preview';

describe('prefixo provisório da geração', () => {
  it('restaura slots completos e retém marcadores divididos entre chunks', () => {
    const draft = protectDraft('fale com João hoje.');
    expect(draft.text).toBe('fale com ENTITY_001 ENTITY_002.');
    expect(restoredStreamingPrefix(draft, 'fale com ENT')).toBe('fale com ');
    expect(restoredStreamingPrefix(draft, 'fale com ENTITY_001')).toBe('fale com ');
    expect(restoredStreamingPrefix(draft, 'fale com ENTITY_001 ')).toBe('fale com João ');
    expect(restoredStreamingPrefix(draft, 'fale com ENTITY_001 ENTITY_002')).toBe('fale com João ');
    expect(restoredStreamingPrefix(draft, 'fale com ENTITY_001 ENTITY_002.')).toBe(
      'fale com João hoje.',
    );
  });

  it('nunca exibe marcador desconhecido ou um início ambíguo', () => {
    const draft = protectDraft('texto hoje.');
    expect(restoredStreamingPrefix(draft, 'texto ENTITY_999 para teste')).toBe('texto ');
    expect(restoredStreamingPrefix(draft, 'texto E')).toBe('texto ');
    expect(restoredStreamingPrefix(draft, 'texto ENTIT')).toBe('texto ');
    expect(restoredStreamingPrefix(draft, 'texto ENTITY_001X')).toBe('texto ');
  });
});
