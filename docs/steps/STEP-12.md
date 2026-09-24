# STEP-12 — Adicionar modelos e perfis de hardware

[Plano geral](../PLANO.md) · [Progresso](../PROGRESSO.md)

## Instrução de execução

> Execute somente a etapa indicada. Leia o plano geral e o registro de progresso, confirme os pré-requisitos e implemente integralmente a entrega prevista. Execute as verificações pertinentes e registre os resultados. Não avance para a próxima etapa. Se houver impedimento, registre a causa e o que falta; não marque como concluído algo que não foi validado.

O status desta etapa é mantido exclusivamente em PROGRESSO.md. Não iniciar outra etapa para resolver uma pendência sem registrar o impedimento e respeitar o escopo solicitado.

## Objetivo

Oferecer os perfis Econômico, Equilibrado e Qualidade sem inferências falsas sobre a capacidade do equipamento.

## Pré-requisitos

- Ler [PLANO.md](../PLANO.md) e [PROGRESSO.md](../PROGRESSO.md).
- [STEP-11](STEP-11.md) e todas as etapas anteriores concluídas, com evidências registradas.

## Tarefas

- [ ] Adicionar Llama 3.2 3B Instruct, Qwen3 4B e Qwen3 8B ao catálogo local, com variantes compatíveis e artefatos executáveis empacotados.
- [ ] Mapear Econômico para Llama, Equilibrado para Qwen3 4B e Qualidade para Qwen3 8B. Manter Econômico como padrão.
- [ ] Validar licença, revisão, runtime e model_lib de cada entrada. Exibir tamanho real conhecido do download, contexto e requisitos estimados separados.
- [ ] Verificar features, limits e carregamento real do adaptador WebGPU; apresentar dados indisponíveis como indisponíveis.
- [ ] Selecionar variante f32 quando os recursos exigidos por f16 faltarem, informando o requisito de memória maior antes de baixar.
- [ ] Desabilitar raciocínio prolongado nos modelos Qwen3 usando a configuração suportada pela versão fixada do runtime.
- [ ] Ao trocar modelo, encerrar pedidos em andamento de forma explícita, liberar o anterior e pedir a ação de download apenas quando faltarem artefatos.
- [ ] Se o carregamento falhar por recursos, sugerir perfil menor sem alterar silenciosamente a escolha ou baixar outro modelo.

## Limites

- Não aceitar URLs arbitrárias de modelos ou código remoto nas configurações.
- Não usar RAM do sistema ou navigator.deviceMemory como VRAM livre.
- Não exigir que o perfil Qualidade rode em todos os computadores suportados.

## Critérios de conclusão e verificação

- [ ] Cada modelo compatível no equipamento pode ser carregado e utilizado; indisponibilidades são registradas.
- [ ] Trocar perfil não mantém dois modelos na GPU nem mistura respostas.
- [ ] Licenças, tamanhos e variantes apresentados correspondem aos artefatos fixados.
- [ ] Erros de memória ou incompatibilidade orientam o usuário sem fallback remoto.

Quando uma verificação não puder ser realizada, registrar exatamente o procedimento pendente e usar Aguardando validação ou Bloqueada no progresso, conforme o motivo. Não substituir evidência real por suposição.

## Entrega esperada

- Catálogo de modelos, seleção de perfis e informações de hardware.
- Matriz de compatibilidade efetivamente verificada.

## Entrega funcional e commit obrigatório

Seguir [AGENTS.md](../../AGENTS.md): concluir todo o escopo acumulado da etapa, preservar o que já funciona e validar a execução correspondente. Quando houver código, executar npm run check e a validação real exigida pela etapa antes de encerrar. Cada etapa concluída deve gerar um commit próprio; revisar os arquivos preparados e informar seu hash na resposta final. Não declarar conclusão com validação obrigatória ou commit pendente.

Para testes de mensagens que forem realmente necessários, usar exclusivamente o contato @gabrielrguarini, conforme as regras de teste do projeto. Esta autorização não altera a proibição de envio automático pela extensão.

## Encerramento

Atualizar PROGRESSO.md com status, arquivos, verificações executadas, resultados, evidências e impedimentos. Na resposta final, informar o que foi entregue, como conferir e o que falta.

Próxima etapa: [STEP-13](STEP-13.md). **Não iniciá-la nesta execução.**
