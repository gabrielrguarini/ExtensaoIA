import { isEngineCommand } from '../../shared/protocol';
import type { EngineEvent } from '../../shared/protocol';
import { SimulatedEngine } from './simulated-engine';
import { ModelRequestRunner } from './request-runner';
import { GemmaEngine } from './gemma-engine';
import { ModelEnvironmentError } from './model-error';
const emit = (event: EngineEvent) => globalThis.postMessage(event);
const model = new GemmaEngine();
const simulated = new SimulatedEngine(emit);
const runner = new ModelRequestRunner(
  model,
  emit,
  () => model.selectedVariant(),
  (error) => (error instanceof ModelEnvironmentError ? error.code : 'UNAVAILABLE'),
);
globalThis.addEventListener('message', (event: MessageEvent<unknown>) => {
  if (isEngineCommand(event.data) && !runner.receive(event.data)) simulated.receive(event.data);
});
globalThis.postMessage({ type: 'ready', simulated: true });
