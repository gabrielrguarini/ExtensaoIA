# STEP-15-C — Gemma via Transformers.js

[Plano geral](../PLANO.md) · [Progresso](../PROGRESSO.md) · [STEP-15 principal](STEP-15.md)

## Instrução de execução

Executar somente esta subetapa. Ler o plano, progresso e este arquivo. Entregar todo o escopo acumulado, validar no ambiente exigido, revisar o diff e registrar commit próprio conforme [AGENTS.md](../../AGENTS.md). Não iniciar a próxima subetapa. Validação obrigatória pendente mantém Aguardando validação; não transformar interrupção em incompatibilidade presumida.

## Objetivo e pré-requisitos

STEP-15-B concluída. Adicionar modelo local selecionável sem descartar infraestrutura de streaming, cancelamento e isolamento existentes.

## Tarefas

- Gemma 4 E2B ONNX/q4, inicialmente Transformers.js **4.2.0**, com dependências, revisão dos pesos e runtime compatível travados no lockfile/catálogo; conferir licença e avisos.
- Empacotar todo JS/WASM executável localmente. Permitir apenas dados de artefatos registrados; revisar CSP/origens e não importar executável remoto.
- Manter pipeline carregado em Worker, cache controlado, download explícito, integridade no carregamento, progresso, orçamento por modelo, streaming/cancelamento e descarregamento.
- Não inferir VRAM livre pela RAM nem presumir menor memória pelo nome E2B. Detecção e inicialização real em WebGPU; nenhuma alternativa própria de CPU/remota.
- Separar gerenciamento de modelos próprios e artefatos do Chrome. Evitar recalcular hashes dos pesos em consultas de estado da UI.
- Aplicar o [guia Chrome de cache](https://developer.chrome.com/docs/ai/cache-models?hl=pt-br) conforme [referências do projeto](../REFERENCIAS-IA-CHROME.md): cache canônico por revisão, preferir Cache API para pesos quando compatível com o runtime, metadados pequenos separados, persistência sem garantia e medição de restauração no hardware alvo. Não duplicar pesos entre mecanismos como na demonstração.

## Aceite e validação

Instalação reproduzível, catálogo/licenças, seleção de Gemma, inferência real WebGPU, isolamento, cancelamento, concorrência, troca, cache removido, reinício/offline e auditoria de rede/storage. npm.cmd run check; nenhuma simulação apresentada como execução do modelo.

## Referências

[Gemma 4 E2B](https://huggingface.co/google/gemma-4-E2B-it) possui aproximadamente 2,3 bilhões de parâmetros efetivos e 5,1 bilhões incluindo embeddings. [Localstudio analisado](https://github.com/ErickWendel/localstudio/tree/6512a521947077977d1d14df58f656e13675c227/apps/editor/src/services) oferece a alternativa Transformers.js; revalidar modelo ONNX/runtime antes de adotar.

## Evidências e commit

Registrar procedimentos, ambiente, resultados e pendências no progresso e relatório da subetapa. Usar dados sintéticos, npm.cmd run check e commit Conventional Commits com identidade humana configurada. Não publicar nem enviar mensagens automaticamente.

Próxima subetapa: [STEP-15-D](STEP-15-D.md), somente após solicitação.
