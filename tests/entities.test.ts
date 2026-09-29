import { describe, expect, it } from 'vitest';
import { extractEntities, protectDraft, restoreAndValidate } from '../src/extension/ai/entities';
import { CorrectionOutputError } from '../src/extension/ai/correction-output';

function kindsAndValues(text: string): string[] {
  return extractEntities(text).map(({ kind, value }) => `${kind}:${value}`);
}

describe('proteção determinística de entidades', () => {
  it('não classifica uma abertura comum de pedido como nome próprio', () => {
    const values = kindsAndValues('Gostaria de pedir que você revisasse o texto hoje.');
    expect(values).not.toContain('name:Gostaria');
    expect(values).toContain('temporal:hoje');
    expect(kindsAndValues('João, revisa o texto hoje.')).toContain('name:João');
  });
  it('resolve sobreposições e conserva spans exatos de todos os tipos previstos', () => {
    const text =
      'João, Maria: projeto XPTO às 14h30 em 15/10. R$ 2.500 para @gabriel e #teste; ' +
      'https://example.com/p/42?x=7, ana.oliveira@example.com, CPF 123.456.789-09, ' +
      'CNPJ 12.345.678/0001-90, código AB-123, sexta 👩🏽‍💻 🇧🇷 1️⃣';
    const entities = extractEntities(text);
    expect(kindsAndValues(text)).toEqual(
      expect.arrayContaining([
        'name:João',
        'name:Maria',
        'code:XPTO',
        'time:14h30',
        'date:15/10',
        'currency:R$ 2.500',
        'mention:@gabriel',
        'hashtag:#teste',
        'url:https://example.com/p/42?x=7',
        'email:ana.oliveira@example.com',
        'cpf-cnpj:123.456.789-09',
        'cpf-cnpj:12.345.678/0001-90',
        'code:AB-123',
        'temporal:sexta',
        'emoji:👩🏽‍💻',
        'emoji:🇧🇷',
        'emoji:1️⃣',
      ]),
    );
    expect(
      entities.some((entity) => entity.kind === 'number' && /42|2\.500|15/.test(entity.value)),
    ).toBe(false);
    for (const [index, entity] of entities.entries()) {
      expect(text.slice(entity.start, entity.end)).toBe(entity.value);
      if (index) expect(entities[index - 1]!.end).toBeLessThanOrEqual(entity.start);
    }
  });

  it('usa slots únicos, evita colisão literal e preserva repetições', () => {
    const original = 'Código ENTITY_001: João e João, https://example.com e https://example.com.';
    const protectedDraft = protectDraft(original);
    expect(protectedDraft.slots.map((slot) => slot.placeholder)).not.toContain('ENTITY_001');
    expect(new Set(protectedDraft.slots.map((slot) => slot.placeholder)).size).toBe(
      protectedDraft.slots.length,
    );
    expect(restoreAndValidate(protectedDraft, protectedDraft.text)).toBe(original);
    expect(protectedDraft.slots.filter((slot) => slot.entity.value === 'João')).toHaveLength(2);
    expect(
      protectedDraft.slots.filter((slot) => slot.entity.value === 'https://example.com'),
    ).toHaveLength(2);
  });

  it('reprova slots ausentes, duplicados, desconhecidos ou modificados', () => {
    const protectedDraft = protectDraft('João, me mande R$ 2.500 até sexta.');
    const slot = protectedDraft.slots[0]!.placeholder;
    for (const generated of [
      protectedDraft.text.replace(slot, ''),
      `${protectedDraft.text} ${slot}`,
      `${protectedDraft.text} ENTITY_999`,
      `${protectedDraft.text} ENTITY_999x`,
      protectedDraft.text.replace(slot, slot.toLowerCase()),
      protectedDraft.text.replace(slot, slot.replace('_', '-')),
    ])
      expect(() => restoreAndValidate(protectedDraft, generated)).toThrow(
        new CorrectionOutputError('PRESERVATION_RISK'),
      );
  });

  it('reprova entidades novas ou removidas mesmo quando todos os slots retornam', () => {
    const protectedDraft = protectDraft('João, veja https://example.com.');
    for (const suffix of [' Ana', ' 42', ' https://outro.com', ' 😊'])
      expect(() => restoreAndValidate(protectedDraft, `${protectedDraft.text} ${suffix}`)).toThrow(
        new CorrectionOutputError('PRESERVATION_RISK'),
      );
    expect(() => restoreAndValidate(protectedDraft, protectedDraft.text)).not.toThrow();
  });

  it('preserva negações múltiplas e permite acentuar nao sem trocar polaridade', () => {
    const original = 'Não quero cancelar e nunca disse que nao poderia.';
    const protectedDraft = protectDraft(original);
    expect(restoreAndValidate(protectedDraft, protectedDraft.text.replace('nao', 'não'))).toContain(
      'não poderia',
    );
    for (const changed of [
      protectedDraft.text.replace('Não ', ''),
      protectedDraft.text.replace('nunca', 'sempre'),
      protectedDraft.text.replace('nao', 'sim'),
    ])
      expect(() => restoreAndValidate(protectedDraft, changed)).toThrow(
        new CorrectionOutputError('PRESERVATION_RISK'),
      );
  });

  it('recusa mudança de prazo e comentário sobre identificadores protegidos', () => {
    const protectedDraft = protectDraft('Me manda R$ 2.500 até 15/10.');
    expect(restoreAndValidate(protectedDraft, protectedDraft.text)).toBe(
      'Me manda R$ 2.500 até 15/10.',
    );
    expect(() =>
      restoreAndValidate(protectedDraft, protectedDraft.text.replace('até', 'e')),
    ).toThrow(new CorrectionOutputError('PRESERVATION_RISK'));
    expect(() =>
      restoreAndValidate(
        protectedDraft,
        `Me manda os conteúdos protegidos ${protectedDraft.slots.map((slot) => slot.placeholder).join(' e ')}.`,
      ),
    ).toThrow(new CorrectionOutputError('PRESERVATION_RISK'));
  });

  it('aceita expansão de hj para hoje e recusa caracteres de controle inesperados', () => {
    const protectedDraft = protectDraft('vc manda hj?');
    expect(restoreAndValidate(protectedDraft, 'Você manda hoje?')).toBe('Você manda hoje?');
    expect(() => restoreAndValidate(protectedDraft, 'Você manda hoje?\u0001')).toThrow(
      new CorrectionOutputError('INVALID_OUTPUT'),
    );
  });

  it('não libera uma pergunta convertida em afirmação', () => {
    const protectedDraft = protectDraft('mano vc pode ver isso?');
    expect(() => restoreAndValidate(protectedDraft, 'Mano, você pode ver isso.')).toThrow(
      new CorrectionOutputError('PRESERVATION_RISK'),
    );
    expect(restoreAndValidate(protectedDraft, 'Mano, você pode ver isso?')).toBe(
      'Mano, você pode ver isso?',
    );
  });

  it('recusa artigo inventado antes de entidade protegida', () => {
    const protectedDraft = protectDraft(
      'Oi João, consegue me mandar R$ 1.500 até sexta? https://exemplo.com',
    );
    const generated = protectedDraft.text
      .replace('mandar ENTITY_', 'mandar o ENTITY_')
      .replace('até ENTITY_', 'até o ENTITY_');
    expect(() => restoreAndValidate(protectedDraft, generated)).toThrow(
      new CorrectionOutputError('PRESERVATION_RISK'),
    );
  });
});
