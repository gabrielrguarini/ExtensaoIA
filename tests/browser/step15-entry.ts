import type { ModelProfile } from '../../src/extension/ai/model-catalog';

export function runBenchmark(
  profile: ModelProfile,
  loadOnly: boolean,
  record: (value: unknown) => Promise<void>,
  ids?: string[],
  pipeline: 'original' | 'legacy-protected' = 'original',
) {
  return new Promise<void>((resolve, reject) => {
    const worker = new Worker(new URL('./step15-worker.ts', import.meta.url), { type: 'module' });
    let queue = Promise.resolve();
    worker.onerror = () => {
      worker.terminate();
      reject(new Error('Benchmark Worker falhou.'));
    };
    worker.onmessage = (event: MessageEvent<{ type: string; error?: string }>) => {
      queue = queue.then(() => record(event.data));
      if (event.data.type === 'load' && !loadOnly)
        void queue.then(() => worker.postMessage('continue'), reject);
      if (event.data.type === 'done' || event.data.type === 'fatal') {
        worker.terminate();
        void queue.then(() => {
          if (event.data.type === 'fatal') reject(new Error(event.data.error));
          else resolve();
        }, reject);
      }
    };
    worker.postMessage({ profile, loadOnly, ids, pipeline });
  });
}

Object.assign(globalThis, { __step15Run: runBenchmark });
