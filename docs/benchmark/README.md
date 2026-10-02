# Benchmark pt-BR local — STEP-15

[Relatório](../VALIDACAO-STEP-15.md) · [Progresso](../PROGRESSO.md) · [Dataset anotado](../../tests/benchmark/cases.ts)

A comparação com Chrome/Gemma e os 108 rascunhos independentes pertence às [campanhas da STEP-15-D](STEP-15-D.md). Os arquivos e números históricos abaixo permanecem preservados.

O conjunto tem **108 pares identificáveis**: 12 textos fictícios × nove ações, com 12 casos por ação. As repetições entre ações são deliberadas para comparar transformações sobre os mesmos fatos. Não são 108 rascunhos independentes. As anotações de entidades, fatos, intenção, gramática e naturalidade foram escritas antes da primeira execução. Nenhuma conversa real foi coletada.

## Executar

Requer Windows/Chrome for Testing com WebGPU, Node/npm das versões do projeto e espaço para os pesos. O caminho de Chrome é fornecido explicitamente. Nenhuma API de inferência externa é usada. A preparação inicial pode baixar somente os artefatos públicos fixados no catálogo; depois dela todos os casos são executados com o contexto offline. Para repetir sem rede desde a preparação, mantenha o perfil/cache já preparado e use o modo offline de carregamento do próprio runner como referência. Um modelo ausente não poderá ser preparado offline.

```powershell
npm.cmd ci
npm.cmd run build
$env:STEP15_CHROME = 'C:/caminho/do/Chrome-for-Testing/chrome.exe'
$env:STEP15_RUN = 'minha-rodada'
npm.cmd run benchmark:step15
```

O runner usa somente `.cache/step15-isolated`, sem conta ou conversa, e grava em `.cache/step15-results/minha-rodada`. Não apontá-lo para um perfil pessoal. Por padrão tenta os três perfis, em blocos de até 12, reiniciando o navegador entre os blocos. Para selecionar um perfil, defina `STEP15_MODELS` como `economico`, `equilibrado` ou `qualidade`; documente a seleção, sem afirmar uma campanha completa dos demais.

O harness é compilado temporariamente em `dist/__step15_eval`, executa o WebLLM e o caminho de texto original/avisos (ou proteção/validação histórica por opção) em um Worker local da origem da extensão e não acrescenta endpoint ao produto. `npm.cmd run build` remove essa instrumentação do pacote instalável. O teste de interface separado usa somente fixture, prévia, substituição explícita e desfazer:

```powershell
npm.cmd run test:step15:browser
```

O smoke usa Econômico por padrão. Para repetir com outro perfil já preparado, defina `STEP15_SMOKE_PROFILE`; a evidência desta execução usou `qualidade`. Os controles determinísticos sem IA são executados por `npm.cmd run benchmark:step15:controls`; eles não substituem a campanha de gerações.

## Revisão e reprodução do relatório

`cases.json` contém a expansão integral do dataset; `metadata.json` registra hashes, parâmetros, versões e equipamento; `source-snapshot.json` preserva o núcleo medido; `results.jsonl` registra cada saída e falha sintética; `cached-loads.jsonl` contém os carregamentos offline após reinícios. Os pesos e caches não são versionados. As revisões independentes ficam em `review.json`, vinculadas por SHA-256 ao dataset e aos resultados. Não copiar revisões para uma nova rodada: cada geração exige leitura própria.

Leia cada saída contra todas as anotações prévias, incluindo as saídas recusadas. Marque `releasedPreserves`, gramática, naturalidade e utilidade apenas quando houver sugestão liberada. `rawPreserves` e `rawFormatComplete` distinguem uma recusa justificada de um falso positivo; um placeholder ausente/modificado não é um candidato completo. Saída inalterada pode ser segura, mas não ganha utilidade de transformação. A revisão do executor não é um estudo humano cego nem uma pontuação calibrada.

Para recalcular a evidência já revisada, sem Chrome, GPU, downloads ou serviços externos:

```powershell
npm.cmd run benchmark:step15:report -- docs/benchmark/step15/final-01
```

O agregador exige todos os IDs e uma revisão por caso. Exit code 2 significa alteração conhecida em saída liberada ou execução pendente; não é erro que se deva esconder. Casos recusados, erros e resultados pendentes permanecem no denominador. Mediana/p95 mostram também quantas medidas existem e quantas estão indisponíveis, sem atribuir zero a valores ausentes.

## Definições

- **Frio inicial:** nova instância/Worker, do início da preparação até prontidão; inclui conferência/cache/download quando necessários. `preparationMs` separa a fase anterior ao carregamento de GPU, mas não é uma medida isolada de rede.
- **Frio com cache:** novo Chrome e novo Worker, preparação inteira offline, com conferência de integridade e carregamento. Pode incluir cache de shaders do driver; não representa uma GPU nunca usada.
- **Quente:** `initialize` na instância residente, sem novo carregamento; não confundir com primeira geração.
- **Primeiro trecho visível:** de `generate` ao primeiro fragmento emitido pelo adaptador, incluindo preparação do tokenizer. O primeiro token interno do runtime é informado separadamente; Qwen remove seu prefixo de raciocínio vazio antes de exibir.
- **Latência total por caso:** geração, limpeza do chat e validação; exclui carregamento e interação de interface. A interface tem confirmação separada no smoke test.
- **Tokens/s:** `usage.extra.decode_tokens_per_s` do WebLLM fixado, solicitado com `stream_options.include_usage`. Tokens e orçamento reais ficam por caso. Não é velocidade da interface nem estimativa por caracteres.
- **Preservação:** saídas liberadas revisadas como seguras / todos os casos. Recusa protege o rascunho, mas não entra como saída preservada.
- **Utilidade:** saída liberada, segura, gramatical, natural e útil para a ação / todos os casos; opinião explícita do executor sobre este conjunto.
- **Memória:** RAM/VRAM física do equipamento é medida do sistema. O catálogo fornece estimativa de modelo. Quando registrado, `globalGpuMemoryUsedFreeMiB` é uso global observado por `nvidia-smi`, sem atribuição exata ao modelo e sem alegar pico. Uso por processo em WDDM pode ser indisponível; não inferir consumo do modelo pela diferença.

Resultados iniciais e experimentos interrompidos são identificados separadamente da rodada final. Não há promessa universal de equivalência semântica, qualidade ou desempenho fora deste conjunto. A revisão do usuário continua necessária.

## Campanhas retomáveis da STEP-15-A

Os diretórios históricos baseline-01/final-01 são imutáveis. O runner atual usa texto original e avisos por padrão. Para comparação controlada, escolha STEP15_PIPELINE=legacy-protected; isso ativa o prompt e validador históricos, sem mudar o produto.

Defina STEP15_RUN, STEP15_MODELS e opcionalmente STEP15_CASE_LIMIT (até 108), STEP15_ROUNDS (1 a 3) e STEP15_MAX_BLOCKS (pausa após blocos). Uma invocação inicial recusa sobrescrever diretório de campanha. Para retomar, mantenha nome, perfis, casos, rodadas e pipeline e defina STEP15_RESUME=1. Código, dataset, runtime/WASM, navegador e hardware precisam coincidir; divergência exige campanha nova. Downloads do harness requerem execução explícita do operador; inferência ocorre offline após carregar cada bloco.

Cada resultado é anexado em results.jsonl e atualizado em checkpoint.json. Casos terminados (inclusive erros técnicos) não são repetidos na retomada. Interrupções ou falhas de carregamento ficam pendentes, com tentativas anteriores preservadas. Retomar exige nova invocação; não há replay de uma geração falha no produto. Checkpoints identificam pendências, sem transformar falta de resultado em incompatibilidade.

Exemplo de dois blocos com o mesmo perfil sintético, sem conta:

```powershell
$env:STEP15_RUN = 'campanha-original'
$env:STEP15_MODELS = 'economico'
$env:STEP15_CASE_LIMIT = '24'
$env:STEP15_MAX_BLOCKS = '1'
npm.cmd run benchmark:step15
$env:STEP15_RESUME = '1'
npm.cmd run benchmark:step15
npm.cmd run benchmark:step15a:report -- .cache/step15-results/campanha-original
```

O novo relatório resume disponibilidade, avisos, erros técnicos, sem alterações, medidas e pendências; não inventa qualidade sem anotação humana. O comando benchmark:step15:report continua exclusivo para relatórios históricos no formato original com review.json. A campanha da STEP-15-A é exploratória; três rodadas e 108 novos rascunhos distintos reservados são aceite da STEP-15-D. Não atribuir qualidade/velocidade de Chrome ou Gemma a medidas WebLLM.
