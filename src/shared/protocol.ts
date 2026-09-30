import { MODEL_PROOF_TEXT } from './model-proof';
import { isWritingAction } from './actions';
import type { WritingAction } from './actions';
import type { ModelProfile } from '../extension/ai/model-catalog';

export const CLIENT_PORT = 'writing-client-v1';
export const MAX_TEXT_LENGTH = 8_000;

export interface RequestKey {
  requestId: string;
  editorId: string;
  snapshotId: string;
  revision: number;
}

export interface Origin {
  tabId: number;
  frameId: number;
  documentId: string;
  connectionId: string;
}

export interface Binding {
  key: RequestKey;
  origin: Origin;
}
export interface BoundRequest extends Binding {
  text: string;
  action: 'simular' | WritingAction | 'prova-modelo';
  semanticReview: boolean;
  profile?: ModelProfile;
  allowDownload?: boolean;
}

export type ClientCommand =
  | {
      type: 'start';
      key: RequestKey;
      text: string;
      action: BoundRequest['action'];
      allowDownload?: boolean;
      expectedProfile?: ModelProfile;
    }
  | { type: 'cancel'; key: RequestKey }
  | { type: 'status' };

export type ErrorCode =
  | 'INVALID_MESSAGE'
  | 'BUSY'
  | 'UNKNOWN_REQUEST'
  | 'UNAVAILABLE'
  | 'DISCONNECTED'
  | 'TIMEOUT'
  | 'WEBGPU_UNAVAILABLE'
  | 'INSUFFICIENT_RESOURCES'
  | 'MODEL_DOWNLOAD'
  | 'DOWNLOAD_REQUIRED'
  | 'CONTEXT_LIMIT'
  | 'EMPTY_OUTPUT'
  | 'TRUNCATED_OUTPUT'
  | 'INVALID_OUTPUT'
  | 'PRESERVATION_RISK'
  | 'SEMANTIC_RISK'
  | 'SEMANTIC_INVALID';
export type RequestEvent =
  | { type: 'progress'; binding: Binding; percent: number }
  | {
      type: 'model-progress';
      binding: Binding;
      phase:
        | 'preparing'
        | 'downloading'
        | 'loading'
        | 'ready'
        | 'generating'
        | 'validating'
        | 'reviewing';
      percent: number;
      variant: 'q4f16_1' | 'q4f32_1' | null;
    }
  | { type: 'fragment'; binding: Binding; text: string }
  | { type: 'action-fragment'; binding: Binding; action: WritingAction; text: string }
  | { type: 'result'; binding: Binding; text: string; simulated: true }
  | { type: 'action-result'; binding: Binding; action: WritingAction; text: string }
  | { type: 'action-rejected'; binding: Binding; action: WritingAction; code: ErrorCode }
  | {
      type: 'proof-result';
      binding: Binding;
      text: string;
      variant: 'q4f16_1' | 'q4f32_1';
    }
  | { type: 'cancelled'; binding: Binding }
  | { type: 'error'; binding: Binding; code: ErrorCode };
export type ClientEvent =
  | RequestEvent
  | { type: 'status'; state: 'idle' | 'busy'; simulated: true }
  | { type: 'rejected'; code: ErrorCode; key: RequestKey | null };
export type EngineCommand =
  { type: 'start'; request: BoundRequest } | { type: 'cancel'; binding: Binding };
export type EngineEvent = RequestEvent | { type: 'ready'; simulated: true };

export function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function fields(value: Record<string, unknown>, keys: string[]): boolean {
  return (
    Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key))
  );
}
export function identifier(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value);
}
function textValue(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_TEXT_LENGTH;
}
export function isKey(value: unknown): value is RequestKey {
  return (
    record(value) &&
    fields(value, ['requestId', 'editorId', 'snapshotId', 'revision']) &&
    identifier(value.requestId) &&
    identifier(value.editorId) &&
    identifier(value.snapshotId) &&
    Number.isSafeInteger(value.revision) &&
    (value.revision as number) >= 0
  );
}
export function isBinding(value: unknown): value is Binding {
  if (
    !record(value) ||
    !fields(value, ['key', 'origin']) ||
    !isKey(value.key) ||
    !record(value.origin)
  )
    return false;
  const origin = value.origin;
  return (
    fields(origin, ['tabId', 'frameId', 'documentId', 'connectionId']) &&
    Number.isSafeInteger(origin.tabId) &&
    (origin.tabId as number) >= 0 &&
    origin.frameId === 0 &&
    identifier(origin.documentId) &&
    identifier(origin.connectionId)
  );
}
export function sameKey(a: RequestKey, b: RequestKey): boolean {
  return (
    a.requestId === b.requestId &&
    a.editorId === b.editorId &&
    a.snapshotId === b.snapshotId &&
    a.revision === b.revision
  );
}
export function sameBinding(a: Binding, b: Binding): boolean {
  return (
    sameKey(a.key, b.key) &&
    a.origin.tabId === b.origin.tabId &&
    a.origin.frameId === b.origin.frameId &&
    a.origin.documentId === b.origin.documentId &&
    a.origin.connectionId === b.origin.connectionId
  );
}
export function isClientCommand(value: unknown): value is ClientCommand {
  if (!record(value)) return false;
  switch (value.type) {
    case 'start':
      return (
        (fields(value, ['type', 'key', 'text', 'action']) ||
          fields(value, ['type', 'key', 'text', 'action', 'allowDownload']) ||
          fields(value, ['type', 'key', 'text', 'action', 'expectedProfile']) ||
          fields(value, ['type', 'key', 'text', 'action', 'allowDownload', 'expectedProfile'])) &&
        (value.allowDownload === undefined || typeof value.allowDownload === 'boolean') &&
        (value.expectedProfile === undefined ||
          value.expectedProfile === 'economico' ||
          value.expectedProfile === 'equilibrado' ||
          value.expectedProfile === 'qualidade') &&
        (value.allowDownload !== true || value.expectedProfile !== undefined) &&
        isKey(value.key) &&
        textValue(value.text) &&
        value.text.trim().length > 0 &&
        (value.action === 'simular' ||
          isWritingAction(value.action) ||
          (value.action === 'prova-modelo' && value.text === MODEL_PROOF_TEXT))
      );
    case 'cancel':
      return fields(value, ['type', 'key']) && isKey(value.key);
    case 'status':
      return fields(value, ['type']);
    default:
      return false;
  }
}
function isErrorCode(value: unknown): value is ErrorCode {
  return (
    typeof value === 'string' &&
    [
      'INVALID_MESSAGE',
      'BUSY',
      'UNKNOWN_REQUEST',
      'UNAVAILABLE',
      'DISCONNECTED',
      'TIMEOUT',
      'WEBGPU_UNAVAILABLE',
      'INSUFFICIENT_RESOURCES',
      'MODEL_DOWNLOAD',
      'DOWNLOAD_REQUIRED',
      'CONTEXT_LIMIT',
      'EMPTY_OUTPUT',
      'TRUNCATED_OUTPUT',
      'INVALID_OUTPUT',
      'PRESERVATION_RISK',
      'SEMANTIC_RISK',
      'SEMANTIC_INVALID',
    ].includes(value)
  );
}
export function isRequestEvent(value: unknown): value is RequestEvent {
  if (!record(value) || !isBinding(value.binding)) return false;
  switch (value.type) {
    case 'progress':
      return (
        fields(value, ['type', 'binding', 'percent']) &&
        typeof value.percent === 'number' &&
        Number.isFinite(value.percent) &&
        value.percent >= 0 &&
        value.percent <= 100
      );
    case 'model-progress':
      return (
        fields(value, ['type', 'binding', 'phase', 'percent', 'variant']) &&
        [
          'preparing',
          'downloading',
          'loading',
          'ready',
          'generating',
          'validating',
          'reviewing',
        ].includes(String(value.phase)) &&
        typeof value.percent === 'number' &&
        Number.isFinite(value.percent) &&
        value.percent >= 0 &&
        value.percent <= 100 &&
        (value.variant === null || value.variant === 'q4f16_1' || value.variant === 'q4f32_1')
      );
    case 'fragment':
      return fields(value, ['type', 'binding', 'text']) && textValue(value.text);
    case 'action-fragment':
      return (
        fields(value, ['type', 'binding', 'action', 'text']) &&
        isWritingAction(value.action) &&
        textValue(value.text)
      );
    case 'result':
      return (
        fields(value, ['type', 'binding', 'text', 'simulated']) &&
        textValue(value.text) &&
        value.simulated === true
      );
    case 'action-result':
      return (
        fields(value, ['type', 'binding', 'action', 'text']) &&
        isWritingAction(value.action) &&
        textValue(value.text)
      );
    case 'action-rejected':
      return (
        fields(value, ['type', 'binding', 'action', 'code']) &&
        isWritingAction(value.action) &&
        isErrorCode(value.code)
      );
    case 'proof-result':
      return (
        fields(value, ['type', 'binding', 'text', 'variant']) &&
        textValue(value.text) &&
        (value.variant === 'q4f16_1' || value.variant === 'q4f32_1')
      );
    case 'cancelled':
      return fields(value, ['type', 'binding']);
    case 'error':
      return fields(value, ['type', 'binding', 'code']) && isErrorCode(value.code);
    default:
      return false;
  }
}
export function isClientEvent(value: unknown): value is ClientEvent {
  return (
    isRequestEvent(value) ||
    (record(value) &&
      ((fields(value, ['type', 'state', 'simulated']) &&
        value.type === 'status' &&
        (value.state === 'idle' || value.state === 'busy') &&
        value.simulated === true) ||
        (fields(value, ['type', 'code', 'key']) &&
          value.type === 'rejected' &&
          isErrorCode(value.code) &&
          (value.key === null || isKey(value.key)))))
  );
}
export function isEngineEvent(value: unknown): value is EngineEvent {
  return (
    isRequestEvent(value) ||
    (record(value) &&
      fields(value, ['type', 'simulated']) &&
      value.type === 'ready' &&
      value.simulated === true)
  );
}
export function isEngineCommand(value: unknown): value is EngineCommand {
  if (!record(value)) return false;
  if (value.type === 'cancel')
    return fields(value, ['type', 'binding']) && isBinding(value.binding);
  if (value.type !== 'start' || !fields(value, ['type', 'request']) || !record(value.request))
    return false;
  const request = value.request;
  return (
    (fields(request, ['key', 'origin', 'text', 'action', 'semanticReview']) ||
      fields(request, [
        'key',
        'origin',
        'text',
        'action',
        'semanticReview',
        'profile',
        'allowDownload',
      ])) &&
    isBinding({ key: request.key, origin: request.origin }) &&
    (request.profile === undefined ||
      request.profile === 'economico' ||
      request.profile === 'equilibrado' ||
      request.profile === 'qualidade') &&
    (request.allowDownload === undefined || typeof request.allowDownload === 'boolean') &&
    textValue(request.text) &&
    typeof request.semanticReview === 'boolean' &&
    (isWritingAction(request.action) || request.semanticReview === false) &&
    (request.action === 'simular' ||
      isWritingAction(request.action) ||
      (request.action === 'prova-modelo' && request.text === MODEL_PROOF_TEXT))
  );
}
