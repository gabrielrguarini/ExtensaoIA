import { BENCHMARK_CASES } from '../benchmark/cases';
import { WebLLMEngine } from '../../src/extension/ai/webllm-engine';
import { MODEL_CHOICES } from '../../src/extension/ai/model-catalog';
import type { ModelProfile } from '../../src/extension/ai/model-catalog';
import { protectDraft } from '../../src/extension/ai/entities';
import { validateActionOutput } from '../../src/extension/ai/action-validation';
import type { GenerationMetrics } from '../../src/extension/ai/ai-engine';

/** Harness isolado, não incluído no pacote de produção; somente dataset fixo sintético. */
self.onmessage = (event: MessageEvent<{ profile: ModelProfile; loadOnly: boolean }>) => {
  self.onmessage = null;
  void run(event.data.profile, event.data.loadOnly).catch((error: unknown) => {
    self.postMessage({ type: 'fatal', error: String(error) });
  });
};

async function run(profile: ModelProfile, loadOnly: boolean) {
  const model = new WebLLMEngine();
  const start = performance.now();
  let lastPhase = '';
  let downloadFinishedMs: number | null = null;
  let loadError: string | null = null;
  try {
    await model.initialize({
      profile,
      allowDownload: !loadOnly,
      onProgress: (phase, percent) => {
        if (phase === 'loading' && downloadFinishedMs === null)
          downloadFinishedMs = performance.now() - start;
        const key = `${phase}:${Math.floor(percent / 10)}`;
        if (key !== lastPhase) {
          self.postMessage({ type: 'progress', phase, percent });
          lastPhase = key;
        }
      },
    });
  } catch (error) {
    loadError = String(error);
  }
  const coldMs = performance.now() - start;
  const warmStart = performance.now();
  if (!loadError) await model.initialize({ profile });
  self.postMessage({
    type: 'load',
    profile,
    choice: MODEL_CHOICES[profile][model.selectedVariant() ?? 'q4f16_1'],
    variant: model.selectedVariant() ?? null,
    coldMs,
    preparationMs: downloadFinishedMs,
    cacheToReadyMs: downloadFinishedMs === null ? null : coldMs - downloadFinishedMs,
    warmMs: loadError ? null : performance.now() - warmStart,
    error: loadError,
  });
  if (loadOnly) {
    await model.unload();
    self.postMessage({ type: 'done', profile });
    return;
  }
  await new Promise<void>((resolve) => {
    self.onmessage = () => {
      self.onmessage = null;
      resolve();
    };
  });
  try {
    for (const test of BENCHMARK_CASES) {
      const protectedDraft = protectDraft(test.text);
      let raw = '';
      let output: string | null = null;
      let error: string | null = loadError;
      let metrics: GenerationMetrics | null = null;
      let firstVisibleMs: number | null = null;
      let generationMs: number | null = null;
      let status = loadError ? 'load-error' : 'accepted';
      const started = performance.now();
      if (!loadError) {
        try {
          for await (const fragment of model.generate(protectedDraft.text, {
            task: test.action,
            writingOptions: { preserveSlang: true, addEmojis: false },
            onMetrics: (value) => {
              metrics = value;
            },
          })) {
            firstVisibleMs ??= performance.now() - started;
            raw += fragment;
          }
          generationMs = performance.now() - started;
          output = await validateActionOutput(
            protectedDraft,
            raw,
            test.text,
            false,
            model,
            new AbortController().signal,
            () => undefined,
          );
        } catch (caught) {
          generationMs ??= performance.now() - started;
          error = String(caught);
          status = /EMPTY_OUTPUT|TRUNCATED_OUTPUT|INVALID_OUTPUT|PRESERVATION_RISK/u.test(error)
            ? 'rejected'
            : 'generation-error';
        }
      }
      self.postMessage({
        type: 'case',
        profile,
        id: test.id,
        action: test.action,
        status,
        raw,
        output,
        error,
        metrics,
        firstVisibleMs,
        generationMs,
        totalMs: loadError ? null : performance.now() - started,
        protectedText: protectedDraft.text,
        slots: protectedDraft.slots.map(({ placeholder, entity }) => ({
          placeholder,
          value: entity.value,
          kind: entity.kind,
        })),
      });
    }
  } finally {
    await model.unload();
  }
  self.postMessage({ type: 'done', profile });
}
