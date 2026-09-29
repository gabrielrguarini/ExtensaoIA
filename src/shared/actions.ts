export const WRITING_ACTIONS = [
  {
    id: 'corrigir',
    label: 'Corrigir',
    summary: 'Ajustes mínimos de escrita',
    instruction: 'Corrija somente ortografia, acentuação, pontuação e gramática necessárias.',
    example: ['vc consegue ver isso hj?', 'Você consegue ver isso hoje?'],
  },
  {
    id: 'melhorar',
    label: 'Melhorar',
    summary: 'Mais clareza e fluidez',
    instruction:
      'Melhore clareza e fluidez sem mudar intenção, conteúdo, grau de certeza, informalidade ou gírias adequadas.',
    example: [
      'vc pode ver esse texto quando puder?',
      'Você pode dar uma olhada nesse texto quando puder?',
    ],
  },
  {
    id: 'formal',
    label: 'Formal',
    summary: 'Vocabulário formal e cordial',
    instruction:
      'Use vocabulário e frases formais e cordiais. Substitua gírias e abreviações por equivalentes formais. Não acrescente tratamentos, cargos ou fatos.',
    example: [
      'mano consegue ver isso pra mim hoje?',
      'Você poderia verificar isso para mim hoje, por gentileza?',
    ],
  },
  {
    id: 'profissional',
    label: 'Profissional',
    summary: 'Objetivo e educado',
    instruction:
      'Escreva de modo claro, objetivo e educado, adequado a uma conversa de trabalho, sem solenidade ou excesso de formalidade.',
    example: [
      'mano consegue ver isso pra mim hoje?',
      'Você consegue verificar isso para mim hoje?',
    ],
  },
  {
    id: 'amigavel',
    label: 'Amigável',
    summary: 'Próximo e cordial',
    instruction:
      'Use um tom próximo e cordial, sem intimidade forçada. Preserve a informalidade e as gírias compatíveis com o contexto.',
    example: ['pode ver isso hoje?', 'Você consegue dar uma olhada nisso hoje?'],
  },
  {
    id: 'natural',
    label: 'Natural',
    summary: 'Espontâneo, sem soar artificial',
    instruction:
      'Soar natural em português brasileiro, mantendo a personalidade e o nível de informalidade do autor. Evite construções artificiais.',
    example: [
      'mano consegue ver isso pra mim hoje?',
      'Mano, consegue dar uma olhada nisso pra mim hoje?',
    ],
  },
  {
    id: 'conciso',
    label: 'Conciso',
    summary: 'Menos palavras, mesmas informações',
    instruction:
      'Remova redundâncias e palavras dispensáveis; mantenha todos os pedidos, condições, prazos e informações importantes.',
    example: [
      'Gostaria de pedir que você revisasse o texto hoje, se puder.',
      'Pode revisar o texto hoje, se puder?',
    ],
  },
  {
    id: 'engracado',
    label: 'Engraçado',
    summary: 'Leveza quando couber',
    instruction:
      'Use humor leve somente quando combinar com o assunto. Não invente fatos, ridicularize ninguém nem altere a intenção. Se a mensagem for séria, mantenha o respeito e não faça piada.',
    example: [
      'O texto ficou enorme, pode revisar hoje?',
      'O texto virou uma novela; pode revisar hoje?',
    ],
  },
  {
    id: 'reescrever',
    label: 'Reescrever',
    summary: 'Outra formulação, mesmo sentido',
    instruction:
      'Reformule de maneira diferente, conservando a mesma intenção, todas as informações e o grau de certeza. Não transforme pedido em afirmação.',
    example: ['consegue me passar o arquivo hoje?', 'Pode me enviar o arquivo hoje?'],
  },
] as const;

export type WritingAction = (typeof WRITING_ACTIONS)[number]['id'];

export function isWritingAction(value: unknown): value is WritingAction {
  return typeof value === 'string' && WRITING_ACTIONS.some((action) => action.id === value);
}

export function writingAction(value: WritingAction): (typeof WRITING_ACTIONS)[number] {
  return WRITING_ACTIONS.find((action) => action.id === value)!;
}
