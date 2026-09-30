export interface WritingOptions {
  preserveSlang: boolean;
  addEmojis: boolean;
}
export const DEFAULT_WRITING_OPTIONS: WritingOptions = { preserveSlang: true, addEmojis: false };
export function isWritingOptions(value: unknown): value is WritingOptions {
  if (typeof value !== 'object' || !value || Array.isArray(value)) return false;
  return (
    Object.keys(value).length === 2 &&
    'preserveSlang' in value &&
    'addEmojis' in value &&
    typeof value.preserveSlang === 'boolean' &&
    typeof value.addEmojis === 'boolean'
  );
}
