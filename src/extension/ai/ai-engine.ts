export type ModelPhase = 'preparing' | 'downloading' | 'loading' | 'ready';

export interface InitializeOptions {
  signal?: AbortSignal;
  onProgress?: (phase: ModelPhase, percent: number) => void;
  profile?: ModelProfile;
  allowDownload?: boolean;
}

export interface GenerateOptions {
  signal?: AbortSignal;
  task?: 'proof' | 'semantic-review' | WritingAction;
}

/** O runtime concreto fica isolado atrás deste contrato. */
export interface AIEngine {
  initialize(options?: InitializeOptions): Promise<void>;
  isReady(): boolean;
  generate(text: string, options?: GenerateOptions): AsyncIterable<string>;
  unload(): Promise<void>;
}
import type { WritingAction } from '../../shared/actions';
import type { ModelProfile } from './model-catalog';
