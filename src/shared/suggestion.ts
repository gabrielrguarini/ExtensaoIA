import type { WritingAction } from './actions';

export interface EngineIdentity {
  id: 'webllm' | 'chrome' | 'transformers';
  model: string | null;
  runtime: string;
  execution: 'webgpu' | 'cpu' | 'browser-managed';
}

export type RiskCode = 'entities' | 'negation' | 'intent' | 'length' | 'format' | 'semantic';
export interface ContentRisk {
  code: RiskCode;
  message: string;
}
/** Somente avaliação histórica dos benchmarks; não integra o resultado do produto. */
export interface RiskAssessment {
  status: 'changed' | 'unchanged';
  risks: ContentRisk[];
  semanticReview: 'not-requested' | 'completed' | 'unavailable';
}
export interface SuggestionResult {
  text: string;
  engine: EngineIdentity;
  status: 'changed' | 'unchanged';
}
export interface EngineCapabilities {
  actions: readonly WritingAction[];
  languages: readonly string[];
  streaming: boolean;
  semanticReview: boolean;
  local: true;
}
export interface AvailabilityQuery {
  action: WritingAction | 'semantic-review';
  language: string;
  /** Compatibilidade automática autorizada: saída da sessão en, pt-BR por instrução. */
  chromePortuguesePrompt?: boolean;
}
/** Não consulta/download de pesos nem promete memória livre. */
export interface EngineAvailability {
  state: 'ready' | 'requires-initialization' | 'unavailable';
  reason?: 'language' | 'action' | 'hardware' | 'api' | 'probe';
  nativeAvailability?: Availability;
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function fields(value: Record<string, unknown>, keys: string[]) {
  return Object.keys(value).length === keys.length && keys.every((key) => key in value);
}
export function isEngineIdentity(value: unknown): value is EngineIdentity {
  return (
    object(value) &&
    fields(value, ['id', 'model', 'runtime', 'execution']) &&
    ['webllm', 'chrome', 'transformers'].includes(String(value.id)) &&
    (value.model === null ||
      (typeof value.model === 'string' && value.model.length > 0 && value.model.length <= 200)) &&
    typeof value.runtime === 'string' &&
    value.runtime.length > 0 &&
    value.runtime.length <= 80 &&
    ['webgpu', 'cpu', 'browser-managed'].includes(String(value.execution))
  );
}
export function isRiskAssessment(value: unknown): value is RiskAssessment {
  return (
    object(value) &&
    fields(value, ['status', 'risks', 'semanticReview']) &&
    ['changed', 'unchanged'].includes(String(value.status)) &&
    ['not-requested', 'completed', 'unavailable'].includes(String(value.semanticReview)) &&
    Array.isArray(value.risks) &&
    value.risks.length <= 24 &&
    value.risks.every(
      (risk: unknown) =>
        object(risk) &&
        fields(risk, ['code', 'message']) &&
        ['entities', 'negation', 'intent', 'length', 'format', 'semantic'].includes(
          String(risk.code),
        ) &&
        typeof risk.message === 'string' &&
        risk.message.trim().length > 0 &&
        risk.message.length <= 300,
    )
  );
}
