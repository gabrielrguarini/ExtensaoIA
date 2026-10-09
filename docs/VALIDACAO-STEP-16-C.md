# Validação STEP-16-C — Texto simples colado

[Plano](PLANO.md) · [Progresso](PROGRESSO.md) · [Escopo](steps/STEP-16-C.md) · [Instalação](INSTALACAO.md)

## Diagnóstico em 09/10/2026

O usuário informou bloqueio de estrutura ao usar texto grande colado sem links ou
formatação. O adaptador confundia duas representações de texto simples com conteúdo
especial: o Chrome enumera white-space:pre-wrap como white-space-collapse:preserve
e text-wrap-mode:wrap; o WhatsApp marca quebras de edição com
data-lexical-managed-linebreak="true" em BR.

O caso foi reduzido a um SPAN com um caractere e white-space:pre-wrap. Remover
somente o estilo permitia escrever. `node tests/browser/step16c-structure.mjs`
reproduziu o aviso exato em quatro casos antes da correção: estilo curto, propriedades
CSS expandidas, linha vazia marcada e texto longo/multilinha. O teste de unidade
da linha vazia também falhou antes da correção (replacementAllowed false).

Hipóteses: CSS expandido recusado, elemento especial acrescentado pela colagem ou
indisponibilidade da API de edição. A comparação sem estilo, a inspeção dos metadados
e o teste da quebra marcada confirmaram as duas recusas do filtro; a mesma API de
edição funcionava no controle de texto simples. Não foi necessário ler conversas.

## Correção

O filtro confere o valor combinado white-space:pre-wrap ao encontrar suas duas
propriedades expandidas e aceita o marcador gerenciado somente em BR com valor
true. A leitura e a edição nativa continuam preservando texto/linhas/Unicode.
Menções, decoradores, imagens, estilos arbitrários e atributos desconhecidos
continuam protegidos. Dois controles negativos verificam marcador fora de BR e
valor diferente de true. Sem retirada indiscriminada da guarda.

Motores, prompts, limites de contexto/saída, configurações, dependências, permissões
e cache permanecem iguais. Nenhum novo download ou publicação foi iniciado.

## Chrome e WhatsApp reais

Chrome instalado **154.0.8037.98**, perfil de testes dedicado. Quatro casos do
roteiro C passaram após a correção, com primeiro trecho e conclusão multilinha sem
aviso/revisão. Os oito cenários de streaming do roteiro A passaram novamente:
edição após clicar, sufixos/Unicode/linhas vazias, cancelamento/resposta atrasada,
recuperação, troca de contexto, texto longo, composição, ação manual simulada de
envio e prévia opcional. Zero erros de página nos dois ensaios sintéticos.

No WhatsApp autenticado, o usuário confirmou novamente a conversa exclusiva de
@gabrielrguarini. Texto simples sintético de mais de cinco mil caracteres foi
colado por ClipboardEvent com text/plain, sem acessar o clipboard do sistema.
O DOM real incluiu o BR marcado, sem formatação especial. Primeira escrita após
digitação, preservação de edição/linhas vazias/emoji, conclusão, Ctrl+Z, Escape,
recuperação do original e descarte de resposta atrasada passaram. O roteiro A
completo também passou no mesmo contato, incluindo falha/recuperação explícita e
prévia opcional. Ambos limparam somente seus próprios rascunhos.

**Geração sintética controlada em todos esses ensaios de escrita.** O campo,
reconciliação, colagem e histórico do WhatsApp são reais. Sem envio, screenshots
da conversa, conteúdo real registrado ou inferência nova. A confirmação do contato
e o cabeçalho para a guarda permanecem apenas em memória. O perfil já estava aberto;
a tentativa de reabri-lo falhou por estar em uso, sem fechar processos do usuário.

## Pacote e verificações finais

`npm.cmd run check` aprovado: **303 testes em 42 arquivos**, tipos, lint,
formatação e build. Pacote **0.16.3**, **50 arquivos / 95.543.413 bytes**,
ZIP **21.170.482 bytes**, Manifest/ícones e inventário SHA-256 conferidos.
Todos os arquivos coincidem com o build final; 48 arquivos são idênticos ao pacote
0.16.2, com mudanças somente em Manifest e content.js. Instalação no Chrome em
perfil dedicado aprovada: popup/padrões, passagem de texto longo ao motor sem
revisão, ausência de cache sem baixar/alterar o original e storage somente com
preferências. Esse ensaio instalado não realizou nova inferência.

Evidências: [reprodução anterior](evidencias/step16c/structure-before.json),
[correção](evidencias/step16c/structure.json),
[streaming Chrome](evidencias/step16c/browser-streaming.json),
[colagem WhatsApp](evidencias/step16c/whatsapp-plain.json),
[streaming WhatsApp](evidencias/step16c/whatsapp-streaming.json),
[instalação](evidencias/step16c/installed.json),
[checks](evidencias/step16c/checks.json) e [pacote](evidencias/step16c/package.json).

Reprodução: `npm.cmd run test:step16c:browser`, `npm.cmd run test:step16a:browser`,
`npm.cmd run check`, `npm.cmd run package` e `npm.cmd run test:step16a:installed`.
O roteiro C aceita STEP16C_CHROME. O roteiro autenticado
`npm.cmd run test:step16c:whatsapp` exige STEP16C_CONTACT_CONFIRMED=1, conversa
confirmada e rascunho vazio; aceita STEP16C_CDP, padrão http://127.0.0.1:9258,
e requer fixture.js gerado pelo roteiro C. Não executar em perfil pessoal.

A conferência real do editor antes pendente na STEP-16-A foi satisfeita neste
ajuste. A inferência completa do pacote em perfil preparado e demais requisitos da
[entrega STEP-16](VALIDACAO-STEP-16.md) permanecem pendentes; não declarar todo o
plano concluído nem iniciar a etapa seguinte.
