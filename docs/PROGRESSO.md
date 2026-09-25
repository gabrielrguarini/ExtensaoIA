# Progresso — Extensão de IA local para WhatsApp Web

[Plano geral](PLANO.md)

## Estado atual

- Última atualização: 25/09/2026.
- Última etapa concluída: **STEP-03 — Implementar Manifest V3 e comunicação**.
- Situação: STEP-03 validada no Chrome for Testing, com escopo completo e commit próprio.
- Próxima etapa executável: **STEP-04 — Detectar o editor do WhatsApp**, somente quando solicitada.
- Implementação: Manifest V3, comunicação validada, Worker simulado e diagnóstico prontos. Detecção do editor e inferência local continuam nas etapas futuras.

## Significado dos status

- **Pendente:** execução ainda não iniciada.
- **Em andamento:** trabalho autorizado da etapa em execução.
- **Aguardando validação:** implementação disponível, mas falta evidência obrigatória, como execução real no Chrome/GPU/WhatsApp.
- **Bloqueada:** impedimento concreto impossibilita a continuidade; registrar causa e o necessário para resolvê-la.
- **Concluída:** todas as entregas e verificações obrigatórias da etapa foram satisfeitas e a entrega está registrada em commit próprio.

Não concluir uma etapa apenas porque o código compila. Pré-requisitos de uma etapa sequencial devem estar Concluídos. Não armazenar mensagens reais, prompts ou respostas como evidências.

## Etapas

| Etapa                       | Descrição                                       | Status    | Evidência                                                                                                                       |
| --------------------------- | ----------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------- |
| [STEP-01](steps/STEP-01.md) | Organizar o plano e o acompanhamento            | Concluída | 18 documentos, 16 etapas, 129 links locais válidos e sequência conferida.                                                       |
| [STEP-02](steps/STEP-02.md) | Criar a base do projeto                         | Concluída | npm ci reproduzível; tipos, lint, formatação, 3 testes de build e build aprovados.                                              |
| [STEP-03](steps/STEP-03.md) | Implementar Manifest V3 e comunicação           | Concluída | 45 testes e build aprovados; extensão executada no Chrome for Testing 154, com duas abas, cancelamento e recuperação validados. |
| [STEP-04](steps/STEP-04.md) | Detectar o editor do WhatsApp                   | Pendente  | Não iniciada.                                                                                                                   |
| [STEP-05](steps/STEP-05.md) | Criar preview e substituição manual             | Pendente  | Não iniciada.                                                                                                                   |
| [STEP-06](steps/STEP-06.md) | Executar o primeiro modelo local                | Pendente  | Não iniciada.                                                                                                                   |
| [STEP-07](steps/STEP-07.md) | Implementar a ação Corrigir                     | Pendente  | Não iniciada.                                                                                                                   |
| [STEP-08](steps/STEP-08.md) | Proteger entidades e validar o resultado        | Pendente  | Não iniciada.                                                                                                                   |
| [STEP-09](steps/STEP-09.md) | Adicionar os demais modos                       | Pendente  | Não iniciada.                                                                                                                   |
| [STEP-10](steps/STEP-10.md) | Exibir geração progressiva e cancelamento       | Pendente  | Não iniciada.                                                                                                                   |
| [STEP-11](steps/STEP-11.md) | Implementar verificação semântica opcional      | Pendente  | Não iniciada.                                                                                                                   |
| [STEP-12](steps/STEP-12.md) | Adicionar modelos e perfis de hardware          | Pendente  | Não iniciada.                                                                                                                   |
| [STEP-13](steps/STEP-13.md) | Consolidar cache, recuperação e desempenho      | Pendente  | Não iniciada.                                                                                                                   |
| [STEP-14](steps/STEP-14.md) | Finalizar configurações e interfaces auxiliares | Pendente  | Não iniciada.                                                                                                                   |
| [STEP-15](steps/STEP-15.md) | Criar e executar o benchmark pt-BR              | Pendente  | Não iniciada.                                                                                                                   |
| [STEP-16](steps/STEP-16.md) | Validar e preparar a entrega instalável         | Pendente  | Não iniciada.                                                                                                                   |

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
- Naquele registro inicial, a STEP-03 permanecia pendente. Sua execução está registrada abaixo.

## STEP-03 — Implementada em 24/09/2026; validada em 25/09/2026

- Escopo implementado: Manifest V3, Service Worker ES module, content script IIFE isolado no frame principal do WhatsApp, documento offscreen com finalidade WORKERS, Worker simulado e página de diagnóstico.
- Arquivos criados: manifest.json, offscreen.html, diagnostic.html; src/shared/{protocol,senders,diagnostic}.ts; src/extension/background/{index,router,offscreen-host}.ts; src/extension/offscreen/index.ts; src/extension/ai/{worker,simulated-engine}.ts; src/extension/content/index.ts; src/extension/diagnostic/{main.tsx,styles.css}; tests/{fixtures,protocol.test,router.test,offscreen-host.test}.ts; docs/VALIDACAO-STEP-03.md.
- Arquivos alterados: Vite, configurações TypeScript, package.json/package-lock.json, página auxiliar React, teste do pacote, .gitignore (artefatos temporários do Playwright), README, checklist da etapa e este registro.
- Dependência nova: @types/chrome 0.3.0, versão exata consultada no registro npm e instalada com quatro pacotes transitivos/diretos no total. Versão do projeto e Manifest: 0.2.0.
- Reprodutibilidade: npm ci --offline --cache .cache/npm --no-audit reinstalou 143 pacotes com sucesso após encontrar a pasta de dependências incompleta. A conferência completa foi repetida e aprovada após a restauração; o pacote pronto em dist foi preservado.
- Roteamento: requestId, editorId, snapshotId e revisão associados à aba, frame, documento e conexão derivados do remetente do Chrome. Validação de campos fechados e limite de texto; descarte de vínculos divergentes, pedidos desconhecidos e eventos atrasados; erro de ocupado sem fila.
- Ciclo de vida: criação offscreen idempotente; prontidão do Worker antes do envio; cancelamento elimina timers do simulador; desconexão elimina o Worker; timeout e reinício não repetem pedidos. Nova ação explícita pode reconectar a um offscreen sobrevivente.
- Privacidade: somente fixture sintética fixa; nenhum seletor ou leitura do WhatsApp, API interna, envio, armazenamento persistente de texto ou log de conteúdo. CSP restringe scripts/workers ao pacote e bloqueia conexões externas. storage está declarado conforme o plano, sem uso nesta etapa. Host restrito ao WhatsApp para listar/verificar apenas as abas permitidas.
- Verificações automatizadas: npm run check aprovado com tipos, lint sem avisos, formatação, 45 testes em quatro arquivos e build completo. Contratos, remetentes, concorrência, cancelamento, desconexão, recuperação, timeout, Unicode e artefatos MV3 cobertos em ambiente simulado.
- Pacote gerado: dist/manifest.json, service-worker.js, content.js, offscreen.html, diagnostic.html, index.html, assets locais e avisos de licença. O teste usa um build temporário separado e confere a sintaxe clássica do content script, as referências locais e a CSP.
- Verificação de interface no navegador disponível: página auxiliar preservada e diagnóstico em localhost renderizados; aviso de APIs indisponíveis fora da extensão e botões desabilitados corretos; nenhum erro ou aviso capturado no console. Isso não certifica a instalação da extensão.
- Validação real: concluída em 25/09/2026 com Playwright MCP 0.0.82, Playwright 1.64.0-alpha-1789764292000 e Chrome for Testing 154.0.8037.0 (Chromium 1246), em perfil separado sem login. [Relatório e roteiro](VALIDACAO-STEP-03.md). A limitação anterior de acesso ao navegador foi resolvida com a instalação do MCP solicitada pelo usuário.
- Evidências reais: extensão descompactada ativada e sem erros indicados no gerenciador; circuito completo nas duas abas com documentos distintos; concorrência gerou um resultado e um ocupado; cancelamento não liberou resultado; fechamento de aba encerrou o pedido e a aba restante concluiu novo teste.
- Reinício real: parada do Service Worker durante pedido busy observada pelo protocolo do navegador; pedido interrompido sem replay. Novo pedido explícito teve sucesso, reutilizando exatamente um offscreen com o mesmo documentId antes e depois. Comando malformado e remetente indevido foram recusados; storage local/sync/session vazio ao final.
- Commit da etapa: feat(step-03): implementar comunicação MV3 simulada. Hash no histórico Git e no relato final; identidade humana configurada, sem atribuições adicionais.
- Status final: **Concluída**. Nenhum impedimento pendente no escopo desta etapa; detecção de editor e inferência permanecem nas etapas futuras.
- Próxima etapa após a conclusão, somente quando solicitada: STEP-04.

## Como continuar

As STEP-01, STEP-02 e STEP-03 estão concluídas. Consulte o [relatório de validação no Chrome](VALIDACAO-STEP-03.md). Para continuar, solicitar **Execute somente a STEP-04 do plano.** A STEP-04 não foi iniciada.

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
