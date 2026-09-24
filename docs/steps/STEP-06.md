# STEP-06 — Executar o primeiro modelo local

[Plano geral](../PLANO.md) · [Progresso](../PROGRESSO.md)

## Instrução de execução

> Execute somente a etapa indicada. Leia o plano geral e o registro de progresso, confirme os pré-requisitos e implemente integralmente a entrega prevista. Execute as verificações pertinentes e registre os resultados. Não avance para a próxima etapa. Se houver impedimento, registre a causa e o que falta; não marque como concluído algo que não foi validado.

O status desta etapa é mantido exclusivamente em PROGRESSO.md. Não iniciar outra etapa para resolver uma pendência sem registrar o impedimento e respeitar o escopo solicitado.

## Objetivo

Comprovar inferência real de uma frase sintética no Worker da extensão, utilizando WebGPU.

## Pré-requisitos

- Ler [PLANO.md](../PLANO.md) e [PROGRESSO.md](../PROGRESSO.md).
- [STEP-05](STEP-05.md) e todas as etapas anteriores concluídas, com evidências registradas.

## Tarefas

- [ ] Revalidar a documentação e o catálogo da versão publicada do WebLLM antes de instalar. Registrar runtime, modelId, variante, revisão dos pesos, biblioteca WASM e licença; não misturar artefatos de versões incompatíveis.
- [ ] Implementar AIEngine com initialize, isReady, generate em AsyncIterable e unload. Incluir suporte a cancelamento nas opções locais e tradução desse cancelamento para o runtime.
- [ ] Isolar chamadas WebLLM no adaptador. O restante da extensão não deve importar suas APIs.
- [ ] Detectar navigator.gpu, requestAdapter, features e limits no contexto real. Começar com Llama-3.2-3B-Instruct-q4f16_1-MLC; usar a variante q4f32_1 quando os recursos exigidos por f16 faltarem, informando o custo maior.
- [ ] Empacotar JS e WASM no build e resolver o model_lib localmente. Permitir apenas URLs fixas dos dados do modelo e dos redirecionamentos/CDNs efetivamente necessários, registrados na configuração.
- [ ] Exibir tamanho conhecido dos artefatos antes da ação Baixar modelo e estados Preparando IA local, Baixando modelo, Carregando GPU e IA pronta.
- [ ] Usar o cache de artefatos do runtime. Não persistir textos nem conservar histórico de conversação entre solicitações.
- [ ] Processar uma frase sintética e registrar hardware disponível, Chrome, versões, resultado e comportamento da interface.

## Limites

- Não usar API de IA externa nem fallback por CPU.
- Não inferir VRAM livre a partir da RAM do sistema.
- Não apresentar bytes estimados de memória como tamanho de download.
- Mocks e testes unitários não substituem a execução real exigida nesta etapa.

## Critérios de conclusão e verificação

- [ ] O modelo real gera uma resposta dentro da extensão via WebGPU e a digitação continua responsiva.
- [ ] O código executável carregado pertence ao pacote local; a rede contém apenas downloads previstos de artefatos.
- [ ] WebGPU indisponível, download falho e falta de recursos geram erro compreensível sem alterar o rascunho.
- [ ] Há registro da execução em hardware real. Se isso não puder ser realizado, a etapa fica Aguardando validação e não Concluída.

Quando uma verificação não puder ser realizada, registrar exatamente o procedimento pendente e usar Aguardando validação ou Bloqueada no progresso, conforme o motivo. Não substituir evidência real por suposição.

## Entrega esperada

- AIEngine, WebLLMEngine e configuração inicial de modelo.
- Registro reproduzível da prova de inferência real, sem dados pessoais.

## Entrega funcional e commit obrigatório

Seguir [AGENTS.md](../../AGENTS.md): concluir todo o escopo acumulado da etapa, preservar o que já funciona e validar a execução correspondente. Quando houver código, executar npm run check e a validação real exigida pela etapa antes de encerrar. Cada etapa concluída deve gerar um commit próprio; revisar os arquivos preparados e informar seu hash na resposta final. Não declarar conclusão com validação obrigatória ou commit pendente.

Para testes de mensagens que forem realmente necessários, usar exclusivamente o contato @gabrielrguarini, conforme as regras de teste do projeto. Esta autorização não altera a proibição de envio automático pela extensão.

## Encerramento

Atualizar PROGRESSO.md com status, arquivos, verificações executadas, resultados, evidências e impedimentos. Na resposta final, informar o que foi entregue, como conferir e o que falta.

Próxima etapa: [STEP-07](STEP-07.md). **Não iniciá-la nesta execução.**
