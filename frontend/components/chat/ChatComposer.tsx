"use client";

import { FormEvent, useState } from "react";

type Props = {
  onSend: (text: string) => void;
  disabled?: boolean;
  quickActions?: { label: string; message: string }[];
};

export function ChatComposer({ onSend, disabled, quickActions }: Props) {
  const [text, setText] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
  }

  return (
    <div className="border-t border-[var(--na-border)] bg-[var(--na-surface-elevated)]">
      {quickActions && quickActions.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pt-3">
          {quickActions.map((action) => (
            <button
              key={action.label}
              type="button"
              disabled={disabled}
              onClick={() => onSend(action.message)}
              className="rounded-full border border-[var(--na-border)] px-3 py-1 text-xs text-[var(--na-muted)] transition hover:border-[var(--na-accent)] hover:text-[var(--na-text)] disabled:opacity-50"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex gap-2 p-4">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
          placeholder="Ask about appointments, inventory, or team…"
          className="na-input flex-1 text-sm"
        />
        <button type="submit" disabled={disabled || !text.trim()} className="na-btn-primary px-4">
          Send
        </button>
      </form>
    </div>
  );
}
