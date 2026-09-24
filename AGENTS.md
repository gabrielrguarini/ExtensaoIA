# Instruções do projeto

## Etapas e entrega funcional

- Ler docs/PLANO.md, docs/PROGRESSO.md e o arquivo da etapa solicitada antes de implementar.
- Executar uma etapa por vez e parar ao terminar, sem iniciar automaticamente a seguinte.
- O usuário confirmou que “aplicação completa e funcionando” significa uma entrega completa e executável de todo o escopo acumulado até aquela etapa. Manter a sequência aprovada; não antecipar toda a extensão.
- Não encerrar uma etapa com funcionalidades obrigatórias incompletas, stubs apresentados como produto ou regressões. Simulações explicitamente previstas devem continuar identificadas como simulações.
- A etapa documental deve estar íntegra e navegável; a base da STEP-02 deve executar; da STEP-03 em diante, verificar a extensão instalável conforme o escopo vigente.
- Quando houver package.json, executar npm run check antes do commit de conclusão. Usar npm.cmd no Windows se necessário. Verificar também o comportamento real correspondente à etapa; build e mocks não substituem Chrome, GPU ou WhatsApp quando exigidos.
- Se faltar validação obrigatória, manter Aguardando validação ou Bloqueada e registrar a causa; não declarar a etapa concluída.

## Commits obrigatórios

- Toda etapa concluída deve ter um commit próprio, com código completo, dependências travadas, documentação e evidências de validação.
- Revisar o diff e os arquivos preparados antes de commitar. Não incluir node_modules, dist, cache, segredos, conversas reais ou arquivos temporários.
- Preservar alterações do usuário sem relação com a etapa e informar qualquer trabalho restante fora do commit.
- Preferir mensagens como docs(step-01): descrever entrega ou feat(step-03): descrever entrega. Informar o hash do commit e as verificações na resposta final.
- Usar a identidade Git já configurada. Não inventar identidade, alterar configuração global, reescrever histórico nem publicar/push sem instrução específica.
- As STEP-01 e STEP-02, concluídas antes da criação do repositório, devem ser registradas em dois commits iniciais coerentes. Registrar essa origem no progresso sem simular datas de commits passadas.

## Testes de mensagens no WhatsApp

- O contato indicado pelo usuário para testes, quando necessários, é exclusivamente @gabrielrguarini.
- Usar fixtures locais e rascunhos primeiro. Se um teste realmente exigir envio manual, usar somente esse contato, textos sintéticos curtos e claramente identificados como teste.
- Confirmar na interface que a conversa corresponde ao contato indicado. Se a identificação for ambígua ou o contato não for encontrado, pedir esclarecimento; não escolher outra conversa.
- A autorização vale para testes rotineiros necessários ao projeto. Não enviar dados pessoais, informações de conversas, compromissos, conteúdo financeiro ou mensagens sem relação com o teste.
- Não implementar envio automático na extensão: a aplicação continua sendo uma ferramenta de escrita com substituição manual.
- Não gravar conteúdo real da conversa em código, logs, screenshots versionadas ou relatórios. Registrar somente procedimento e resultado do teste.
