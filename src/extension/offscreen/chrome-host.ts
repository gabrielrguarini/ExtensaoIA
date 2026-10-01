import { ChromeEngine, nativeError } from '../ai/chrome-engine';
import { ModelRequestRunner } from '../ai/request-runner';
import type { Engine } from '../background/router';
import type { EngineEvent, BoundRequest } from '../../shared/protocol';
import type { AvailabilityQuery } from '../../shared/suggestion';

export class ChromeHost implements Engine {
  readonly model = new ChromeEngine();
  private readonly runner: ModelRequestRunner;
  constructor(private readonly emit: (event: EngineEvent) => void) {
    this.runner = new ModelRequestRunner(
      this.model,
      emit,
      undefined,
      (error) => nativeError(error).code,
      true,
    );
  }
  async prepare(
    query: AvailabilityQuery,
    signal: AbortSignal,
    request: BoundRequest,
  ): Promise<Engine> {
    await this.model.initialize({
      query,
      signal,
      onProgress: (phase, percent) => {
        if (!signal.aborted)
          this.emit({
            type: 'model-progress',
            binding: { key: request.key, origin: request.origin },
            phase,
            percent,
            variant: null,
          });
      },
    });
    signal.throwIfAborted();
    return this;
  }
  send: Engine['send'] = (command) => {
    this.runner.receive(command);
  };
  reset = (): void => {
    this.runner.reset();
    void this.model.unload();
  };
}
