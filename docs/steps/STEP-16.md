# STEP-16 — Validar e preparar a entrega instalável

[Plano geral](../PLANO.md) · [Progresso](../PROGRESSO.md)

## Instrução de execução

> Execute somente a etapa indicada. Leia o plano geral e o registro de progresso, confirme os pré-requisitos e implemente integralmente a entrega prevista. Execute as verificações pertinentes e registre os resultados. Não avance para a próxima etapa. Se houver impedimento, registre a causa e o que falta; não marque como concluído algo que não foi validado.

O status desta etapa é mantido exclusivamente em PROGRESSO.md. Não iniciar outra etapa para resolver uma pendência sem registrar o impedimento e respeitar o escopo solicitado.

## Objetivo

Entregar o pacote local com verificações completas e instruções de instalação, atualização e privacidade.

## Pré-requisitos

- Ler [PLANO.md](../PLANO.md) e [PROGRESSO.md](../PROGRESSO.md).
- [STEP-15](STEP-15.md), incluindo [A](STEP-15-A.md), [B](STEP-15-B.md), [C](STEP-15-C.md) e [D](STEP-15-D.md), e todas as etapas anteriores concluídas, com evidências registradas.

## Tarefas

- [ ] Validar instalação limpa com seleção nativa/local, idioma pt-BR indisponível, preparação explícita, avisos e Substituir mesmo assim sem confirmação adicional.
- [ ] Conferir sessões nativas isoladas, Rewriter por configuração, quotas/cancelamento, Gemma e perfis WebLLM selecionáveis, cache administrado pelo Chrome separado dos modelos próprios.
- [ ] Executar os checks do projeto e testes de integração em fixtures controladas com múltiplos editores/abas e textos sintéticos.
- [ ] Validar manualmente o fluxo no WhatsApp Web real: digitar, abrir IA, escolher ação, acompanhar, revisar e substituir. Não automatizar envio de mensagens.
- [ ] Cobrir troca de conversa, rascunho alterado, Unicode, quebras de linha, menções estruturadas, cópia, desfazer, cancelamento e respostas atrasadas.
- [ ] Revalidar download, cache, inicialização offline, troca de modelo, perda de GPU, reinício dos componentes e falta de suporte WebGPU.
- [ ] Auditar Manifest, CSP, permissões, pacote, logs e storage. Inspecionar em ambiente de teste requisições originadas pela extensão com textos sintéticos identificáveis, sem adicionar interceptação de tráfego ao produto.
- [ ] Confirmar que downloads se restringem aos artefatos registrados e que código executável é local.
- [ ] Gerar a pasta final instalável e documentar chrome://extensions → Modo do desenvolvedor → Carregar sem compactação.
- [ ] Documentar versões/hardware testados, requisitos, atualização da extensão, descarga da GPU, remoção dos modelos, privacidade, diagnóstico sem conteúdo e limitações conhecidas.

## Limites

- Não publicar na Chrome Web Store nem configurar distribuição externa nesta etapa.
- Não declarar compatibilidade com equipamentos ou versões que não foram verificados.
- Não encerrar a entrega como concluída com validação real obrigatória pendente.

## Critérios de conclusão e verificação

- [ ] Instalação limpa do pacote funciona sem depender de servidor de desenvolvimento.
- [ ] O fluxo completo real atende aos critérios de privacidade, avisos de preservação e substituição manual.
- [ ] Testes automatizados e verificações manuais obrigatórias estão registrados com evidências.
- [ ] Nenhum conteúdo sintético de rascunho aparece em requisições externas, logs ou storage persistente da extensão.
- [ ] A inferência funciona offline após preparação completa e reinício; limitações são documentadas.

Quando uma verificação não puder ser realizada, registrar exatamente o procedimento pendente e usar Aguardando validação ou Bloqueada no progresso, conforme o motivo. Não substituir evidência real por suposição.

## Entrega esperada

- Pasta instalável, guia de instalação/operação e documentação de privacidade.
- Relatório final de validação, limitações e conclusão do plano apenas se todos os critérios forem atendidos.

## Entrega funcional e commit obrigatório

Seguir [AGENTS.md](../../AGENTS.md): concluir todo o escopo acumulado da etapa, preservar o que já funciona e validar a execução correspondente. Quando houver código, executar npm run check e a validação real exigida pela etapa antes de encerrar. Cada etapa concluída deve gerar um commit próprio; revisar os arquivos preparados e informar seu hash na resposta final. Não declarar conclusão com validação obrigatória ou commit pendente.

Para testes de mensagens que forem realmente necessários, usar exclusivamente o contato @gabrielrguarini, conforme as regras de teste do projeto. Esta autorização não altera a proibição de envio automático pela extensão.

## Encerramento

Atualizar PROGRESSO.md com status, arquivos, verificações executadas, resultados, evidências e impedimentos. Na resposta final, informar o que foi entregue, como conferir e o que falta.

Encerrar o plano somente após todos os critérios e validações obrigatórias. Não iniciar publicação ou funcionalidades fora do escopo.
