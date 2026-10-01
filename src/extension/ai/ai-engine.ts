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
  writingOptions?: WritingOptions;
  /** Apenas harness histórico; o produto sempre usa o texto original. */
  inputFormat?: 'original' | 'legacy-protected';
  /** Contadores numéricos opcionais; sem conteúdo, armazenamento ou telemetria. */
  onMetrics?: (metrics: GenerationMetrics) => void;
}

export interface GenerationMetrics {
  promptTokens: number;
  completionTokens: number;
  maxTokens: number;
  runtimeFirstTokenMs: number;
  runtimeTotalMs: number;
  decodeTokensPerSecond: number;
}

/** O runtime concreto fica isolado atrás deste contrato. */
export interface AIEngine {
  identity(): EngineIdentity;
  capabilities(): EngineCapabilities;
  availability(query: AvailabilityQuery): Promise<EngineAvailability>;
  initialize(options?: InitializeOptions): Promise<void>;
  isReady(): boolean;
  generate(text: string, options?: GenerateOptions): AsyncIterable<string>;
  unload(): Promise<void>;
}
import type {
  EngineIdentity,
  EngineCapabilities,
  AvailabilityQuery,
  EngineAvailability,
} from '../../shared/suggestion';
import type { WritingAction } from '../../shared/actions';
import type { ModelProfile } from './model-catalog';
import type { WritingOptions } from '../../shared/writing-options';
