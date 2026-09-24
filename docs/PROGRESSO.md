# Progresso — Extensão de IA local para WhatsApp Web

[Plano geral](PLANO.md)

## Estado atual

- Última atualização: 24/09/2026.
- Última etapa concluída: **STEP-01 — Organizar o plano e o acompanhamento**.
- Situação: documentação criada e verificada; snapshot documental da STEP-01.
- Próxima etapa executável: **STEP-02 — Criar a base do projeto**.
- Implementação: este commit contém somente o planejamento e as regras do projeto.

## Significado dos status

- **Pendente:** execução ainda não iniciada.
- **Em andamento:** trabalho autorizado da etapa em execução.
- **Aguardando validação:** implementação disponível, mas falta evidência obrigatória, como execução real no Chrome/GPU/WhatsApp.
- **Bloqueada:** impedimento concreto impossibilita a continuidade; registrar causa e o necessário para resolvê-la.
- **Concluída:** todas as entregas e verificações obrigatórias da etapa foram satisfeitas e a entrega está registrada em commit próprio.

Não concluir uma etapa apenas porque o código compila. Pré-requisitos de uma etapa sequencial devem estar Concluídos. Não armazenar mensagens reais, prompts ou respostas como evidências.

## Etapas

| Etapa                       | Descrição                                       | Status    | Evidência                                                                          |
| --------------------------- | ----------------------------------------------- | --------- | ---------------------------------------------------------------------------------- |
| [STEP-01](steps/STEP-01.md) | Organizar o plano e o acompanhamento            | Concluída | 18 documentos, 16 etapas, 129 links locais válidos e sequência conferida.          |
| [STEP-02](steps/STEP-02.md) | Criar a base do projeto | Pendente | Entrega registrada separadamente no próximo commit. |
| [STEP-03](steps/STEP-03.md) | Implementar Manifest V3 e comunicação           | Pendente  | Não iniciada.                                                                      |
| [STEP-04](steps/STEP-04.md) | Detectar o editor do WhatsApp                   | Pendente  | Não iniciada.                                                                      |
| [STEP-05](steps/STEP-05.md) | Criar preview e substituição manual             | Pendente  | Não iniciada.                                                                      |
| [STEP-06](steps/STEP-06.md) | Executar o primeiro modelo local                | Pendente  | Não iniciada.                                                                      |
| [STEP-07](steps/STEP-07.md) | Implementar a ação Corrigir                     | Pendente  | Não iniciada.                                                                      |
| [STEP-08](steps/STEP-08.md) | Proteger entidades e validar o resultado        | Pendente  | Não iniciada.                                                                      |
| [STEP-09](steps/STEP-09.md) | Adicionar os demais modos                       | Pendente  | Não iniciada.                                                                      |
| [STEP-10](steps/STEP-10.md) | Exibir geração progressiva e cancelamento       | Pendente  | Não iniciada.                                                                      |
| [STEP-11](steps/STEP-11.md) | Implementar verificação semântica opcional      | Pendente  | Não iniciada.                                                                      |
| [STEP-12](steps/STEP-12.md) | Adicionar modelos e perfis de hardware          | Pendente  | Não iniciada.                                                                      |
| [STEP-13](steps/STEP-13.md) | Consolidar cache, recuperação e desempenho      | Pendente  | Não iniciada.                                                                      |
| [STEP-14](steps/STEP-14.md) | Finalizar configurações e interfaces auxiliares | Pendente  | Não iniciada.                                                                      |
| [STEP-15](steps/STEP-15.md) | Criar e executar o benchmark pt-BR              | Pendente  | Não iniciada.                                                                      |
| [STEP-16](steps/STEP-16.md) | Validar e preparar a entrega instalável         | Pendente  | Não iniciada.                                                                      |

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

## Registro inicial em Git

- O Git foi iniciado depois da execução das etapas iniciais. Este primeiro commit registra somente a documentação da STEP-01; a base da STEP-02 será registrada separadamente no commit seguinte.
- Foram incorporadas as regras confirmadas pelo usuário: uma entrega completa e funcionando no escopo de cada etapa, um commit por etapa e o contato @gabrielrguarini para eventuais testes necessários.
- A data dos commits corresponde à criação real do histórico, sem retroagir datas.

## Como continuar

A STEP-01 está concluída neste snapshot. A próxima entrega do histórico é a STEP-02.

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
