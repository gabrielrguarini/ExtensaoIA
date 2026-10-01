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

## Implementação adotada

- Transformers.js **4.2.0**, ONNX Runtime Web **1.26.0-dev.20260416-b7804b056c**, revisões/licenças no lockfile e pacote. `sharp` **0.35.4** e `adm-zip` **0.6.1** por overrides corrigem dependências transitivas de instalação; não executam na extensão.
- [Modelo ONNX fixado](https://huggingface.co/onnx-community/gemma-4-E2B-it-ONNX/tree/9f4bef82ea6e296bc69f8a2f5939f73af81b07a6): `Gemma4ForCausalLM` carrega apenas embed_tokens/decoder e tokenizer, apesar da configuração multimodal upstream. q4f16: **3.130.549.798 bytes**; q4: **3.646.892.071 bytes**; nove arquivos por variante, sem áudio/visão.
- Cache API canônica `local-writing/gemma` por URL/revisão, recibos pequenos em `local-writing/gemma-integrity`, hash em fluxo no download/carregamento. Estado da UI só faz inventário. Não criar `transformers-cache`, copiar pesos para OPFS ou baixar WASM/JS.
- Compatibilidade 4.2.0: a descoberta de tokenizer consulta `main` sem propagar a revisão. Somente essa consulta de metadados resolve no arquivo fixado já verificado, sem gravar um alias nem fazer rede. Jinja aceita `enable_thinking: false`, ausente da tipagem dessa versão; o objeto de opções documenta esse uso. [Fontes do runtime](https://github.com/huggingface/transformers.js/tree/4.2.0/src).
- Preferências v5 separam motor e modelo local; mantêm perfil WebLLM e opção pt-BR experimental. Seleção anterior à geração, Worker por runtime, pesos reutilizados e pedidos sem histórico. Orçamento inclui prompt real, limite de contexto, EOS e cancelamento; erro não repete geração.
- Gerenciamento e avisos no menu/popup/painel; substituição manual e revisão explícita preservadas. [Relatório C](../VALIDACAO-STEP-15-C.md) registra aceite, procedimentos, tentativas corrigidas e limites da validação q4f16 no hardware alvo.

## Evidências e commit

Registrar procedimentos, ambiente, resultados e pendências no progresso e relatório da subetapa. Usar dados sintéticos, npm.cmd run check e commit Conventional Commits com identidade humana configurada. Não publicar nem enviar mensagens automaticamente.

Próxima subetapa: [STEP-15-D](STEP-15-D.md), somente após solicitação.
