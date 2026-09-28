# Extensão de IA local para WhatsApp Web

Base incremental com React, TypeScript strict e pacote Manifest V3. Na **STEP-05**, o botão **IA** abre um menu e uma prévia junto ao editor do WhatsApp. O **motor simulado** apenas acrescenta “[Simulação]” ao texto: não há correção por IA. A prévia oferece Substituir, Copiar e Cancelar; nenhuma mensagem é enviada pela extensão. O diagnóstico da STEP-03 continua disponível.

O estado e as evidências ficam em [docs/PROGRESSO.md](docs/PROGRESSO.md). Consulte o [plano](docs/PLANO.md) e execute somente a etapa solicitada. A conclusão depende das verificações automatizadas e da validação correspondente no Chrome.

## Requisitos e instalação

- Node.js 22.13+ na linha 22, ou versão compatível das linhas 24/26+; npm 10.9.2+ compatível com o Node instalado.
- Ambiente usado: Windows, Node 22.14.0 e npm 10.9.2. Nenhuma atualização global é necessária.
- Chrome 116+ para runtime.getContexts, offscreen e identificação de documentos. O mínimo declarado é um requisito das APIs, não certificação de todas as versões ou de WebGPU.
- Internet somente para instalar as dependências de desenvolvimento nesta etapa. Nenhum modelo é baixado.

Na pasta do projeto:

```sh
npm ci
npm run check
```

No PowerShell, use npm.cmd se a política local bloquear npm.ps1; não altere a política do sistema.

Abra chrome://extensions, habilite o modo do desenvolvedor, escolha **Carregar sem compactação** e selecione a pasta **dist**. Recarregue as abas do WhatsApp após instalar ou atualizar. O ícone da extensão abre o diagnóstico.

Siga o [roteiro completo da STEP-03](docs/VALIDACAO-STEP-03.md), que cobre circuito, duas abas, concorrência, cancelamento, desconexão e reinício. Não é necessário abrir conversas ou enviar mensagens.

Para testar a escrita, consulte [validação e limites da STEP-05](docs/VALIDACAO-STEP-05.md). Escreva um rascunho sintético, clique em **IA → Criar prévia simulada** e revise o resultado. Abrir o menu não lê o texto; solicitar a prévia o captura em memória e o encaminha ao Worker local. **Substituir** confirma a edição nativa, que pode ser desfeita com Ctrl+Z. **Copiar** grava a sugestão na área de transferência somente pelo clique. **Cancelar**, Escape e clique fora descartam a prévia; edição ou troca de contexto invalidam sugestões anteriores.

Textos com várias linhas, menções estruturadas, formatação especial e editores sem suporte oferecem **somente cópia**. O teste real encontrou perda de quebras de linha na inserção nativa do WhatsApp; o rascunho multilinha permanece intacto e a cópia preserva suas linhas. Confira menções e formatação ao colar. Nenhuma API interna do site é utilizada para contornar esse limite.

## Comandos

| Comando              | Finalidade                                                                 |
| -------------------- | -------------------------------------------------------------------------- |
| npm run dev          | Servir as páginas auxiliares em http://127.0.0.1:5173.                     |
| npm run typecheck    | Conferir tipos do navegador e das ferramentas sem emitir arquivos.         |
| npm run lint         | Conferir código com informação de tipos, sem aceitar avisos.               |
| npm run format:check | Conferir formatação.                                                       |
| npm run format       | Aplicar formatação.                                                        |
| npm test             | Executar testes, incluindo um build completo temporário.                   |
| npm run test:watch   | Reexecutar testes durante a edição.                                        |
| npm run build        | Conferir tipos e gerar a extensão completa em dist.                        |
| npm run preview      | Servir as páginas construídas em http://127.0.0.1:4173.                    |
| npm run check        | Executar tipos, lint, formatação, testes e build; parar na primeira falha. |

Os servidores escutam apenas no computador local e falham se a porta estiver ocupada. Encerre com Ctrl+C. O preview valida React e estilos; **localhost não executa APIs de extensão**. O diagnóstico nesse endereço informa que precisa ser aberto pela extensão instalada.

## Componentes implementados

| Local                    | Responsabilidade                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------- |
| manifest.json            | MV3, permissões, CSP e entradas do pacote.                                                              |
| src/extension/background | Coordenador, remetentes, roteador e criação idempotente do offscreen.                                   |
| src/extension/offscreen  | Hospedagem de um Worker; comunicação de extensão somente por chrome.runtime.                            |
| src/extension/ai         | Worker e motor de eco explicitamente simulado.                                                          |
| src/extension/content    | Botão, menu/prévia React com Shadow DOM, sessão em memória e clientes de comunicação.                   |
| src/integration/whatsapp | Seletores, detecção, leitura de blocos, revisão e substituição nativa do editor.                        |
| src/extension/diagnostic | Página auxiliar aberta pelo ícone da extensão. Não é o popup de configurações nem o preview do produto. |
| src/shared               | Contratos, validação dos payloads/remetentes e fixture sintética.                                       |
| src/development          | Página React auxiliar da STEP-02, preservada.                                                           |
| tests                    | Contratos, remetentes, roteamento, cancelamento, recuperação, simulador, pacote e fixtures do editor.   |

WebLLM entra na STEP-06. Modelos, preservação semântica, preferências, popup e painel continuam nas etapas previstas. Não há implementações vazias desses módulos.

## Detecção e revisão do editor

O adaptador procura um único textbox contenteditable visível no footer de #main. Recusa campos de busca, diálogo, ocultos, desativados, somente leitura e seleções ambíguas. Os seletores ficam centralizados e não dependem de classes ofuscadas, idioma ou placeholder. Uma mudança estrutural do WhatsApp pode exigir atualização do adaptador; na ausência de um editor reconhecido, o botão desaparece.

MutationObserver acompanha o compositor e o cabeçalho, além dos filhos diretos dos ancestrais. Não observa profundamente body nem o histórico. Uma descoberta estrutural a cada segundo cobre contêineres novos e mudanças externas de CSS; atualizações são agrupadas por frame. O host da extensão é ignorado e o Shadow DOM isola os estilos. ResizeObserver e eventos de scroll/resize atualizam a posição; os listeners, observadores e timers são encerrados ao sair da página. O retorno pelo cache de navegação remonta a integração.

Capturas têm UUIDs aleatórios e revisão, sem identidade de contato. Edição, composição IME, substituição do campo e mudanças no cabeçalho invalidam a revisão, inclusive quando o texto permanece igual. Não se lê o conteúdo do cabeçalho: até mudanças de presença podem invalidar conservadoramente uma captura. A conferência drena mutações pendentes antes de decidir se ela ainda é atual. Cliques sintéticos disparados pela página são ignorados.

Copiar e Substituir conferem novamente o texto, documento, editor e revisão capturados. A substituição aguarda a restauração de foco/seleção do editor controlado, limita a seleção ao campo e usa execCommand('insertText') exclusivamente no adaptador. O resultado é conferido antes e depois da reconciliação da página. Uma inserção incorreta pode ser desfeita sincronamente pela própria transação; não há segunda tentativa automática nem rollback tardio que possa apagar uma edição posterior. Uma falha não confirmada orienta a conferir o rascunho. A API é obsoleta e o suporte foi validado no Chrome indicado no relatório, sem garantia para versões futuras.

## Protocolo e ciclo de vida

O diagnóstico solicita ao coordenador um teste em uma aba permitida. O coordenador encaminha a fixture ao content script; este inicia um pedido por uma conexão própria. A resposta faz o caminho Worker → offscreen → coordenador → content script. Só então o content script devolve o relatório ao diagnóstico. A página não pode substituir o texto sintético por dados arbitrários.

Uniões discriminadas e validação em tempo de execução cobrem start, cancel, status, progress, fragment, result, cancelled, error e rejected. A ação corrigir é apenas um identificador reservado: o motor devolve o texto sem corrigi-lo. Payloads têm campos fechados, IDs limitados e texto de até 8.000 unidades UTF-16; o limite por tokenizer pertence à STEP-07.

Cada pedido carrega requestId, editorId, snapshotId e revisão. O coordenador acrescenta aba, frame, documento e conexão com base no remetente do Chrome. O diagnóstico usa identidades fictícias; a prévia usa o snapshot real solicitado explicitamente. Respostas só são aceitas quando todos os campos do vínculo conferem. O cliente da prévia também fixa o vínculo recebido e descarta eventos divergentes ou posteriores ao cancelamento.

Há um pedido ativo por vez, inclusive durante a preparação do motor. Pedidos concorrentes recebem **IA ocupada**, sem fila. Cancelar descarta resultados em trânsito; o Worker confirma após eliminar seus timers. Desconexão do solicitante encerra o Worker. Timeouts limitam a espera de prontidão a cinco segundos e o pedido a quinze segundos, sem replay.

A criação do offscreen é compartilhada entre chamadas concorrentes. runtime.getContexts verifica o documento existente e WORKERS justifica sua criação. O coordenador espera confirmação do Worker antes de encaminhar texto. Não há reconexão periódica nem keepalive artificial: uma nova ação explícita cria uma sessão limpa e pode reutilizar o documento offscreen sobrevivente. Pedidos interrompidos não são retomados.

## Permissões e privacidade

- offscreen hospeda o Worker; storage está declarado conforme o plano, mas não é usado ainda.
- Host e content script restritos a https://web.whatsapp.com/*. A permissão de host permite listar/verificar essas abas no diagnóstico, sem conceder a permissão global tabs.
- Não há activeTab, scripting, <all_urls>, externally_connectable, APIs internas do WhatsApp, interceptação de tráfego ou ponte com scripts da página.
- CSP permite scripts/workers locais e WASM empacotado, sem eval ou código remoto. connect-src 'none' bloqueia conexões externas das páginas da extensão. Downloads de modelos exigirão revisão na STEP-06.
- Não há storage, logs de conteúdo ou persistência de pedidos. O relatório sintético permanece em memória até a página fechar.
- O rascunho só é lido ao solicitar a prévia e conferir uma ação explícita de cópia/substituição (inclusive ativação por teclado). Detecção, observadores e consulta de revisão não leem o texto. A captura e a resposta permanecem em memória até serem descartadas, sem leitura de histórico/contatos. A extensão só altera o rascunho após Substituir e nunca o envia.
- Copiar usa a área de transferência do sistema por escolha explícita. Não há leitura dela pelo produto nem nova permissão de extensão. O sistema operacional e outros aplicativos podem acessar o texto copiado conforme suas próprias configurações.

## Build e verificações

Vite gera as páginas HTML, o Service Worker ES module e o Worker local. Uma compilação IIFE separada incorpora o content script em arquivo clássico, sem imports ESM. O Manifest é copiado explicitamente; não há diretório public genérico. A saída contém caminhos relativos, JavaScript/CSS locais e avisos de licença em dist/.vite/license.md.

Variáveis de ambiente não são incorporadas automaticamente; o bundle do content script fixa apenas o modo de produção do React, sem depender de process no navegador. Não coloque segredos nas fontes ou no Manifest. O alvo de sintaxe é chrome116. Após editar, gere dist novamente, recarregue a extensão e as abas do WhatsApp.

Os testes conferem remetentes, campos extras, limites, vínculos divergentes, concorrência, cancelamento, descarte de eventos atrasados, desconexão, timeout, criação única e reconexão. O simulador integrado ao roteador testa eco Unicode/multilinha. O teste de build gera um pacote temporário e verifica Manifest/CSP, contextos locais, sintaxe clássica do content script, ausência de scripts inline, código de desenvolvimento e valores sintéticos de ambiente. A limpeza confirma caminho e prefixo antes de remover o diretório temporário.

Esses testes não certificam a execução das APIs do Chrome. Consulte o progresso para distinguir testes automatizados de evidência real. Inferência em GPU e auditoria completa de privacidade pertencem às etapas futuras.

A STEP-05 acrescenta testes de captura explícita, leitura de parágrafos/linhas vazias, estruturas somente para cópia, seleção, desfazer, cancelamento durante a substituição, falhas de cópia e descarte de resultados obsoletos. O relatório registra também execução do pacote instalado no Chrome e aplicação/desfazer no WhatsApp real.

## Versões travadas

| Ferramenta                      | Versão           |
| ------------------------------- | ---------------- |
| React / React DOM               | 19.3.0           |
| TypeScript                      | 6.0.3            |
| Vite / plugin React             | 8.3.1 / 6.1.1    |
| Vitest                          | 5.0.1            |
| ESLint / @eslint/js             | 10.11.0 / 10.0.1 |
| typescript-eslint               | 8.70.1           |
| Prettier                        | 3.9.9            |
| @types/node                     | 22.20.4          |
| @types/react / @types/react-dom | 19.3.0           |
| @types/chrome                   | 0.3.0            |
| jsdom (somente testes)          | 29.1.1           |

Versões diretas são exatas e transitivas ficam em package-lock.json. Use npm ci, sem --force ou --legacy-peer-deps. TypeScript 6.0.3 foi mantido porque typescript-eslint 8.70.1 requer versão menor que 6.1.0. jsdom 29.1.1 aceita Node 22.13+, enquanto a linha 30 consultada exige Node 22.22.2+; o ambiente permanece em 22.14.0. Tipos do Chrome não substituem a conferência da versão mínima de cada API.

## Referências técnicas

- [Chrome Offscreen: WORKERS, documento único e runtime](https://developer.chrome.com/docs/extensions/reference/api/offscreen).
- [Mensagens e conexões](https://developer.chrome.com/docs/extensions/develop/concepts/messaging). Listeners usam return true com sendResponse, compatível com Chrome 116, sem exigir suporte recente a retorno de Promise.
- [Chrome Tabs e permissões de host](https://developer.chrome.com/docs/extensions/reference/api/tabs).
- [Ciclo de vida do Service Worker](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle).
- [CSP de extensões](https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy).
- [Content scripts e isolamento](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts).
- [MDN: execCommand, limitações e histórico de edição](https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand).
- [jsdom e versões do Node](https://github.com/jsdom/jsdom/releases).
- [Vite: build](https://vite.dev/guide/build.html), [Vitest](https://vitest.dev/guide/), [ESLint](https://eslint.org/docs/latest/use/getting-started) e [compatibilidade do typescript-eslint](https://typescript-eslint.io/users/dependency-versions/).

## Entrega por etapa

Cada etapa entrega seu escopo completo, com verificações e commit próprio após a validação. Usar Conventional Commits e a identidade humana já configurada no Git. Ver [AGENTS.md](AGENTS.md) e o estado atual em [PROGRESSO.md](docs/PROGRESSO.md). Não iniciar automaticamente a próxima etapa.
