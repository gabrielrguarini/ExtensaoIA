# STEP-16-A — Streaming direto editável

[Plano](../PLANO.md) · [Progresso](../PROGRESSO.md)

## Escopo autorizado em 08/10/2026

O usuário escolheu streaming no próprio campo do WhatsApp. A primeira escrita da IA
substitui o conteúdo presente naquele instante, inclusive digitação posterior ao clique.
Depois dela, edições humanas nos trechos recebidos permanecem e os próximos trechos
são acrescentados ao final. Esta decisão substitui, apenas no modo direto, a invalidação
por edição do rascunho e a aplicação somente do resultado final da STEP-15-H.

- Retirar a restrição de quebras de linha na captura e na aplicação; não exigir ativação
  de revisão. Preservar as restrições para estruturas não representáveis como menções.
- Guardar o original em memória durante a operação; restaurar em falha/cancelamento
  se não houver edições humanas após a primeira escrita. Se houver, preservar essas
  edições e oferecer recuperação explícita do original, sem nova geração.
- Serializar escritas, preservar composição de teclado e descartar eventos
  atrasados. Manter vínculo com documento/editor/conversa mesmo com conteúdo idêntico.
- A chegada de um trecho pode deixar o cursor no final, conforme autorização adicional
  do usuário em 08/10. Não reconstruir o texto recebido para tentar manter a seleção.
- Não enviar mensagens nem continuar escrevendo depois de uma ação de envio do usuário.
- Manter Revisar sugestão como modo opcional com aplicação manual e suas guardas.
- Validar os limites reais do modelo: streaming não amplia contexto ou limite de saída.

## Aceite

Testes de primeira resposta após digitação, edição durante streaming, quebras/Unicode,
conclusão sem sobrescrever edição humana, cancelamento, recuperação, composição,
respostas atrasadas, seleção, mudança de contexto e regressão da prévia. Executar
`npm.cmd run check`, gerar o pacote e validar Chrome real. O fluxo de inserção e
reconciliação precisa também ser conferido no WhatsApp autenticado, exclusivamente
em rascunhos sintéticos de @gabrielrguarini, sem registrar conversas. Enquanto faltar
essa validação, o ajuste e a STEP-16 permanecem **Aguardando validação**.
