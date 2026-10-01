# Validação — STEP-15-A

Data: 01/10/2026. [Plano](PLANO.md) · [Progresso](PROGRESSO.md) · [Subetapa](steps/STEP-15-A.md).

## Entrega funcional

Pacote/Manifest **0.15.0**. WebLLM recebe o rascunho original, produz uma geração de escrita e retorna texto, motor e avaliação tipada. Riscos de entidades, negação, intenção, comprimento e comentários são avisos; toda resposta final legível fica disponível para copiar ou substituir. Respostas idênticas aparecem como sem alterações. Vazio, Unicode inválido, resposta só com caracteres invisíveis, limite técnico/incompletude continuam erros.

A prévia mostra aviso geral e **Substituir mesmo assim** quando houver riscos, sem confirmação adicional. A preferência opcional mostra **Analisar sentido**: a análise usa pedido separado e explícito, mantém a sugestão e devolve avisos (ou avaliação indisponível). Não há análise automática, retry ou troca de motor após falha. Cancelamento, desconexão e snapshot desatualizado continuam impedindo aplicação. Nenhuma mensagem é enviada.

AIEngine mantém initialize/isReady/generate/unload e acrescenta identidade, capacidades e disponibilidade por idioma/ação, sem consulta/download de pesos nessa verificação. Métricas numéricas continuam opcionais por callback. O pipeline de placeholders e bloqueios permanece somente no harness histórico, acessível por STEP15_PIPELINE=legacy-protected.

## Ambiente e checks

Windows 10.0.26200 x64; Node 22.14.0, npm 10.9.2; Chrome for Testing **154.0.8037.0**, perfil dedicado sem autenticação. i9-13980HX, RAM física 16.779.935.744 bytes; RTX 4060 Laptop, 8.188 MiB totais conforme nvidia-smi, driver 555.97. VRAM por modelo/pico não foi medida; não inferir disponibilidade pela RAM.

npm.cmd run check aprovado com TypeScript strict, ESLint sem avisos, Prettier, **202 testes em 30 arquivos** e build MV3. Há testes de riscos versus erros técnicos, original sem mascaramento, resultados estruturados, revisão explícita/ilegível, geração única, cancelamento, prévia/cópia/substituição, edição durante revisão, protocolo fechado, disponibilidade e checkpoint. Mocks estão limitados aos testes automatizados; a validação abaixo usa modelo real.

## Campanha real e retomada

[Dados canônicos](benchmark/step15a/final-03/metadata.json), [resultados](benchmark/step15a/final-03/results.jsonl), [resumo](benchmark/step15a/final-03/summary.json), [checkpoint pausado](benchmark/step15a/final-03/checkpoint-paused.json) e [final](benchmark/step15a/final-03/checkpoint.json). SHA-256 em [integrity.json](benchmark/step15a/final-03/integrity.json); fontes/revisões/artefatos medidos registrados. Dados exclusivamente sintéticos.

Llama-3.2-3B-Instruct-q4f16_1-MLC, pesos 1e80abf71e3d17cd564e2d2b63caa15cb226018e, WebLLM 0.2.82, contexto 4.096, temperatura zero, gírias preservadas e sem novos emojis. Primeiros **24 pares do conjunto histórico**, uma rodada, com pipeline original; não são os 108 rascunhos reservados da STEP-15-D.

| Medida                                                    | Resultado             |
| --------------------------------------------------------- | --------------------- |
| Tentativas concluídas / sugestões legíveis                | 24/24 / 24/24         |
| Respostas com avisos / sem alterações                     | 23/24 / 0/24          |
| Falhas técnicas nas gerações                              | 0                     |
| Latência total mediana / p95                              | 1.377 ms / 1.970,5 ms |
| Primeiro trecho mediana / p95                             | 893,1 ms / 1.324,7 ms |
| Carga com cache após reiniciar, offline                   | 30.789,4 ms           |
| Preparação/conferência nesse carregamento                 | 20.744,2 ms           |
| Carregamento de GPU após preparação                       | 10.045,2 ms           |
| Erros de página / requisições fora das origens permitidas | 0 / 0                 |

Execução inicial: STEP15_RUN=step15a-final-03, MODELS=economico, CASE_LIMIT=24, MAX_BLOCKS=1. Parou com 12 concluídos e 12 pendentes. Segunda invocação com STEP15_RESUME=1 concluiu somente os 12 restantes. Conferência independente: 24 IDs únicos, dois blocos, hash do prefixo dos resultados igual ao checkpoint pausado e fontes medidas iguais às atuais. Reinícios entre blocos/carga final preservaram inferência offline. O harness muda para offline após carregar cada bloco.

[As duas falhas anteriores de preparação](benchmark/step15a/final-03/preparation-attempts.json) ocorreram antes de qualquer inferência; foram mantidas como tentativas com 24 casos não executados, sem classificação de incompatibilidade. Inspeção do gerenciador mostrou o item da extensão desativado. O harness agora confere/habilita somente a extensão neste perfil sintético e acorda o Service Worker com consulta sem texto; não fecha o navegador durante recarga assíncrona. A campanha final passou após o ajuste.

## Qualidade: limites observados

Disponibilidade de sugestão não é utilidade. Houve remoção/troca de emojis, alterações na forma de datas/horários, nomes/números omitidos e respostas à pergunta em vez de reescrita. Os avisos tornam essas sugestões revisáveis; não demonstram que o modelo ficou preciso.

Exemplos revisados: B01-corrigir removeu o emoji e mostrou aviso; B02-melhorar mudou envio para verificação, omitiu nome/quantidade e mostrou avisos; B03-corrigir manteve fatos e não gerou aviso. B03-formal trocou “2” por “dois”: a quantidade permaneceu, mas a comparação lexical de números avisou. Isso ilustra a necessidade de avaliar avisos indevidos por caso. A análise semântica adicional também pode errar.

A amostra usa textos/exemplos conhecidos, só um candidato e uma rodada, sem revisão humana cega ou campanha de utilidade completa. Não comparar sua mediana diretamente aos 108 casos históricos nem recomendar vencedor. A comparação do pipeline histórico/original, três rodadas, Qwen/Chrome/Gemma, 108 novos rascunhos distintos reservados e avaliação separada de utilidade/preservação/avisos pertencem à STEP-15-D.

## Fluxo instalado offline

npm.cmd run test:step15:browser, perfil Econômico preparado. [Evidência sem conteúdo real](benchmark/step15a/final-03/smoke.json) e [captura sintética](benchmark/step15a/final-03/preview-synthetic.png).

- Fixture HTTPS do WhatsApp interceptada localmente, sem conta ou conversa; nenhum envio.
- Resposta legível exibida com aviso de emoji omitido, motor identificado e botão Substituir mesmo assim habilitado.
- Analisar sentido acionado explicitamente, concluído e mantendo o texto da sugestão.
- Rascunho intacto antes da substituição; clique único substituiu; Ctrl+Z restaurou o original depois da confirmação da edição.
- Novo pedido seguido de edição do rascunho invalidou a prévia e removeu a possibilidade de aplicar resposta antiga.
- Operações offline e zero erros de página.

O roteiro espera o término da transação de edição antes de desfazer. A captura usa caret:initial: o padrão de screenshots do Playwright altera temporariamente CSS do editor e invalida corretamente o snapshot; isso foi corrigido no roteiro, sem relaxar a proteção do produto.

## Encerramento e pendências

STEP-15-A entregue com evidência real; commit próprio feat(step-15-a): exibir sugestões com avisos e retomar benchmark. Hash no histórico e no relato final. Nenhuma etapa seguinte iniciada.

STEP-15 principal continua **Aguardando validação**. [Resultados históricos](VALIDACAO-STEP-15.md) e 191 casos pendentes dos Qwen permanecem intactos. Chrome/@types/dom-chromium-ai 0.0.17 são STEP-15-B; Gemma/Transformers.js STEP-15-C; comparação/otimização STEP-15-D. Instalação limpa e WhatsApp real/auditoria final permanecem na STEP-16 revisada.
