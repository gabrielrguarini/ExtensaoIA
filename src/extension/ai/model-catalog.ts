export const WEBLLM_VERSION = '0.2.82';
export type ModelProfile = 'economico' | 'equilibrado' | 'qualidade';
export type ModelVariant = 'q4f16_1' | 'q4f32_1';
export const MODEL_PROFILES: ModelProfile[] = ['economico', 'equilibrado', 'qualidade'];
export const PROFILE_LABELS: Record<ModelProfile, string> = {
  economico: 'Econômico',
  equilibrado: 'Equilibrado',
  qualidade: 'Qualidade',
};

export interface ModelChoice {
  profile: ModelProfile;
  id: string;
  url: string;
  gpuMemoryEstimateMB: number;
  downloadBytes: number;
  variant: ModelVariant;
  license: 'Llama 3.2 Community License' | 'Apache-2.0';
  contextTokens: 4096;
}

const base = 'https://huggingface.co/mlc-ai/';
function choice(
  profile: ModelProfile,
  id: string,
  revision: string,
  gpuMemoryEstimateMB: number,
  downloadBytes: number,
  license: ModelChoice['license'],
): ModelChoice {
  return {
    profile,
    id,
    url: `${base}${id}/resolve/${revision}/`,
    gpuMemoryEstimateMB,
    downloadBytes,
    variant: id.includes('q4f16_1') ? 'q4f16_1' : 'q4f32_1',
    license,
    contextTokens: 4096,
  };
}

/** Pesos fixados por commit e bibliotecas da tabela oficial do WebLLM 0.2.82 (v0_2_80). */
export const MODEL_CHOICES: Record<ModelProfile, Record<ModelVariant, ModelChoice>> = {
  economico: {
    q4f16_1: choice(
      'economico',
      'Llama-3.2-3B-Instruct-q4f16_1-MLC',
      '1e80abf71e3d17cd564e2d2b63caa15cb226018e',
      2263.69,
      1_816_632_516,
      'Llama 3.2 Community License',
    ),
    q4f32_1: choice(
      'economico',
      'Llama-3.2-3B-Instruct-q4f32_1-MLC',
      '6083cfdaaf08d2dd4872d7f5b87fb0242aa7d75c',
      2951.51,
      1_816_632_516,
      'Llama 3.2 Community License',
    ),
  },
  equilibrado: {
    q4f16_1: choice(
      'equilibrado',
      'Qwen3-4B-q4f16_1-MLC',
      'a5c9fab855e3ccbdfed2e7e69683d75f30332161',
      3431.59,
      2_274_525_373,
      'Apache-2.0',
    ),
    q4f32_1: choice(
      'equilibrado',
      'Qwen3-4B-q4f32_1-MLC',
      'b7e4eb1ba80728187fb5df44055cc1a7c32310e0',
      4327.71,
      2_274_525_372,
      'Apache-2.0',
    ),
  },
  qualidade: {
    q4f16_1: choice(
      'qualidade',
      'Qwen3-8B-q4f16_1-MLC',
      'b3d55c289eae58f77095f5b68c895eeea358ee09',
      5695.78,
      4_619_346_526,
      'Apache-2.0',
    ),
    q4f32_1: choice(
      'qualidade',
      'Qwen3-8B-q4f32_1-MLC',
      '34026572351006ba1865d11319309b151d9ccf16',
      6852.55,
      4_619_346_526,
      'Apache-2.0',
    ),
  },
};

export function smallerProfile(profile: ModelProfile): ModelProfile | null {
  return profile === 'qualidade' ? 'equilibrado' : profile === 'equilibrado' ? 'economico' : null;
}
