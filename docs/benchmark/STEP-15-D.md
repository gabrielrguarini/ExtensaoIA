# Campanhas comparáveis — STEP-15-D

[Etapa](../steps/STEP-15-D.md) · [Progresso](../PROGRESSO.md) · [Benchmark histórico](README.md)

O dataset reservado contém **108 rascunhos distintos**, 12 por ação, anotados antes de qualquer inferência. Não usar esse conjunto para ajustar prompts. `training` seleciona 12 pares conhecidos do conjunto histórico; `history` preserva seus 108 pares. Campanhas ficam separadas e não sobrescrevem resultados antigos.

## Execução local

Preparar os modelos explicitamente no perfil de teste, com os downloads autorizados. O executor usa somente `.cache/step15b-chrome`, nunca um perfil pessoal. Todos os candidatos devem usar a mesma máquina, Chrome e casos. O candidato `chrome-prompt` mede a compatibilidade experimental manual sem declarar idioma; não altera o padrão do produto.

```powershell
npm.cmd run build
$env:STEP15D_CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
$env:STEP15D_RUN = 'minha-campanha'
$env:STEP15D_DATASET = 'reserved'
$env:STEP15D_MODELS = 'chrome-prompt,economico,gemma,equilibrado,qualidade'
$env:STEP15D_ROUNDS = '3'
npm.cmd run benchmark:step15d
```

Sem `STEP15D_DOWNLOAD=1`, o contexto está offline antes de carregar. Com essa opção explícita, pode preparar os artefatos fixados, mas muda para offline antes das gerações. `STEP15D_MAX_BLOCKS=2` para na fronteira de bloco; `STEP15D_RESUME=1` retoma apenas casos sem resultado terminal, desde que dataset, fontes, parâmetros, Chrome e CPU permaneçam iguais. Cada resultado salva o checkpoint e seu hash. Exit code 2 preserva pendências/erros; não indica incompatibilidade geral.

`STEP15D_PIPELINE=legacy-protected` compara o caminho histórico ENTITY_* somente com os três perfis WebLLM. A alternativa padrão é `original`, usando o rascunho original e avisos posteriores. O WebLLM delimita esse dado por JSON; Chrome e Gemma mantêm os prompts selecionados após os pilotos. Nenhuma transformação prévia mascara entidades no caminho padrão.

Os blocos têm até 12 casos. Chrome, Llama e Gemma reutilizam sessões/pesos dentro de uma rodada; reiniciam o navegador entre rodadas e candidatos. Qwen reinicia entre blocos para reduzir pressão de recursos observada na campanha histórica. `STEP15D_RESTART_EACH_BLOCK=1` força reinícios para todos. A configuração pertence à identidade da campanha. Sempre há aquecimento separado antes dos casos medidos. Não executar build, outra campanha ou inferência na mesma GPU durante uma campanha.

## Revisão e métricas

`cases.json` e `metadata.json` são gravados antes de inferir. `source-snapshot.json` preserva fontes medidas; executáveis são identificados pelos hashes, não duplicados no relatório. `results.jsonl` registra preparo, disponibilidade, aquecimento, casos, erros e interrupções. `network.jsonl` observa offscreen/Workers reais via CDP, sem corpos ou parâmetros assinados de URLs; `environment-end.json` registra erros, requisições e alocação global de GPU. Isso não mede consumo exclusivo do modelo nem pico de memória.

Cada sugestão precisa de leitura independente contra fatos, entidades, intenção, ação e preferências. `review.json` contém `reviews` com perfil, rodada, ID, SHA-256 de `reviewedValue`, preservação semântica, entidades literais, gramática, naturalidade, idioma efetivo, utilidade da ação, índices dos avisos corretos, risco não sinalizado e justificativa. Não obter essas notas do próprio motor avaliado ou de sua aceitação automática. O resumo separa `preservationRejections` do pipeline histórico, `errors` técnicos e `unavailableSuggestions` totais. Anotações desconhecidas continuam pendentes; erros sem sugestão não ganham qualidade inventada. Saídas idênticas são disponíveis, mas não úteis para transformação.

```powershell
npm.cmd run benchmark:step15d:report -- .cache/step15d/minha-campanha
```

O relatório valida hashes e denominadores, calcula percentis 50/95 pelo posto `ceil(N × p)` do agregador histórico (sem interpolação) e mantém medidas ausentes. `totalMs` vai da geração à limpeza/avaliação, sem interação da UI nem carga fria; `setupMs` registra inicialização por ação. `firstVisibleMs` é o primeiro fragmento do adaptador. Carga fria com cache inclui integridade e inicialização de GPU; `resident: true` distingue consultas já prontas. O preparo inicial com download não pode ser chamado de carga com cache. Tokens/s são publicados somente com contagem real: estatística de decodificação do WebLLM ou contagem de IDs gerados e tempo no adaptador Gemma. Tokenizadores e fronteiras de tempo diferem entre motores. Chrome não fornece essa taxa; quota não é convertida em tokens.

O harness é incorporado temporariamente em `dist/step15d-entry.js`, com acesso somente a fixtures de teste. Não é endpoint do produto. O build final remove a instrumentação antes da entrega instalável. A STEP-16 mantém instalação limpa e fluxo final no WhatsApp, sem envio automático.
