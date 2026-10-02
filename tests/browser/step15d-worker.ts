import { WebLLMEngine } from '../../src/extension/ai/webllm-engine';
import { GemmaEngine } from '../../src/extension/ai/gemma-engine';
import { comparisonRun } from '../benchmark/comparison-run';
import type { ComparisonOptions } from '../benchmark/comparison-run';
import type { AIEngine } from '../../src/extension/ai/ai-engine';
let engine: AIEngine | undefined;
function receive(event: MessageEvent<ComparisonOptions>) {
  self.onmessage = null;
  engine ??= event.data.candidate === 'gemma' ? new GemmaEngine() : new WebLLMEngine();
  void comparisonRun(
    engine,
    event.data,
    (value) => {
      self.postMessage(value);
      return Promise.resolve();
    },
    () =>
      new Promise<void>((resolve) => {
        self.onmessage = () => {
          self.onmessage = null;
          resolve();
        };
      }),
  ).then(
    () => {
      self.onmessage = receive;
      self.postMessage({ type: 'done' });
    },
    (error: unknown) => self.postMessage({ type: 'fatal', error: String(error) }),
  );
}
self.onmessage = receive;
