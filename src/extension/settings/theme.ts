import type { WritingPreferences } from '../../shared/preferences';
import { preferenceStore } from '../content/preferences-client';

export function watchTheme(element: HTMLElement): () => void {
  const apply = (value: WritingPreferences) => {
    element.dataset.theme = value.theme;
  };
  let active = true;
  let revision = 0;
  const unsubscribe = preferenceStore.subscribe?.((value) => {
    revision++;
    apply(value);
  });
  void preferenceStore.read().then(
    (value) => {
      if (active && revision === 0) apply(value);
    },
    () => undefined,
  );
  return () => {
    active = false;
    unsubscribe?.();
  };
}
