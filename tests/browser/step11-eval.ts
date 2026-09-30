import { WebLLMEngine } from '../../src/extension/ai/webllm-engine';
import {
  parseSemanticReview,
  semanticApproved,
  semanticInput,
} from '../../src/extension/ai/semantic-review';

const cases = [
  {
    id: 'mesmo-sentido',
    original: 'vc consegue me mandar o relatório hj?',
    suggestion: 'Você consegue me mandar o relatório hoje?',
    expected: true,
  },
  {
    id: 'fato-alterado',
    original: 'Envie 2 arquivos para João.',
    suggestion: 'Envie 3 arquivos para João.',
    expected: false,
  },
  {
    id: 'pergunta-virou-afirmacao',
    original: 'Você pode enviar o arquivo?',
    suggestion: 'Você pode enviar o arquivo.',
    expected: false,
  },
  {
    id: 'negacao-removida',
    original: 'Não cancele a reunião.',
    suggestion: 'Cancele a reunião.',
    expected: false,
  },
  {
    id: 'negacao-incluida',
    original: 'Cancele a reunião.',
    suggestion: 'Não cancele a reunião.',
    expected: false,
  },
  {
    id: 'entidades-iguais-sentido-alterado',
    original: 'João enviou 2 arquivos para Maria.',
    suggestion: 'Maria enviou 2 arquivos para João.',
    expected: false,
  },
] as const;

export async function evaluateSemanticCases(): Promise<{
  variant: string | undefined;
  results: { id: string; expected: boolean; approved: boolean; raw: string; error?: string }[];
}> {
  const model = new WebLLMEngine();
  const results: {
    id: string;
    expected: boolean;
    approved: boolean;
    raw: string;
    error?: string;
  }[] = [];
  try {
    await model.initialize();
    for (const test of cases) {
      console.info(`semantic-case=${test.id}`);
      let raw = '';
      try {
        for await (const fragment of model.generate(semanticInput(test.original, test.suggestion), {
          task: 'semantic-review',
        }))
          raw += fragment;
        results.push({
          id: test.id,
          expected: test.expected,
          approved: semanticApproved(parseSemanticReview(raw)),
          raw,
        });
      } catch (error) {
        results.push({
          id: test.id,
          expected: test.expected,
          approved: false,
          raw,
          error: String(error),
        });
      }
    }
    return { variant: model.selectedVariant(), results };
  } finally {
    await model.unload();
  }
}

(
  globalThis as typeof globalThis & { __evaluateSemanticCases?: typeof evaluateSemanticCases }
).__evaluateSemanticCases = evaluateSemanticCases;
