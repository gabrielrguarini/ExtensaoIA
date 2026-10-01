import { sameBinding } from '../../shared/protocol';
import type { AIEngine } from './ai-engine';
import type {
  Binding,
  BoundRequest,
  EngineCommand,
  EngineEvent,
  ErrorCode,
} from '../../shared/protocol';
import { MODEL_PROOF_TEXT } from '../../shared/model-proof';
import { CorrectionOutputError } from './correction-output';
import { isWritingAction } from '../../shared/actions';
import { MAX_TEXT_LENGTH } from '../../shared/protocol';
import { analyzeSuggestion, semanticApproved, SemanticReviewError } from './semantic-review';
import { suggestionResult } from './suggestion-assessment';
import { DEFAULT_WRITING_OPTIONS } from '../../shared/writing-options';
import type { LocalVariant } from '../../shared/local-model';

/** Mesmas guardas e avaliação para o Worker local e documento nativo. */
export class ModelRequestRunner {
  private active: { binding: Binding; controller: AbortController } | undefined;
  constructor(
    private readonly model: Pick<AIEngine, 'initialize' | 'generate' | 'identity' | 'unload'>,
    private readonly emit: (event: EngineEvent) => void,
    private readonly variant: () => LocalVariant | undefined = () => undefined,
    private readonly environmentError: (error: unknown) => ErrorCode = () => 'UNAVAILABLE',
    private readonly prepared = false,
  ) {}
  receive(command: EngineCommand): boolean {
    if (command.type === 'start' && command.request.action !== 'simular') {
      void this.run(command.request);
      return true;
    }
    if (
      command.type === 'cancel' &&
      this.active &&
      sameBinding(command.binding, this.active.binding)
    ) {
      this.active.controller.abort();
      return true;
    }
    return false;
  }
  reset(): void {
    this.active?.controller.abort();
  }
  private async run(request: BoundRequest): Promise<void> {
    const binding: Binding = { key: request.key, origin: request.origin };
    if (this.active) {
      this.emit({ type: 'error', binding, code: 'BUSY' });
      return;
    }
    const controller = new AbortController();
    this.active = { binding, controller };
    const action = isWritingAction(request.action) ? request.action : undefined;
    let terminal: EngineEvent | undefined;
    try {
      if (!this.prepared)
        await this.model.initialize({
          signal: controller.signal,
          profile: request.profile ?? 'economico',
          allowDownload: request.allowDownload === true,
          onProgress: (phase, percent) => {
            if (this.active?.controller !== controller || controller.signal.aborted) return;
            this.emit({
              type: 'model-progress',
              binding,
              phase,
              percent,
              variant: this.variant() ?? null,
            });
          },
        });
      if (controller.signal.aborted) throw controller.signal.reason;
      if (request.action === 'revisar-sentido' && request.suggestion) {
        this.emit({
          type: 'model-progress',
          binding,
          phase: 'reviewing',
          percent: 100,
          variant: this.variant() ?? null,
        });
        const result = suggestionResult(
          request.text,
          request.suggestion,
          this.model.identity(),
          request.writingOptions?.addEmojis,
        );
        try {
          const verdict = await analyzeSuggestion(
            this.model,
            request.text,
            request.suggestion,
            controller.signal,
          );
          result.assessment.semanticReview = 'completed';
          if (!semanticApproved(verdict)) {
            result.assessment.risks.push(
              ...(verdict.issues.length
                ? verdict.issues
                : ['A análise adicional identificou possível mudança de sentido.']
              )
                .map((message) => ({ code: 'semantic' as const, message }))
                .slice(0, 24 - result.assessment.risks.length),
            );
          }
        } catch (error) {
          if (controller.signal.aborted) throw controller.signal.reason;
          if (!(error instanceof SemanticReviewError)) throw error;
          result.assessment.semanticReview = 'unavailable';
          result.assessment.risks.push({
            code: 'semantic',
            message:
              'A análise adicional não retornou uma avaliação utilizável. Revise o sentido manualmente.',
          });
        }
        terminal = { type: 'review-result', binding, ...result };
        return;
      }
      this.emit({
        type: 'model-progress',
        binding,
        phase: 'generating',
        percent: 100,
        variant: this.variant() ?? null,
      });
      let response = '';
      let oversized = false;
      let lastVisible = '';
      let lastShownAt = 0;
      for await (const fragment of this.model.generate(action ? request.text : MODEL_PROOF_TEXT, {
        signal: controller.signal,
        task: action ?? 'proof',
        writingOptions: request.writingOptions ?? DEFAULT_WRITING_OPTIONS,
      })) {
        if (controller.signal.aborted || oversized) continue;
        response += fragment;
        if (response.length > MAX_TEXT_LENGTH) {
          response = '';
          oversized = true;
          continue;
        }
        if (action) {
          const visible = response;
          const now = performance.now();
          if (
            visible &&
            visible !== lastVisible &&
            visible.length <= MAX_TEXT_LENGTH &&
            now - lastShownAt >= 100
          ) {
            this.emit({ type: 'action-fragment', binding, action, text: visible });
            lastVisible = visible;
            lastShownAt = now;
          }
        }
      }
      if (controller.signal.aborted) throw controller.signal.reason;
      if (oversized) throw new CorrectionOutputError('INVALID_OUTPUT');
      if (action) {
        this.emit({
          type: 'model-progress',
          binding,
          phase: 'validating',
          percent: 100,
          variant: this.variant() ?? null,
        });
        terminal = {
          type: 'action-result',
          binding,
          action,
          ...suggestionResult(
            request.text,
            response,
            this.model.identity(),
            request.writingOptions?.addEmojis,
          ),
        };
      } else {
        const variant = this.variant();
        if (!variant || !response.trim()) throw new CorrectionOutputError('EMPTY_OUTPUT');
        terminal = { type: 'proof-result', binding, text: response.trim(), variant };
      }
    } catch (error) {
      if (controller.signal.aborted) terminal = { type: 'cancelled', binding };
      else {
        const code =
          error instanceof CorrectionOutputError || error instanceof SemanticReviewError
            ? error.code
            : this.environmentError(error);
        terminal = action
          ? { type: 'action-rejected', binding, action, code }
          : { type: 'error', binding, code };
        if (
          code === 'UNAVAILABLE' ||
          code === 'MODEL_DOWNLOAD' ||
          code === 'INSUFFICIENT_RESOURCES'
        )
          await this.model.unload().catch(() => undefined);
      }
    } finally {
      if (this.active?.controller === controller) this.active = undefined;
      if (controller.signal.aborted) terminal = { type: 'cancelled', binding };
      if (terminal) this.emit(terminal);
    }
  }
}
