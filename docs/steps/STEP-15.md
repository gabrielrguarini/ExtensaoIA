# STEP-15 — Criar e executar o benchmark pt-BR

[Plano geral](../PLANO.md) · [Progresso](../PROGRESSO.md)

## Instrução de execução

> Execute somente a etapa indicada. Leia o plano geral e o registro de progresso, confirme os pré-requisitos e implemente integralmente a entrega prevista. Execute as verificações pertinentes e registre os resultados. Não avance para a próxima etapa. Se houver impedimento, registre a causa e o que falta; não marque como concluído algo que não foi validado.

O status desta etapa é mantido exclusivamente em PROGRESSO.md. Não iniciar outra etapa para resolver uma pendência sem registrar o impedimento e respeitar o escopo solicitado.

## Objetivo

Medir qualidade e desempenho com pelo menos 100 casos sintéticos reproduzíveis.

## Pré-requisitos

- Ler [PLANO.md](../PLANO.md) e [PROGRESSO.md](../PROGRESSO.md).
- [STEP-14](STEP-14.md) e todas as etapas anteriores concluídas, com evidências registradas.

## Tarefas

- [x] Criar no mínimo 100 casos texto/ação, distribuídos pelas nove ações: informal, profissional, curtos, longos, gírias, abreviações, números, datas, URLs, emojis, negativas, nomes e valores.
- [x] Anotar antes da execução as entidades e fatos invariantes, intenção esperada e critérios de gramática e naturalidade; evitar comparação literal única para geração livre.
- [ ] Executar nos modelos compatíveis com o hardware disponível, mantendo registrados modelo, variante, revisão, parâmetros, runtime, Chrome e equipamento.
- [ ] Medir preservação, utilidade, rejeições, carregamento frio/quente, primeira resposta, latência total e tokens por segundo.
- [x] Informar uso de memória apenas quando mensurável; separar medidas, estimativas do catálogo e informação indisponível.
- [x] Revisar saídas além do julgamento do próprio modelo. Registrar falsos positivos e falsos negativos dos validadores.
- [x] Incluir todos os casos no denominador, inclusive rejeitados, erros e incompatibilidades; não melhorar métricas excluindo resultados difíceis.
- [x] Publicar relatório local reproduzível e registrar defeitos encontrados. Alteração conhecida de entidade protegida, fato ou intenção em saída liberada impede concluir o aceite.

Evidências e pendências: [relatório da execução](../VALIDACAO-STEP-15.md). Há 108 pares anotados por perfil; 133/324 gerações concluídas. Os dois itens de execução/medição permanecem abertos até completar os Qwen. O commit parcial não conclui a etapa.

## Limites

- Usar dados sintéticos; não coletar conversas reais para preencher o benchmark.
- Não afirmar execução de modelo incompatível com o equipamento.
- Não apresentar resultados simulados ou pontuação do próprio modelo como qualidade comprovada.

## Critérios de conclusão e verificação

- [x] Há pelo menos 100 casos identificáveis com cobertura das categorias e ações.
- [x] O relatório identifica exatamente o que foi executado e o que ficou pendente.
- [ ] Não há alteração conhecida de entidades protegidas, fatos ou intenção entre saídas liberadas do conjunto; rejeições são contadas separadamente.
- [x] Métricas e revisão podem ser reproduzidas localmente sem serviços externos.

Quando uma verificação não puder ser realizada, registrar exatamente o procedimento pendente e usar Aguardando validação ou Bloqueada no progresso, conforme o motivo. Não substituir evidência real por suposição.

## Entrega esperada

- Conjunto de benchmark, mecanismo de execução e relatório local.
- Lista de limitações e resultados por modelo/hardware efetivamente avaliado.

## Entrega funcional e commit obrigatório

Seguir [AGENTS.md](../../AGENTS.md): concluir todo o escopo acumulado da etapa, preservar o que já funciona e validar a execução correspondente. Quando houver código, executar npm run check e a validação real exigida pela etapa antes de encerrar. Cada etapa concluída deve gerar um commit próprio; revisar os arquivos preparados e informar seu hash na resposta final. Não declarar conclusão com validação obrigatória ou commit pendente.

Para testes de mensagens que forem realmente necessários, usar exclusivamente o contato @gabrielrguarini, conforme as regras de teste do projeto. Esta autorização não altera a proibição de envio automático pela extensão.

## Encerramento

Atualizar PROGRESSO.md com status, arquivos, verificações executadas, resultados, evidências e impedimentos. Na resposta final, informar o que foi entregue, como conferir e o que falta.

Próxima etapa: [STEP-16](STEP-16.md). **Não iniciá-la nesta execução.**
