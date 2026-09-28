export type ModelPhase = 'preparing' | 'downloading' | 'loading' | 'ready';

export interface InitializeOptions {
  signal?: AbortSignal;
  onProgress?: (phase: ModelPhase, percent: number) => void;
}

export interface GenerateOptions {
  signal?: AbortSignal;
}

/** O runtime concreto fica isolado atrás deste contrato. */
export interface AIEngine {
  initialize(options?: InitializeOptions): Promise<void>;
  isReady(): boolean;
  generate(text: string, options?: GenerateOptions): AsyncIterable<string>;
  unload(): Promise<void>;
}
