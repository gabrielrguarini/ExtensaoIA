# STEP-15-F — Interface de escrita e configurações simplificadas

[Plano geral](../PLANO.md) · [Progresso](../PROGRESSO.md)

## Escopo autorizado em 02/10/2026

Executar somente este ajuste antes da STEP-16. O botão IA executa a ação configurada na extensão. Configurações ficam exclusivamente no popup e painel lateral. Retirar simulações, testes de IA e detalhes de implementação da interface do usuário. Português brasileiro é automático, incluindo a compatibilidade por instrução na Prompt API quando a declaração do idioma ou a API especializada não estiver disponível.

## Pré-requisitos e tarefas

- STEP-15-E concluída; ler plano e progresso antes de implementar.
- Remover configurações e seleção de ações do editor. Manter progresso, cancelamento, sugestão real, Copiar e Substituir manualmente.
- Consolidar a escolha de modelo nas configurações, com nomes compreensíveis e sem frameworks, variantes, quotas ou diagnósticos de desenvolvimento.
- Migrar preferências sem perder ação, modelo, tema, gírias ou emojis; remover o interruptor experimental de pt-BR.
- Consultar idioma/API específicos primeiro e compatibilidade por prompt antes da geração. Confirmar a configuração no offscreen; downloads continuam exigindo ação explícita. Nunca repetir geração após falha.
- Corrigir o popup estreito relatado pelo usuário: largura intrínseca independente da viewport inicial; validar a janela real de popup do Chrome, além da página em aba.
- Manter somente informações necessárias para decisões: preparação, tamanho do download, privacidade e remoção dos modelos. Consentimento de download junto ao pedido não altera configurações.
- Atualizar documentação operacional e STEP-16, preservando relatórios e evidências históricos.

## Aceite e evidências

- Testes de migração, seleção automática, ação configurada, concorrência de preferências, cancelamento, obsolescência e aplicação manual.
- Chrome real com fixture sintética: um clique em IA, inferência nativa/local offline, Copiar, Substituir e desfazer. Verificar configurações em largura estreita e tema escuro, foco e ausência de controles técnicos/simulados. Nenhum envio ou conversa real necessário neste ajuste.
- Executar npm.cmd run check; revisar diff, registrar relatório, evidências e commit próprio com identidade humana, conforme [AGENTS.md](../../AGENTS.md).

## Encerramento

Validação obrigatória pendente mantém Aguardando validação. Parar ao terminar; STEP-16 continua pendente.
