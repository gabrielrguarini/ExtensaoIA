import { CorrectionOutputError } from './correction-output';

const families = [
  /\b(?:ver|veja|vejo|ve|olh\w*|revis\w*|confer\w*|confir[ao]|verific\w*|chec\w*|visualiz\w*)\b/u,
  /\b(?:envi\w*|mand\w*|encaminh\w*|passar|passe|passa)\b/u,
  /\b(?:devolv\w*|devolu\w*|reembols\w*)\b/u,
  /\b(?:cancel\w*)\b/u,
  /\b(?:confirm\w*|aprov\w*)\b/u,
  /\b(?:particip\w*)\b/u,
  /\b(?:esper\w*|aguard\w*)\b/u,
  /\b(?:respond\w*|respost\w*)\b/u,
  /\b(?:convers\w*|falar|fale|fala)\b/u,
  /\b(?:lev\w*|transport\w*)\b/u,
];

function normalized(value: string) {
  return value.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/\p{M}/gu, '');
}

/** Guardas conservadoras para mudanças observadas; não provam equivalência geral. */
export function preserveMeaningAnchors(original: string, generated: string): void {
  const before = normalized(original);
  const after = normalized(generated);
  if (families.some((family) => family.test(before) !== family.test(after)))
    throw new CorrectionOutputError('PRESERVATION_RISK');
  const uncertain = /\b(?:talvez|possivelmente|provavelmente)\b|\bpode ser\b/u;
  const conditional = /\b(?:se|caso)\b|\bdesde que\b/u;
  const firstPerson = /\b(?:eu|me|minha|minhas|meu|meus|estou|consigo|enviei|preciso|quero)\b/u;
  for (const marker of [uncertain, conditional, firstPerson])
    if (marker.test(before) && !marker.test(after))
      throw new CorrectionOutputError('PRESERVATION_RISK');
  // Um local/recipiente mencionado não pode desaparecer numa reescrita.
  for (const match of before.matchAll(/\b(?:no|na|nos|nas)\s+([a-z]{4,})\b/gu)) {
    const noun = match[1]!;
    if (!after.split(/[^a-z]+/u).includes(noun))
      throw new CorrectionOutputError('PRESERVATION_RISK');
  }
}
