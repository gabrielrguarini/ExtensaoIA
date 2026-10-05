# STEP-12 — Adicionar modelos e perfis de hardware

[Plano geral](../PLANO.md) · [Progresso](../PROGRESSO.md)

## Objetivo

Oferecer os perfis Econômico, Equilibrado e Qualidade sem inferências falsas sobre a capacidade do equipamento.

## Pré-requisitos

- [STEP-11](STEP-11.md) e todas as etapas anteriores concluídas, com evidências registradas.

## Tarefas

- [x] Adicionar Llama 3.2 3B Instruct, Qwen3 4B e Qwen3 8B ao catálogo local, com variantes compatíveis e artefatos executáveis empacotados.
- [x] Mapear Econômico para Llama, Equilibrado para Qwen3 4B e Qualidade para Qwen3 8B. Manter Econômico como padrão.
- [x] Validar licença, revisão, runtime e model_lib de cada entrada. Exibir tamanho real conhecido do download, contexto e requisitos estimados separados.
- [x] Verificar features, limits e carregamento real do adaptador WebGPU; apresentar dados indisponíveis como indisponíveis.
- [x] Selecionar variante f32 quando os recursos exigidos por f16 faltarem, informando o requisito de memória maior antes de baixar.
- [x] Desabilitar raciocínio prolongado nos modelos Qwen3 usando a configuração suportada pela versão fixada do runtime.
- [x] Ao trocar modelo, encerrar pedidos em andamento de forma explícita, liberar o anterior e pedir a ação de download apenas quando faltarem artefatos.
- [x] Se o carregamento falhar por recursos, sugerir perfil menor sem alterar silenciosamente a escolha ou baixar outro modelo.

## Limites

- Não aceitar URLs arbitrárias de modelos ou código remoto nas configurações.
- Não usar RAM do sistema ou navigator.deviceMemory como VRAM livre.
- Não exigir que o perfil Qualidade rode em todos os computadores suportados.

## Critérios de conclusão e verificação

- [x] Cada modelo compatível no equipamento pode ser carregado e utilizado; indisponibilidades são registradas.
- [x] Trocar perfil não mantém dois modelos na GPU nem mistura respostas.
- [x] Licenças, tamanhos e variantes apresentados correspondem aos artefatos fixados.
- [x] Erros de memória ou incompatibilidade orientam o usuário sem fallback remoto.

Quando uma verificação não puder ser realizada, registrar exatamente o procedimento pendente e usar Aguardando validação ou Bloqueada no progresso, conforme o motivo. Não substituir evidência real por suposição.

## Entrega esperada

- Catálogo de modelos, seleção de perfis e informações de hardware.
- Matriz de compatibilidade efetivamente verificada.
