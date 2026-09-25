# Validação da STEP-04 — Editor e botão IA

[Plano](PLANO.md) · [Progresso](PROGRESSO.md) · [Etapa](steps/STEP-04.md)

## Escopo e ambiente

Validação em 25/09/2026, Windows, Node 22.14.0, npm 10.9.2, pacote 0.3.0. Navegador: Chrome for Testing 154.0.8037.0 (Chromium 1246), controlado pelo Playwright MCP 0.0.82. Pacote descompactado gerado em dist, sem servidor de desenvolvimento.

O botão apenas confirma que reconheceu o campo. A captura explícita fica em memória; não é enviada ao Worker simulado nem exibida no aviso. Não há menu de ações, preview, substituição ou modelo de IA nesta etapa.

## Testes automatizados

- npm run check: tipos, lint sem avisos, formatação, **69 testes em seis arquivos** e build aprovados.
- Os 45 testes anteriores permanecem aprovados: protocolo, roteamento, isolamento, cancelamento, recuperação, offscreen e pacote MV3.
- 19 testes do adaptador: localização sem depender de idioma/classes; busca, diálogo, desativado, somente leitura, oculto/inert e ambiguidade; leitura somente por captura; Unicode/multilinha; input/IME; mutações pendentes; mesmo editor em novo contexto; remoção/recriação; descoberta tardia; histórico fora do observer; host próprio ignorado; coalescência e limpeza.
- Cinco testes do botão: montagem única/acessível, isolamento de estilo, preservação do footer, ausência/recriação, rejeição de clique sintético, colisão com controles e encerramento/remontagem.
- jsdom não calcula layout nem reproduz o editor do WhatsApp. Os testes usam geometria sintética e não substituem as verificações abaixo.

## Chrome com página controlada

Perfil separado, sem conta. A navegação de teste foi atendida integralmente por HTML sintético no processo de teste, antes de qualquer acesso ao site; o produto não contém interceptação de tráfego. A URL do fixture tem a origem permitida pelo Manifest para exercitar a injeção real do content script.

| Verificação                                    | Resultado                                                                                 |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Pacote MV3 carregado, content script executado | Aprovado; um host e um botão.                                                             |
| Estilo da página com botões amarelos/vermelhos | Botão IA manteve estilo próprio no Shadow DOM.                                            |
| Texto sintético com Unicode e quebra de linha  | Preservado após clique real em IA.                                                        |
| Aviso de etapa sem ações disponíveis           | Exibido, sem apresentar correção simulada como IA real.                                   |
| Edição após clique                             | Aviso/captura descartados.                                                                |
| Remover e recriar footer                       | Host removido e recriado uma única vez.                                                   |
| Viewport 800 × 600                             | Botão 48 × 32 visível acima do compositor, sem sobrepor o campo.                          |
| Ativação com Enter e fechamento com Escape     | Aprovados.                                                                                |
| Diagnóstico da STEP-03                         | Circuito completo content → coordenador → offscreen → Worker → origem, com eco sintético. |

## WhatsApp real autenticado

O usuário conectou voluntariamente o perfil separado pelo QR code e abriu o contato autorizado. A identidade **@gabrielrguarini** foi confirmada no cabeçalho da interface antes da edição. Nenhuma mensagem foi enviada; nenhum conteúdo real de conversa ou screenshot de histórico integra este relatório ou o repositório.

| Verificação                        | Resultado                                                                                                  |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Identificação do compositor        | #main com header direto, footer e textbox contenteditable reconhecidos.                                    |
| Estado inicial                     | Rascunho vazio; exatamente um host e botão IA visível.                                                     |
| Posição                            | Botão acima do footer e fora do campo; campo começa em y ≈ 671 e botão termina em y = 648 na janela usada. |
| Clique real com rascunho sintético | Aviso visível; rascunho com acento/emoji preservado integralmente.                                         |
| Fechar e reabrir conversa          | Host ausente sem #main e um único botão após reabrir o contato autorizado.                                 |
| Busca pelo contato autorizado      | Continuou existindo somente o botão do compositor; nenhum botão na busca.                                  |
| Remover rascunho de teste          | Ctrl+A e Backspace no editor; vazio confirmado antes e após reabrir.                                       |

Detalhes da execução: Escape também fecha a conversa no WhatsApp, comportamento nativo preservado. A tentativa de limpeza com fill vazio não removeu o rascunho controlado pelo site; a limpeza pelo teclado foi conferida e concluída. Uma tentativa de clicar no resultado enquanto a busca era limpa encontrou um item removido pelo próprio WhatsApp; repetir a busca explícita pelo contato autorizado permitiu reabrir e conferir o resultado. Esses limites da automação não foram tratados como sucesso até a repetição validada.

Troca entre dois contextos distintos com texto idêntico foi testada com fixtures; no WhatsApp real, os testes ficaram restritos ao contato autorizado e cobriram fechamento/reabertura. Não foram usadas outras conversas para ampliar a validação.

## Como reproduzir

1. Executar npm ci e npm run check; carregar dist em chrome://extensions. Após atualizar, recarregar a extensão e a aba do WhatsApp.
2. Sem uma conversa aberta, verificar ausência do botão IA. Na busca, não deve haver botão associado ao campo de busca.
3. Abrir o contato autorizado @gabrielrguarini e confirmar sua identidade na interface. Se houver um rascunho preexistente, preservá-lo e usar uma sessão de teste vazia.
4. Confirmar um único botão IA acima do compositor. Digitar um texto sintético curto, clicar IA e verificar o aviso de indisponibilidade das ações nesta versão. O texto deve permanecer intacto.
5. Editar o rascunho e conferir descarte do aviso. Fechar e reabrir a conversa; conferir remoção/recriação sem duplicatas. Abrir a busca, mudar o tamanho da janela e confirmar que controles nativos continuam acessíveis.
6. Remover somente o rascunho sintético com o teclado e conferir que ficou vazio. Não enviar a mensagem.
7. Abrir o diagnóstico pelo ícone da extensão, atualizar as abas e executar o circuito simulado. Deve continuar retornando a fixture fixa da STEP-03.

## Limites conhecidos

- Seletores refletem a estrutura observada nesta versão do WhatsApp. Estruturas não reconhecidas ou ambíguas não recebem botão.
- Mudanças de presença no cabeçalho podem invalidar uma captura conservadoramente, sem leitura ou armazenamento do nome/estado do contato.
- A descoberta de contêineres novos pode levar até um segundo. Observação profunda fica restrita ao cabeçalho e compositor; não há varredura de conteúdo de mensagens.
- O botão procura posições acima do compositor livres de controles interativos. Se não encontrar espaço, fica oculto.
- Perfis/cache locais de teste ficam ignorados em .cache; não incluir sessões autenticadas em commits.
- Validação de substituição/desfazer, menções especiais e preview pertence à STEP-05. Inferência real e WebGPU pertencem à STEP-06.
