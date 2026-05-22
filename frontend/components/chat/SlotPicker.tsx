"use client";

import type { ChatCard } from "@/lib/chat";

type Props = {
  card: Extract<ChatCard, { type: "slot_picker" }>;
  onSelect: (start: string, end: string) => void;
  disabled?: boolean;
};

export function SlotPicker({ card, onSelect, disabled }: Props) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {card.slots.map((slot) => (
        <button
          key={`${slot.start}-${slot.end}`}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(slot.start, slot.end)}
          className="rounded-full border border-[var(--na-border)] bg-[var(--na-surface)] px-3 py-1.5 text-sm text-[var(--na-text)] transition hover:border-[var(--na-accent)] hover:bg-[var(--na-accent-soft)] disabled:opacity-50"
        >
          {slot.label}
        </button>
      ))}
    </div>
  );
}
