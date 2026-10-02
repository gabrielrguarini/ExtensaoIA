import { MAX_TEXT_LENGTH } from '../../shared/protocol';
import type { EngineIdentity, SuggestionResult } from '../../shared/suggestion';
import { invalidCharacters } from './entities';
import { CorrectionOutputError } from './correction-output';

/** Confere somente a usabilidade técnica; a revisão do conteúdo pertence ao usuário. */
export function createSuggestion(
  original: string,
  raw: string,
  engine: EngineIdentity,
): SuggestionResult {
  const text = raw.trim();
  if (!text || !/[^\s\p{Cf}]/u.test(text)) throw new CorrectionOutputError('EMPTY_OUTPUT');
  if (text.length > MAX_TEXT_LENGTH || invalidCharacters(text))
    throw new CorrectionOutputError('INVALID_OUTPUT');
  return { text, engine, status: text === original.trim() ? 'unchanged' : 'changed' };
}
