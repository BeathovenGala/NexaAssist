"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { hasPermission, useAuth } from "@/lib/auth";
import { ChatLayout } from "./ChatLayout";

const AssistantOrb = dynamic(
  () => import("./AssistantOrb").then((m) => m.AssistantOrb),
  {
    ssr: false,
    loading: () => (
      <div className="h-14 w-14 rounded-full bg-[var(--na-accent)]/30 animate-pulse" />
    ),
  },
);

function StaticOrbFallback() {
  return (
    <div
      className="h-14 w-14 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/40"
      aria-hidden
    />
  );
}

export function AssistantFloatingWidget() {
  const { user, isLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const handler = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onKeyDown]);

  if (isLoading || !user || !hasPermission(user, "chat:use")) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Close assistant" : "Open NexaAssist"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-[var(--na-accent)]/50 bg-[var(--na-surface)] shadow-xl shadow-indigo-900/30 transition hover:scale-105 hover:border-[var(--na-accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--na-accent)]"
      >
        {mounted && !reduceMotion ? (
          <AssistantOrb className="h-12 w-12" />
        ) : (
          <StaticOrbFallback />
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close assistant overlay"
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-label="NexaAssist chat"
            className="fixed bottom-0 right-0 z-50 flex h-[min(100dvh,720px)] w-full max-w-md flex-col border-l border-t border-[var(--na-border)] bg-[var(--na-bg)] shadow-2xl sm:bottom-6 sm:right-6 sm:h-[min(calc(100dvh-3rem),680px)] sm:rounded-xl sm:border"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--na-border)] px-4 py-3">
              <span className="text-sm font-semibold text-[var(--na-text)]">NexaAssist</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-1 text-sm text-[var(--na-muted)] hover:bg-[var(--na-surface-2)] hover:text-[var(--na-text)]"
              >
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1 p-2">
              <ChatLayout variant="panel" />
            </div>
          </div>
        </>
      )}
    </>
  );
}
