import { SimulatedEngine } from './simulated-engine';
import { isEngineCommand, sameBinding } from '../../shared/protocol';
import type { Binding, BoundRequest, EngineEvent } from '../../shared/protocol';
import { WebLLMEngine, ModelEnvironmentError } from './webllm-engine';
import { MODEL_PROOF_TEXT } from '../../shared/model-proof';
import { CorrectionOutputError } from './correction-output';
import { protectDraft } from './entities';
import { isWritingAction } from '../../shared/actions';
import { restoredStreamingPrefix } from './streaming-preview';
import { MAX_TEXT_LENGTH } from '../../shared/protocol';
import { SemanticReviewError } from './semantic-review';
import { validateActionOutput } from './action-validation';

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

async function runModel(request: BoundRequest): Promise<void> {
  const binding: Binding = { key: request.key, origin: request.origin };
  if (active) {
    emit({ type: 'error', binding, code: 'BUSY' });
    return;
  }
  if (idle) clearTimeout(idle);
  const controller = new AbortController();
  active = { binding, controller };
  const action = isWritingAction(request.action) ? request.action : undefined;
  let terminal: EngineEvent | undefined;
  try {
    const protectedDraft = action ? protectDraft(request.text) : undefined;
    await model.initialize({
      signal: controller.signal,
      profile: request.profile ?? 'economico',
      allowDownload: request.allowDownload === true,
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
    let oversized = false;
    let lastVisible = '';
    let lastShownAt = 0;
    for await (const fragment of model.generate(protectedDraft?.text ?? MODEL_PROOF_TEXT, {
      signal: controller.signal,
      task: action ?? 'proof',
    })) {
      if (controller.signal.aborted || oversized) continue;
      response += fragment;
      if (response.length > MAX_TEXT_LENGTH) {
        response = '';
        oversized = true;
        continue;
      }
      if (action && protectedDraft) {
        const visible = restoredStreamingPrefix(protectedDraft, response);
        const now = performance.now();
        if (
          visible &&
          visible !== lastVisible &&
          visible.length <= MAX_TEXT_LENGTH &&
          now - lastShownAt >= 100
        ) {
          emit({ type: 'action-fragment', binding, action, text: visible });
          lastVisible = visible;
          lastShownAt = now;
        }
      }
    }
    if (controller.signal.aborted) throw controller.signal.reason;
    if (oversized) throw new CorrectionOutputError('INVALID_OUTPUT');
    if (action) {
      emit({
        type: 'model-progress',
        binding,
        phase: 'validating',
        percent: 100,
        variant: model.selectedVariant() ?? null,
      });
      const text = await validateActionOutput(
        protectedDraft!,
        response,
        request.text,
        request.semanticReview,
        model,
        controller.signal,
        () =>
          emit({
            type: 'model-progress',
            binding,
            phase: 'reviewing',
            percent: 100,
            variant: model.selectedVariant() ?? null,
          }),
      );
      terminal = { type: 'action-result', binding, action, text };
    } else {
      const variant = model.selectedVariant();
      if (!variant || !response.trim()) throw new CorrectionOutputError('EMPTY_OUTPUT');
      terminal = { type: 'proof-result', binding, text: response.trim(), variant };
    }
  } catch (error) {
    if (controller.signal.aborted) terminal = { type: 'cancelled', binding };
    else {
      const code =
        error instanceof ModelEnvironmentError ||
        error instanceof CorrectionOutputError ||
        error instanceof SemanticReviewError
          ? error.code
          : 'UNAVAILABLE';
      terminal = action
        ? { type: 'action-rejected', binding, action, code }
        : { type: 'error', binding, code };
      if (code === 'UNAVAILABLE' || code === 'MODEL_DOWNLOAD' || code === 'INSUFFICIENT_RESOURCES')
        await model.unload().catch(() => undefined);
    }
  } finally {
    if (active?.controller === controller) active = undefined;
    armIdle();
    if (terminal) emit(terminal);
  }
}

globalThis.addEventListener('message', (event: MessageEvent<unknown>) => {
  if (!isEngineCommand(event.data)) return;
  const command = event.data;
  if (command.type === 'start' && command.request.action !== 'simular') {
    void runModel(command.request);
  } else if (command.type === 'cancel' && active && sameBinding(command.binding, active.binding)) {
    active.controller.abort();
  } else {
    engine.receive(command);
  }
});
globalThis.postMessage({ type: 'ready', simulated: true });
