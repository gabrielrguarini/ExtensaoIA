import './diagnostic-client';
import { mountEditorButton } from './editor-button';

let dispose = mountEditorButton(document);
globalThis.addEventListener('pagehide', () => {
  dispose();
});
globalThis.addEventListener('pageshow', (event) => {
  if (event.persisted) dispose = mountEditorButton(document);
});
