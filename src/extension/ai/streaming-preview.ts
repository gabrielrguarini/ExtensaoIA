import type { ProtectedDraft } from './entities';

const marker = /ENTITY(?:[\p{L}\p{N}_-]|\s+\d)*/giu;
const markerStart = 'ENTITY';

/** Expõe somente um prefixo sem marcadores, inclusive quando um slot atravessa chunks. */
export function restoredStreamingPrefix(draft: ProtectedDraft, generated: string): string {
  const slots = new Map(draft.slots.map((slot) => [slot.placeholder, slot.entity.value]));
  let cursor = 0;
  let visible = '';
  for (const match of generated.matchAll(marker)) {
    const index = match.index;
    if (index === undefined) continue;
    visible += generated.slice(cursor, index);
    const end = index + match[0].length;
    const restored = slots.get(match[0]);
    // Um slot no fim ainda pode receber mais caracteres no próximo chunk.
    if (!restored || end === generated.length) return visible;
    visible += restored;
    cursor = end;
  }
  const tail = generated.slice(cursor);
  for (let length = Math.min(markerStart.length - 1, tail.length); length > 0; length--) {
    if (tail.slice(-length).toUpperCase() === markerStart.slice(0, length))
      return visible + tail.slice(0, -length);
  }
  return visible + tail;
}
