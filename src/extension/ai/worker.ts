import { SimulatedEngine } from './simulated-engine';
import { isEngineCommand, sameBinding } from '../../shared/protocol';
import type { Binding, EngineEvent } from '../../shared/protocol';
import { WebLLMEngine, ModelEnvironmentError } from './webllm-engine';
import { MODEL_PROOF_TEXT } from '../../shared/model-proof';

const engine = new SimulatedEngine((event) => {
  globalThis.postMessage(event);
});
const model = new WebLLMEngine();
let active: { binding: Binding; controller: AbortController } | undefined;
let idle: ReturnType<typeof setTimeout> | undefined;

function emit(event: EngineEvent): void {
  globalThis.postMessage(event);
}

function armIdle(): void {
  if (idle) clearTimeout(idle);
  idle = setTimeout(() => {
    if (!active) void model.unload().catch(() => undefined);
  }, 5 * 60_000);
}

async function prove(binding: Binding): Promise<void> {
  if (active) {
    emit({ type: 'error', binding, code: 'BUSY' });
    return;
  }
  if (idle) clearTimeout(idle);
  const controller = new AbortController();
  active = { binding, controller };
  try {
    await model.initialize({
      signal: controller.signal,
      onProgress: (phase, percent) => {
        if (active?.controller !== controller || controller.signal.aborted) return;
        emit({
          type: 'model-progress',
          binding,
          phase,
          percent,
          variant: model.selectedVariant() ?? null,
        });
      },
    });
    if (controller.signal.aborted) throw controller.signal.reason;
    emit({
      type: 'model-progress',
      binding,
      phase: 'generating',
      percent: 100,
      variant: model.selectedVariant() ?? null,
    });
    let response = '';
    for await (const fragment of model.generate(MODEL_PROOF_TEXT, { signal: controller.signal }))
      response += fragment;
    if (controller.signal.aborted) throw controller.signal.reason;
    const variant = model.selectedVariant();
    if (!variant || !response.trim()) throw new Error('Resposta vazia.');
    emit({ type: 'proof-result', binding, text: response.trim(), variant });
  } catch (error) {
    if (controller.signal.aborted) emit({ type: 'cancelled', binding });
    else {
      emit({
        type: 'error',
        binding,
        code: error instanceof ModelEnvironmentError ? error.code : 'UNAVAILABLE',
      });
      await model.unload().catch(() => undefined);
    }
  } finally {
    if (active?.controller === controller) active = undefined;
    armIdle();
  }
}

globalThis.addEventListener('message', (event: MessageEvent<unknown>) => {
  if (!isEngineCommand(event.data)) return;
  const command = event.data;
  if (command.type === 'start' && command.request.action === 'prova-modelo') {
    void prove({ key: command.request.key, origin: command.request.origin });
  } else if (command.type === 'cancel' && active && sameBinding(command.binding, active.binding)) {
    active.controller.abort();
  } else {
    engine.receive(command);
  }
});
globalThis.postMessage({ type: 'ready', simulated: true });
