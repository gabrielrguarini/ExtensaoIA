import f16Library from './wasm/Llama-3.2-3B-Instruct-q4f16_1_cs1k-webgpu.wasm?url';
import f32Library from './wasm/Llama-3.2-3B-Instruct-q4f32_1_cs1k-webgpu.wasm?url';

export const WEBLLM_VERSION = '0.2.85';

export interface ModelChoice {
  id: string;
  url: string;
  library: string;
  gpuMemoryEstimateMB: number;
  variant: 'q4f16_1' | 'q4f32_1';
}

const base = 'https://huggingface.co/mlc-ai/';

export const MODEL_CHOICES: Record<ModelChoice['variant'], ModelChoice> = {
  q4f16_1: {
    id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    url: `${base}Llama-3.2-3B-Instruct-q4f16_1-MLC/resolve/1e80abf71e3d17cd564e2d2b63caa15cb226018e/`,
    library: f16Library,
    gpuMemoryEstimateMB: 2263.69,
    variant: 'q4f16_1',
  },
  q4f32_1: {
    id: 'Llama-3.2-3B-Instruct-q4f32_1-MLC',
    url: `${base}Llama-3.2-3B-Instruct-q4f32_1-MLC/resolve/6083cfdaaf08d2dd4872d7f5b87fb0242aa7d75c/`,
    library: f32Library,
    gpuMemoryEstimateMB: 2951.51,
    variant: 'q4f32_1',
  },
};
