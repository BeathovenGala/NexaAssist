"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { hasPermission, useAuth } from "@/lib/auth";

const LINKS: { href: string; label: string; permission?: string }[] = [
  { href: "/dashboard/inventory", label: "Overview", permission: "inventory:read" },
  { href: "/dashboard/inventory/items", label: "Items", permission: "inventory:read" },
  { href: "/dashboard/inventory/requests", label: "Requests", permission: "inventory:read" },
  { href: "/dashboard/inventory/movements", label: "Movements", permission: "inventory:read" },
  { href: "/dashboard/inventory/alerts", label: "Alerts", permission: "inventory:read" },
  { href: "/dashboard/inventory/categories", label: "Categories", permission: "inventory:read" },
];

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const links = LINKS.filter((l) => !l.permission || hasPermission(user, l.permission));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 border-b border-[var(--na-border-subtle)] pb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--na-text)]">Inventory</h1>
        <p className="max-w-2xl text-sm text-[var(--na-muted)]">
          Operational stock, movements, alerts, and restock workflow.
        </p>
        <nav className="flex flex-wrap gap-2 pt-2">
          {links.map((l) => {
            const active =
              l.href === "/dashboard/inventory"
                ? pathname === "/dashboard/inventory"
                : pathname?.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold no-underline transition ${
                  active
                    ? "bg-[var(--na-surface-2)] text-[var(--na-accent)] ring-1 ring-[var(--na-accent)]/25"
                    : "text-[var(--na-muted)] hover:bg-[var(--na-surface)]/80 hover:text-[var(--na-text)]"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
      {children}
    </div>
  );
}
