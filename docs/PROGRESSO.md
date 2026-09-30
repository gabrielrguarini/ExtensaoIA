# Progresso — Extensão de IA local para WhatsApp Web

[Plano geral](PLANO.md)

## Estado atual

- Última atualização: 30/09/2026.
- Última etapa concluída: **STEP-12 — Adicionar modelos e perfis de hardware**.
- Situação: três perfis carregados e usados no Chrome/WebGPU, com download explícito, limites reais do adaptador, variantes fixadas e troca durante streaming liberando o Worker anterior; entrega registrada em commit próprio.
- Validação complementar no WhatsApp real: 14 pedidos no grupo autorizado, duas alterações consideradas úteis, seis recusas, três respostas sem mudança e três prévias insatisfatórias; duas substituições e uma mensagem sintética enviada manualmente. A qualidade varia e exige revisão. [Resultados](VALIDACAO-STEP-12.md#validação-complementar-no-whatsapp-real--30092026).
- Próxima etapa executável: **STEP-13**, somente quando solicitada.
- Implementação: Manifest V3, comunicação, adaptador do editor, botão IA, prévia, substituição manual, prova sintética e nove ações com streaming nos perfis Econômico/Llama 3.2 3B, Equilibrado/Qwen3 4B e Qualidade/Qwen3 8B via WebGPU. A revisão semântica opcional usa a mesma instância do modelo em sequência. A simulação continua identificada. Textos multilinha e estruturas especiais oferecem somente cópia.

## Significado dos status

- **Pendente:** execução ainda não iniciada.
- **Em andamento:** trabalho autorizado da etapa em execução.
- **Aguardando validação:** implementação disponível, mas falta evidência obrigatória, como execução real no Chrome/GPU/WhatsApp.
- **Bloqueada:** impedimento concreto impossibilita a continuidade; registrar causa e o necessário para resolvê-la.
- **Concluída:** todas as entregas e verificações obrigatórias da etapa foram satisfeitas e a entrega está registrada em commit próprio.

Não concluir uma etapa apenas porque o código compila. Pré-requisitos de uma etapa sequencial devem estar Concluídos. Não armazenar mensagens reais, prompts ou respostas como evidências.

## Etapas

| Etapa                       | Descrição                                       | Status    | Evidência                                                                                                                                                                |
| --------------------------- | ----------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [STEP-01](steps/STEP-01.md) | Organizar o plano e o acompanhamento            | Concluída | 18 documentos, 16 etapas, 129 links locais válidos e sequência conferida.                                                                                                |
| [STEP-02](steps/STEP-02.md) | Criar a base do projeto                         | Concluída | npm ci reproduzível; tipos, lint, formatação, 3 testes de build e build aprovados.                                                                                       |
| [STEP-03](steps/STEP-03.md) | Implementar Manifest V3 e comunicação           | Concluída | 45 testes e build aprovados; extensão executada no Chrome for Testing 154, com duas abas, cancelamento e recuperação validados.                                          |
| [STEP-04](steps/STEP-04.md) | Detectar o editor do WhatsApp                   | Concluída | 69 testes e build aprovados; botão único, rascunho preservado, busca e fechamento/reabertura conferidos no WhatsApp real.                                                |
| [STEP-05](steps/STEP-05.md) | Criar preview e substituição manual             | Concluída | 98 testes e build; Chrome/WhatsApp com aplicação e undo, cópia, cancelamento e bloqueio de sugestões obsoletas.                                                          |
| [STEP-06](steps/STEP-06.md) | Executar o primeiro modelo local                | Concluída | 102 testes e build; Llama 3.2 3B em WebGPU/Chrome, resposta sintética real, cache offline e falha de download validados. [Relatório](VALIDACAO-STEP-06.md).              |
| [STEP-07](steps/STEP-07.md) | Implementar a ação Corrigir                     | Concluída | 111 testes e build; correção real no Chrome, prévia e aplicação manual, contexto recusado e saídas arriscadas preservando o rascunho. [Relatório](VALIDACAO-STEP-07.md). |
| [STEP-08](steps/STEP-08.md) | Proteger entidades e validar o resultado        | Concluída | 120 testes e build; oito casos de correção no Chrome/WebGPU, seis prévias, duas recusas seguras, contexto, simulação e prova offline. [Relatório](VALIDACAO-STEP-08.md). |
| [STEP-09](steps/STEP-09.md) | Adicionar os demais modos                       | Concluída | 128 testes e build; nove prévias e duas recusas seguras no grupo de teste do WhatsApp Web. [Relatório](VALIDACAO-STEP-09.md).                                            |
| [STEP-10](steps/STEP-10.md) | Exibir geração progressiva e cancelamento       | Concluída | 134 testes e build; streaming, cancelamento, novo pedido e edição durante geração no Chrome/WebGPU. [Relatório](VALIDACAO-STEP-10.md).                                   |
| [STEP-11](steps/STEP-11.md) | Implementar verificação semântica opcional      | Concluída | 143 testes e build; seis casos sintéticos no Llama/WebGPU, preferência persistida e cancelamento durante revisão no Chrome. [Relatório](VALIDACAO-STEP-11.md).           |
| [STEP-12](steps/STEP-12.md) | Adicionar modelos e perfis de hardware          | Concluída | 151 testes e build; três modelos f16 usados no Chrome/WebGPU e troca durante streaming com liberação do Worker. [Matriz e artefatos](VALIDACAO-STEP-12.md).              |
| [STEP-13](steps/STEP-13.md) | Consolidar cache, recuperação e desempenho      | Pendente  | Não iniciada.                                                                                                                                                            |
| [STEP-14](steps/STEP-14.md) | Finalizar configurações e interfaces auxiliares | Pendente  | Não iniciada.                                                                                                                                                            |
| [STEP-15](steps/STEP-15.md) | Criar e executar o benchmark pt-BR              | Pendente  | Não iniciada.                                                                                                                                                            |
| [STEP-16](steps/STEP-16.md) | Validar e preparar a entrega instalável         | Pendente  | Não iniciada.                                                                                                                                                            |

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

## STEP-04 — 25/09/2026

- Escopo: adaptador de seletores semânticos, identificação do compositor, botão IA único/acessível com estilos isolados, captura explícita em memória e invalidação por revisão. O clique informa que as ações de escrita ainda não estão disponíveis. Nenhum preview ou correção antecipados.
- Arquivos criados: src/integration/whatsapp/adapter.ts; src/extension/content/{diagnostic-client.ts,editor-button.ts,editor-button.css}; tests/{whatsapp-fixture.ts,whatsapp-adapter.test.ts,editor-button.test.ts}; docs/VALIDACAO-STEP-04.md.
- Arquivos alterados: entrada do content script, página auxiliar, Manifest, package.json/package-lock.json, tsconfig.node.json, README, checklist da etapa e este progresso.
- Dependência: jsdom 29.1.1, somente desenvolvimento, escolhida após consulta aos requisitos oficiais no npm; compatível com Node 22.14.0. A instalação adicionou 37 pacotes e reportou zero vulnerabilidades naquele momento. Projeto/Manifest: 0.3.0.
- Integração: seletores centralizados em #main com header/footer diretos e textbox contenteditable; recusa de busca, diálogos, ocultos, somente leitura e ambiguidade. Sem classes ofuscadas ou texto de placeholder. MutationObserver restrito, descoberta estrutural a cada segundo, atualizações por frame, descarte de eventos/observadores obsoletos e limpeza em pagehide.
- Privacidade: observadores não leem o texto nem valores do cabeçalho; captura somente por ativação real do botão. Texto em memória é descartado ao editar/mudar contexto/fechar; não é encaminhado ao diagnóstico, Worker, rede ou armazenamento. Nenhuma identidade de contato entra no adaptador. Verificação real final encontrou storage local/sync/session vazio no perfil de fixtures.
- Verificações automatizadas: npm run check aprovado, incluindo tipos, lint, formatação, 69 testes em seis arquivos e build. Os 45 testes anteriores permanecem aprovados; 24 novos testes cobrem seleção, exclusões, privacidade da leitura, revisão, reutilização do editor, descoberta tardia, observadores, montagem e limpeza.
- Validação no Chrome: pacote descompactado executado no Chrome for Testing 154.0.8037.0, com fixtures sintéticas e WhatsApp real autenticado. [Relatório completo](VALIDACAO-STEP-04.md), com procedimentos e limites separados por ambiente.
- Evidências reais: identidade do contato autorizado confirmada na interface; botão único fora da área de digitação; clique mantém o rascunho sintético e exibe aviso; fechar/reabrir remove/recria o botão; busca não ganha botão. Rascunho de teste removido e vazio conferido, sem envio de mensagens. Nenhuma captura de histórico foi versionada.
- Regressão: diagnóstico da STEP-03 concluiu o circuito simulado no navegador após separar seu cliente da integração. Estilos isolados, teclado, viewport menor e remoção/recriação de footer passaram na página controlada.
- Limitações: mudanças estruturais futuras podem exigir novos seletores; atualização de presença no cabeçalho pode invalidar conservadoramente a captura; posições sobre controles nativos são recusadas. Dois contextos distintos com texto igual foram testados por fixtures; o teste real ficou no contato autorizado.
- Commit da etapa: feat(step-04): detectar editor e adicionar botão de IA. Hash no histórico Git e no relato final; identidade humana configurada, sem atribuições adicionais.
- Status final: **Concluída**. Nenhum impedimento pendente no escopo da etapa.
- Próxima etapa, somente por nova solicitação: STEP-05. Não iniciada.

## STEP-05 — 25 a 28/09/2026

- Escopo: menu/prévia React junto ao editor, simulação identificada, Substituir/Copiar/Cancelar, seleção nativa, leitura de blocos e proteção contra sugestões obsoletas. Motor continua sendo o eco local da STEP-03; não há IA real nem envio de mensagens.
- Arquivos criados: src/extension/content/{PreviewPanel.tsx,preview-client.ts,preview-session.ts}; src/integration/whatsapp/draft.ts; tests/{editor-replacement.test.ts,preview-session.test.ts}; docs/VALIDACAO-STEP-05.md.
- Arquivos alterados: editor-button.ts/CSS, adaptador do WhatsApp, teste do build, Vite, tsconfig.node.json, página auxiliar React, Manifest, package.json/package-lock.json, README, checklist da STEP-05 e este progresso. Nenhuma dependência nova; versão do pacote/Manifest 0.4.0.
- Comunicação: captura somente ao pedir a prévia; pedido vinculado a documento, aba, editor, snapshot e revisão. O cliente aceita somente eventos do vínculo atual e descarta respostas após cancelamento. Texto em memória; nenhuma nova permissão ou persistência.
- Edição: conferência explícita de texto/contexto, seleção limitada ao editor, espera pela restauração do foco e seleção do WhatsApp, insertText isolado no adaptador e verificação do resultado. Undo nativo confirmado; não há escrita por innerHTML nem API interna do site.
- Limite confirmado: o WhatsApp removeu quebras durante uma tentativa de inserção multilinha; o ensaio foi desfeito com Ctrl+Z. A entrega final oferece somente cópia para rascunhos/sugestões multilinha e estruturas especiais, preservando o original e as linhas na prévia/cópia. Esse fallback e os limites da API obsoleta estão documentados no README e no relatório.
- Verificações: npm run check aprovado com tipos, lint sem avisos, formatação, 98 testes em oito arquivos e build. Casos cobrem linhas vazias, Unicode, menções, falhas, seleção/undo, cancelamento, revisão e respostas atrasadas. O build inclui React em modo de produção no content script clássico.
- Navegador: pacote 0.4.0 executado no Chrome for Testing 154.0.8037.0. Fixtures validaram HTML literal, aplicação/undo, cópia e recusa de permissão, cancelamento, troca de contexto com texto igual, editor recriado, teclado/Escape e menções somente para cópia. Nenhum pageerror capturado; diagnóstico anterior aprovado; storage local/sync/session vazio. [Relatório e roteiro](VALIDACAO-STEP-05.md).
- WhatsApp real: contato autorizado conferido na interface; frase sintética de uma linha com acento/emoji aplicada e desfeita. Prévia multilinha preservou separações, bloqueou substituição e permitiu copiar. Cancelamento/Escape preservaram o rascunho. Campo vazio confirmado ao encerrar; nenhuma mensagem enviada e nenhum conteúdo real versionado.
- Interrupção: a revisão automática de aprovação atingiu limite de uso em 25/09 e impediu executar um teste pendente. O trabalho foi retomado por solicitação em 28/09 e as verificações restantes foram executadas; o impedimento não permanece.
- Commit da etapa: feat(step-05): adicionar prévia e substituição manual. Hash no histórico Git e no relato final; identidade humana configurada, sem atribuições adicionais.
- Status final: **Concluída** no escopo descrito, sem validação obrigatória pendente. A substituição multilinha não é oferecida nem declarada validada.
- Próxima etapa: STEP-06, somente por nova solicitação; não iniciada.

## STEP-06 — 28/09/2026

- Escopo: primeira inferência real no Worker da extensão, usando somente uma frase sintética fixa. A prévia de escrita da STEP-05 permanece explicitamente simulada até a STEP-07.
- Arquivos criados: interface `AIEngine`, adaptador `WebLLMEngine`, catálogo fixo de modelo, dois WASM locais, cliente de prova, fixture/procedimento de navegador, licenças, aviso e [relatório reproduzível](VALIDACAO-STEP-06.md). Arquivos alterados: Worker, protocolo, roteador, menu, Manifest/CSP, build, tipos, testes, pacote/lockfile, README, checklist e progresso.
- Dependências exatas novas: `@mlc-ai/web-llm` 0.2.85, `@webgpu/types` 0.1.69 (desenvolvimento) e `playwright-core` 1.55.0 (roteiro de validação). Versão do projeto/Manifest: 0.5.0. Catálogo, revisões de pesos e bibliotecas WASM compatíveis foram conferidos antes da integração; os hashes dos WASM empacotados são verificados no teste de build.
- Segurança e privacidade: JS/WASM executáveis locais; dados do modelo limitados a `huggingface.co` e ao redirecionamento observado `us.aws.cdn.hf.co`. A prova usa somente a frase fixa e não lê rascunho/conversa. Cache API contém artefatos do modelo; Chrome Storage local/sync/session vazio. Nenhuma mensagem foi enviada.
- Hardware real: Chrome for Testing da família 154 em Windows, adapter Intel `gen-12lp`, `shader-f16`, limites de storage buffer e buffer de 2.147.483.644 e 2.147.483.648 bytes. A variante f16 gerou `TESTE.` para a frase sintética no Worker. Digitação independente respondeu durante o processamento; o rascunho da fixture permaneceu intacto.
- Validação adicional: após reiniciar Chrome, a mesma prova funcionou com rede desativada a partir do cache. Em perfil sem cache e sem rede, a falha de download mostrou aviso e preservou o rascunho. A simulação da STEP-05 continuou funcionando no Chrome. O cache tinha `webllm/config` (1) e `webllm/model` (60), somente URLs de `huggingface.co`; Chrome Storage vazio.
- Verificações automatizadas: `npm run check` aprovado, cobrindo tipos, lint, formatação, 102 testes em nove arquivos e build. Roteiro versionado `npm run test:step06:browser -- online|offline|download-failure|cache|regression` aprovado nos modos executados.
- Limites: a variante f32 foi validada por seleção automatizada e catálogo, sem uma segunda GPU real sem `shader-f16`. Os ramos de WebGPU ausente e limites baixos foram verificados em testes automatizados; a falha de download teve execução real. O compositor usado nesta etapa foi sintético, com extensão instalada no Chrome; não foi necessário abrir conversa no WhatsApp real.
- Commit da etapa: `feat(step-06): executar primeira inferência local`. Hash no histórico Git e no relato final; identidade humana configurada.
- Status final: **Concluída** no escopo da STEP-06. A próxima etapa é STEP-07, somente por nova solicitação.

## STEP-07 — 28/09/2026

- Escopo: ação Corrigir em pt-BR ligada ao rascunho, ao modelo WebGPU real e ao preview existente. Simulação e prova de modelo continuam separadas; nenhum outro tom foi introduzido.
- Arquivos criados: prompt de correção, orçamento por tokenizer, validação inicial de saída, cliente de correção, testes de unidade/sessão, fixture de navegador e [relatório reproduzível](VALIDACAO-STEP-07.md). Arquivos alterados: Worker, WebLLMEngine, protocolo/roteador, menu e sessão de preview, testes anteriores, pacote/lockfile, Manifest, README, NOTICE, checklist e progresso.
- Dependência exata nova: `@mlc-ai/web-tokenizers` 0.1.6, licença Apache 2.0. Projeto/Manifest: 0.6.0. O tokenizer e o template vêm dos artefatos da revisão de modelo já fixada; a conta inclui instruções e reserva de saída no contexto de 4.096 tokens, com recusa de excesso sem truncamento silencioso.
- Segurança e privacidade: rascunho como mensagem de usuário, prompt de sistema separado, somente após clique; texto em memória, sem persistência, log de conteúdo real, envio automático ou mudança de permissões. Resposta vazia, truncada, formatada de modo inadequado ou com âncoras evidentes alteradas não entra no preview. A guarda é inicial e pode rejeitar sugestões válidas; não equivale à proteção abrangente da STEP-08.
- Verificações automatizadas: `npm run check` aprovado com tipos, lint, formatação, 111 testes em 11 arquivos e build. Testes cobrem prompt, orçamento/template, saída vazia/truncada/formato, âncoras, roteamento e snapshot obsoleto.
- Chrome real: pacote 0.6.0 instalado sem compactação em Chrome for Testing 154, GPU Intel `gen-12lp`, variante q4f16_1. Com compositor sintético, `vc consegue me mandar o relatório hj?` produziu `Você consegue me mandar o relatório hoje?` e foi aplicado somente por clique em Substituir; `Não quero cancelar a reunião.` manteve a negação; `mano vc pode ver isso?` preservou a linguagem informal. Os rascunhos de valor/data, URL e comando malicioso receberam recusa conservadora, sem alteração. Campo vazio e excesso de contexto foram recusados; zero erros de página nos roteiros. [Procedimento e resultados](VALIDACAO-STEP-07.md).
- Regressões: prévia simulada apresentou `[Simulação] Rascunho sintético` e cancelou sem edição. A prova sintética da STEP-06 ainda gerou `TESTE.` com rede bloqueada, a partir do cache, sem tocar no rascunho.
- Limite da evidência: a correção real usou fixture instalada no Chrome, sem conta WhatsApp. A substituição no WhatsApp real já havia sido validada na STEP-05. Truncamento da geração foi exercitado em teste automatizado, não forçado na GPU. A variante f32 continua sem segunda GPU física disponível; a guarda semântica completa não foi reivindicada.
- Commit da etapa: `feat(step-07): integrar correção local ao preview`. Hash no histórico Git e no relato final; identidade humana configurada.
- Status final: **Concluída** no escopo da STEP-07, sem validação obrigatória pendente. A próxima etapa é STEP-08, somente por nova solicitação.

## STEP-08 — 29/09/2026

- Escopo: extração e proteção determinística de entidades antes da inferência; restauração e validação antes da prévia. Inclui URLs, e-mails, números, valores, datas, horários, CPF/CNPJ, códigos, menções, hashtags, emojis compostos, nomes e referências temporais detectáveis, com resolução de sobreposição, slots únicos e rejeição de colisões/ocorrências inválidas.
- Guardas: entidades originais exatas e mesma contagem, nenhum slot faltante/duplicado/desconhecido/alterado, nenhuma entidade nova, negações e relações preservadas, pergunta mantida, caracteres válidos, sem artigo inventado antes de entidade. Formato, comprimento, âncoras e término completo da geração seguem obrigatórios. Reprovação não oferece Substituir/Copiar nem modifica o rascunho.
- Arquivos criados: `src/extension/ai/entities.ts`, `tests/entities.test.ts`, `tests/browser/step08-preservation.mjs`, bibliotecas WASM compatíveis e [relatório](VALIDACAO-STEP-08.md). Arquivos alterados: Worker, prompt, adaptador WebLLM, catálogo de modelo, testes de build/navegador, pacote/lockfile, Manifest, avisos de licença, README, checklist da etapa e este progresso. Projeto/Manifest: 0.7.0.
- Compatibilidade: WebLLM 0.2.85 apresentou `Object has already been disposed` na GPU Intel. O [relato oficial da regressão](https://github.com/mlc-ai/web-llm/issues/844) aponta a série 0.2.83+; WebLLM passou a 0.2.82 exato, com duas bibliotecas WASM locais do catálogo `v0_2_80` na revisão oficial fixada. Pesos/modelo seguem na revisão da STEP-06. Hashes e fonte constam no relatório; build confere os binários.
- Verificações automatizadas: `npm run check` aprovado com tipos, lint sem avisos, formatação, 120 testes em 12 arquivos e build. Os novos testes cobrem colisão literal `ENTITY_001`, repetição, sobreposição, URLs com números, CPF/CNPJ, Unicode/emoji composto, múltiplas negações, slots inválidos, relação, interrogação e artigos inventados.
- Chrome real: pacote 0.7.0 instalado sem compactação em Chrome for Testing 154, GPU Intel `gen-12lp`, `shader-f16`, variante f16 do Llama 3.2 3B. Oito casos sintéticos executados na mesma sessão: seis prévias aprovadas, inclusive valor/data, URL, nomes/código e mistura de nome/valor/prazo/URL; duas saídas recusadas, com rascunho intacto e ações indisponíveis. Dois casos aplicaram a sugestão por clique em Substituir. Zero erros de página.
- Regressões reais: rascunho vazio e excesso de contexto recusados, simulação identificada e cancelável, prova da STEP-06 `TESTE.` com rede bloqueada após reinício e modelo em cache; todas com zero erros de página. Não houve envio de mensagem nem dados reais versionados.
- Limites: nomes são detectados por heurística; referências temporais cobrem formas explícitas. A comparação não prova equivalência semântica geral e pode rejeitar correções úteis. Um caso informal foi recusado porque o modelo removeu a interrogação. O fluxo da STEP-08 usou fixture sintética instalada no Chrome; o adaptador e a substituição no WhatsApp real já foram validados na STEP-05. A variante f32 não foi executada em uma segunda GPU física.
- Commit da etapa: `feat(step-08): proteger entidades na correção`. Hash no histórico Git e na resposta de entrega; identidade humana configurada, sem atribuições adicionais.
- Status final: **Concluída** no escopo da STEP-08, sem validação obrigatória pendente. Próxima etapa: STEP-09, somente por nova solicitação.

## STEP-09 — 29/09/2026

- Escopo: registro tipado único das nove ações, com rótulos, descrições, exemplos e instruções próprias; menu completo no editor; seleção do prompt e orçamento pelo modo; identificação do modo no pedido, resultado e prévia. A ação Corrigir mantém seu prompt de ajustes mínimos.
- Proteção: o Worker usa a extração, restauração e validação da STEP-08 para todas as ações. Respostas de outro modo são descartadas pelo roteador e pelo cliente. As recusas não oferecem Copiar/Substituir e preservam o rascunho.
- Arquivos principais: `src/shared/actions.ts`, prompts e Worker, protocolo/roteador, cliente de ações, sessão/menu, adaptador do WhatsApp, testes e [relatório](VALIDACAO-STEP-09.md). Projeto/Manifest: 0.8.0, sem novas dependências.
- Verificação automatizada: `npm.cmd run check` aprovado com tipos, lint, formatação, 128 testes em 13 arquivos e build. Casos novos cobrem registro/prompt, vínculo de modo, preservação, atualização transitória de status e controles do rodapé.
- WhatsApp real: Chrome for Testing 154, grupo **Teste Extensão** confirmado no cabeçalho antes de usar rascunhos sintéticos, GPU Intel `gen-12lp` e modelo q4f16_1 no Worker. Rodada final: nove prévias para as nove ações, Formal e Profissional distintos no mesmo rascunho, duas recusas seguras por perda de conteúdo ou prazo, zero erros de página. Nenhuma mensagem enviada; rascunhos de teste limpos.
- Ajuste real: mutações transitórias do status do grupo e de controles do rodapé não invalidam uma prévia enquanto o editor e o título permanecem. Mudança no campo, editor ou título continua invalidando. Oscilações que ocorreram durante o desenvolvimento não reapareceram na rodada final.
- Limite: a validação determinística não prova equivalência semântica geral e pode recusar saídas úteis. Uma pergunta em Melhorar foi recusada porque o modelo omitiu a interrogação. A variante f32 não foi executada em segunda GPU física.
- Commit da etapa: `feat(step-09): adicionar nove modos de escrita`. Hash no histórico Git e na resposta de entrega; identidade humana configurada.
- Status final: **Concluída** no escopo da STEP-09, sem validação obrigatória pendente. Próxima etapa: STEP-10, somente por nova solicitação.

## STEP-10 — 29/09/2026

- Escopo: streaming real das nove ações no WebLLM, trechos provisórios restaurados e limitados a dez atualizações por segundo, fases Gerando/Validando e ações Copiar/Substituir liberadas somente após conclusão e validação. O modo, pedido, origem e revisão acompanham cada evento.
- Segurança do texto: marcadores completos, divididos ou desconhecidos ficam ocultos até poderem ser restaurados. Trechos provisórios nunca são aplicáveis. Cancelar, editar o rascunho, trocar de contexto ou perder a conexão descartam o buffer visual e eventos posteriores.
- Cancelamento: interface envia o comando ao roteador e ao Worker; o runtime interrompe e drena o fluxo para liberar o bloqueio interno antes de confirmar. Se não houver confirmação em dois segundos, a desconexão reinicia o Worker. Um pedido novo não herda fragmentos do anterior.
- Arquivos principais: `src/extension/ai/streaming-preview.ts`, WebLLM/Worker, protocolo/roteador, cliente/sessão/painel, testes de corrida e [relatório](VALIDACAO-STEP-10.md). Projeto/Manifest: 0.9.0, sem novas dependências.
- Verificação automatizada: `npm.cmd run check` aprovado com tipos, lint, formatação, 134 testes em 15 arquivos e build. Os casos novos cobrem placeholders divididos, cancelamento com confirmação e timeout, vínculos de modo/revisão/aba e fragmentos tardios.
- Chrome/WebGPU real: extensão instalada na página sintética. A rodada final observou 15 atualizações provisórias, sem `ENTITY` exposto e sem Copiar/Substituir antes da aprovação. Cancelar preservou o rascunho; o pedido seguinte concluiu sem recarregar a GPU. Uma edição durante outro pedido invalidou a geração; zero erros de página e nenhum envio de mensagem.
- Limite: teste de streaming no Chrome usou fixture sintética. O editor e os nove modos no WhatsApp real já foram validados na STEP-09. A variante sem `shader-f16` não foi executada em segunda GPU física.
- Commit da etapa: `feat(step-10): exibir geração progressiva e cancelamento`. Hash no histórico Git e na resposta de entrega; identidade humana configurada.
- Status final: **Concluída** no escopo da STEP-10, sem validação obrigatória pendente. Próxima etapa: STEP-11, somente por nova solicitação.

## STEP-11 — 29/09/2026

- Escopo: preferência versionada `semanticReview` com padrão `false` em Chrome Storage local, controle no menu e leitura autoritativa pelo coordenador a cada ação. Se ligada, reescrita e revisão usam o mesmo WebLLM sequencialmente e a prévia só é liberada depois da validação determinística e de um veredicto semântico válido e favorável.
- Contrato: JSON fechado com `valid`, `meaningPreserved`, `issues` e, quando presentes, `entitiesPreserved` e `confidence`. Contradições, formato inválido, ausência, erro, cancelamento ou reprovação bloqueiam a sugestão. `entitiesPreserved` não sobrepõe as guardas determinísticas; `confidence` não é usado como garantia. O modelo recebe original e sugestão restaurada como dados, sem reter conversa entre gerações.
- Arquivos principais: `src/shared/preferences.ts`, cliente e serviço de preferência, `src/extension/ai/semantic-review.ts`, validação/Worker/WebLLM, menu/roteador/protocolo, testes e [relatório](VALIDACAO-STEP-11.md). Projeto/Manifest: 0.10.0, sem novas dependências.
- Verificação automatizada: `npm.cmd run check` aprovado com tipos, lint, formatação, 143 testes em 17 arquivos e build. Os testes cobrem preferência, ordem das guardas, ausência da segunda geração quando desligada, respostas válidas/inválidas, erro, cancelamento, fatos, pergunta, negações e troca de papéis com mesmas entidades.
- Modelo real: Chrome for Testing 154 com WebGPU Intel `gen-12lp`, variante q4f16_1. Rodada final: seis veredictos sintéticos esperados, cinco recusas e uma aprovação. A primeira versão do prompt deixou passar pergunta/afirmação e troca de papéis; a segunda recusou também uma correção segura. A versão final ainda deu justificativas erradas para mudança numérica e inclusão de negação, embora tenha recusado ambas. Essas falhas constam no relatório; não há promessa de precisão geral.
- Extensão instalada: opção começou desligada, evitou segunda revisão, persistiu após reabrir o menu e, quando ligada, mostrou Revisando significado antes da prévia. Copiar/Substituir permaneceram indisponíveis até aprovação. Cancelar durante a revisão preservou o rascunho; zero erros de página e nenhuma mensagem enviada. Testes em compositor sintético, sem abrir conversa.
- Limite: a revisão por LLM pode aprovar mudanças desconhecidas ou recusar texto válido; a validação determinística permanece obrigatória. A variante sem `shader-f16` não foi executada em segunda GPU física.
- Commit da etapa: `feat(step-11): adicionar revisão semântica opcional`. Hash no histórico Git e na resposta de entrega; identidade humana configurada.
- Status final: **Concluída** no escopo da STEP-11, sem validação obrigatória pendente. Próxima etapa: STEP-12, somente por nova solicitação.

## STEP-12 — 30/09/2026

- Escopo: catálogo local de Llama 3.2 3B, Qwen3 4B e Qwen3 8B, perfis Econômico (padrão), Equilibrado e Qualidade, duas variantes por modelo, seis bibliotecas WASM empacotadas e pesos fixados por revisão. Contexto de 4.096 tokens, bytes de download e estimativas de GPU apresentados separadamente, com licenças incluídas.
- Hardware: adapter WebGPU, `shader-f16` e limites de buffer reais. Sem `shader-f16`, seleciona q4f32_1 e informa a exigência maior antes do download. VRAM livre aparece indisponível, sem usar RAM do sistema. Falha de recursos mantém a escolha e sugere perfil menor, sem baixar outro modelo.
- Qwen: `extra_body.enable_thinking: false` conforme WebLLM 0.2.82, template/tokenizer compatíveis e orçamento que inclui o prefixo vazio do modo. Esse prefixo é removido antes da apresentação; raciocínio não vazio ou incompleto falha fechado.
- Download: somente por confirmação quando faltam artefatos. Uma falha real de `Cache.add` em respostas válidas da CDN foi resolvida com download sequencial por `fetch`/`Cache.put`, nomes fixos, tamanho dos shards validado, cache parcial reaproveitado e tentativas limitadas. Gestão completa do cache permanece na STEP-13.
- Troca: pedido atual cancelado explicitamente, Worker anterior encerrado antes da próxima instância, eventos tardios descartados. Preferências sincronizadas entre menus abertos; confirmação de download vinculada ao perfil esperado, recusada se a escolha mudou. Migração do esquema v1 para v2 preserva a revisão semântica; gravações concorrentes preservam os dois campos.
- Arquivos principais: catálogo/bibliotecas/cache/hardware, runtime/token budget, preferências/protocolo/roteador, clientes/menu/sessão, quatro novos WASM, licença Qwen, testes e [relatório com matriz](VALIDACAO-STEP-12.md). Projeto/Manifest: 0.11.0, dependências mantidas e travadas.
- Verificação automatizada: `npm.cmd run check` aprovado com tipos, lint, formatação, 151 testes em 18 arquivos e build completo. Hashes das seis bibliotecas conferidos; content script abaixo de 1 MB, sem embutir WASM.
- Chrome/WebGPU real: três variantes q4f16_1 carregadas no Chrome for Testing 154, com prova sintética e prévia de Corrigir aprovadas, zero erros de página. Qwen3 8B completou 4,62 GB de dados após confirmação. Retorno ao Econômico reutilizou cache. Em duas abas sintéticas, troca durante streaming real cancelou o pedido, preservou o rascunho, destruiu o Worker anterior e produziu nova prova com um único Worker diferente. Na rodada inicial com fixtures, nenhuma conversa aberta ou mensagem enviada.
- Complemento solicitado em 30/09/2026: WhatsApp real no grupo **Teste Extensão**, autorizado explicitamente para envio. Quatorze pedidos nos três perfis e nas nove ações: duas alterações úteis, seis recusas com original intacto, três respostas iguais e três prévias insatisfatórias rejeitadas manualmente. Duas substituições conferidas e uma mensagem sintética identificada enviada por Enter manual. Qwen4/8 baixados e carregados nesse perfil; zero erros de página. Uma duplicação causada pela escrita do roteiro de teste foi barrada antes do envio e corrigida; a substituição da extensão estava correta. Campo limpo, Econômico restaurado, revisão semântica desligada e nenhum texto real ou de teste versionado. Relatório atualizado e `npm.cmd run check` novamente aprovado com 151 testes. Complemento em commit documental próprio; sem alteração do produto nem início da STEP-13.
- Limites: GPU disponível oferece `shader-f16`; variantes f32 foram conferidas por seleção/testes/artefatos, sem inferência física em segunda GPU. Falha física de memória também não foi reproduzida. A compatibilidade efetivamente observada e esses limites constam na matriz; não se exige Qualidade em todo equipamento nem se promete precisão geral dos modelos.
- Commit da etapa: `feat(step-12): adicionar modelos e perfis de hardware`. Hash no histórico Git e na resposta de entrega; identidade humana configurada.
- Status final: **Concluída** no escopo da STEP-12. Próxima etapa: STEP-13, somente por nova solicitação.

## Como continuar

As STEP-01 a STEP-12 estão concluídas. Consulte os relatórios da [comunicação](VALIDACAO-STEP-03.md), do [editor](VALIDACAO-STEP-04.md), da [prévia](VALIDACAO-STEP-05.md), da [inferência local](VALIDACAO-STEP-06.md), da [correção](VALIDACAO-STEP-07.md), da [proteção determinística](VALIDACAO-STEP-08.md), dos [nove modos](VALIDACAO-STEP-09.md), do [streaming](VALIDACAO-STEP-10.md), da [revisão semântica](VALIDACAO-STEP-11.md) e dos [perfis](VALIDACAO-STEP-12.md). Para continuar, solicitar **Execute somente a STEP-13 do plano.** A STEP-13 não foi iniciada.

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
