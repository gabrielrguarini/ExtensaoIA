import type { PreferencePatch, WritingPreferences } from '../../shared/preferences';
import { MODEL_PROFILES, PROFILE_LABELS } from '../ai/model-catalog';
import { WRITING_ACTIONS } from '../../shared/actions';
import { useLayoutEffect, useRef } from 'react';

export function PreferenceFields({
  value,
  disabled,
  onChange,
}: {
  value: WritingPreferences;
  disabled: boolean;
  onChange: (patch: PreferencePatch) => void;
}) {
  const focus = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (disabled || !focus.current?.isConnected) return;
    const root = focus.current.getRootNode();
    const active = root instanceof ShadowRoot ? root.activeElement : document.activeElement;
    if (!active || active === document.body) focus.current.focus();
    focus.current = null;
  }, [disabled]);
  return (
    <fieldset className="preference-fields" disabled={disabled}>
      <legend>Preferências de escrita</legend>
      <p>Idioma: Português brasileiro (pt-BR).</p>
      <label>
        Motor de IA
        <select
          aria-label="Motor de IA"
          value={value.engine}
          onChange={(e) => {
            if (e.nativeEvent.isTrusted) {
              focus.current = e.currentTarget;
              onChange({ engine: e.currentTarget.value as WritingPreferences['engine'] });
            }
          }}
        >
          <option value="chrome-preferred">Chrome preferencial</option>
          <option value="local">Modelo local selecionado</option>
        </select>
      </label>
      <p>
        Chrome é escolhido somente quando a ação e pt-BR estiverem disponíveis e preparados. Caso
        contrário, usamos o modelo local selecionado. Prepare a IA do Chrome no painel lateral.
      </p>
      <label>
        Modelo local e alternativa
        <select
          aria-label="Modelo local e alternativa"
          value={value.localModel}
          onChange={(e) => {
            if (e.nativeEvent.isTrusted) {
              focus.current = e.currentTarget;
              onChange({ localModel: e.currentTarget.value as WritingPreferences['localModel'] });
            }
          }}
        >
          <option value="webllm">WebLLM · perfil selecionado</option>
          <option value="gemma">Gemma 4 E2B · Transformers.js</option>
        </select>
      </label>
      <label>
        <input
          type="checkbox"
          checked={value.chromePortuguesePrompt}
          onChange={(event) => {
            if (event.nativeEvent.isTrusted) {
              focus.current = event.currentTarget;
              onChange({ chromePortuguesePrompt: event.currentTarget.checked });
            }
          }}
        />
        Português por prompt no Chrome (experimental)
      </label>
      <p>
        Essa opção pede português do Brasil à IA mesmo quando o navegador não aceita declarar o
        idioma. Usa Prompt nas ações de escrita; confira o idioma e o sentido da sugestão. A
        disponibilidade e a qualidade variam conforme o Chrome. Prepare pelo painel lateral.
      </p>
      <label>
        Tema
        <select
          aria-label="Tema"
          value={value.theme}
          onChange={(e) => {
            if (e.nativeEvent.isTrusted) {
              focus.current = e.currentTarget;
              onChange({ theme: e.currentTarget.value as WritingPreferences['theme'] });
            }
          }}
        >
          <option value="system">Sistema</option>
          <option value="light">Claro</option>
          <option value="dark">Escuro</option>
        </select>
      </label>
      <label>
        Ação padrão
        <select
          aria-label="Ação padrão"
          value={value.defaultAction}
          onChange={(e) => {
            if (e.nativeEvent.isTrusted) {
              focus.current = e.currentTarget;
              onChange({
                defaultAction: e.currentTarget.value as WritingPreferences['defaultAction'],
              });
            }
          }}
        >
          {WRITING_ACTIONS.map((action) => (
            <option key={action.id} value={action.id}>
              {action.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Perfil de IA local
        <select
          aria-label="Perfil de IA local"
          value={value.profile}
          onChange={(e) => {
            if (e.nativeEvent.isTrusted) {
              focus.current = e.currentTarget;
              onChange({ profile: e.currentTarget.value as WritingPreferences['profile'] });
            }
          }}
        >
          {MODEL_PROFILES.map((profile) => (
            <option key={profile} value={profile}>
              {PROFILE_LABELS[profile]}
            </option>
          ))}
        </select>
      </label>
      <label>
        <input
          type="checkbox"
          checked={value.preserveSlang}
          onChange={(e) => {
            if (e.nativeEvent.isTrusted) {
              focus.current = e.currentTarget;
              onChange({ preserveSlang: e.currentTarget.checked });
            }
          }}
        />
        Preservar gírias (Formal pode adaptar)
      </label>
      <label>
        <input
          type="checkbox"
          checked={value.addEmojis}
          onChange={(e) => {
            if (e.nativeEvent.isTrusted) {
              focus.current = e.currentTarget;
              onChange({ addEmojis: e.currentTarget.checked });
            }
          }}
        />
        Permitir novos emojis
      </label>
      <p>A IA é orientada a preservar emojis existentes. Revise a sugestão antes de usar.</p>
    </fieldset>
  );
}
