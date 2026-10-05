# STEP-04 — Detectar o editor do WhatsApp

[Plano geral](../PLANO.md) · [Progresso](../PROGRESSO.md)

## Objetivo

Encontrar o campo de composição correto e posicionar um único botão IA sem ler a conversa.

## Pré-requisitos

- [STEP-03](STEP-03.md) e todas as etapas anteriores concluídas, com evidências registradas.

## Tarefas

- [x] Concentrar seletores em um adaptador do WhatsApp, combinando contenteditable, atributos semânticos e localização na área de composição.
- [x] Não depender exclusivamente de classes CSS ofuscadas, texto de placeholder ou idioma da interface do WhatsApp.
- [x] Inserir um botão IA acessível próximo ao editor, sem deslocar ou impedir controles nativos.
- [x] Observar mudanças com MutationObserver de escopo limitado, coalescer atualizações e excluir o próprio conteúdo da extensão de ciclos de observação.
- [x] Remover eventos e observadores obsoletos quando o editor mudar; atualizar posição e visibilidade sem duplicar o botão.
- [x] Capturar o texto somente em uma ação explícita. Invalidar snapshots ao detectar edição, troca de contexto ou substituição do editor, sem coletar nomes de contatos.
- [x] Criar fixtures sintéticas para editor válido, busca, conversa sem editor, troca de conversa e editor removido.

## Limites

- Não percorrer nem extrair o histórico de mensagens ou contatos.
- Não usar rede, banco interno, objetos internos da aplicação ou instrumentação de APIs do WhatsApp.
- Apenas detectar editor e botão; o preview entra na STEP-05.

## Critérios de conclusão e verificação

- [x] Há um único botão por editor válido e nenhum em busca ou campos não relacionados.
- [x] O botão acompanha troca de conversa e remoção/recriação do editor.
- [x] Montagens repetidas e mudanças feitas pela própria extensão não geram loops ou eventos duplicados.
- [x] Fixtures automatizadas passam e o comportamento é conferido no WhatsApp real quando disponível.

Quando uma verificação não puder ser realizada, registrar exatamente o procedimento pendente e usar Aguardando validação ou Bloqueada no progresso, conforme o motivo. Não substituir evidência real por suposição.

## Entrega esperada

- Adaptador do WhatsApp, botão IA e fixtures de detecção.
- Registro separado dos resultados automatizados e da validação real.
