import { ChromeEngine } from '../../src/extension/ai/chrome-engine';
import { comparisonRun } from '../benchmark/comparison-run';
import type { ComparisonOptions } from '../benchmark/comparison-run';
import { WRITING_ACTIONS } from '../../src/shared/actions';

async function run(options: ComparisonOptions, emit: (value: unknown) => Promise<void>) {
  if (options.candidate === 'chrome-prompt') {
    await comparisonRun(native, options, emit, () => Promise.resolve());
    await emit({ type: 'done' });
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const worker = (local ??= new Worker(new URL('./step15d-worker.ts', import.meta.url), {
      type: 'module',
    }));
    let queue = Promise.resolve();
    worker.onerror = () => {
      worker.terminate();
      local = undefined;
      reject(new Error('Worker de comparação falhou.'));
    };
    worker.onmessage = (event: MessageEvent<{ type: string; error?: string }>) => {
      queue = queue.then(() => emit(event.data));
      if (event.data.type === 'load') void queue.then(() => worker.postMessage('continue'), reject);
      if (['done', 'fatal'].includes(event.data.type)) {
        if (!options.retain || event.data.type === 'fatal') {
          worker.terminate();
          local = undefined;
        }
        void queue.then(
          () => (event.data.type === 'done' ? resolve() : reject(new Error(event.data.error))),
          reject,
        );
      }
    };
    worker.postMessage(options);
  });
}
const native = new ChromeEngine();
let local: Worker | undefined;
async function availability() {
  const engine = new ChromeEngine();
  return Promise.all(
    WRITING_ACTIONS.map(async ({ id }) => ({
      action: id,
      declared: await engine.availability({ action: id, language: 'pt-BR' }),
      experimental: await engine.availability({
        action: id,
        language: 'pt-BR',
        chromePortuguesePrompt: true,
      }),
    })),
  );
}
Object.assign(globalThis, { __step15dRun: run, __step15dAvailability: availability });
