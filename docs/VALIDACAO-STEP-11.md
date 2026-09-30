# Validação da STEP-11

[Etapa](steps/STEP-11.md) · [Progresso](PROGRESSO.md)

## Procedimento reproduzível

1. Execute `npm.cmd run check` na raiz do projeto. O comando confere tipos, lint, formatação, testes e build `0.10.0`.
2. Defina `STEP11_CHROME` para o Chrome for Testing com WebGPU. Opcionalmente, use `STEP11_PROFILE` para um perfil isolado com modelo em cache. Execute `npm.cmd run test:step11:browser`.
3. O primeiro roteiro cria uma entrada temporária dentro de `dist`, avalia seis pares sintéticos com o Llama 3.2 3B na mesma instância em sequência e remove a entrada ao encerrar. Compara os veredictos com o esperado e falha em resposta inválida ou divergente.
4. O segundo roteiro instala a extensão em um compositor sintético sob `web.whatsapp.com`: verifica padrão desligado, ausência da segunda análise, persistência da opção, revisão antes da prévia e cancelamento durante a revisão. Ao final, devolve a preferência a `false`. Não abre conversa nem envia mensagem.

## Resultado observado em 29/09/2026

- `npm.cmd run check`: aprovado com 143 testes em 17 arquivos, tipos, lint, formatação e build.
- Chrome for Testing 154, GPU Intel `gen-12lp`, variante `q4f16_1`, WebLLM 0.2.82. A rodada final do verificador acertou os seis veredictos sintéticos:

| Par sintético                                          | Esperado | Veredicto final |
| ------------------------------------------------------ | -------- | --------------- |
| Correção de `vc`/`hj` mantendo a pergunta              | Aprovar  | Aprovou         |
| Alteração de 2 para 3 arquivos                         | Recusar  | Recusou         |
| Pergunta transformada em afirmação                     | Recusar  | Recusou         |
| Remoção de negação                                     | Recusar  | Recusou         |
| Inclusão de negação                                    | Recusar  | Recusou         |
| Mesmos nomes e número, remetente/destinatário trocados | Recusar  | Recusou         |

- Na primeira versão do prompt, o modelo aprovou incorretamente a pergunta convertida em afirmação e a troca entre pessoas. A segunda versão recusou as quatro alterações então avaliadas, mas também recusou a correção de mesmo significado. A versão final incluiu exemplos positivos e negativos e produziu os seis veredictos esperados. Essas falhas intermediárias não foram tratadas como sucesso da versão final.
- Mesmo na versão final, `issues` atribuiu incorretamente **negação removida** à alteração do número de arquivos e à **inclusão** de negação. A decisão nesses dois casos foi de recusa. O produto não apresenta essa justificativa ao usuário como fato comprovado.
- Extensão instalada no Chrome: com a opção desligada, **Validando resposta** apareceu e **Revisando significado** não apareceu. Após marcar o controle e reabrir o menu, a escolha continuou salva. Com a opção ligada, a prévia só apareceu depois de **Revisando significado**; Copiar/Substituir não foram liberados cedo. Cancelar durante a revisão preservou o rascunho e não mostrou resultado tardio. Zero erros de página.
- Testes automatizados cobrem padrão `false`, esquema versionado, leitura da preferência pelo coordenador, falha fechada, ausência da segunda geração com opção desligada, ordem da validação determinística, JSON estrito, `entitiesPreserved`, `confidence` não calibrada, saída vazia/inválida, erro, cancelamento e as classes de mudança de sentido.

## Limites

- Se a opção estiver ligada, a análise usa mais tempo de GPU. O mesmo modelo processa reescrita e revisão sequencialmente, com `resetChat()` após cada geração e sem segundo modelo simultâneo.
- O verificador é outro julgamento do mesmo Llama 3.2 3B. Os seis exemplos não demonstram precisão geral; a falha inicial e as justificativas erradas mostram que ele pode aprovar mudanças ou recusar correções úteis em casos não testados. A validação determinística continua obrigatória e prevalece, inclusive quando a revisão reporta `entitiesPreserved: true`.
- Falha de armazenamento, formato inválido, ausência de resposta, erro, cancelamento ou reprovação da segunda análise impedem liberar a sugestão quando a opção está ligada. O rascunho permanece intacto.
- A prova usa textos e compositor sintéticos no Chrome/WebGPU. Editor e modos no WhatsApp real foram verificados na STEP-09; não foi necessário abrir conversa nesta etapa. A variante sem `shader-f16` não foi executada em segunda GPU física.
