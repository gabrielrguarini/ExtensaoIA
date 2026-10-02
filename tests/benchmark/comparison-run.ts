import type {
  AIEngine,
  GenerationMetrics,
  NativeGenerationMetrics,
} from '../../src/extension/ai/ai-engine';
import type { ModelProfile } from '../../src/extension/ai/model-catalog';
import { BENCHMARK_CASES } from './cases';
import { RESERVED_CASES } from './reserved-cases';
import { protectDraft } from '../../src/extension/ai/entities';
import { validateActionOutput } from '../../src/extension/ai/action-validation';
import { suggestionResult } from '../../src/extension/ai/suggestion-assessment';
import type { RiskAssessment } from '../../src/shared/suggestion';

export type Candidate = ModelProfile | 'gemma' | 'chrome-prompt';
export interface ComparisonOptions {
  candidate: Candidate;
  ids: string[];
  pipeline: 'original' | 'legacy-protected';
  allowDownload: boolean;
  retain?: boolean;
}
export const COMPARISON_CASES = [...BENCHMARK_CASES, ...RESERVED_CASES];
/** Somente fixtures fixas do benchmark. Nunca exposto por mensagens do produto. */
export async function comparisonRun(
  engine: AIEngine,
  options: ComparisonOptions,
  emit: (record: Record<string, unknown>) => Promise<void>,
  loaded: () => Promise<void>,
) {
  const cases = COMPARISON_CASES.filter(({ id }) => options.ids.includes(id));
  if (cases.length !== options.ids.length) throw new Error('IDs de benchmark desconhecidos.');
  const profile = ['economico', 'equilibrado', 'qualidade'].includes(options.candidate)
    ? (options.candidate as ModelProfile)
    : undefined;
  const native = options.candidate === 'chrome-prompt';
  const queryFor = (action: (typeof cases)[number]['action']) => ({
    action,
    language: 'pt-BR',
    chromePortuguesePrompt: native,
  });
  const start = performance.now();
  const resident = engine.isReady();
  let preparationMs: number | null = null;
  let loadError: string | null = null;
  let phaseKey = '';
  try {
    await engine.initialize({
      ...(profile ? { profile } : {}),
      query: queryFor(cases[0]!.action),
      allowDownload: options.allowDownload,
      onProgress(phase, percent) {
        if (phase === 'loading' && preparationMs === null)
          preparationMs = performance.now() - start;
        const key = `${phase}:${Math.floor(percent / 10)}`;
        if (phaseKey !== key) {
          phaseKey = key;
          void emit({ type: 'progress', phase, percent });
        }
      },
    });
  } catch (error) {
    loadError = String(error);
  }
  await emit({
    type: 'load',
    coldMs: performance.now() - start,
    resident,
    preparationMs,
    error: loadError,
    engine: engine.identity(),
  });
  await loaded();
  if (loadError) {
    await engine.unload();
    return;
  }
  try {
    // Rodadas medidas são quentes. Aquecimento separado não é caso nem qualidade.
    let warmup = '';
    const warm = performance.now();
    for await (const part of engine.generate(
      native ? 'Este é um aquecimento sintético.' : 'Responda somente TESTE.',
      { task: native ? cases[0]!.action : 'proof' },
    ))
      warmup += part;
    await emit({ type: 'warmup', totalMs: performance.now() - warm, text: warmup });
    for (const test of cases) {
      await emit({ type: 'case-start', id: test.id });
      const setup = performance.now();
      await engine.initialize({ ...(profile ? { profile } : {}), query: queryFor(test.action) });
      const setupMs = performance.now() - setup;
      const protectedDraft = protectDraft(test.text);
      const start = performance.now();
      let raw = '',
        output: string | null = null;
      let assessment: RiskAssessment | null = null;
      let error: string | null = null;
      let metrics: GenerationMetrics | null = null,
        nativeMetrics: NativeGenerationMetrics | null = null;
      let firstVisibleMs: number | null = null;
      let generationMs: number | null = null;
      let status = 'accepted';
      try {
        for await (const fragment of engine.generate(
          options.pipeline === 'original' ? test.text : protectedDraft.text,
          {
            task: test.action,
            inputFormat: options.pipeline,
            writingOptions: { preserveSlang: true, addEmojis: false },
            onMetrics: (value) => {
              metrics = value;
            },
            onNativeMetrics: (value) => {
              nativeMetrics = value;
            },
          },
        )) {
          firstVisibleMs ??= performance.now() - start;
          raw += fragment;
        }
        generationMs = performance.now() - start;
        if (options.pipeline === 'original') {
          const result = suggestionResult(test.text, raw, engine.identity());
          output = result.text;
          assessment = result.assessment;
        } else
          output = await validateActionOutput(
            protectedDraft,
            raw,
            test.text,
            false,
            engine,
            new AbortController().signal,
            () => undefined,
          );
      } catch (caught) {
        generationMs ??= performance.now() - start;
        error = String(caught);
        status = /EMPTY_OUTPUT|INVALID_OUTPUT|TRUNCATED_OUTPUT|PRESERVATION_RISK/u.test(error)
          ? 'rejected'
          : 'generation-error';
      }
      await emit({
        type: 'case',
        id: test.id,
        action: test.action,
        status,
        executionComplete: true,
        raw,
        output,
        assessment,
        error,
        metrics,
        nativeMetrics,
        firstVisibleMs,
        generationMs,
        setupMs,
        totalMs: performance.now() - start,
        engine: engine.identity(),
        protectedText: options.pipeline === 'legacy-protected' ? protectedDraft.text : null,
        slots: options.pipeline === 'legacy-protected' ? protectedDraft.slots : null,
      });
    }
  } finally {
    if (!options.retain) await engine.unload();
  }
}
