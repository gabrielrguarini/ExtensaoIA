import { describe, expect, it } from 'vitest';
import { preserveMeaningAnchors } from '../src/extension/ai/meaning-anchors';

describe('guardas conservadoras de sentido', () => {
  it('recusa ação trocada, condição removida, certeza inventada e referência do autor perdida', () => {
    for (const [before, after] of [
      ['mano vc pode ver isso? 🙂', 'Pode me enviar o arquivo 🙂?'],
      ['Se for aprovado, devolva o valor.', 'Devolva o valor.'],
      ['Talvez eu consiga participar.', 'Eu vou participar.'],
      [
        'Eu preciso confirmar; pode esperar minha resposta?',
        'Você precisa confirmar; pode esperar sua resposta?',
      ],
      ['O código está no envelope; leva ele?', 'Pode levar o código?'],
    ])
      expect(() => preserveMeaningAnchors(before!, after!)).toThrow('PRESERVATION_RISK');
  });
  it('permite sinônimos de ações e condições sem confundir a revisão com envio', () => {
    for (const [before, after] of [
      ['Pode ver isso?', 'Consegue dar uma olhada nisso?'],
      ['Me manda o arquivo.', 'Me envie o arquivo.'],
      ['Se aprovado, devolva o valor.', 'Caso aprovado, reembolse o valor.'],
      ['Talvez eu participe.', 'Possivelmente eu participarei.'],
      ['O código está no envelope; leva ele?', 'O código está no envelope; pode levá-lo?'],
    ])
      expect(() => preserveMeaningAnchors(before!, after!)).not.toThrow();
  });
});
