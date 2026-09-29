import { CorrectionOutputError } from './correction-output';

export type EntityKind =
  | 'url'
  | 'email'
  | 'currency'
  | 'cpf-cnpj'
  | 'date'
  | 'time'
  | 'mention'
  | 'hashtag'
  | 'emoji'
  | 'code'
  | 'number'
  | 'name'
  | 'temporal';

export interface Entity {
  kind: EntityKind;
  value: string;
  start: number;
  end: number;
}

interface Candidate extends Entity {
  priority: number;
}

const nameStopWords = new Set([
  'a',
  'agora',
  'bom',
  'boa',
  'claro',
  'consegue',
  'corrija',
  'ele',
  'ela',
  'eu',
  'gostaria',
  'ignore',
  'isso',
  'já',
  'mano',
  'me',
  'manda',
  'não',
  'nao',
  'nunca',
  'oi',
  'olha',
  'por',
  'pode',
  'preciso',
  'quero',
  'segue',
  'sim',
  'texto',
  'você',
  'voce',
]);
const placeholderPattern = /\bENTITY(?:[\p{L}\p{N}_-]|\s+\d)*/giu;
const negationPattern = /(?<![\p{L}\p{N}])(?:não|nao|nunca|jamais|nem|sem)(?![\p{L}\p{N}])/giu;
const relationPattern =
  /(?<![\p{L}\p{N}])(?:até|antes|depois|após|desde|durante|somente|apenas|pelo menos|no máximo)(?![\p{L}\p{N}])/giu;
const markerDescriptionPattern =
  /\b(?:conteúdos? protegidos?|entidades? protegidas?|identificadores? protegidos?|marcadores? de entidade)\b/iu;

function addMatches(
  candidates: Candidate[],
  text: string,
  kind: EntityKind,
  pattern: RegExp,
  priority: number,
  clean?: (value: string) => string,
): void {
  for (const match of text.matchAll(pattern)) {
    const matched = match[0];
    if (match.index === undefined || !matched) continue;
    const value = clean ? clean(matched) : matched;
    if (value)
      candidates.push({
        kind,
        value,
        start: match.index,
        end: match.index + value.length,
        priority,
      });
  }
}

function trimUrl(value: string): string {
  let result = value.replace(/[.,!?;:]+$/u, '');
  while (
    result.endsWith(')') &&
    (result.match(/\)/gu)?.length ?? 0) > (result.match(/\(/gu)?.length ?? 0)
  )
    result = result.slice(0, -1);
  return result;
}

/** Heurísticas locais. A seleção por prioridade evita números dentro de URLs ou valores. */
export function extractEntities(text: string): Entity[] {
  const candidates: Candidate[] = [];
  addMatches(candidates, text, 'url', /https?:\/\/[^\s<>"'`]+/giu, 100, trimUrl);
  addMatches(candidates, text, 'email', /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/giu, 95);
  addMatches(candidates, text, 'code', /`[^`\n]+`/gu, 92);
  addMatches(
    candidates,
    text,
    'cpf-cnpj',
    /(?<!\d)(?:\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{3}\.\d{3}\.\d{3}-\d{2}|\d{14}|\d{11})(?!\d)/gu,
    90,
  );
  addMatches(candidates, text, 'currency', /(?:R\$|US\$|€|\$|£)\s*\d+(?:[.,]\d+)*/gu, 85);
  addMatches(
    candidates,
    text,
    'currency',
    /(?<![\p{L}\p{N}])\d+(?:[.,]\d+)*\s*(?:reais?|euros?|dólares?)(?![\p{L}\p{N}])/giu,
    85,
  );
  addMatches(candidates, text, 'date', /(?<!\d)\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?(?!\d)/gu, 80);
  addMatches(
    candidates,
    text,
    'date',
    /(?<!\d)\d{1,2}\s+de\s+(?:janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)(?:\s+de\s+\d{4})?(?![\p{L}\p{N}])/giu,
    80,
  );
  addMatches(
    candidates,
    text,
    'time',
    /(?<!\d)(?:\d{1,2}:\d{2}(?::\d{2})?|\d{1,2}h(?:\d{2})?)(?!\d)/giu,
    75,
  );
  addMatches(candidates, text, 'mention', /(?<![\p{L}\p{N}._%+-])@[\p{L}\p{N}_.-]+/gu, 70);
  addMatches(candidates, text, 'hashtag', /(?<![\p{L}\p{N}])#[\p{L}\p{N}_]+/gu, 70);
  addMatches(
    candidates,
    text,
    'code',
    /(?<![\p{L}\p{N}])(?:[A-Z]{2,}[A-Z0-9]*(?:[-_][A-Z0-9]+)*|[A-Z]+\d+[A-Z0-9_-]*)(?![\p{L}\p{N}_-])/gu,
    65,
  );
  addMatches(
    candidates,
    text,
    'number',
    /(?<![\p{L}\p{N}])\d+(?:[.,:/-]\d+)*(?![\p{L}\p{N}])/gu,
    60,
  );
  addMatches(
    candidates,
    text,
    'temporal',
    /(?<![\p{L}\p{N}])(?:hoje|amanhã|ontem|segunda(?:-feira)?|terça(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|sábado|domingo|semana que vem|próxima semana|mês que vem)(?![\p{L}\p{N}])/giu,
    55,
  );
  addMatches(
    candidates,
    text,
    'name',
    /(?<![\p{L}\p{N}])\p{Lu}\p{Ll}{2,}(?:[ -]\p{Lu}\p{Ll}{2,})*(?![\p{L}\p{N}])/gu,
    40,
  );
  for (const segment of new Intl.Segmenter('pt-BR', { granularity: 'grapheme' }).segment(text)) {
    if (
      /[\p{Extended_Pictographic}\p{Emoji_Presentation}\u20e3\p{Regional_Indicator}]/u.test(
        segment.segment,
      )
    )
      candidates.push({
        kind: 'emoji',
        value: segment.segment,
        start: segment.index,
        end: segment.index + segment.segment.length,
        priority: 88,
      });
  }
  const chosen: Candidate[] = [];
  for (const candidate of candidates.sort(
    (a, b) => b.priority - a.priority || b.value.length - a.value.length || a.start - b.start,
  )) {
    if (candidate.kind === 'name' && nameStopWords.has(candidate.value.toLocaleLowerCase('pt-BR')))
      continue;
    if (chosen.some((entity) => candidate.start < entity.end && entity.start < candidate.end))
      continue;
    chosen.push(candidate);
  }
  return chosen
    .sort((a, b) => a.start - b.start)
    .map((candidate) => ({
      kind: candidate.kind,
      value: candidate.value,
      start: candidate.start,
      end: candidate.end,
    }));
}

export interface ProtectedDraft {
  original: string;
  text: string;
  slots: ReadonlyArray<{ placeholder: string; entity: Entity }>;
}

export function protectDraft(original: string): ProtectedDraft {
  const entities = extractEntities(original);
  const slots: { placeholder: string; entity: Entity }[] = [];
  let cursor = 0;
  let next = 1;
  let text = '';
  for (const entity of entities) {
    let placeholder: string;
    do {
      placeholder = `ENTITY_${String(next++).padStart(3, '0')}`;
    } while (original.includes(placeholder));
    text += original.slice(cursor, entity.start) + placeholder;
    cursor = entity.end;
    slots.push({ placeholder, entity });
  }
  text += original.slice(cursor);
  return { original, text, slots };
}

function occurrenceMap(values: Iterable<string>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

function sameOccurrences(left: Map<string, number>, right: Map<string, number>): boolean {
  return (
    left.size === right.size && [...left].every(([value, count]) => right.get(value) === count)
  );
}

function temporalKey(value: string): string {
  return value.toLocaleLowerCase('pt-BR');
}

function negations(value: string): string[] {
  return [...value.matchAll(negationPattern)].map((match) =>
    match[0].toLocaleLowerCase('pt-BR').replace('nao', 'não'),
  );
}

function relations(value: string): string[] {
  return [...value.matchAll(relationPattern)].map((match) => match[0].toLocaleLowerCase('pt-BR'));
}

function precedingArticle(value: string, index: number): string | undefined {
  return value
    .slice(0, index)
    .match(/\b(o|a|os|as)\s*$/iu)?.[1]
    ?.toLocaleLowerCase('pt-BR');
}

function invalidCharacters(value: string): boolean {
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if ((code < 32 && code !== 9 && code !== 10 && code !== 13) || code === 127 || code === 0xfffd)
      return true;
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(++index);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
    } else if (code >= 0xdc00 && code <= 0xdfff) return true;
  }
  return false;
}

/** Restaura apenas slots exatos e reprova qualquer entidade nova, removida ou duplicada. */
export function restoreAndValidate(protectedDraft: ProtectedDraft, generated: string): string {
  if (!generated.trim()) throw new CorrectionOutputError('EMPTY_OUTPUT');
  if (invalidCharacters(generated)) throw new CorrectionOutputError('INVALID_OUTPUT');
  const slotMap = new Map(
    protectedDraft.slots.map((slot) => [slot.placeholder, slot.entity.value]),
  );
  const seen = new Set<string>();
  for (const match of generated.matchAll(placeholderPattern)) {
    const placeholder = match[0];
    if (!slotMap.has(placeholder) || seen.has(placeholder))
      throw new CorrectionOutputError('PRESERVATION_RISK');
    seen.add(placeholder);
  }
  if (seen.size !== slotMap.size) throw new CorrectionOutputError('PRESERVATION_RISK');
  for (const slot of protectedDraft.slots) {
    const generatedArticle = precedingArticle(generated, generated.indexOf(slot.placeholder));
    if (
      generatedArticle &&
      generatedArticle !== precedingArticle(protectedDraft.original, slot.entity.start)
    )
      throw new CorrectionOutputError('PRESERVATION_RISK');
  }
  const restored = generated.replace(placeholderPattern, (placeholder) =>
    slotMap.get(placeholder)!,
  );
  if (
    markerDescriptionPattern.test(restored) &&
    !markerDescriptionPattern.test(protectedDraft.original)
  )
    throw new CorrectionOutputError('PRESERVATION_RISK');
  const before = occurrenceMap(
    extractEntities(protectedDraft.original).map(
      (entity) =>
        `${entity.kind}:${entity.kind === 'temporal' ? temporalKey(entity.value) : entity.value}`,
    ),
  );
  const after = occurrenceMap(
    extractEntities(restored).map(
      (entity) =>
        `${entity.kind}:${entity.kind === 'temporal' ? temporalKey(entity.value) : entity.value}`,
    ),
  );
  // "hj" é corrigível para "hoje" sem mudar a referência temporal.
  const abbreviatedToday = [
    ...protectedDraft.original.matchAll(/(?<![\p{L}\p{N}])hj(?![\p{L}\p{N}])/giu),
  ].length;
  if (abbreviatedToday)
    before.set('temporal:hoje', (before.get('temporal:hoje') ?? 0) + abbreviatedToday);
  if (!sameOccurrences(before, after)) throw new CorrectionOutputError('PRESERVATION_RISK');
  if (negations(protectedDraft.original).join('|') !== negations(restored).join('|'))
    throw new CorrectionOutputError('PRESERVATION_RISK');
  if (relations(protectedDraft.original).join('|') !== relations(restored).join('|'))
    throw new CorrectionOutputError('PRESERVATION_RISK');
  if (protectedDraft.original.includes('?') && !restored.includes('?'))
    throw new CorrectionOutputError('PRESERVATION_RISK');
  return restored;
}
