# Progresso — Extensão de IA local para WhatsApp Web

[Plano geral](PLANO.md)

## Estado atual

- Última atualização: 24/09/2026.
- Última etapa concluída: **STEP-02 — Criar a base do projeto**.
- Situação: base tipada, build e verificações concluídos; nenhuma etapa em execução.
- Próxima etapa executável: **STEP-03 — Implementar Manifest V3 e comunicação**.
- Implementação: base de desenvolvimento pronta; Manifest, comunicação, integração com WhatsApp e IA ainda pertencem às etapas futuras.

## Significado dos status

- **Pendente:** execução ainda não iniciada.
- **Em andamento:** trabalho autorizado da etapa em execução.
- **Aguardando validação:** implementação disponível, mas falta evidência obrigatória, como execução real no Chrome/GPU/WhatsApp.
- **Bloqueada:** impedimento concreto impossibilita a continuidade; registrar causa e o necessário para resolvê-la.
- **Concluída:** todas as entregas e verificações obrigatórias da etapa foram satisfeitas e a entrega está registrada em commit próprio.

Não concluir uma etapa apenas porque o código compila. Pré-requisitos de uma etapa sequencial devem estar Concluídos. Não armazenar mensagens reais, prompts ou respostas como evidências.

## Etapas

| Etapa                       | Descrição                                       | Status    | Evidência                                                                          |
| --------------------------- | ----------------------------------------------- | --------- | ---------------------------------------------------------------------------------- |
| [STEP-01](steps/STEP-01.md) | Organizar o plano e o acompanhamento            | Concluída | 18 documentos, 16 etapas, 129 links locais válidos e sequência conferida.          |
| [STEP-02](steps/STEP-02.md) | Criar a base do projeto                         | Concluída | npm ci reproduzível; tipos, lint, formatação, 3 testes de build e build aprovados. |
| [STEP-03](steps/STEP-03.md) | Implementar Manifest V3 e comunicação           | Pendente  | Não iniciada.                                                                      |
| [STEP-04](steps/STEP-04.md) | Detectar o editor do WhatsApp                   | Pendente  | Não iniciada.                                                                      |
| [STEP-05](steps/STEP-05.md) | Criar preview e substituição manual             | Pendente  | Não iniciada.                                                                      |
| [STEP-06](steps/STEP-06.md) | Executar o primeiro modelo local                | Pendente  | Não iniciada.                                                                      |
| [STEP-07](steps/STEP-07.md) | Implementar a ação Corrigir                     | Pendente  | Não iniciada.                                                                      |
| [STEP-08](steps/STEP-08.md) | Proteger entidades e validar o resultado        | Pendente  | Não iniciada.                                                                      |
| [STEP-09](steps/STEP-09.md) | Adicionar os demais modos                       | Pendente  | Não iniciada.                                                                      |
| [STEP-10](steps/STEP-10.md) | Exibir geração progressiva e cancelamento       | Pendente  | Não iniciada.                                                                      |
| [STEP-11](steps/STEP-11.md) | Implementar verificação semântica opcional      | Pendente  | Não iniciada.                                                                      |
| [STEP-12](steps/STEP-12.md) | Adicionar modelos e perfis de hardware          | Pendente  | Não iniciada.                                                                      |
| [STEP-13](steps/STEP-13.md) | Consolidar cache, recuperação e desempenho      | Pendente  | Não iniciada.                                                                      |
| [STEP-14](steps/STEP-14.md) | Finalizar configurações e interfaces auxiliares | Pendente  | Não iniciada.                                                                      |
| [STEP-15](steps/STEP-15.md) | Criar e executar o benchmark pt-BR              | Pendente  | Não iniciada.                                                                      |
| [STEP-16](steps/STEP-16.md) | Validar e preparar a entrega instalável         | Pendente  | Não iniciada.                                                                      |

## Registro de execução

### STEP-01 — 24/09/2026

- Escopo: materializar o plano aprovado, 16 etapas individuais e o acompanhamento.
- Arquivos: PLANO.md, PROGRESSO.md e steps/STEP-01.md até steps/STEP-16.md.
- Verificações executadas: leitura dos arquivos em UTF-8; contagem de 18 documentos e 16 etapas; numeração 01–16; oito seções obrigatórias e instrução integral em cada etapa; dependências anteriores e próximas etapas; resolução de 129 links locais; confirmação de 15 etapas futuras pendentes.
- Resultado: verificação documental aprovada, sem arquivos ausentes, links locais quebrados ou caracteres de substituição de codificação. Revisão de conteúdo confirmou decisões de interface, modelos, privacidade, nove ações, revisão semântica opcional e critérios de evidência real.
- Limite das verificações: somente documentação. Build, testes do aplicativo, compatibilidade de dependências, GPU e WhatsApp pertencem às etapas futuras e não foram executados.
- Status final: **Concluída**.
- Impedimentos: nenhum identificado.
- Próxima ação: executar somente a STEP-02 quando solicitada. Nenhuma funcionalidade da extensão foi implementada nesta etapa.

### STEP-02 — 24/09/2026

- Escopo: base TypeScript strict/React/Vite, configuração de qualidade, instalação reproduzível e teste real do pacote; sem iniciar o Manifest V3.
- Arquivos criados: package.json e package-lock.json; configurações de npm, TypeScript, ESLint, Prettier, Vite e Vitest; .gitignore e .editorconfig; index.html; src/development/App.tsx, main.tsx e styles.css; tests/build.test.ts; README.md.
- Documentação atualizada: este progresso e checklist da STEP-02. Prettier normalizou a formatação de PLANO.md e STEP-08.md, sem executar ou alterar o escopo das etapas futuras.
- Compatibilidade: documentação oficial e metadados do registro npm consultados. TypeScript 6.0.3 escolhido porque typescript-eslint 8.70.1 não aceita TypeScript 7. Versões exatas das ferramentas estão no README e no lockfile.
- Ambiente verificado: Windows, Node 22.14.0 e npm 10.9.2. Nenhuma atualização global foi feita.
- Instalação: npm install adicionou 139 pacotes e reportou zero vulnerabilidades naquele momento. npm ci --offline --cache .cache/npm --no-audit reinstalou os pacotes a partir do cache; SHA-256 do package-lock.json permaneceu igual antes e depois.
- Verificações: npm run check terminou com código 0, cobrindo typecheck, lint sem avisos, format:check, npm test e build. Vitest executou 1 arquivo com 3 testes aprovados.
- Evidências dos testes: um build real em processo separado gerou HTML pt-BR com JS/CSS relativos existentes, sem cliente do servidor de desenvolvimento nem import externo de React; não incorporou o valor sintético de ambiente e não gerou scripts inline no HTML.
- Saída conferida: dist/index.html, arquivos JS/CSS em dist/assets e avisos locais de licença em dist/.vite/license.md.
- Limites: não há Manifest, integração com WhatsApp ou modelo de IA; dist contém somente a página auxiliar e não pode ser carregado como extensão. A auditoria completa de privacidade e a validação em GPU/WhatsApp permanecem nas etapas previstas.
- Status final: **Concluída**.
- Impedimentos: nenhum pendente.
- Próxima ação: executar somente a STEP-03 quando solicitada.

## Registro inicial em Git e regras adicionais

- O usuário confirmou a sequência incremental, com cada entrega completa e funcionando no escopo acumulado da etapa.
- A pasta ainda não era um repositório Git quando as STEP-01 e STEP-02 foram executadas. Seu estado foi organizado em dois commits iniciais: documentação da STEP-01 e base validada da STEP-02, com as datas reais de criação dos commits.
- Commit da STEP-01: a9fe784 — docs(step-01): registrar plano e regras de execução.
- Commit da STEP-02: chore(step-02): preparar base React e validações. O hash fica no histórico Git e na resposta de entrega.
- Verificação adicional: página de produção em http://127.0.0.1:4173/ conferida no navegador; React montado, textos e estilos visíveis, sem avisos ou erros capturados no console.
- Regras novas: AGENTS.md e instruções de todas as etapas exigem commit, verificações e funcionamento completo do escopo. O contato exclusivo para testes necessários é @gabrielrguarini.
- Mensagens de commit devem seguir Conventional Commits; autor e committer mantêm a identidade humana configurada, sem trailers de coautoria ou créditos adicionais.
- Nenhuma mensagem de teste foi necessária ou enviada nesta atualização.
- A STEP-03 permanece pendente.

## Como continuar

As STEP-01 e STEP-02 estão concluídas. Para continuar, solicitar: **Execute somente a STEP-03 do plano.**

Em futuras execuções, ler o plano e a etapa indicada, validar os pré-requisitos e atualizar este documento ao terminar. Não mudar o estado de etapas futuras apenas porque suas descrições foram criadas.

## Modelo de registro para futuras execuções

Copiar o bloco abaixo para cada execução e preencher somente com fatos verificados:

- Etapa e data:
- Escopo executado:
- Arquivos criados/alterados:
- Verificações e comandos/procedimentos:
- Resultados e evidências:
- Limitações ou validações pendentes:
- Impedimento e ação necessária, se houver:
- Commit da etapa (mensagem; hash no histórico Git e no relato final):
- Status final da etapa:
- Próxima etapa, sem iniciá-la:
