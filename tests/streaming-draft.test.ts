import { describe, expect, it, vi } from 'vitest';
import { StreamingDraft } from '../src/integration/whatsapp/streaming-draft';
import type { StreamEditor, StreamWriteResult } from '../src/integration/whatsapp/streaming-draft';

function harness() {
  let text = 'original';
  let current = true;
  const failure = vi.fn();
  const write = vi.fn<StreamEditor['write']>(async (delta, append, expected, active) => {
    await Promise.resolve();
    if (!current || !active()) return 'stale';
    if (text !== expected) return 'retry';
    text = append ? text + delta : delta;
    return 'applied';
  });
  const restore = vi.fn<StreamEditor['restore']>(async (expected, original, active) => {
    await Promise.resolve();
    if (!active() || !current || text !== expected) return false;
    text = original;
    return true;
  });
  const stream = new StreamingDraft(
    { current: () => current, read: () => text, write, restore },
    'original',
    failure,
  );
  return {
    stream,
    failure,
    write,
    restore,
    read: () => text,
    edit: (value: string) => {
      text = value;
    },
    switch: () => {
      current = false;
    },
  };
}

describe('streaming editável no rascunho', () => {
  it('substitui a digitação posterior ao clique e preserva alterações depois da primeira escrita', async () => {
    const h = harness();
    h.edit('digitação antes da IA');
    h.stream.push('Olá');
    await h.stream.finish('Olá');
    expect(h.read()).toBe('Olá');
    h.edit('Oi, editado');
    h.stream.push('Olá\nsegunda linha 👋');
    expect(await h.stream.finish('Olá\nsegunda linha 👋')).toBe(true);
    expect(h.read()).toBe('Oi, editado\nsegunda linha 👋');
    expect(h.write.mock.calls.map(([text, append]) => [text, append])).toEqual([
      ['Olá', false],
      ['\nsegunda linha 👋', true],
    ]);
  });

  it('não reaplica o resultado final sobre uma edição humana', async () => {
    const h = harness();
    await h.stream.finish('Resposta inteira');
    h.edit('Edição final');
    expect(await h.stream.finish('Resposta inteira')).toBe(true);
    expect(h.read()).toBe('Edição final');
    expect(h.write).toHaveBeenCalledOnce();
  });

  it('serializa e agrega fragmentos rápidos sem duplicar trechos', async () => {
    const h = harness();
    h.stream.push('A');
    h.stream.push('AB');
    h.stream.push('ABC');
    expect(await h.stream.finish('ABCD')).toBe(true);
    expect(h.read()).toBe('ABCD');
    expect(h.write.mock.calls.map(([delta]) => delta).join('')).toBe('ABCD');
  });

  it('normaliza prefixos de espaços e retém Unicode incompleto sem retrações no final', async () => {
    const h = harness();
    h.stream.push('  Olá ');
    await h.stream.finish('  Olá ');
    h.stream.push('  Olá \ud83d');
    await h.stream.finish('  Olá 👋\r\nTudo bem?  ');
    expect(h.read()).toBe('Olá 👋\nTudo bem?');
    expect(h.failure).not.toHaveBeenCalled();
  });

  it('restaura o original após cancelamento, mas conserva a edição humana e permite recuperação explícita', async () => {
    const h = harness();
    await h.stream.finish('Texto parcial');
    expect(await h.stream.cancel()).toBe('restored');
    expect(h.read()).toBe('original');
    const edited = harness();
    await edited.stream.finish('Texto parcial');
    edited.edit('Minha edição');
    expect(await edited.stream.cancel()).toBe('edited');
    expect(edited.read()).toBe('Minha edição');
    expect(await edited.stream.restoreOriginal()).toBe(true);
    expect(edited.read()).toBe('original');
  });

  it('lembra edições humanas mesmo depois de mais fragmentos', async () => {
    const h = harness();
    await h.stream.finish('Primeiro');
    h.edit('Editado');
    await h.stream.finish('Primeiro e segundo');
    expect(await h.stream.cancel()).toBe('edited');
    expect(h.read()).toBe('Editado e segundo');
  });

  it('não escreve nem restaura em outro contexto, nem repete eventos depois de cancelado', async () => {
    const h = harness();
    await h.stream.finish('Parcial');
    h.switch();
    h.edit('Outra conversa');
    h.stream.push('Parcial atrasado');
    expect(await h.stream.cancel()).toBe('stale');
    expect(await h.stream.restoreOriginal()).toBe(false);
    h.stream.push('Ainda mais atrasado');
    expect(h.read()).toBe('Outra conversa');
    expect(h.restore).not.toHaveBeenCalled();
  });

  it('cancelamento enquanto a primeira escrita aguarda impede a inserção', async () => {
    const h = harness();
    h.stream.push('Parcial');
    expect(await h.stream.cancel()).toBe('untouched');
    expect(h.read()).toBe('original');
  });

  it('abandono durante recuperação impede restaurar depois de uma ação manual de envio', async () => {
    const h = harness();
    await h.stream.finish('Parcial');
    let resume: () => void = () => undefined;
    h.restore.mockImplementation(async (_expected, original, active) => {
      await new Promise<void>((resolve) => {
        resume = resolve;
      });
      if (!active()) return false;
      h.edit(original);
      return true;
    });
    const canceled = h.stream.cancel();
    await Promise.resolve();
    h.stream.release();
    resume();
    await canceled;
    expect(h.read()).toBe('Parcial');
    expect(await h.stream.restoreOriginal()).toBe(false);
  });

  it('deferência de escrita não perde fragmentos nem sobrescreve edição concorrente', async () => {
    const h = harness();
    h.write.mockResolvedValueOnce('retry');
    h.stream.push('Parte');
    h.edit('Digitei antes da primeira escrita');
    expect(await h.stream.finish('Parte completa')).toBe(true);
    expect(h.read()).toBe('Parte completa');
  });

  it.each(['unsupported', 'failed'] as StreamWriteResult[])(
    'encerra a geração se o editor retornar %s',
    async (result) => {
      const h = harness();
      h.write.mockResolvedValueOnce(result);
      expect(await h.stream.finish('Resposta')).toBe(false);
      expect(h.failure).toHaveBeenCalledWith(result);
    },
  );
});
