import { SimulatedEngine } from './simulated-engine';
import { isEngineCommand } from '../../shared/protocol';
import type { EngineEvent } from '../../shared/protocol';
import { WebLLMEngine, ModelEnvironmentError } from './webllm-engine';
import { ModelRequestRunner } from './request-runner';
function emit(event: EngineEvent): void {
  globalThis.postMessage(event);
}
const simulated = new SimulatedEngine(emit);
const model = new WebLLMEngine();
const runner = new ModelRequestRunner(
  model,
  emit,
  () => model.selectedVariant(),
  (error) => (error instanceof ModelEnvironmentError ? error.code : 'UNAVAILABLE'),
);
globalThis.addEventListener('message', (event: MessageEvent<unknown>) => {
  if (!isEngineCommand(event.data)) return;
  if (!runner.receive(event.data)) simulated.receive(event.data);
});
globalThis.postMessage({ type: 'ready', simulated: true });
