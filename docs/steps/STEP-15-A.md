# STEP-15-A — Sugestões com avisos e contratos

[Plano geral](../PLANO.md) · [Progresso](../PROGRESSO.md) · [STEP-15 principal](STEP-15.md)

## Objetivo e pré-requisitos

Partir da STEP-14 concluída e da implementação parcial histórica da STEP-15. Melhorar disponibilidade das sugestões sem ocultar riscos. As avaliações dos Qwen continuam pendentes na etapa principal; não são pré-requisito para mudar o fluxo autorizado.

## Tarefas

- Atualizar plano, sequência A–D e entrega final, preservando o relatório histórico e suas pendências.
- Generalizar identidade, capacidades, disponibilidade por idioma/ação e resultado com avaliação de riscos no contrato AIEngine; manter initialize, isReady, generate e unload.
- Gerar uma vez com o texto original. Preservar o caminho ENTITY_* exclusivamente para comparação histórica.
- Exibir toda resposta final legível com aviso geral e riscos específicos de entidades, negação, intenção, omissões e acréscimos. Copiar e Substituir mesmo assim não exigem confirmação adicional.
- Separar falhas técnicas (vazio, ilegível, incompleto, limites do runtime) de avisos de conteúdo. Resultado idêntico aparece como sem alterações.
- Mover análise semântica para ação explícita na prévia, retornando avisos. A preferência opcional passa a mostrar esse botão; nunca disparar análise automática.
- Preservar aplicação manual, cancelamento, exclusão de eventos atrasados, desconexão e vínculo ao rascunho.
- Tornar campanhas do WebLLM retomáveis em blocos de até 12, com checkpoint por resultado, erros/pedidos pendentes preservados e proteção contra mistura de versões/datasets. Permitir comparação original/legado.

## Aceite e validação

- Testes de saídas arriscadas, vazias, idênticas, Unicode inválido, avisos, revisão explícita, fronteiras do protocolo e rascunho desatualizado.
- Retomada reproduzível sem repetir casos concluídos nem apagar erros de tentativas anteriores.
- Chrome instalado com WebLLM/WebGPU real: geração única, prévia, avisos, substituição manual, desfazer e inferência offline. Fixtures sintéticas são adequadas; não substituir esta verificação por mocks.
- Verificações completas do projeto aprovadas, documentação navegável e evidências.

## Limites

Não implementar Chrome nativo, instalar tipagens nativas nem Transformers.js nesta subetapa. Não declarar o vencedor de desempenho nem completar artificialmente campanhas pendentes. A comparação e anotação de 108 novos rascunhos distintos ficam na STEP-15-D.

## Evidências

Relatório com procedimentos, ambiente, resultados, pendências e evidências sintéticas da subetapa.

Próxima subetapa: [STEP-15-B](STEP-15-B.md).
