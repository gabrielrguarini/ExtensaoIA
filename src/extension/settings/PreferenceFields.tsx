import type { PreferencePatch, WritingPreferences } from '../../shared/preferences';
import { WRITING_ACTIONS, writingAction } from '../../shared/actions';
import { useLayoutEffect, useRef } from 'react';
import type { ReactNode } from 'react';

export function PreferenceFields({
  value,
  disabled,
  onChange,
  children,
}: {
  value: WritingPreferences;
  disabled: boolean;
  onChange: (patch: PreferencePatch) => void;
  children?: ReactNode;
}) {
  const focus = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (disabled || !focus.current?.isConnected) return;
    if (!document.activeElement || document.activeElement === document.body) focus.current.focus();
    focus.current = null;
  }, [disabled]);
  return (
    <fieldset className="preference-fields" disabled={disabled}>
      <legend>Como escrever</legend>
      <label>
        Ao clicar em IA
        <select
          aria-label="Ao clicar em IA"
          value={value.interaction}
          onChange={(e) => {
            if (e.nativeEvent.isTrusted) {
              focus.current = e.currentTarget;
              onChange({ interaction: e.currentTarget.value as WritingPreferences['interaction'] });
            }
          }}
        >
          <option value="direct">Substituir diretamente</option>
          <option value="preview">Revisar sugestão</option>
        </select>
      </label>
      <p className="field-hint">
        {value.interaction === 'direct'
          ? 'A IA aplica o resultado no rascunho. Use Ctrl+Z para desfazer.'
          : 'Confira a sugestão antes de copiar ou substituir.'}
      </p>
      <label>
        Ação do botão IA
        <select
          aria-label="Ação do botão IA"
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
      <p className="field-hint">
        {writingAction(value.defaultAction).summary}. Clique em IA no WhatsApp para aplicar esta
        ação ao rascunho.
      </p>
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
        Preservar gírias
      </label>
      <p className="field-hint">A ação Formal pode adaptar as gírias.</p>
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
      <details className="ai-options">
        <summary>IA e modelos</summary>
        <label>
          Inteligência artificial
          <select
            aria-label="Inteligência artificial"
            value={value.engine}
            onChange={(e) => {
              if (e.nativeEvent.isTrusted) {
                focus.current = e.currentTarget;
                onChange({ engine: e.currentTarget.value as WritingPreferences['engine'] });
              }
            }}
          >
            <option value="chrome-preferred">Automática (recomendado)</option>
            <option value="local">Usar o modelo escolhido</option>
          </select>
        </label>
        <p className="field-hint">
          No modo automático, usamos a IA do navegador quando estiver pronta. Caso contrário, usamos
          o modelo abaixo. A escrita é em português do Brasil.
        </p>
        <label>
          {value.engine === 'chrome-preferred' ? 'Modelo alternativo' : 'Modelo'}
          <select
            aria-label="Modelo"
            value={value.localModel === 'gemma' ? 'gemma' : value.profile}
            onChange={(e) => {
              if (!e.nativeEvent.isTrusted) return;
              focus.current = e.currentTarget;
              const selected = e.currentTarget.value;
              onChange(
                selected === 'gemma'
                  ? { localModel: 'gemma' }
                  : { localModel: 'webllm', profile: selected as WritingPreferences['profile'] },
              );
            }}
          >
            <option value="economico">Llama 3.2 · 3B</option>
            <option value="equilibrado">Qwen3 · 4B</option>
            <option value="qualidade">Qwen3 · 8B</option>
            <option value="gemma">Gemma 4 · E2B</option>
          </select>
        </label>
        {children}
      </details>
    </fieldset>
  );
}
