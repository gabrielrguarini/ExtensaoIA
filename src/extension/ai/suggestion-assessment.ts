import { MAX_TEXT_LENGTH } from '../../shared/protocol';
import type { ContentRisk, RiskAssessment, EngineIdentity } from '../../shared/suggestion';
import { extractEntities, invalidCharacters, temporalKey } from './entities';
import { CorrectionOutputError } from './correction-output';
import { preserveMeaningAnchors } from './meaning-anchors';

const labels = {
  url: 'links',
  email: 'e-mails',
  currency: 'valores',
  'cpf-cnpj': 'documentos',
  date: 'datas',
  time: 'horários',
  mention: 'menções',
  hashtag: 'hashtags',
  emoji: 'emojis',
  code: 'códigos',
  number: 'números',
  name: 'nomes',
  temporal: 'prazos',
};
function entities(text: string, addEmojis: boolean) {
  const items = extractEntities(text).filter((entity) => !addEmojis || entity.kind !== 'emoji');
  const map = new Map<string, number>();
  for (const entity of items) {
    const key = `${entity.kind}:${entity.kind === 'temporal' ? temporalKey(entity.value) : entity.value}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  const abbreviatedToday = (text.match(/\bhj\b/giu) ?? []).length;
  if (abbreviatedToday)
    map.set('temporal:hoje', (map.get('temporal:hoje') ?? 0) + abbreviatedToday);
  return { items, map };
}
function counts(text: string, pattern: RegExp) {
  return [...text.toLocaleLowerCase('pt-BR').matchAll(pattern)]
    .map((match) => match[0].replace('nao', 'não'))
    .sort()
    .join('|');
}

/** Avaliação histórica do benchmark; não usada no fluxo do produto desde STEP-15-E. */
export function assessSuggestion(
  original: string,
  raw: string,
  addEmojis = false,
): { text: string; assessment: RiskAssessment } {
  const text = raw.trim();
  if (!text || !/[^\s\p{Cf}]/u.test(text)) throw new CorrectionOutputError('EMPTY_OUTPUT');
  if (text.length > MAX_TEXT_LENGTH || invalidCharacters(text))
    throw new CorrectionOutputError('INVALID_OUTPUT');
  const risks: ContentRisk[] = [];
  const before = entities(original, false);
  const after = entities(text, addEmojis);
  // Emojis adicionados são permitidos; os originais continuam sujeitos à comparação.
  if (addEmojis) {
    for (const [key, count] of before.map) {
      if (key.startsWith('emoji:')) {
        const present = extractEntities(text).filter(
          (entity) => `emoji:${entity.value}` === key,
        ).length;
        if (present >= count) after.map.set(key, count);
      }
    }
  }
  const changes = new Set(
    [...before.map.keys(), ...after.map.keys()]
      .filter((key) => before.map.get(key) !== after.map.get(key))
      .map((key) => key.split(':')[0] as keyof typeof labels),
  );
  for (const kind of changes)
    risks.push({
      code: 'entities',
      message: `Possível alteração de ${labels[kind]}. Confira o original e a sugestão.`,
    });
  if (
    counts(original, /\b(?:não|nao|nunca|jamais|nem|sem)\b/gu) !==
    counts(text, /\b(?:não|nao|nunca|jamais|nem|sem)\b/gu)
  )
    risks.push({ code: 'negation', message: 'Possível mudança de negação ou polaridade.' });
  const order = (value: string) =>
    extractEntities(value)
      .filter((entity) => entity.kind !== 'emoji' && entity.kind !== 'temporal')
      .map((entity) => `${entity.kind}:${entity.value}`)
      .join('|');
  const relation = /\b(?:até|antes|depois)\b/gu;
  let meaningRisk =
    original.includes('?') !== text.includes('?') ||
    counts(original, relation) !== counts(text, relation);
  if (!changes.size && order(original) !== order(text)) meaningRisk = true;
  try {
    preserveMeaningAnchors(original, text);
  } catch {
    meaningRisk = true;
  }
  if (meaningRisk)
    risks.push({
      code: 'intent',
      message: 'Possível mudança de intenção, papéis, condições ou prazo.',
    });
  if (text.length < original.trim().length * 0.6 || text.length > original.trim().length * 2 + 40)
    risks.push({
      code: 'length',
      message: 'A extensão do texto mudou bastante; confira omissões e acréscimos.',
    });
  const commentary =
    /^```|^(?:(?:o\s+)?texto (?:corrigido|final)|correção|versão corrigida|claro|aqui está|segue o texto)\b/iu;
  if (commentary.test(text) && !commentary.test(original.trim()))
    risks.push({
      code: 'format',
      message: 'A resposta pode conter comentários ou formatação além do rascunho.',
    });
  return {
    text,
    assessment: {
      status: text === original.trim() ? 'unchanged' : 'changed',
      risks,
      semanticReview: 'not-requested',
    },
  };
}
export function suggestionResult(
  original: string,
  raw: string,
  engine: EngineIdentity,
  addEmojis = false,
): { text: string; assessment: RiskAssessment; engine: EngineIdentity } {
  return { ...assessSuggestion(original, raw, addEmojis), engine };
}
