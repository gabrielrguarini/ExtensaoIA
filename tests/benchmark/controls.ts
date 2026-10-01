import { protectDraft } from '../../src/extension/ai/entities';
import { validateActionOutput } from '../../src/extension/ai/action-validation';

/** Candidatos fixos anotados, sem geração nem julgamento pelo modelo. */
export const VALIDATOR_CONTROLS = [
  {
    id: 'C01',
    original: 'Pode ver isso hoje?',
    candidate: 'Pode verificar isso hoje?',
    expectedPreservation: true,
    rationale: 'Sinônimo de verificação; mesma pergunta e data relativa.',
  },
  {
    id: 'C02',
    original: 'João enviou 2 arquivos para Maria ontem.',
    candidate: 'Ontem, Maria recebeu 2 arquivos de João.',
    expectedPreservation: true,
    rationale:
      'Mesmos remetente, destinatária, quantidade e momento, em construção inversa legítima.',
  },
  {
    id: 'C03',
    original: 'se aprovado, devolva R$ 10 para Luana.',
    candidate: 'caso aprovado, devolva R$ 10 para Luana.',
    expectedPreservation: true,
    rationale: 'Se/caso são equivalentes condicionais neste contexto.',
  },
  {
    id: 'C04',
    original: 'Envie 2 arquivos para Maria.',
    candidate: 'Encaminhe 2 arquivos para Maria.',
    expectedPreservation: true,
    rationale: 'Sinônimo de envio; Encaminhe é verbo, não novo nome.',
  },
  {
    id: 'C05',
    original: 'Pode ver isso? 🙂',
    candidate: 'Pode me enviar o arquivo 🙂?',
    expectedPreservation: false,
    rationale: 'Mudou verificação para envio e inventou arquivo.',
  },
  {
    id: 'C06',
    original: 'João enviou 2 arquivos para Maria ontem.',
    candidate: 'Maria enviou 2 arquivos para João ontem.',
    expectedPreservation: false,
    rationale: 'Inverteu remetente e destinatário.',
  },
  {
    id: 'C07',
    original: 'Se aprovado, devolva R$ 10 para Luana.',
    candidate: 'Devolva R$ 10 para Luana.',
    expectedPreservation: false,
    rationale: 'Removeu condição de aprovação.',
  },
  {
    id: 'C08',
    original: 'Não cancele a reunião antes da confirmação.',
    candidate: 'Cancele a reunião antes da confirmação.',
    expectedPreservation: false,
    rationale: 'Removeu negação, invertendo pedido.',
  },
] as const;

export async function runValidatorControls() {
  const results = [];
  for (const control of VALIDATOR_CONTROLS) {
    const protectedDraft = protectDraft(control.original);
    let raw: string = control.candidate;
    for (const slot of protectedDraft.slots)
      raw = raw.replaceAll(slot.entity.value, slot.placeholder);
    let approved = false;
    let error: string | null = null;
    try {
      await validateActionOutput(
        protectedDraft,
        raw,
        control.original,
        false,
        {
          generate: () => {
            throw new Error('Controles não devem chamar IA.');
          },
        },
        new AbortController().signal,
        () => undefined,
      );
      approved = true;
    } catch (caught) {
      error = String(caught);
    }
    results.push({
      ...control,
      approved,
      error,
      falsePositive: control.expectedPreservation && !approved,
      falseNegative: !control.expectedPreservation && approved,
    });
  }
  return results;
}
