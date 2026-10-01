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
      <p>A IA é orientada a preservar emojis existentes. Confira a sugestão e os avisos.</p>
      <label>
        <input
          type="checkbox"
          checked={value.semanticReview}
          onChange={(e) => {
            if (e.nativeEvent.isTrusted) {
              focus.current = e.currentTarget;
              onChange({ semanticReview: e.currentTarget.checked });
            }
          }}
        />
        Mostrar botão Analisar sentido na prévia (opcional, mais lento)
      </label>
    </fieldset>
  );
}
