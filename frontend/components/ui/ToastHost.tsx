"use client";

import { useToastStore } from "@/lib/store/toast";

export function ToastHost() {
  const { message, variant, clear } = useToastStore();
  if (!message) return null;
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[100] flex w-[min(420px,calc(100vw-2rem))] -translate-x-1/2 px-4">
      <div
        role="status"
        className={`pointer-events-auto w-full rounded-md border px-4 py-3 text-sm shadow-[0_25px_50px_rgba(0,0,0,0.45)] ${
          variant === "error"
            ? "border-red-500/30 bg-[#2a1515] text-red-100"
            : "border-[var(--na-border)] bg-[var(--na-surface-2)] text-[var(--na-text)]"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="leading-relaxed">{message}</p>
          <button
            type="button"
            onClick={clear}
            className="shrink-0 rounded border border-[var(--na-border)] px-2 py-0.5 text-xs text-[var(--na-muted)] hover:text-[var(--na-text)]"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
