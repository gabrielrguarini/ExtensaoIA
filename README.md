# Extensão de IA local para WhatsApp Web

Base de desenvolvimento da STEP-02. O projeto já tem React, TypeScript strict, build e verificações automatizadas. A integração com Chrome/WhatsApp e a inferência local serão implementadas nas etapas seguintes.

O estado de execução fica em [docs/PROGRESSO.md](docs/PROGRESSO.md). Consulte o [plano geral](docs/PLANO.md) antes de continuar. Execute somente a etapa solicitada.

## Requisitos

- Node.js **22.13 ou superior na linha 22**, ou uma versão compatível das linhas 24/26+. As dependências recusam uma versão fora do intervalo declarado em package.json.
- npm **10.9.2 ou superior**, desde que a versão do npm também suporte o Node instalado.
- Ambiente usado nesta etapa: **Windows, Node 22.14.0 e npm 10.9.2**. Não é necessário trocar a instalação global para reproduzir este ambiente.
- Internet para instalar dependências de desenvolvimento; nenhum modelo é baixado nesta etapa.

As versões diretas são exatas e as transitivas ficam registradas em package-lock.json. Manter esse arquivo junto do código; usar npm ci para reproduzir a instalação. Não usar --force ou --legacy-peer-deps para esconder incompatibilidades.

## Instalação e comandos

Na pasta do projeto:

```sh
npm ci
```

| Comando              | Finalidade                                                                         |
| -------------------- | ---------------------------------------------------------------------------------- |
| npm run dev          | Abrir o servidor local de desenvolvimento em http://127.0.0.1:5173.                |
| npm run typecheck    | Conferir tipos do navegador e das ferramentas separadamente, sem emitir arquivos.  |
| npm run lint         | Conferir qualidade do código; qualquer aviso provoca falha.                        |
| npm run format:check | Conferir formatação sem alterar arquivos.                                          |
| npm run format       | Aplicar formatação explicitamente durante a edição.                                |
| npm test             | Executar os testes uma vez e encerrar.                                             |
| npm run test:watch   | Executar testes novamente conforme os arquivos mudam.                              |
| npm run build        | Conferir tipos e gerar a saída em dist.                                            |
| npm run preview      | Servir o build local em http://127.0.0.1:4173 após npm run build.                  |
| npm run check        | Executar tipos, lint, formatação, testes e build, interrompendo na primeira falha. |

No PowerShell, se a política local bloquear npm.ps1, use npm.cmd no lugar de npm. Nenhuma alteração da política do sistema é necessária.

O desenvolvimento e o preview escutam somente no computador local. Para encerrá-los, use Ctrl+C. Se a porta estiver ocupada, o comando falhará em vez de escolher outra silenciosamente.

## O que pode ser conferido agora

A página de desenvolvimento mostra uma mensagem sobre a base do projeto e a próxima etapa. Ela serve para conferir a montagem do React e o carregamento do CSS. Não oferece ações de correção, acesso ao WhatsApp nem execução de IA.

O build gera HTML, JavaScript, CSS e avisos de licença locais. **A pasta dist ainda não é uma extensão instalável:** o Manifest V3 será criado na STEP-03. O preview serve a página construída e não substitui a futura validação em chrome://extensions.

## Organização e limites dos módulos

Arquivos e pastas são criados quando passam a ter implementação. Nesta etapa, não há arquivos vazios, motores simulados, modelos nem contratos de comunicação antecipados.

| Local                                | Responsabilidade e momento de criação                                                    |
| ------------------------------------ | ---------------------------------------------------------------------------------------- |
| src/development                      | Página auxiliar existente para validar React e CSS; não é a interface final da extensão. |
| tests                                | Testes existentes do pacote gerado.                                                      |
| src/extension/background e offscreen | Coordenação e hospedagem do Worker, a partir da STEP-03.                                 |
| src/extension/content                | Integração com WhatsApp, seletores e edição, a partir das STEP-03/04/05.                 |
| src/extension/ui                     | Componentes do menu e preview, a partir da STEP-05.                                      |
| src/extension/ai                     | Runtime, adaptador WebLLM, prompts e reescrita, a partir da STEP-06.                     |
| src/models                           | Catálogo local e configuração de artefatos, a partir da STEP-06.                         |
| src/extension/core                   | Parsing, preservação e validação, conforme STEP-07/08.                                   |
| src/extension/storage                | Preferências; criar quando houver configuração efetivamente persistida.                  |
| src/shared                           | Contratos e tipos realmente compartilhados entre contextos, a partir da STEP-03.         |
| src/extension/popup e sidepanel      | Configurações e informações auxiliares, na STEP-14.                                      |

O núcleo deve permanecer independente de React, DOM e WebLLM. Somente o adaptador de IA importa WebLLM. Integração com WhatsApp não deve importar diretamente o runtime; a comunicação será por mensagens. O código do navegador não deve usar APIs de Node.js.

## Preparação do build para os próximos contextos

A configuração Vite declara explicitamente a única entrada existente: index.html. Novas entradas só devem ser adicionadas junto de sua implementação.

- Páginas de offscreen, popup e painel podem entrar como HTMLs adicionais.
- O Service Worker deverá ter entrada própria e seu formato deverá corresponder ao Manifest.
- O content script exige atenção ao formato aceito pelo Chrome; não copiar cegamente a configuração ES module das páginas. O build específico será implementado na STEP-03.
- Workers usam formato ES e deverão ser empacotados como arquivos locais, referenciados por URL resolvida pelo bundler.
- A saída usa caminhos relativos e não incorpora assets como data URLs. A pasta public está desabilitada; a inclusão de artefatos deve ser explícita.
- Variáveis do ambiente não são expostas automaticamente ao navegador. Não colocar segredos em código, arquivos HTML ou configurações de build.
- O alvo chrome116 define a transformação de sintaxe; não certifica compatibilidade das futuras APIs de extensão ou suporte de hardware.

As próximas etapas deverão transformar a saída em um pacote MV3 completo. Este estágio não cria Manifest, permissões, Service Worker ou mensagens.

## Teste inicial

O teste chama o build real do Vite em um processo separado com modo de produção e diretório temporário exclusivo. Confere:

1. HTML pt-BR com referências relativas a arquivos JavaScript e CSS realmente gerados.
2. Dependências incorporadas, sem cliente de desenvolvimento, React Refresh, referências ao código-fonte ou imports externos de React.
3. Ausência de um valor sintético de ambiente e de scripts inline no HTML gerado.

O diretório temporário é removido somente após confirmar seu caminho e prefixo. O teste não modifica dist, documentos ou arquivos de origem. Ele é uma verificação da base atual; não substitui a auditoria completa de privacidade da STEP-16.

TypeScript strict também habilita verificação de índices, propriedades opcionais exatas e imports laterais. ESLint usa informação de tipos e proíbe any explícito sem exceção justificada, eval, new Function e console no código do navegador. A formatação é responsabilidade separada do Prettier.

## Versões verificadas em 24/09/2026

| Ferramenta                      | Versão fixada    |
| ------------------------------- | ---------------- |
| React / React DOM               | 19.3.0           |
| TypeScript                      | 6.0.3            |
| Vite                            | 8.3.1            |
| Plugin React do Vite            | 6.1.1            |
| Vitest                          | 5.0.1            |
| ESLint / @eslint/js             | 10.11.0 / 10.0.1 |
| typescript-eslint               | 8.70.1           |
| Prettier                        | 3.9.9            |
| @types/node                     | 22.20.4          |
| @types/react / @types/react-dom | 19.3.0           |

A seleção foi conferida na documentação oficial e nos metadados de engines e peerDependencies do registro npm. O TypeScript 7.0.2 estava disponível, mas typescript-eslint 8.70.1 exige TypeScript menor que 6.1.0; por isso foi fixado 6.0.3. Não foram ignorados conflitos de dependências.

O requisito mínimo deste projeto combina as ferramentas: ESLint 10 exige Node 22.13+ na linha 22 e Vitest 5 admite as linhas 22.12+, 24 e 26+. npm 10.9.2 foi mantido por ser a versão disponível e compatível; atualizar npm globalmente não faz parte desta etapa.

Referências consultadas:

- [Vite — instalação](https://vite.dev/guide/) e [build](https://vite.dev/config/build-options)
- [Vitest — requisitos e execução](https://vitest.dev/guide/)
- [ESLint — requisitos](https://eslint.org/docs/latest/use/getting-started)
- [typescript-eslint — versões compatíveis](https://typescript-eslint.io/users/dependency-versions/)
- [TypeScript — instalação](https://www.typescriptlang.org/download/)
- [React — versões](https://react.dev/versions)
- [Prettier — instalação](https://prettier.io/docs/install)
- [Node.js — linhas de versões](https://nodejs.org/en/about/previous-releases)
- [npm ci — instalação pelo lockfile](https://docs.npmjs.com/cli/v10/commands/npm-ci)

## Commits e validação por etapa

Cada etapa deve entregar todo o escopo previsto funcionando e terminar em um commit próprio, após revisão do diff, npm run check e validação real apropriada. A execução continua incremental. Ver [AGENTS.md](AGENTS.md) para as regras de entrega e o contato autorizado para eventuais testes de mensagens.

Para a base atual, conferir também npm run preview: a página deve montar o React, carregar os estilos e não apresentar erros. A montagem da página foi conferida no navegador durante o registro inicial das etapas em Git. A validação real de Chrome/WhatsApp/IA começa nas etapas correspondentes.

## Próxima etapa

Consultar [STEP-03](docs/steps/STEP-03.md) somente quando sua execução for solicitada. A conclusão e as evidências desta etapa serão registradas no [progresso](docs/PROGRESSO.md).
