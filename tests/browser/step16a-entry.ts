import type { WhatsAppAdapter } from '../../src/integration/whatsapp/adapter';
import { readDraft } from '../../src/integration/whatsapp/draft';
import { mountEditorButton } from '../../src/extension/content/editor-button';
import { PreviewSession } from '../../src/extension/content/preview-session';
import { DEFAULT_PREFERENCES } from '../../src/shared/preferences';
import type { ActionGenerator } from '../../src/extension/content/action-client';
import type { WritingPreferences } from '../../src/shared/preferences';

let session: PreviewSession;
let adapter: WhatsAppAdapter;
let callbacks: Parameters<ActionGenerator> | undefined;
let requests = 0;
let cancels = 0;
let dispose: (() => void) | undefined;

const fixture = {
  mount(interaction: WritingPreferences['interaction'] = 'direct') {
    dispose?.();
    dispose = mountEditorButton(document, (value) => {
      adapter = value;
      session = new PreviewSession(
        adapter,
        undefined,
        undefined,
        undefined,
        (...args) => {
          callbacks = args;
          requests++;
          return () => {
            cancels++;
          };
        },
        {
          read: () => Promise.resolve({ ...DEFAULT_PREFERENCES, interaction }),
          setProfile: () => Promise.resolve(DEFAULT_PREFERENCES),
        },
      );
      return session;
    });
  },
  partial(text: string) {
    callbacks?.[3](text);
  },
  finish(text: string) {
    callbacks?.[4]({ ok: true, text });
  },
  fail() {
    callbacks?.[4]({ ok: false, message: 'Falha sintética de teste.' });
  },
  state() {
    return { kind: session.getState().kind, requests, cancels };
  },
  read() {
    const editor = document.querySelector<HTMLElement>('#main > footer [contenteditable]');
    return editor ? readDraft(editor).text : null;
  },
  dispose() {
    dispose?.();
  },
};
declare global {
  interface Window {
    streamingFixture: typeof fixture;
  }
}
window.streamingFixture = fixture;
