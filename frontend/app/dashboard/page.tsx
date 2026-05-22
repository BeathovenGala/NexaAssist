"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";

const QUICK_LINKS = [
  { label: "Appointments", href: "/dashboard/appointments", hint: "Schedule & calendar" },
  { label: "Inventory", href: "/dashboard/inventory", hint: "Stock & movements" },
  { label: "Assistant", href: "/dashboard/assistant", hint: "AI operations" },
  { label: "Analytics", href: "/dashboard/analytics", hint: "KPIs & insights" },
] as const;

export default function DashboardPage() {
  const { user, isLoading } = useAuth();

  if (isLoading || !user) {
    return <p className="text-sm text-[var(--na-muted)]">Loading…</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--na-border)] bg-[var(--na-surface-2)]/80 px-3 py-1.5 text-xs font-medium text-[var(--na-muted)] backdrop-blur-md">
          <span
            className="h-2 w-2 rounded-full shadow-[0_0_8px_var(--na-cyan)]"
            style={{ backgroundColor: "var(--na-cyan)" }}
          />
          Overview
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--na-text)]">
          Dashboard
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK_LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="na-card group block p-5 transition hover:-translate-y-0.5"
          >
            <p className="text-sm font-semibold text-[var(--na-text)] group-hover:text-[var(--na-accent)]">
              {item.label}
            </p>
            <p className="mt-1 text-xs text-[var(--na-muted)]">{item.hint}</p>
          </Link>
        ))}
      </div>

      <div className="na-card p-8">
        <p className="text-sm text-[var(--na-muted)]">Signed in as</p>
        <p className="mt-1 text-lg font-medium text-[var(--na-text)]">{user.email}</p>
        <p className="mt-3 text-sm text-[var(--na-muted)]">
          User code:{" "}
          <span className="font-mono text-[var(--na-text)]">{user.userCode}</span>
        </p>
        <p className="mt-2 text-sm text-[var(--na-muted)]">
          Roles:{" "}
          <span className="font-medium text-[var(--na-text)]">{user.roles.join(", ")}</span>
        </p>
        {user.tenant && (
          <p className="mt-2 text-sm text-[var(--na-muted)]">
            Organization:{" "}
            <span className="font-medium text-[var(--na-text)]">{user.tenant.name}</span> (
            {user.tenant.slug})
          </p>
        )}
      </div>
    </div>
  );
}
