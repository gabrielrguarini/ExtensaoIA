export type LocalModel = 'webllm' | 'gemma';
export type GemmaVariant = 'q4f16' | 'q4';
export type LocalVariant = 'q4f16_1' | 'q4f32_1' | GemmaVariant;
export function isLocalVariant(value: unknown): value is LocalVariant {
  return typeof value === 'string' && ['q4f16_1', 'q4f32_1', 'q4f16', 'q4'].includes(value);
}
export function isGemmaVariant(value: unknown): value is GemmaVariant {
  return value === 'q4f16' || value === 'q4';
}
