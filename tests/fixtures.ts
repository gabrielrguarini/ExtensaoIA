import type { Binding, ClientCommand } from '../src/shared/protocol';

export const binding: Binding = {
  key: { requestId: 'req-a', editorId: 'editor-a', snapshotId: 'snapshot-a', revision: 1 },
  origin: { tabId: 1, frameId: 0, documentId: 'document-a', connectionId: 'connection-a' },
};
export const start = {
  type: 'start',
  key: binding.key,
  text: 'Teste sintético 🙂\nSegunda linha.',
  action: 'simular',
} satisfies ClientCommand;

export const suggestionMetadata = {
  engine: {
    id: 'webllm' as const,
    model: 'synthetic-test',
    runtime: '0.2.82',
    execution: 'webgpu' as const,
  },
  status: 'changed' as const,
};
