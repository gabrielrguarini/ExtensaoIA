import { MODEL_CHOICES } from './model-catalog';
import type { ModelProfile } from './model-catalog';
import { GEMMA_MODEL } from './gemma-catalog';
import { gemmaBytes } from './gemma-cache';
import { isGemmaVariant } from '../../shared/local-model';
import type { LocalVariant } from '../../shared/local-model';
export function localChoice(profile: ModelProfile, variant: LocalVariant) {
  if (isGemmaVariant(variant))
    return {
      id: 'Gemma 4 E2B (' + variant + ')',
      variant,
      downloadBytes: gemmaBytes(variant),
      gpuMemoryEstimateMB: null,
      contextTokens: GEMMA_MODEL.contextTokens,
      license: 'Apache 2.0',
    };
  return MODEL_CHOICES[profile][variant];
}
