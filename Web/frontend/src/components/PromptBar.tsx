import { useLayoutEffect, useRef, type ReactNode } from "react";
import { ArrowUp } from "lucide-react";
import "./PromptBar.css";

type PromptBarProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  label: string;
  sendLabel: string;
  placeholder: string;
  disabled?: boolean;
  maxLength?: number;
  actions?: ReactNode;
  attachment?: ReactNode;
};

/**
 * LearnUnlock's raised prompt surface and bottom-row send action.
 * Keeps multiline drafts bounded; Enter sends, while Shift+Enter and input
 * composition keep editing. Network state and draft ownership stay with the caller.
 */
export function PromptBar({
  value,
  onChange,
  onSend,
  label,
  sendLabel,
  placeholder,
  disabled = false,
  maxLength = 4000,
  actions,
  attachment,
}: PromptBarProps) {
  const input = useRef<HTMLTextAreaElement>(null);
  const composing = useRef(false);
  const canSend = !disabled && !!value.trim();
  useLayoutEffect(() => {
    const element = input.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.max(64, Math.min(element.scrollHeight, 200))}px`;
  }, [value]);
  function submit() {
    if (canSend) onSend();
  }
  return (
    <form
      className="prompt-bar"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      {attachment}
      <textarea
        ref={input}
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={2}
        maxLength={maxLength}
        onCompositionStart={() => {
          composing.current = true;
        }}
        onCompositionEnd={() => {
          composing.current = false;
        }}
        onKeyDown={(event) => {
          if (
            event.key === "Enter" &&
            !event.shiftKey &&
            !composing.current &&
            !event.nativeEvent.isComposing &&
            event.keyCode !== 229
          ) {
            event.preventDefault();
            submit();
          }
        }}
      />
      <div className="prompt-bar-actions">
        <div className="prompt-bar-tools">{actions}</div>
        <button type="submit" aria-label={sendLabel} disabled={!canSend}>
          <ArrowUp aria-hidden="true" size={18} />
        </button>
      </div>
    </form>
  );
}
