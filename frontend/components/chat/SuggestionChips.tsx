"use client";

import type { ChatSuggestion } from "@/lib/chat";

type Props = {
  suggestions: ChatSuggestion[];
  onSelect: (message: string) => void;
  disabled?: boolean;
  className?: string;
};

export function SuggestionChips({
  suggestions,
  onSelect,
  disabled,
  className = "",
}: Props) {
  if (!suggestions.length) return null;
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {suggestions.map((s) => (
        <button
          key={`${s.label}-${s.message}`}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(s.message)}
          className="rounded-full border border-[var(--na-accent)]/40 bg-[var(--na-accent-soft)] px-3 py-1 text-xs font-medium text-[var(--na-text)] transition hover:border-[var(--na-accent)] hover:bg-[var(--na-accent)] hover:text-white disabled:opacity-50"
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
