# Página pública de privacidade

[Política publicada](https://ia-local-whatsapp-privacidade.gabrielrguarini.chatgpt.site) · [Texto canônico](../PRIVACIDADE.md) · [Guia de publicação](../PUBLICACAO-CHROME-WEB-STORE.md)

Página estática em pt-BR, publicada pelo plugin Sites em 05/10/2026 com acesso público. [index.html](index.html) contém o texto da política e o contato fornecido pelo editor, com layout responsivo, sem scripts, fontes externas, formulários ou dependências de aplicação. A publicação da política é independente da aprovação da extensão na Chrome Web Store.

## Identidade e evidências

- Projeto Sites: `appgprj_6ac3df6ed2288191a2328933c6c74138`.
- Versão salva: `appgprj_6ac3df6ed2288191a2328933c6c74138~appgver_d52c5550dae48191abf53883cb40480e`.
- Publicação: `appgdep_6ac3e2b69f6c81919190593cd24c0479`, estado `succeeded`.
- Commit da fonte isolada: `9157dcf1fde2333e46c3f9b238607a06b282362e`, com autor/committer humanos configurados, mensagem `docs(privacy): publicar politica da extensao`.
- Acesso HTTPS sem cookies ou autenticação: HTTP 200, sem redirecionamento para login; política, finalidade e contato presentes. Conteúdo completo também conferido pelo navegador do Codex.
- Verificações do projeto: tipos, lint, formatação, 286 testes em 41 arquivos e build aprovados. Nenhuma alteração de runtime ou download de pesos.

## Manutenção

Mantenha o texto de [PRIVACIDADE.md](../PRIVACIDADE.md) e desta página em acordo. A cópia de publicação fica no diretório ignorado `.cache/privacy-site`, um repositório isolado com `dist/index.html` e `.openai/hosting.json`. O Manifest de hospedagem conserva o identificador acima e `static.directory` igual a `dist`.

Reutilize o mesmo projeto Sites, com o fluxo de fonte, empacotamento, versão salva e publicação do plugin. Não crie outro projeto ao atualizar a política. Se a cópia local faltar, recupere a fonte desse projeto com o helper do plugin; não reutilize o Git do repositório da extensão como fonte de hospedagem. Credenciais temporárias passam somente por stdin e não ficam em arquivos, histórico de comandos ou documentação.

No Windows, a preparação precisou do Bash instalado com o Git e de `TAR_OPTIONS=--force-local` para tratar o caminho do arquivo como local. A execução com rede também usou uma exceção temporária `safe.directory` apenas para essa cópia criada no sandbox. Nenhuma configuração global do Git foi alterada. As tentativas anteriores falharam por conexão HTTPS restrita, diferença de proprietário do checkout e caminhos do Bash/TAR; o mesmo projeto e commit foram preservados.
