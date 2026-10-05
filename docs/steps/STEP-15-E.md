# STEP-15-E — Revisão e substituição pelo usuário

[Plano geral](../PLANO.md) · [Progresso](../PROGRESSO.md) · [STEP-15 principal](STEP-15.md)

## Escopo autorizado em 02/10/2026

O usuário pediu a remoção da verificação de alterações, pois correções úteis estavam recebendo avisos indevidos. Esta decisão substitui os requisitos anteriores de avaliação automática e análise semântica na interface; os relatórios e benchmarks históricos permanecem intactos.

## Pré-requisitos

STEP-15-D concluída.

## Tarefas

- Remover a comparação automática de entidades, negação, intenção e demais riscos do fluxo de escrita.
- Remover os avisos de conteúdo, o botão Analisar sentido e a preferência correspondente, migrando as preferências anteriores sem perder motor, modelo ou demais escolhas.
- Apresentar respostas finais legíveis com Copiar e Substituir. O usuário revisa e decide, sem confirmação adicional ou classificação automática de qualidade.
- Manter indicação de resposta idêntica, erros técnicos, geração única, streaming, cancelamento, isolamento e bloqueio de rascunhos desatualizados/desconectados.
- Preservar os prompts de escrita e a infraestrutura Chrome/WebLLM/Gemma. Manter as avaliações antigas somente como ferramentas de comparação histórica, fora do caminho do produto.
- Atualizar o escopo da STEP-16 e documentar o comportamento vigente.

## Aceite e evidências

- Cobrir a frase sintética fornecida pelo usuário: “fazendo o teste da extensao apra ver se funciona de verdade” → “Fazendo o teste da extensão pra ver se funciona de verdade.”, sem avisos de conteúdo.
- Verificar também respostas com mudanças de conteúdo, idênticas, vazias ou inválidas; migração de preferência antiga ligada; rejeição de pedidos da análise removida; cancelamento e obsolescência.
- Validar no Chrome real instalado com inferência local, prévia sem avaliação, substituição manual, desfazer e rascunho desatualizado. Fixtures sintéticas são suficientes para este ajuste; nenhuma mensagem precisa ser enviada.
- Verificações completas do projeto aprovadas e relatório com evidências.
