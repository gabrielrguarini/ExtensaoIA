import type { ProtectedDraft } from './entities';
import { restoreAndValidate } from './entities';
import { acceptCorrection } from './correction-output';
import { reviewSuggestion } from './semantic-review';
import type { AIEngine } from './ai-engine';

export async function validateActionOutput(
  protectedDraft: ProtectedDraft,
  generated: string,
  original: string,
  semanticReview: boolean,
  model: Pick<AIEngine, 'generate'>,
  signal: AbortSignal,
  onReview: () => void,
  addEmojis = false,
): Promise<string> {
  const restored = restoreAndValidate(protectedDraft, generated, addEmojis);
  const text = acceptCorrection(restored, original);
  if (semanticReview) {
    onReview();
    await reviewSuggestion(model, original, text, signal);
  }
  return text;
}
