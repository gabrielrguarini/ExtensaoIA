# Extensão de IA local para WhatsApp Web

Base incremental com React, TypeScript strict e pacote Manifest V3. Na **STEP-12**, o menu **IA** oferece nove ações de escrita com os perfis Econômico (Llama 3.2 3B), Equilibrado (Qwen3 4B) e Qualidade (Qwen3 8B) no Worker via WebGPU, além de revisão semântica opcional. A geração mostra trechos provisórios e pode ser cancelada. Todas as ações protegem entidades do rascunho e validam o resultado antes de liberar Copiar ou Substituir. A prova sintética da STEP-06 e a prévia simulada da STEP-05 continuam disponíveis e identificadas. Nenhuma mensagem é enviada pela extensão. O diagnóstico da STEP-03 continua disponível.

O estado e as evidências ficam em [docs/PROGRESSO.md](docs/PROGRESSO.md). Consulte o [plano](docs/PLANO.md) e execute somente a etapa solicitada. A conclusão depende das verificações automatizadas e da validação correspondente no Chrome.

## Requisitos e instalação

- Node.js 22.13+ na linha 22, ou versão compatível das linhas 24/26+; npm 10.9.2+ compatível com o Node instalado.
- Ambiente usado: Windows, Node 22.14.0 e npm 10.9.2. Nenhuma atualização global é necessária.
- Chrome 116+ para runtime.getContexts, offscreen e identificação de documentos. O mínimo declarado é um requisito das APIs, não certificação de todas as versões ou de WebGPU.
- Internet para instalar dependências e, por ação explícita, baixar os dados do modelo de uma revisão fixa. Após o download completo, a inferência pode usar o cache local.

Na pasta do projeto:

```sh
npm ci
npm run check
```

No PowerShell, use npm.cmd se a política local bloquear npm.ps1; não altere a política do sistema.

Abra chrome://extensions, habilite o modo do desenvolvedor, escolha **Carregar sem compactação** e selecione a pasta **dist**. Recarregue as abas do WhatsApp após instalar ou atualizar. O ícone da extensão abre o diagnóstico.

Siga o [roteiro completo da STEP-03](docs/VALIDACAO-STEP-03.md), que cobre circuito, duas abas, concorrência, cancelamento, desconexão e reinício. Não é necessário abrir conversas ou enviar mensagens.

Para testar a escrita, consulte [validação e limites da STEP-05](docs/VALIDACAO-STEP-05.md). Escreva um rascunho sintético, clique em **IA → Criar prévia simulada** e revise o resultado. Abrir o menu não lê o texto; solicitar a prévia o captura em memória e o encaminha ao Worker local. **Substituir** confirma a edição nativa, que pode ser desfeita com Ctrl+Z. **Copiar** grava a sugestão na área de transferência somente pelo clique. **Cancelar**, Escape e clique fora descartam a prévia; edição ou troca de contexto invalidam sugestões anteriores.

Para usar o modelo, escreva um rascunho e clique em **IA**. Escolha **Corrigir**, **Melhorar**, **Formal**, **Profissional**, **Amigável**, **Natural**, **Conciso**, **Engraçado** ou **Reescrever**. Corrigir faz ajustes mínimos; Formal adapta gírias e usa linguagem mais formal; Profissional é objetivo e educado; Conciso remove redundâncias; Engraçado só acrescenta leveza quando o assunto permite. As outras ações seguem os rótulos e exemplos do menu. Se faltarem pesos no cache, confirme o download antes da geração. O painel separa o tamanho conhecido dos dados (1,82 GB, 2,27 GB ou 4,62 GB), o contexto de 4.096 tokens e a estimativa de memória de GPU. O rascunho é enviado somente ao Worker local e tratado como dado a editar, sem ler a conversa. Durante a geração aparecem trechos provisórios com entidades restauradas; eles não podem ser aplicados ou copiados pelo menu. **Cancelar** interrompe o pedido. Após **Validando resposta**, a opção **Revisão semântica adicional** pode executar uma segunda análise no mesmo modelo, em sequência. Ela começa desligada e pode ser ativada no menu; o estado **Revisando significado** não libera Copiar ou Substituir. Falha, cancelamento, resposta inválida ou reprovação dessa análise bloqueiam a sugestão. Em todas as ações, a extensão protege URLs, e-mails, números, valores, datas, horários, documentos, códigos, menções, hashtags, emojis e nomes/referências temporais detectáveis com identificadores temporários; restaura os valores exatos e confere as ocorrências, negações e relações antes de liberar a prévia. Saídas vazias, truncadas ou suspeitas são recusadas, sem mudar o rascunho. A detecção de nomes é heurística; nem as guardas nem o verificador local provam equivalência semântica geral. Revise cada sugestão aceita. Consulte [a validação da STEP-09](docs/VALIDACAO-STEP-09.md), [a prova de streaming da STEP-10](docs/VALIDACAO-STEP-10.md) e [a avaliação da STEP-11](docs/VALIDACAO-STEP-11.md).

Os perfis usam variantes q4f16_1 com `shader-f16` e q4f32_1 sem esse recurso. A variante f32 pede mais memória; o navegador informa limites de buffer, mas não a VRAM livre. A troca cancela pedidos ativos e libera o modelo anterior. Uma falha de recursos mantém a escolha e indica um perfil menor. Os pesos vêm apenas das revisões fixadas do Hugging Face; os seis WASM compatíveis com WebLLM 0.2.82 já estão no pacote.

Para conferir a inferência, clique em **IA → Testar IA local**. Se o perfil escolhido ainda não estiver no cache, use **Baixar e continuar** após revisar o tamanho e a variante. O teste usa somente a frase sintética fixa; o resultado aparece separado da prévia e não oferece Substituir ou Copiar. O download aceita apenas `huggingface.co` e o redirecionamento observado `us.aws.cdn.hf.co`, sem JavaScript remoto. As bibliotecas WASM já estão no pacote. Se o redirecionamento mudar para outra origem, o download falhará de forma segura até que a configuração seja revista. Consulte [a matriz, os artefatos e a prova real dos perfis](docs/VALIDACAO-STEP-12.md).

Textos com várias linhas, menções estruturadas, formatação especial e editores sem suporte oferecem **somente cópia**. O teste real encontrou perda de quebras de linha na inserção nativa do WhatsApp; o rascunho multilinha permanece intacto e a cópia preserva suas linhas. Confira menções e formatação ao colar. Nenhuma API interna do site é utilizada para contornar esse limite.

## Comandos

| Comando                                    | Finalidade                                                                         |
| ------------------------------------------ | ---------------------------------------------------------------------------------- |
| npm run dev                                | Servir as páginas auxiliares em http://127.0.0.1:5173.                             |
| npm run typecheck                          | Conferir tipos do navegador e das ferramentas sem emitir arquivos.                 |
| npm run lint                               | Conferir código com informação de tipos, sem aceitar avisos.                       |
| npm run format:check                       | Conferir formatação.                                                               |
| npm run format                             | Aplicar formatação.                                                                |
| npm test                                   | Executar testes, incluindo um build completo temporário.                           |
| npm run test:step06:browser -- online      | Executar a prova WebGPU em Chrome for Testing; requer `STEP06_CHROME`.             |
| npm run test:step07:browser -- corrections | Exercitar correção real em Chrome com fixture sintética; requer `STEP07_CHROME`.   |
| npm run test:step07:browser -- context     | Conferir vazio e orçamento de contexto no Chrome; requer `STEP07_CHROME`.          |
| npm run test:step07:browser -- regression  | Conferir a prévia simulada no Chrome; requer `STEP07_CHROME`.                      |
| npm run test:step08:browser -- corrections | Exercitar proteção e rejeições seguras no Chrome; requer `STEP08_CHROME`.          |
| npm run test:step08:browser -- context     | Conferir vazio e limite de contexto no Chrome; requer `STEP08_CHROME`.             |
| npm run test:step08:browser -- regression  | Conferir a prévia simulada no Chrome; requer `STEP08_CHROME`.                      |
| npm run test:step09:browser -- fixture     | Exercitar os nove modos em fixture no Chrome; requer `STEP09_CHROME`.              |
| npm run test:step09:browser -- whatsapp    | Exercitar rascunhos sintéticos no grupo de teste autorizado; requer perfil logado. |
| npm run test:step10:browser                | Conferir streaming e cancelamento no Chrome/WebGPU com fixture sintética.          |
| npm run test:step11:browser                | Avaliar o verificador e a preferência no Chrome/WebGPU; requer `STEP11_CHROME`.    |
| npm run test:step12:browser -- qualidade   | Validar o perfil no Chrome/WebGPU com fixture sintética; requer `STEP12_CHROME`.   |
| npm run test:step12:switch                 | Conferir troca durante geração e liberação do Worker; requer os perfis em cache.   |
| npm run test:watch                         | Reexecutar testes durante a edição.                                                |
| npm run build                              | Conferir tipos e gerar a extensão completa em dist.                                |
| npm run preview                            | Servir as páginas construídas em http://127.0.0.1:4173.                            |
| npm run check                              | Executar tipos, lint, formatação, testes e build; parar na primeira falha.         |

Os roteiros de navegador das STEP-06 a STEP-11 reproduzem as versões registradas nos respectivos commits. Para o pacote atual, use os roteiros da STEP-12; os testes automatizados continuam cobrindo as funcionalidades acumuladas.

Os servidores escutam apenas no computador local e falham se a porta estiver ocupada. Encerre com Ctrl+C. O preview valida React e estilos; **localhost não executa APIs de extensão**. O diagnóstico nesse endereço informa que precisa ser aberto pela extensão instalada.

## Componentes implementados

| Local                    | Responsabilidade                                                                                           |
| ------------------------ | ---------------------------------------------------------------------------------------------------------- |
| manifest.json            | MV3, permissões, CSP e entradas do pacote.                                                                 |
| src/extension/background | Coordenador, remetentes, roteador e criação idempotente do offscreen.                                      |
| src/extension/offscreen  | Hospedagem de um Worker; comunicação de extensão somente por chrome.runtime.                               |
| src/extension/ai         | Worker, WebLLM, prompt, orçamento com tokenizer, extração/restauração de entidades, validação e simulador. |
| src/extension/content    | Botão, menu/prévia React com Shadow DOM, sessão em memória e clientes de comunicação.                      |
| src/integration/whatsapp | Seletores, detecção, leitura de blocos, revisão e substituição nativa do editor.                           |
| src/extension/diagnostic | Página auxiliar aberta pelo ícone da extensão. Não é o popup de configurações nem o preview do produto.    |
| src/shared               | Contratos, validação dos payloads/remetentes e fixture sintética.                                          |
| src/development          | Página React auxiliar da STEP-02, preservada.                                                              |
| tests                    | Contratos, remetentes, roteamento, cancelamento, recuperação, simulador, pacote e fixtures do editor.      |

WebLLM 0.2.82 executa a prova sintética, as nove ações e a revisão semântica opcional na mesma instância do perfil selecionado. A versão foi fixada devido à falha de GPU observada com 0.2.85; as bibliotecas WASM locais são compatíveis com o catálogo `v0_2_80`. Configurações completas, popup e painel continuam nas etapas previstas.

## Detecção e revisão do editor

O adaptador procura um único textbox contenteditable visível no footer de #main. Recusa campos de busca, diálogo, ocultos, desativados, somente leitura e seleções ambíguas. Os seletores ficam centralizados e não dependem de classes ofuscadas, idioma ou placeholder. Uma mudança estrutural do WhatsApp pode exigir atualização do adaptador; na ausência de um editor reconhecido, o botão desaparece.

MutationObserver acompanha o campo editável, a estrutura direta do compositor e o título da conversa, além dos filhos diretos dos ancestrais. Mudanças transitórias nos demais controles do rodapé ou no status do grupo não invalidam o rascunho. Não observa profundamente body nem o histórico. Uma descoberta estrutural a cada segundo cobre contêineres novos e mudanças externas de CSS; atualizações são agrupadas por frame. O host da extensão é ignorado e o Shadow DOM isola os estilos. ResizeObserver e eventos de scroll/resize atualizam a posição; os listeners, observadores e timers são encerrados ao sair da página. O retorno pelo cache de navegação remonta a integração.

Capturas têm UUIDs aleatórios e revisão, sem identidade de contato. Edição, composição IME, substituição do campo e mudanças no título invalidam a revisão, inclusive quando o texto permanece igual. Não se lê o conteúdo do cabeçalho. A conferência drena mutações pendentes antes de decidir se ela ainda é atual. Cliques sintéticos disparados pela página são ignorados.

Copiar e Substituir conferem novamente o texto, documento, editor e revisão capturados. A substituição aguarda a restauração de foco/seleção do editor controlado, limita a seleção ao campo e usa execCommand('insertText') exclusivamente no adaptador. O resultado é conferido antes e depois da reconciliação da página. Uma inserção incorreta pode ser desfeita sincronamente pela própria transação; não há segunda tentativa automática nem rollback tardio que possa apagar uma edição posterior. Uma falha não confirmada orienta a conferir o rascunho. A API é obsoleta e o suporte foi validado no Chrome indicado no relatório, sem garantia para versões futuras.

## Protocolo e ciclo de vida

O diagnóstico solicita ao coordenador um teste em uma aba permitida. O coordenador encaminha a fixture ao content script; este prepara o documento offscreen e abre um canal direto com ele. A resposta faz o caminho Worker → offscreen → content script. Só então o content script devolve o relatório ao diagnóstico. A página não pode substituir o texto sintético por dados arbitrários.

Uniões discriminadas e validação em tempo de execução cobrem start, cancel, status, progress, fragmentos de ação, result, cancelled, error e rejected. `simular`, as nove ações e `prova-modelo` seguem caminhos distintos; só as ações usam o rascunho com o modelo real. O modo é vinculado ao pedido, a cada trecho e à resposta, evitando aplicar uma saída de outro modo. O coordenador lê a preferência local no início da ação e envia ao Worker um valor booleano validado; a página não escolhe esse valor no pedido. Payloads têm campos fechados, IDs limitados e texto de até 8.000 unidades UTF-16. O tokenizer compatível com o modelo inclui template, instruções e reserva de saída no limite de 4.096 tokens; excedê-lo gera aviso sem truncar o rascunho.

Cada pedido carrega requestId, editorId, snapshotId e revisão. O roteador no offscreen acrescenta aba, frame, documento e conexão com base no remetente do Chrome. O diagnóstico usa identidades fictícias; a prévia usa o snapshot real solicitado explicitamente. Respostas só são aceitas quando todos os campos do vínculo conferem. O cliente da prévia também fixa o vínculo recebido e descarta eventos divergentes ou posteriores ao cancelamento.

Há um pedido ativo por vez, inclusive durante a preparação do motor. Pedidos concorrentes recebem **IA ocupada**, sem fila. Cancelar envia o comando ao Worker e espera a confirmação; se não houver resposta, a desconexão após dois segundos encerra o Worker. Fragmentos e resultados tardios são descartados. A espera de prontidão é limitada a cinco segundos; a simulação dura no máximo quinze segundos e as ações reais podem levar até uma hora para download/inferência, sem replay. A GPU é liberada após cinco minutos sem uso; o cache dos artefatos permanece.

A criação do offscreen é compartilhada entre chamadas concorrentes. runtime.getContexts verifica o documento existente e WORKERS justifica sua criação. O coordenador confirma a prontidão do documento; o roteador local espera a prontidão do Worker antes de encaminhar texto. O Service Worker pode encerrar por inatividade durante a geração: ele não hospeda mais o pedido nem sua porta. Não há reconexão periódica, keepalive artificial ou replay. Perder a aba, o canal direto ou o contexto da IA encerra o pedido; uma nova ação explícita pode reutilizar o documento sobrevivente. A [validação da correção](docs/VALIDACAO-STEP-12.md#correção-da-conexão-durante-inferência--30092026) registra o encerramento natural do coordenador durante duas gerações reais.

## Permissões e privacidade

- offscreen hospeda o Worker; Chrome Storage local guarda somente `{version: 2, semanticReview: boolean, profile: ModelProfile}`, com revisão desligada e perfil Econômico por padrão.
- Content script restrito a https://web.whatsapp.com/*. A permissão desse host permite listar/verificar apenas suas abas no diagnóstico, sem conceder `tabs` global. O Worker usa permissões adicionais somente para dados fixos do modelo em `huggingface.co` e `us.aws.cdn.hf.co`.
- Não há activeTab, scripting, <all_urls>, externally_connectable, APIs internas do WhatsApp, interceptação de tráfego ou ponte com scripts da página.
- CSP permite scripts/workers locais e WASM empacotado, sem código remoto. `connect-src` aceita o próprio pacote e os dois hosts de dados acima.
- Não há armazenamento de textos, logs de conteúdo ou persistência de pedidos. Cache API guarda somente os artefatos do modelo; Chrome Storage guarda apenas a preferência versionada de revisão e perfil. O relatório sintético permanece em memória até a página fechar.
- O rascunho só é lido ao solicitar a prévia e conferir uma ação explícita de cópia/substituição (inclusive ativação por teclado). Detecção, observadores e consulta de revisão não leem o texto. A captura e a resposta permanecem em memória até serem descartadas, sem leitura de histórico/contatos. A extensão só altera o rascunho após Substituir e nunca o envia.
- Copiar usa a área de transferência do sistema por escolha explícita. Não há leitura dela pelo produto nem nova permissão de extensão. O sistema operacional e outros aplicativos podem acessar o texto copiado conforme suas próprias configurações.

## Build e verificações

Vite gera as páginas HTML, o Service Worker ES module e o Worker local. Uma compilação IIFE separada incorpora o content script em arquivo clássico, sem imports ESM. O Manifest é copiado explicitamente; não há diretório public genérico. A saída contém caminhos relativos, JavaScript/CSS locais e avisos de licença em dist/.vite/license.md.

Variáveis de ambiente não são incorporadas automaticamente; o bundle do content script fixa apenas o modo de produção do React, sem depender de process no navegador. Não coloque segredos nas fontes ou no Manifest. O alvo de sintaxe é chrome116. Após editar, gere dist novamente, recarregue a extensão e as abas do WhatsApp.

Os testes conferem remetentes, campos extras, limites, vínculos divergentes, concorrência, cancelamento, descarte de eventos atrasados, desconexão, timeout, criação única e reconexão. O simulador integrado ao roteador testa eco Unicode/multilinha. O teste de build gera um pacote temporário e verifica Manifest/CSP, contextos locais, sintaxe clássica do content script, ausência de scripts inline, código de desenvolvimento e valores sintéticos de ambiente. A limpeza confirma caminho e prefixo antes de remover o diretório temporário.

Esses testes não certificam a execução das APIs do Chrome. Consulte o progresso e os relatórios para distinguir testes automatizados de evidência real. A STEP-06 acrescentou prova de WebGPU no Chrome, com fixture sintética, teste offline após reinício, falha de download e inspeção de cache/storage. A STEP-07 acrescentou correção real no Chrome, aplicação manual e recusas seguras. A STEP-08 verifica extração e preservação determinística, além do fluxo real no Chrome. Auditoria final de privacidade permanece na STEP-16.

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
| WebLLM                          | 0.2.82           |
| @mlc-ai/web-tokenizers          | 0.1.6            |
| @webgpu/types (somente tipos)   | 0.1.69           |
| playwright-core (prova Chrome)  | 1.55.0           |

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
- [WebLLM 0.2.82](https://github.com/mlc-ai/web-llm/releases/tag/v0.2.82), [catálogo da versão](https://github.com/mlc-ai/web-llm/blob/v0.2.82/src/config.ts), [falha de GPU das versões posteriores](https://github.com/mlc-ai/web-llm/issues/844), [licença Llama 3.2](https://dev.meta.ai/llama/llama3_2/license) e [licenças incluídas](licenses/LLAMA-3.2-LICENSE).
- [Vite: build](https://vite.dev/guide/build.html), [Vitest](https://vitest.dev/guide/), [ESLint](https://eslint.org/docs/latest/use/getting-started) e [compatibilidade do typescript-eslint](https://typescript-eslint.io/users/dependency-versions/).

## Entrega por etapa

Cada etapa entrega seu escopo completo, com verificações e commit próprio após a validação. Usar Conventional Commits e a identidade humana já configurada no Git. Ver [AGENTS.md](AGENTS.md) e o estado atual em [PROGRESSO.md](docs/PROGRESSO.md). Não iniciar automaticamente a próxima etapa.
