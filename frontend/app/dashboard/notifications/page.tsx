"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useNotificationsStore } from "@/lib/store/notifications";

const FILTERS = [
  { label: "All", status: undefined, type: undefined },
  { label: "Unread", status: "UNREAD", type: undefined },
  { label: "Appointments", status: undefined, type: "APPOINTMENT" },
  { label: "Inventory", status: undefined, type: "INVENTORY" },
  { label: "System", status: undefined, type: "SYSTEM" },
] as const;

export default function NotificationsPage() {
  const [active, setActive] = useState(0);
  const [criticalOnly, setCriticalOnly] = useState(false);
  const { items, loading, unreadCount, fetchList, markRead, markAllRead, setFilters } =
    useNotificationsStore();

  useEffect(() => {
    const f = FILTERS[active];
    setFilters({ status: f.status, type: f.type });
    void fetchList();
  }, [active, fetchList, setFilters]);

  const displayed = criticalOnly
    ? items.filter((n) => n.priority === "CRITICAL")
    : items;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--na-text)]">
            Notifications
          </h1>
          <p className="mt-2 text-sm text-[var(--na-muted)]">
            {unreadCount} unread · operational inbox
          </p>
        </div>
        {unreadCount > 0 ? (
          <button
            type="button"
            className="na-btn-secondary px-4 py-2 text-sm"
            onClick={() => void markAllRead()}
          >
            Mark all read
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f, i) => (
          <button
            key={f.label}
            type="button"
            className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
              active === i && !criticalOnly
                ? "border-[var(--na-accent)] bg-[var(--na-surface-2)] text-[var(--na-accent)]"
                : "border-[var(--na-border)] text-[var(--na-muted)]"
            }`}
            onClick={() => {
              setCriticalOnly(false);
              setActive(i);
            }}
          >
            {f.label}
          </button>
        ))}
        <button
          type="button"
          className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
            criticalOnly
              ? "border-rose-500/50 bg-rose-500/10 text-rose-200"
              : "border-[var(--na-border)] text-[var(--na-muted)]"
          }`}
          onClick={() => setCriticalOnly(true)}
        >
          Critical
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--na-muted)]">Loading…</p>
      ) : displayed.length === 0 ? (
        <p className="text-sm text-[var(--na-muted)]">No notifications.</p>
      ) : (
        <ul className="space-y-3">
          {displayed.map((n) => (
            <li
              key={n.id}
              className={`na-card border p-4 ${
                n.status === "UNREAD"
                  ? "border-[var(--na-accent)]/30 bg-[var(--na-surface)]/60"
                  : "border-[var(--na-border-subtle)]"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--na-text)]">
                      {n.title}
                    </span>
                    {n.priority === "CRITICAL" || n.priority === "HIGH" ? (
                      <span className="rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-rose-300">
                        {n.priority}
                      </span>
                    ) : null}
                    <span className="text-[10px] uppercase text-[var(--na-muted)]">
                      {n.type}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--na-muted)]">{n.message}</p>
                  <p className="mt-2 text-xs text-[var(--na-muted)]">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {n.actionUrl ? (
                    <Link
                      href={n.actionUrl}
                      className="na-btn-secondary px-3 py-1.5 text-xs no-underline"
                    >
                      Open
                    </Link>
                  ) : null}
                  {n.status === "UNREAD" ? (
                    <button
                      type="button"
                      className="rounded-md border border-[var(--na-border)] px-3 py-1.5 text-xs text-[var(--na-text)]"
                      onClick={() => void markRead(n.id)}
                    >
                      Mark read
                    </button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
