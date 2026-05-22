"use client";

import Link from "next/link";
import { ChatComposer } from "./ChatComposer";
import { ConfirmActionBar } from "./ConfirmActionBar";
import { MessageList } from "./MessageList";
import { SuggestionChips } from "./SuggestionChips";
import { useChatSession } from "./useChatSession";

type Props = {
  variant?: "page" | "panel";
};

export function ChatLayout({ variant = "page" }: Props) {
  const {
    sessions,
    activeId,
    setActiveId,
    messages,
    pendingConfirmation,
    busy,
    starterChips,
    followUpSuggestions,
    handleNewSession,
    handleArchiveSession,
    handleSend,
    handleSelectSlot,
    handleConfirm,
    handleCancelPending,
  } = useChatSession();

  const isPanel = variant === "panel";
  const heightClass = isPanel
    ? "h-full min-h-[400px]"
    : "h-[calc(100vh-8rem)] min-h-[480px]";
  const sidebarWidth = isPanel ? "w-44" : "w-56";
  const showStartersInComposer = messages.length === 0 && !pendingConfirmation;

  return (
    <div
      className={`flex overflow-hidden rounded-xl border border-[var(--na-border)] bg-[var(--na-surface)] ${heightClass}`}
    >
      <aside
        className={`hidden shrink-0 flex-col border-r border-[var(--na-border)] md:flex ${sidebarWidth}`}
      >
        <div className="flex items-center justify-between border-b border-[var(--na-border)] p-3">
          <span className="text-sm font-medium text-[var(--na-text)]">Chats</span>
          <button
            type="button"
            onClick={() => void handleNewSession()}
            className="text-xs text-[var(--na-accent)] hover:underline"
            title="New conversation"
          >
            New
          </button>
        </div>
        <ul className="flex-1 overflow-y-auto p-2">
          {sessions.map((s) => (
            <li key={s.id} className="group flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveId(s.id)}
                className={`min-w-0 flex-1 rounded-lg px-3 py-2 text-left text-sm transition ${
                  activeId === s.id
                    ? "bg-[var(--na-accent-soft)] text-[var(--na-text)]"
                    : "text-[var(--na-muted)] hover:bg-[var(--na-surface-elevated)]"
                }`}
              >
                <span className="block truncate">{s.title ?? "Conversation"}</span>
              </button>
              <button
                type="button"
                aria-label="Delete conversation"
                onClick={(e) => {
                  e.stopPropagation();
                  if (
                    typeof window !== "undefined" &&
                    !window.confirm("Delete this conversation?")
                  ) {
                    return;
                  }
                  void handleArchiveSession(s.id);
                }}
                className="rounded p-1 text-[var(--na-muted)] opacity-0 transition hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-2 border-b border-[var(--na-border)] px-3 py-2 md:hidden">
          <select
            value={activeId ?? ""}
            onChange={(e) => setActiveId(e.target.value)}
            className="na-input min-w-0 flex-1 text-sm"
          >
            <option value="" disabled>
              Select conversation
            </option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title ?? s.id.slice(0, 8)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void handleNewSession()}
            className="shrink-0 text-sm text-[var(--na-accent)]"
          >
            New
          </button>
          {activeId && (
            <button
              type="button"
              aria-label="Delete conversation"
              onClick={() => {
                if (!window.confirm("Delete this conversation?")) return;
                void handleArchiveSession(activeId);
              }}
              className="shrink-0 text-sm text-red-400"
            >
              Delete
            </button>
          )}
        </div>

        {isPanel && (
          <div className="hidden items-center justify-between border-b border-[var(--na-border)] px-3 py-2 md:flex">
            <span className="text-xs font-medium text-[var(--na-muted)]">NexaAssist</span>
            <Link
              href="/dashboard/assistant"
              className="text-xs text-[var(--na-accent)] hover:underline"
            >
              Open full assistant
            </Link>
          </div>
        )}

        <MessageList
          messages={messages}
          starterChips={starterChips}
          onSelectSlot={handleSelectSlot}
          onSend={(t) => void handleSend(t)}
          busy={busy}
        />

        {!pendingConfirmation && followUpSuggestions.length > 0 && (
          <div className="border-t border-[var(--na-border)] px-4 py-2">
            <p className="mb-2 text-xs text-[var(--na-muted)]">Suggested next steps</p>
            <SuggestionChips
              suggestions={followUpSuggestions}
              onSelect={(t) => void handleSend(t)}
              disabled={busy}
            />
          </div>
        )}

        {pendingConfirmation ? (
          <ConfirmActionBar
            onConfirm={() => void handleConfirm()}
            onCancel={() => void handleCancelPending()}
            disabled={busy}
          />
        ) : (
          <ChatComposer
            onSend={(t) => void handleSend(t)}
            disabled={busy}
            quickActions={showStartersInComposer ? starterChips : undefined}
          />
        )}
      </div>
    </div>
  );
}
