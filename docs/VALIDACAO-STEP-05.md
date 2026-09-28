# Validação da STEP-05 — Prévia e substituição manual

[Plano](PLANO.md) · [Progresso](PROGRESSO.md) · [Etapa](steps/STEP-05.md)

## Ambiente e escopo

Validação concluída em 28/09/2026, após implementação e testes iniciados em 25/09/2026. Windows, Node 22.14.0, npm 10.9.2, Playwright MCP 0.0.82 e Chrome for Testing 154.0.8037.0 (Chromium 1246). Pacote descompactado 0.4.0 carregado de dist, sem servidor de desenvolvimento. Não houve instalação de dependências novas nesta etapa.

O menu e a prévia usam React em Shadow DOM. A ação explicitamente simulada acrescenta “[Simulação]” ao rascunho e percorre content script → Service Worker → offscreen → Worker → content script. Nenhuma correção por IA é alegada. WebLLM e WebGPU não fazem parte desta etapa.

## Verificações automatizadas

Executar na raiz:

```sh
npm ci
npm run check
```

No Windows, usar npm.cmd quando necessário. A execução de npm run check passou com tipos, lint sem avisos, formatação, **98 testes em oito arquivos** e build. A instalação já existente foi reutilizada; npm ci não foi repetido nesta etapa, pois não houve troca de dependências.

Os testes novos cobrem sessão da prévia e adaptador de edição: captura somente ao solicitar a simulação; ausência de aplicação automática; descarte de textos e respostas atrasadas; falha de cópia; rascunho vazio/grande; snapshots forjados/obsoletos; conferência de texto antes da escrita; seleção limitada ao editor; espera de restauração de foco; cancelamento antes da inserção; resultado incorreto e undo síncrono; proibição de rollback após edição posterior; estruturas especiais; parágrafos, blocos DIV, linhas vazias e Unicode. O teste de build impede dependência de process.env no content script.

## Chrome com páginas controladas

Perfil isolado e sem conta, com uma página sintética servida pelo harness do Playwright na origem permitida. Esse atendimento de requisições pertence somente ao teste; o produto não intercepta tráfego. A página contém #main, header/footer diretos, um textbox contenteditable, busca separada e botões nativos. Somente dados sintéticos foram usados.

| Caso                     | Procedimento                                                                              | Resultado                                                                                                                                                                       |
| ------------------------ | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prévia e HTML literal    | Gerar para texto com acento, emoji e `<b>literal</b>`.                                    | Prefixo correto; nenhum elemento b interpretado.                                                                                                                                |
| Confirmação e desfazer   | Clicar em Substituir; conferir texto; Ctrl+Z no editor.                                   | Uma substituição após confirmação; original restaurado.                                                                                                                         |
| Linhas e cópia           | Gerar texto com linha vazia em blocos DIV; copiar e ler somente o conteúdo recém-copiado. | Prévia/cópia preservam as linhas; Substituir desabilitado; rascunho intacto. O Windows converte LF em CRLF na área de transferência, normalizado apenas na comparação do teste. |
| Cópia recusada           | Negar clipboard-write no perfil de testes e clicar em Copiar.                             | Erro visível, sem alteração do campo. Permissão de teste restaurada depois.                                                                                                     |
| Rascunho editado         | Alterar o campo e emitir input com a prévia aberta.                                       | Aviso de contexto obsoleto; resultado e botões de aplicação removidos.                                                                                                          |
| Contexto com texto igual | Alterar apenas o cabeçalho da fixture.                                                    | Sugestão invalidada mesmo com rascunho idêntico.                                                                                                                                |
| Editor recriado          | Substituir o elemento por uma cópia com o mesmo conteúdo.                                 | Prévia fechada; nenhuma aplicação no novo elemento.                                                                                                                             |
| Menção estruturada       | Inserir chip sintético contenteditable=false.                                             | Texto representável na prévia; somente cópia.                                                                                                                                   |
| Teclado e Escape         | Focar IA, ativar com Enter; ativar a ação focada; usar Escape.                            | Menu e ação acessíveis; Escape fecha a prévia e devolve foco ao campo. Enter é usado apenas nos botões, nunca no editor.                                                        |
| Cancelamento             | Cancelar durante geração e aguardar além da resposta esperada.                            | Prévia não reaparece; original intacto.                                                                                                                                         |
| Interface                | Conferir a prévia com captura da fixture, mantendo caret inicial.                         | Título, aviso de simulação, texto e três ações legíveis junto ao compositor. Captura mantida somente no cache ignorado.                                                         |
| Regressão da STEP-03     | Abrir diagnostic.html da extensão e executar o circuito.                                  | Resultado completo do Worker simulado.                                                                                                                                          |
| Execução e armazenamento | Conferir erros da página e storage da extensão após os testes.                            | Nenhum pageerror capturado; storage local/sync/session com zero chaves.                                                                                                         |

O Chrome recebeu permissões de clipboard somente no perfil controlado para conferir o conteúdo copiado e simular recusa. O Manifest do produto não recebeu novas permissões. A leitura da área de transferência não existe no código da extensão.

## WhatsApp real

Perfil de testes autenticado anteriormente pelo usuário. Antes de qualquer edição, a interface foi conferida para corresponder exclusivamente a **@gabrielrguarini**. Nenhum histórico, contato adicional ou mensagem recebida foi usado como evidência. Nenhuma mensagem foi enviada.

No pacote final 0.4.0:

1. Confirmar o campo vazio e preencher uma frase sintética curta com acento e emoji.
2. Abrir IA → Criar prévia simulada. Conferir o prefixo e clicar em Substituir.
3. Conferir a substituição exata após a reconciliação do WhatsApp; Ctrl+Z restaurou integralmente o original.
4. Criar um rascunho sintético com duas linhas. A prévia preservou uma quebra entre os parágrafos; Substituir permaneceu desabilitado. Copiar confirmou sucesso e o rascunho permaneceu intacto.
5. Escape fechou a interface e devolveu foco ao editor. Cancelar durante a geração também descartou a resposta, sem edição.
6. Remover apenas o rascunho sintético com seleção no editor e Backspace; campo vazio confirmado ao terminar.

Aplicação/desfazer, prévia multilinha, bloqueio de substituição, cópia, preservação e limpeza foram repetidos após o último build funcional. O cancelamento também passou no navegador controlado final. Troca entre conversas foi coberta por fixtures para manter o teste real restrito ao contato autorizado.

## Limitações verificadas e decisões

- A inserção nativa de múltiplas linhas foi ensaiada no WhatsApp real e o editor removeu a quebra durante sua reconciliação. O Ctrl+Z recuperou o original. Por isso **qualquer rascunho ou sugestão com múltiplas linhas oferece somente cópia**, assim como estruturas não preserváveis. Esse é o fallback de segurança previsto na etapa, e não uma substituição multilinha certificada.
- innerText produz separações extras entre certos blocos P/DIV. A leitura explícita desses blocos preserva as quebras e linhas vazias na prévia/cópia; não usa APIs internas do WhatsApp.
- O editor real restaura a seleção ao receber foco. A escrita aguarda essa restauração e a seleção nativa antes de inserir; Range sozinho não passou no teste real. Todas as chamadas execCommand ficam no adaptador. A API é obsoleta: [documentação MDN](https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand).
- Estruturas desconhecidas, menções, imagens e estilos não reconhecidos ficam somente para cópia. Emojis Unicode desenhados em spans do editor foram testados; não se promete suporte a todos os formatos de emoji/menção.
- Mudanças de presença/cabeçalho podem invalidar a prévia conservadoramente. É necessário gerar outra explicitamente. O Shadow DOM isola estilos, sem ser uma fronteira de segurança contra a página hospedeira.
- Conferência posterior à edição não promete recuperar uma alteração arbitrária do site: se o resultado não puder ser confirmado, a interface orienta a inspecionar o campo. Nunca há rollback tardio sobre uma edição posterior do usuário.
- A validação cobre esta versão do Chrome e a interface do WhatsApp disponível na data. A auditoria completa de requisições e privacidade continua prevista na STEP-16; storage vazio e revisão de código não substituem essa auditoria.

## Como conferir a entrega

Gere dist com npm run check. Em chrome://extensions, carregue ou recarregue a pasta dist e recarregue a aba do WhatsApp. No contato autorizado, use somente rascunhos sintéticos. Confira o fluxo de uma linha com Substituir/Ctrl+Z e o fluxo multilinha com Copiar. Teste Cancelar/Escape e edite o rascunho após gerar uma prévia: a sugestão anterior deve desaparecer ou ser invalidada. Não clique em Enviar.

Se o navegador mantiver um content script de build anterior, feche e reabra somente o perfil de testes, preservando seus dados; não remova o perfil. O diagnóstico pelo ícone deve continuar executando o circuito simulado.

Conclusão: entrega da STEP-05 validada no seu escopo, incluindo os casos somente para cópia documentados. STEP-06 não iniciada.
