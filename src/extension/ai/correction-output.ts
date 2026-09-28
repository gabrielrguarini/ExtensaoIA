import { MAX_TEXT_LENGTH } from '../../shared/protocol';

export type CorrectionFailure =
  'EMPTY_OUTPUT' | 'TRUNCATED_OUTPUT' | 'INVALID_OUTPUT' | 'PRESERVATION_RISK';

export class CorrectionOutputError extends Error {
  constructor(readonly code: CorrectionFailure) {
    super(code);
  }
}

export function requireCompleteGeneration(reason: string | null): void {
  if (reason !== 'stop')
    throw new CorrectionOutputError(reason === 'length' ? 'TRUNCATED_OUTPUT' : 'INVALID_OUTPUT');
}

/** Falha fechada: nenhuma parte da resposta é removida para disfarçar um formato incorreto. */
export function acceptCorrection(raw: string, original: string): string {
  const text = raw.trim();
  if (!text) throw new CorrectionOutputError('EMPTY_OUTPUT');
  if (text.length > MAX_TEXT_LENGTH) throw new CorrectionOutputError('INVALID_OUTPUT');
  if (
    /^```/u.test(text) ||
    (/^(?:texto corrigido|correção|versão corrigida)\s*:/iu.test(text) &&
      !/^(?:texto corrigido|correção|versão corrigida)\s*:/iu.test(original)) ||
    (/^(?:claro[,!.:]|aqui está|segue (?:o|a) texto)/iu.test(text) &&
      !/^(?:claro[,!.:]|aqui está|segue (?:o|a) texto)/iu.test(original))
  )
    throw new CorrectionOutputError('INVALID_OUTPUT');
  const originalLength = original.trim().length;
  if (text.length < originalLength * 0.6 || text.length > originalLength * 2 + 40)
    throw new CorrectionOutputError('PRESERVATION_RISK');
  // Guarda inicial para alterações conhecidas; a proteção geral de entidades é da STEP-08.
  const anchors = (value: string) => [
    ...value.matchAll(/https?:\/\/[^\s<>"']+/giu),
    ...value.matchAll(/(?:R\$\s*)?\d+(?:[.,:/-]\d+)*/gu),
    ...value.matchAll(/\b(?:não|nao|nunca|jamais|nem|sem)\b/giu),
  ];
  const count = (value: string) => {
    const occurrences = new Map<string, number>();
    for (const match of anchors(value)) {
      const key = match[0]?.toLocaleLowerCase('pt-BR');
      if (key) occurrences.set(key, (occurrences.get(key) ?? 0) + 1);
    }
    return occurrences;
  };
  const before = count(original);
  const after = count(text);
  if (
    before.size !== after.size ||
    [...before].some(([key, occurrences]) => after.get(key) !== occurrences)
  )
    throw new CorrectionOutputError('PRESERVATION_RISK');
  return text;
}
