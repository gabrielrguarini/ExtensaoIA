# Validação STEP-16-A — Streaming direto

[Plano](PLANO.md) · [Progresso](PROGRESSO.md) · [Escopo](steps/STEP-16-A.md) · [Instalação](INSTALACAO.md)

## Estado em 08/10/2026

**Aguardando validação final no WhatsApp autenticado.** Implementação e pacote 0.16.1 disponíveis. O usuário autorizou a primeira substituição do conteúdo presente no campo e o acréscimo dos próximos trechos, preservando edições nos trechos recebidos. Também autorizou deixar o cursor no final a cada escrita.

O bloqueio relatado não dependia apenas do tamanho: a guarda anterior recusava qualquer quebra de linha, inclusive em texto curto. A STEP-16-A remove essa restrição e a mensagem que exigia ativar revisão. Menções estruturadas e formatação especial permanecem protegidas.

## Implementação

- A primeira escrita substitui o conteúdo presente naquele instante, inclusive digitação posterior ao clique em IA. A IA recebe apenas o original capturado no clique.
- As escritas são serializadas; depois da primeira, somente o sufixo novo do modelo é acrescentado ao conteúdo atual. A conclusão não reaplica o resultado inteiro sobre edições humanas.
- Quebras de linha usam o evento público de colagem do editor com texto simples, sem acessar o clipboard do sistema. O fallback usa operações nativas insertText/insertLineBreak. Nenhuma API interna do WhatsApp ou escrita por innerHTML.
- Documento, campo e conversa continuam vinculados ao pedido. Composição IME adia a escrita; cancelamento e ações manuais de envio descartam eventos atrasados e impedem novas inserções.
- O original permanece em memória. Falha/cancelamento restaura automaticamente se não houve edição após a primeira escrita; caso contrário, conserva a edição e oferece Restaurar original/Manter edição. A restauração também pode ser cancelada antes da mutação.
- Revisar sugestão permanece opcional; a prévia conserva revisão de rascunho e aplicação por clique, inclusive com várias linhas.

## Verificações automatizadas e Chrome

Windows, Node 22.14.0, Chrome instalado **154.0.8037.98**. `npm.cmd run check` aprovado: **300 testes em 42 arquivos**, tipos, lint, formatação e build. A execução fora do sandbox foi necessária porque os workers do Vitest não conseguiam criar seus arquivos temporários na execução restrita; nenhuma alteração de configuração foi usada para esconder esse problema.

`npm.cmd run test:step16a:browser` usa o adaptador, a sessão e o botão reais, compilados para o ensaio, com **geração e editor sintéticos**. Oito verificações passaram: primeira substituição após digitação, preservação de edição/Unicode/linhas vazias, Escape e resposta atrasada, falha com recuperação explícita, mudança de contexto, rascunho com mais de seis mil caracteres/múltiplas linhas, eventos de composição, encerramento por Enter/controle de envio simulado e regressão da prévia. Zero erros de página. Não houve envio.

`npm.cmd run test:step16a:installed` instalou o pacote release em um perfil dedicado. Popup, padrões Corrigir/direto, passagem de rascunho longo multilinha ao motor sem exigir revisão e storage somente com preferências passaram. Chrome informou IA nativa **downloadable**, sem sessão preparada. O pedido offline informou cache ausente, não iniciou download e preservou o original. Esse ensaio não comprova nova inferência real.

Os modelos dos perfis anteriores foram removidos por solicitação do usuário em 05/10, conforme [registro histórico](VALIDACAO-STEP-16.md#reprodução-e-pendência). Nenhum download de gigabytes foi repetido neste ajuste. Os contratos/motores/prompts/cache permanecem preservados; suas evidências anteriores não substituem a validação restante do fluxo atual.

## WhatsApp autenticado

Perfil visível de testes dedicado, vinculado pelo usuário. O cabeçalho não mostrava o identificador autorizado, e o usuário confirmou explicitamente que a conversa aberta era @gabrielrguarini. Foram usados somente rascunhos sintéticos, sem enviar mensagens ou registrar conteúdo de conversa/cabeçalho.

Uma execução preliminar confirmou a primeira substituição e a inserção de múltiplas linhas, mas falhou no critério de conservar a posição do cursor. Tentativas de reconstruir seleção foram descartadas; o usuário autorizou cursor no final. Uma repetição encontrou montagens antigas duplicadas do ensaio, e o recarregamento para removê-las fechou a conversa. A repetição final com o contrato vigente depende de reabrir a conversa confirmada. Esses ensaios incompletos não são apresentados como aprovação final.

O roteiro `tests/browser/step16a-whatsapp.mjs` usa geração sintética controlada e a integração real do campo. Exige confirmação humana da conversa (`STEP16A_CONTACT_CONFIRMED=1`) e conexão de depuração de um perfil dedicado (`STEP16A_CDP`, padrão porta 9258). Deve começar com campo vazio. Confere primeira escrita após digitação, edições, múltiplas linhas/emoji/linhas vazias, histórico nativo, Escape, evento atrasado, falha/recuperação, rascunho longo e prévia opcional. Guarda o cabeçalho apenas em memória para interromper se a conversa mudar. Não envia, não tira screenshots da conversa e registra somente procedimentos/resultados. Não executar em perfil pessoal ou contato não confirmado.

## Limites e reprodução

O cursor pode ir ao final a cada trecho. O histórico nativo pode separar operações do streaming; Ctrl+Z não promete restaurar todo o original em um único passo. Original para recuperação é temporário, sem persistência. Streaming não amplia o limite de 8.000 caracteres do protocolo nem o contexto/saída dos modelos, e não garante qualidade ou fidelidade semântica.

`npm.cmd run check`, `npm.cmd run package`, `npm.cmd run test:step16a:browser`, `npm.cmd run test:step16a:installed`. O roteiro instalado exige pacote gerado e perfil próprio, sem IA/modelos preparados para o cenário de cache ausente. O roteiro WhatsApp exige a conversa confirmada aberta e o bundle fixture.js gerado pelo teste de navegador. Os roteiros das etapas anteriores retratam os contratos históricos nos commits correspondentes.

O pacote 0.16.1 contém **50 arquivos / 95.543.361 bytes**, ZIP **21.170.469 bytes** e inventário SHA-256 em release; todos os arquivos do ZIP e os ícones do Manifest conferidos pelo empacotador. Não inclui pesos, caches, testes, conversas ou segredos. [Checks](evidencias/step16a/checks.json), [inventário](evidencias/step16a/package.json), [navegador](evidencias/step16a/browser.json) e [instalação](evidencias/step16a/installed.json). A política local foi atualizada para explicar a recuperação em memória; não houve nova publicação da página pública nem upload à loja.

Pendências: repetição final do ensaio no WhatsApp com cursor no fim e inferência completa do pacote em perfil preparado. A STEP-16 e o ajuste permanecem Aguardando validação até registrar as evidências exigidas, sem antecipar outra etapa.
