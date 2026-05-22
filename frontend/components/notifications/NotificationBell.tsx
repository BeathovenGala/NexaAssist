"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useNotificationsStore } from "@/lib/store/notifications";
import { hasPermission, useAuth } from "@/lib/auth";

export function NotificationBell() {
  const { user } = useAuth();
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const fetchUnreadCount = useNotificationsStore((s) => s.fetchUnreadCount);

  const canRead = hasPermission(user, "notifications:read");

  useEffect(() => {
    if (!canRead) return;
    void fetchUnreadCount();
    const t = setInterval(() => void fetchUnreadCount(), 30_000);
    return () => clearInterval(t);
  }, [canRead, fetchUnreadCount]);

  if (!canRead) return null;

  return (
    <Link
      href="/dashboard/notifications"
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--na-border)] text-[var(--na-muted)] no-underline transition hover:border-[var(--na-muted)]/50 hover:bg-[var(--na-surface-2)] hover:text-[var(--na-text)]"
      aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
    >
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      {unreadCount > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--na-accent-solid)] px-1 text-[10px] font-bold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}
