# Validação da STEP-09

[Etapa](steps/STEP-09.md) · [Progresso](PROGRESSO.md)

## Procedimento

1. Execute `npm.cmd run check` na raiz do projeto. O comando confere tipos, lint, formatação, testes e build da extensão `0.8.0`.
2. Carregue `dist` como extensão descompactada no Chrome for Testing com WebGPU. Defina `STEP09_CHROME` com o caminho absoluto do executável e `STEP09_PROFILE` com um perfil de teste autenticado no WhatsApp Web.
3. Execute `npm.cmd run test:step09:browser -- whatsapp`. O roteiro confirma que existe exatamente um grupo **Teste Extensão** na lista e que o mesmo título aparece no cabeçalho aberto. Se houver rascunho desconhecido, interrompe sem alterá-lo.
4. O roteiro usa somente frases sintéticas. Em cada caso, abre as nove ações, solicita uma prévia, confere o modo e o resultado ou a recusa, cancela a prévia e limpa o rascunho de teste. Não clica em Enviar nem armazena conteúdo de conversas.
5. Para repetir um caso específico, defina `STEP09_CASE` como seu número antes do comando. O perfil e o cache do modelo ficam em `.cache`, ignorado pelo Git.

## Resultado observado em 29/09/2026

- `npm.cmd run check`: aprovado, com 128 testes em 13 arquivos, lint, tipos, formatação e build.
- Chrome for Testing 154, WhatsApp Web autenticado, grupo **Teste Extensão** confirmado na interface, GPU Intel `gen-12lp`, variante `q4f16_1` do Llama 3.2 3B carregada no Worker da extensão.
- Os nove rótulos e seletores apareceram uma vez por abertura. As nove ações produziram prévias na rodada final; Formal e Profissional produziram formulações diferentes para o mesmo rascunho sintético.
- Melhorar recusou com segurança uma formulação interrogativa em uma rodada anterior quando o modelo perdeu a interrogação. Em caso declarativo da rodada final, produziu prévia preservando a condição temporal. O roteiro aceita paráfrases equivalentes dessa condição.
- Engraçado recusou uma saída que perdeu informação de uma mensagem séria. Profissional recusou outra saída que perdeu a relação com um prazo. Nas recusas, Substituir/Copiar não foram oferecidos.
- Todos os rascunhos de teste ficaram inalterados durante a geração e foram limpos ao terminar; não houve envio de mensagem. A rodada completa registrou zero erros de página.
- Uma oscilação transitória da interface havia invalidado a prévia durante uma tentativa. O observador passou a tratar alterações no campo editável, ignorando mudanças nos demais controles do rodapé. O posicionamento do botão mantém a sessão quando apenas sua posição fica temporariamente coberta; o roteiro detecta desaparecimento prolongado da prévia. A rodada final passou sem essa invalidação.

## Limites

- A proteção determinística preserva entidades, negações, relações e formato conhecido, mas não prova equivalência semântica geral. Uma resposta arriscada é recusada, mesmo que outra formulação útil pudesse existir.
- A variante de modelo para GPU sem `shader-f16` continua coberta por seleção e testes automatizados, sem segunda GPU física nesta execução.
- O roteiro real exercita prévia e cancelamento; a substituição manual e o desfazer no WhatsApp real foram validados na STEP-05. O envio automático continua ausente.
