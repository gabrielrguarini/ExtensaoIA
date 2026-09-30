# Validação da STEP-10

[Etapa](steps/STEP-10.md) · [Progresso](PROGRESSO.md)

## Procedimento reproduzível

1. Execute `npm.cmd run check` na raiz do projeto. O comando valida tipos, lint, formatação, testes e build `0.9.0`.
2. Defina `STEP10_CHROME` para o executável do Chrome for Testing com WebGPU. Opcionalmente, defina `STEP10_PROFILE` para um perfil isolado com cache do modelo; o padrão é `.cache/step10-browser`.
3. Execute `npm.cmd run test:step10:browser`. O roteiro instala `dist` como extensão descompactada, recarrega seu Service Worker e usa uma página HTML sintética em `web.whatsapp.com`, sem conta WhatsApp ou mensagens reais.
4. O roteiro solicita Corrigir, observa a geração provisória, cancela, inicia novo pedido até a prévia validada e depois altera um terceiro rascunho durante a geração. Confere o texto original e a ausência de resultados aplicáveis após cancelamento ou edição.

## Resultado observado em 29/09/2026

- `npm.cmd run check`: aprovado com 134 testes em 15 arquivos, análise de tipos, lint, formatação e build.
- Chrome for Testing com WebGPU e a extensão `0.9.0` instalada: o modelo local gerou trechos provisórios na fixture. A rodada final observou 15 atualizações de texto e as fases **Gerando sugestão** e **Validando resposta**.
- Nenhum trecho exibiu `ENTITY` ou outro marcador interno; os casos de marcador dividido e desconhecido também passaram nos testes automatizados.
- **Copiar** e **Substituir** não apareceram durante a geração e só ficaram disponíveis após a resposta completa ser validada. A prévia final preservou o rascunho até confirmação explícita.
- **Cancelar** durante a primeira geração fechou a interface e manteve o rascunho. O pedido seguinte concluiu sem recarregar a GPU e sem fragmentos do pedido anterior.
- Editar o rascunho durante um terceiro pedido invalidou a geração; nenhum resultado obsoleto nem ação de cópia/substituição apareceu. Zero erros de página e nenhuma mensagem enviada.
- A primeira implementação travou após cancelar porque o WebLLM 0.2.82 libera seu bloqueio de streaming somente ao consumir o último chunk. O caminho final interrompe a geração, drena os chunks restantes sem exibi-los e só confirma o cancelamento após liberar o pedido. Há um encerramento forçado do Worker após dois segundos sem resposta.

## Limites

- A prova da STEP-10 usa compositor sintético instalado no Chrome com WebGPU. A integração do editor e as nove ações no WhatsApp real foram verificadas na STEP-09; não foi necessário abrir conversa para validar streaming e cancelamento.
- O teste físico usou a variante disponível nesta GPU. A variante sem `shader-f16` permanece coberta por seleção e testes automatizados, sem segunda GPU nesta execução.
- Trechos provisórios não são resultados aprovados. A proteção determinística continua sujeita aos limites descritos na [STEP-09](VALIDACAO-STEP-09.md).
