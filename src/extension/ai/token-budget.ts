export const CONTEXT_TOKENS = 4096;

export interface LlamaTemplate {
  systemTemplate: string;
  prefixTokenIds: number[];
  userRole: string;
  assistantRole: string;
  contentSep: string;
  emptySep: string;
  turnSep: string;
  assistantSuffix?: string;
}

/** Campos usados pelo WebLLM Conversation.getPromptArray() para um turno isolado. */
export type PromptTemplate = LlamaTemplate;

export function parseQwenTemplate(config: unknown): PromptTemplate {
  if (typeof config !== 'object' || !config || !('conv_template' in config))
    throw new Error('Template Qwen ausente.');
  if (typeof config.conv_template !== 'object' || !config.conv_template)
    throw new Error('Template Qwen inválido.');
  const template = config.conv_template as Record<string, unknown>;
  const roles = template.roles as Record<string, unknown> | undefined;
  if (
    template.name !== 'qwen3' ||
    template.system_template !== '<|im_start|>system\n{system_message}<|im_end|>\n' ||
    template.add_role_after_system_message !== true ||
    roles?.user !== '<|im_start|>user' ||
    roles?.assistant !== '<|im_start|>assistant' ||
    template.role_content_sep !== '\n' ||
    template.role_empty_sep !== '\n' ||
    !Array.isArray(template.seps) ||
    template.seps.length !== 1 ||
    template.seps[0] !== '<|im_end|>\n'
  )
    throw new Error('Template Qwen incompatível com a contagem.');
  return {
    systemTemplate: template.system_template,
    prefixTokenIds: [],
    userRole: roles.user,
    assistantRole: roles.assistant,
    contentSep: '\n',
    emptySep: '\n',
    turnSep: '<|im_end|>\n',
    assistantSuffix: '<think>\n\n</think>\n\n',
  };
}

/** Somente o template Llama da revisão fixada é aceito para que a conta corresponda ao runtime. */
export function parseLlamaTemplate(config: unknown): LlamaTemplate {
  if (typeof config !== 'object' || !config || !('conv_template' in config))
    throw new Error('Template do modelo ausente.');
  const template = config.conv_template;
  if (typeof template !== 'object' || !template || !('roles' in template))
    throw new Error('Papéis do template ausentes.');
  const roles = template.roles;
  if (typeof roles !== 'object' || !roles) throw new Error('Papéis inválidos.');
  const value = template as Record<string, unknown>;
  const roleValues = roles as Record<string, unknown>;
  if (
    value.system_template !==
      '<|start_header_id|>system<|end_header_id|>\n\n{system_message}<|eot_id|>' ||
    !Array.isArray(value.system_prefix_token_ids) ||
    value.system_prefix_token_ids.length !== 1 ||
    value.system_prefix_token_ids[0] !== 128000 ||
    value.add_role_after_system_message !== true ||
    roleValues.user !== '<|start_header_id|>user' ||
    roleValues.assistant !== '<|start_header_id|>assistant' ||
    value.role_content_sep !== '<|end_header_id|>\n\n' ||
    value.role_empty_sep !== '<|end_header_id|>\n\n' ||
    !Array.isArray(value.seps) ||
    value.seps.length !== 1 ||
    value.seps[0] !== '<|eot_id|>' ||
    (value.role_templates !== undefined &&
      (typeof value.role_templates !== 'object' ||
        !value.role_templates ||
        (value.role_templates as Record<string, unknown>).user !== '{user_message}'))
  )
    throw new Error('Template do modelo incompatível com a contagem.');
  return {
    systemTemplate: '<|start_header_id|>system<|end_header_id|>\n\n{system_message}<|eot_id|>',
    prefixTokenIds: [128000],
    userRole: '<|start_header_id|>user',
    assistantRole: '<|start_header_id|>assistant',
    contentSep: '<|end_header_id|>\n\n',
    emptySep: '<|end_header_id|>\n\n',
    turnSep: '<|eot_id|>',
  };
}

export interface TokenBudget {
  promptTokens: number;
  draftTokens: number;
  outputTokens: number;
}

/** Codifica cada segmento separadamente, como Conversation.getPromptArray() no WebLLM 0.2.82. */
export function correctionTokenBudget(
  encode: (value: string) => Int32Array,
  template: LlamaTemplate,
  systemPrompt: string,
  draft: string,
  rawDraft = draft,
): TokenBudget | null {
  const system = template.systemTemplate.replace('{system_message}', systemPrompt);
  const user = `${template.userRole}${template.contentSep}${draft}${template.turnSep}`;
  const assistant = `${template.assistantRole}${template.emptySep}${template.assistantSuffix ?? ''}`;
  const promptTokens =
    template.prefixTokenIds.length +
    encode(system).length +
    encode(user).length +
    encode(assistant).length;
  const draftTokens = encode(rawDraft).length;
  const outputTokens = Math.max(128, Math.min(2048, Math.ceil(draftTokens * 1.5) + 64));
  return promptTokens + outputTokens <= CONTEXT_TOKENS
    ? { promptTokens, draftTokens, outputTokens }
    : null;
}

export function semanticTokenBudget(
  encode: (value: string) => Int32Array,
  template: LlamaTemplate,
  systemPrompt: string,
  input: string,
): number | null {
  const system = template.systemTemplate.replace('{system_message}', systemPrompt);
  const user = `${template.userRole}${template.contentSep}${input}${template.turnSep}`;
  const assistant = `${template.assistantRole}${template.emptySep}${template.assistantSuffix ?? ''}`;
  const promptTokens =
    template.prefixTokenIds.length +
    encode(system).length +
    encode(user).length +
    encode(assistant).length;
  return promptTokens + 320 <= CONTEXT_TOKENS ? 320 : null;
}
