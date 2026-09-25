# Extensão de IA local para WhatsApp Web

Base incremental com React, TypeScript strict e pacote Manifest V3. Na **STEP-03**, a extensão oferece um diagnóstico de comunicação com **motor simulado**. Não executa IA, não lê conversas ou rascunhos e não altera ou envia mensagens.

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
| src/extension/content    | Cliente isolado no frame principal do WhatsApp; executa somente a fixture solicitada pelo diagnóstico.  |
| src/extension/diagnostic | Página auxiliar aberta pelo ícone da extensão. Não é o popup de configurações nem o preview do produto. |
| src/shared               | Contratos, validação dos payloads/remetentes e fixture sintética.                                       |
| src/development          | Página React auxiliar da STEP-02, preservada.                                                           |
| tests                    | Contratos, remetentes, roteamento, cancelamento, recuperação, simulador e pacote gerado.                |

Editor começa na STEP-04; menu/preview na STEP-05; WebLLM na STEP-06. Modelos, preservação semântica, preferências, popup e painel continuam nas etapas previstas. Não há implementações vazias desses módulos.

## Protocolo e ciclo de vida

O diagnóstico solicita ao coordenador um teste em uma aba permitida. O coordenador encaminha a fixture ao content script; este inicia um pedido por uma conexão própria. A resposta faz o caminho Worker → offscreen → coordenador → content script. Só então o content script devolve o relatório ao diagnóstico. A página não pode substituir o texto sintético por dados arbitrários.

Uniões discriminadas e validação em tempo de execução cobrem start, cancel, status, progress, fragment, result, cancelled, error e rejected. A ação corrigir é apenas um identificador reservado: o motor devolve o texto sem corrigi-lo. Payloads têm campos fechados, IDs limitados e texto de até 8.000 unidades UTF-16; o limite por tokenizer pertence à STEP-07.

Cada pedido carrega requestId, editorId, snapshotId e revisão. O coordenador acrescenta aba, frame, documento e conexão com base no remetente do Chrome. O simulador utiliza editor fictício e snapshot sintético, sem inspecionar o WhatsApp. Respostas só são aceitas quando todos os campos do vínculo conferem.

Há um pedido ativo por vez, inclusive durante a preparação do motor. Pedidos concorrentes recebem **IA ocupada**, sem fila. Cancelar descarta resultados em trânsito; o Worker confirma após eliminar seus timers. Desconexão do solicitante encerra o Worker. Timeouts limitam a espera de prontidão a cinco segundos e o pedido a quinze segundos, sem replay.

A criação do offscreen é compartilhada entre chamadas concorrentes. runtime.getContexts verifica o documento existente e WORKERS justifica sua criação. O coordenador espera confirmação do Worker antes de encaminhar texto. Não há reconexão periódica nem keepalive artificial: uma nova ação explícita cria uma sessão limpa e pode reutilizar o documento offscreen sobrevivente. Pedidos interrompidos não são retomados.

## Permissões e privacidade

- offscreen hospeda o Worker; storage está declarado conforme o plano, mas não é usado ainda.
- Host e content script restritos a https://web.whatsapp.com/*. A permissão de host permite listar/verificar essas abas no diagnóstico, sem conceder a permissão global tabs.
- Não há activeTab, scripting, <all_urls>, externally_connectable, APIs internas do WhatsApp, interceptação de tráfego ou ponte com scripts da página.
- CSP permite scripts/workers locais e WASM empacotado, sem eval ou código remoto. connect-src 'none' bloqueia conexões externas das páginas da extensão. Downloads de modelos exigirão revisão na STEP-06.
- Não há storage, logs de conteúdo ou persistência de pedidos. O relatório sintético permanece em memória até a página fechar.
- Nenhum script desta versão lê o editor, modifica rascunhos ou envia mensagens. A validação do rascunho atualizado será implementada com o adaptador nas etapas seguintes.

## Build e verificações

Vite gera as páginas HTML, o Service Worker ES module e o Worker local. Uma compilação IIFE separada incorpora o content script em arquivo clássico, sem imports ESM. O Manifest é copiado explicitamente; não há diretório public genérico. A saída contém caminhos relativos, JavaScript/CSS locais e avisos de licença em dist/.vite/license.md.

Variáveis de ambiente não são incorporadas automaticamente. Não coloque segredos nas fontes ou no Manifest. O alvo de sintaxe é chrome116. Após editar, gere dist novamente, recarregue a extensão e as abas do WhatsApp.

Os testes conferem remetentes, campos extras, limites, vínculos divergentes, concorrência, cancelamento, descarte de eventos atrasados, desconexão, timeout, criação única e reconexão. O simulador integrado ao roteador testa eco Unicode/multilinha. O teste de build gera um pacote temporário e verifica Manifest/CSP, contextos locais, sintaxe clássica do content script, ausência de scripts inline, código de desenvolvimento e valores sintéticos de ambiente. A limpeza confirma caminho e prefixo antes de remover o diretório temporário.

Esses testes não certificam a execução das APIs do Chrome. Consulte o progresso para distinguir testes automatizados de evidência real. Inferência em GPU e auditoria completa de privacidade pertencem às etapas futuras.

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

Versões diretas são exatas e transitivas ficam em package-lock.json. Use npm ci, sem --force ou --legacy-peer-deps. TypeScript 6.0.3 foi mantido porque typescript-eslint 8.70.1 requer versão menor que 6.1.0. Tipos do Chrome não substituem a conferência da versão mínima de cada API.

## Referências técnicas

- [Chrome Offscreen: WORKERS, documento único e runtime](https://developer.chrome.com/docs/extensions/reference/api/offscreen).
- [Mensagens e conexões](https://developer.chrome.com/docs/extensions/develop/concepts/messaging). Listeners usam return true com sendResponse, compatível com Chrome 116, sem exigir suporte recente a retorno de Promise.
- [Chrome Tabs e permissões de host](https://developer.chrome.com/docs/extensions/reference/api/tabs).
- [Ciclo de vida do Service Worker](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle).
- [CSP de extensões](https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy).
- [Vite: build](https://vite.dev/guide/build.html), [Vitest](https://vitest.dev/guide/), [ESLint](https://eslint.org/docs/latest/use/getting-started) e [compatibilidade do typescript-eslint](https://typescript-eslint.io/users/dependency-versions/).

## Entrega por etapa

Cada etapa entrega seu escopo completo, com verificações e commit próprio após a validação. Usar Conventional Commits e a identidade humana já configurada no Git. Ver [AGENTS.md](AGENTS.md). A STEP-04 só pode começar após a conclusão registrada da STEP-03 e nova solicitação do usuário.
