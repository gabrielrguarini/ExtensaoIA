import { identifier } from './protocol';
import type { Origin } from './protocol';

interface Sender {
  id?: string;
  url?: string;
  origin?: string;
  frameId?: number;
  documentId?: string;
  documentLifecycle?: string;
  tab?: { id?: number | undefined };
}

export function isWhatsAppUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    return new URL(value).origin === 'https://web.whatsapp.com';
  } catch {
    return false;
  }
}
export function contentOrigin(
  sender: Sender | undefined,
  extensionId: string,
  connectionId: string,
): Origin | null {
  if (
    !sender ||
    sender.id !== extensionId ||
    !isWhatsAppUrl(sender.url) ||
    sender.origin !== 'https://web.whatsapp.com' ||
    sender.frameId !== 0 ||
    (sender.documentLifecycle !== undefined && sender.documentLifecycle !== 'active') ||
    !identifier(sender.documentId) ||
    !Number.isSafeInteger(sender.tab?.id) ||
    (sender.tab?.id ?? -1) < 0
  )
    return null;
  return {
    tabId: sender.tab?.id as number,
    frameId: 0,
    documentId: sender.documentId,
    connectionId,
  };
}
export function isExtensionPage(
  sender: Sender | undefined,
  extensionId: string,
  path: string,
): boolean {
  return sender?.id === extensionId && sender.url === `chrome-extension://${extensionId}/${path}`;
}
// Apenas o Service Worker: páginas da extensão sempre possuem uma URL de documento.
export function isCoordinator(sender: Sender | undefined, extensionId: string): boolean {
  return (
    sender?.id === extensionId &&
    sender.tab === undefined &&
    (sender.url === undefined ||
      sender.url === `chrome-extension://${extensionId}/service-worker.js`)
  );
}
