# STEP-06 — Executar o primeiro modelo local

[Plano geral](../PLANO.md) · [Progresso](../PROGRESSO.md)

## Objetivo

Comprovar inferência real de uma frase sintética no Worker da extensão, utilizando WebGPU.

## Pré-requisitos

- [STEP-05](STEP-05.md) e todas as etapas anteriores concluídas, com evidências registradas.

## Tarefas

- [x] Revalidar a documentação e o catálogo da versão publicada do WebLLM antes de instalar. Registrar runtime, modelId, variante, revisão dos pesos, biblioteca WASM e licença; não misturar artefatos de versões incompatíveis.
- [x] Implementar AIEngine com initialize, isReady, generate em AsyncIterable e unload. Incluir suporte a cancelamento nas opções locais e tradução desse cancelamento para o runtime.
- [x] Isolar chamadas WebLLM no adaptador. O restante da extensão não deve importar suas APIs.
- [x] Detectar navigator.gpu, requestAdapter, features e limits no contexto real. Começar com Llama-3.2-3B-Instruct-q4f16_1-MLC; usar a variante q4f32_1 quando os recursos exigidos por f16 faltarem, informando o custo maior.
- [x] Empacotar JS e WASM no build e resolver o model_lib localmente. Permitir apenas URLs fixas dos dados do modelo e dos redirecionamentos/CDNs efetivamente necessários, registrados na configuração.
- [x] Exibir tamanho conhecido dos artefatos antes da ação Baixar modelo e estados Preparando IA local, Baixando modelo, Carregando GPU e IA pronta.
- [x] Usar o cache de artefatos do runtime. Não persistir textos nem conservar histórico de conversação entre solicitações.
- [x] Processar uma frase sintética e registrar hardware disponível, Chrome, versões, resultado e comportamento da interface.

## Limites

- Não usar API de IA externa nem fallback por CPU.
- Não inferir VRAM livre a partir da RAM do sistema.
- Não apresentar bytes estimados de memória como tamanho de download.
- Mocks e testes unitários não substituem a execução real exigida nesta etapa.

## Critérios de conclusão e verificação

- [x] O modelo real gera uma resposta dentro da extensão via WebGPU e a digitação continua responsiva.
- [x] O código executável carregado pertence ao pacote local; a rede contém apenas downloads previstos de artefatos.
- [x] WebGPU indisponível, download falho e falta de recursos geram erro compreensível sem alterar o rascunho. Download falho foi observado no Chrome; os outros dois ramos foram testados com adapters simulados, conforme os limites do relatório.
- [x] Há registro da execução em hardware real. Se isso não puder ser realizado, a etapa fica Aguardando validação e não Concluída.

Quando uma verificação não puder ser realizada, registrar exatamente o procedimento pendente e usar Aguardando validação ou Bloqueada no progresso, conforme o motivo. Não substituir evidência real por suposição.

## Entrega esperada

- AIEngine, WebLLMEngine e configuração inicial de modelo.
- Registro reproduzível da prova de inferência real, sem dados pessoais.

Evidências, versões fixadas, roteiro reproduzível e limites: [VALIDACAO-STEP-06.md](../VALIDACAO-STEP-06.md). O status permanece exclusivamente em PROGRESSO.md.
