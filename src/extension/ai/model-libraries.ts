import llamaF16 from './wasm/Llama-3.2-3B-Instruct-q4f16_1-ctx4k_cs1k-webgpu.wasm?url';
import llamaF32 from './wasm/Llama-3.2-3B-Instruct-q4f32_1-ctx4k_cs1k-webgpu.wasm?url';
import qwen4F16 from './wasm/Qwen3-4B-q4f16_1-ctx4k_cs1k-webgpu.wasm?url';
import qwen4F32 from './wasm/Qwen3-4B-q4f32_1-ctx4k_cs1k-webgpu.wasm?url';
import qwen8F16 from './wasm/Qwen3-8B-q4f16_1-ctx4k_cs1k-webgpu.wasm?url';
import qwen8F32 from './wasm/Qwen3-8B-q4f32_1-ctx4k_cs1k-webgpu.wasm?url';
import type { ModelProfile, ModelVariant } from './model-catalog';

/** Importado somente pelo Worker: o content script não incorpora binários WASM. */
export const MODEL_LIBRARIES: Record<ModelProfile, Record<ModelVariant, string>> = {
  economico: { q4f16_1: llamaF16, q4f32_1: llamaF32 },
  equilibrado: { q4f16_1: qwen4F16, q4f32_1: qwen4F32 },
  qualidade: { q4f16_1: qwen8F16, q4f32_1: qwen8F32 },
};
