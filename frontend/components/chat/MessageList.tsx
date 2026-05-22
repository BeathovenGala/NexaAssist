"use client";

import { useEffect, useRef } from "react";
import type { ChatCard, ChatMessage } from "@/lib/chat";
import type { ChatQuickAction } from "@/lib/chatQuickActions";
import { SlotPicker } from "./SlotPicker";
import { SuggestionChips } from "./SuggestionChips";

type Props = {
  messages: ChatMessage[];
  starterChips?: ChatQuickAction[];
  onSelectSlot?: (start: string, end: string) => void;
  onSend?: (text: string) => void;
  busy?: boolean;
};

function renderCards(
  cards: ChatCard[] | undefined,
  onSelectSlot?: Props["onSelectSlot"],
  onSend?: Props["onSend"],
  busy?: boolean,
) {
  if (!cards?.length) return null;
  return (
    <div className="mt-2 space-y-2">
      {cards.map((card, i) => {
        if (card.type === "slot_picker" && onSelectSlot) {
          return (
            <SlotPicker
              key={`slot-${i}`}
              card={card}
              onSelect={onSelectSlot}
              disabled={busy}
            />
          );
        }
        if (card.type === "inventory_results") {
          return (
            <ul
              key={`inv-${i}`}
              className="mt-2 space-y-1 rounded-lg border border-[var(--na-border)] bg-[var(--na-surface)] p-3 text-sm"
            >
              {card.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-2">
                  <span>
                    {item.name}{" "}
                    <span className="text-[var(--na-muted)]">({item.sku})</span>
                  </span>
                  <span className="text-[var(--na-muted)]">
                    {item.quantity} · {item.status}
                  </span>
                </li>
              ))}
            </ul>
          );
        }
        if (card.type === "booking_summary") {
          return (
            <div
              key={`book-${i}`}
              className="mt-2 rounded-lg border border-[var(--na-accent)]/30 bg-[var(--na-accent-soft)] p-3 text-sm"
            >
              <p className="font-medium">{card.staffName}</p>
              <p className="text-[var(--na-muted)]">
                {card.date} at {card.time}
                {card.appointmentCode ? ` · ${card.appointmentCode}` : ""}
              </p>
            </div>
          );
        }
        if (card.type === "staff_picker") {
          return (
            <div key={`staff-${i}`} className="mt-2 flex flex-wrap gap-2">
              {card.staff.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  disabled={busy}
                  onClick={() => onSend?.(s.label)}
                  className="rounded-full border border-[var(--na-accent)]/50 bg-[var(--na-accent-soft)] px-3 py-1.5 text-xs font-medium text-[var(--na-text)] transition hover:border-[var(--na-accent)] hover:bg-[var(--na-accent)] hover:text-white disabled:opacity-50"
                >
                  {s.label}
                </button>
              ))}
            </div>
          );
        }
        if (card.type === "confirmation") {
          return (
            <div
              key={`confirm-${i}`}
              className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-[var(--na-text)]"
            >
              {card.summary}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

export function MessageList({
  messages,
  starterChips,
  onSelectSlot,
  onSend,
  busy,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--na-border)] bg-[var(--na-surface-2)] text-2xl">
          🤖
        </div>
        <p className="text-base font-medium text-[var(--na-text)]">How can I help you today?</p>
        <p className="max-w-xs text-sm text-[var(--na-muted)]">
          Ask me to book an appointment, look up inventory, invite a team member, or anything else.
        </p>
        {starterChips && starterChips.length > 0 && onSend && (
          <SuggestionChips
            suggestions={starterChips}
            onSelect={onSend}
            disabled={busy}
            className="mt-2 max-w-md justify-center"
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
      {messages.map((msg) => {
        const isUser = msg.role === "USER";
        const meta = msg.metadata ?? undefined;
        return (
          <div
            key={msg.id}
            className={`flex ${isUser ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                isUser
                  ? "bg-[var(--na-accent)] text-white"
                  : "border border-[var(--na-border)] bg-[var(--na-surface)] text-[var(--na-text)]"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {!isUser && renderCards(meta?.cards, onSelectSlot, onSend, busy)}
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
