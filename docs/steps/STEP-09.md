# STEP-09 — Adicionar os demais modos

[Plano geral](../PLANO.md) · [Progresso](../PROGRESSO.md)

## Objetivo

Disponibilizar as nove ações com diferenças semânticas claras e preservação obrigatória.

## Pré-requisitos

- [STEP-08](STEP-08.md) e todas as etapas anteriores concluídas, com evidências registradas.

## Tarefas

- [x] Criar um registro tipado único das ações para a interface e os prompts; evitar listas divergentes.
- [x] Corrigir: alterações mínimas de escrita. Melhorar: clareza e fluidez sem alterar conteúdo. Reescrever: formulação alternativa com a mesma intenção e informações.
- [x] Formal: vocabulário e estrutura formais, cordialidade, evitar gírias e abreviações. Profissional: claro, objetivo e educado, sem excesso de formalidade.
- [x] Amigável: proximidade e cordialidade, preservando informalidade compatível. Natural: corrigir sem linguagem artificial, mantendo personalidade.
- [x] Conciso: remover redundâncias preservando todas as informações importantes. Engraçado: leveza compatível com o assunto, sem inventar fatos, ridicularizar ou descaracterizar intenção séria.
- [x] Aplicar a proteção e validação existentes a todas as ações. Preservar gírias por padrão, com a formalização explicitamente escolhida podendo adaptá-las.
- [x] Acrescentar exemplos por ação, incluindo mano consegue ver isso pra mim hoje?, mensagens profissionais e mensagens sérias.
- [x] Manter a escolha da ação ligada ao pedido correspondente, sem aplicar uma resposta produzida para outro modo.

## Limites

- Tradução e expansão permanecem fora desta versão.
- Os modos não podem ser implementados como simples substituições de palavras.
- Um tom não autoriza alterar fatos, valores ou negações.

## Critérios de conclusão e verificação

- [x] As nove ações aparecem com rótulos em pt-BR e acionam a configuração correta.
- [x] Formal e Profissional têm comportamentos distintos nos casos de avaliação.
- [x] Conciso preserva informações e Engraçado não inventa conteúdo factual.
- [x] Testes de preservação continuam passando para todas as ações.

Quando uma verificação não puder ser realizada, registrar exatamente o procedimento pendente e usar Aguardando validação ou Bloqueada no progresso, conforme o motivo. Não substituir evidência real por suposição.

## Entrega esperada

- Registro de ações, prompts semânticos e menu completo.
- Exemplos e testes cobrindo cada modo.
