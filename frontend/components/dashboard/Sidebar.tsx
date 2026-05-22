"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  hasPermission,
  useAuth,
  type AuthUser,
  isCustomerOnly,
  customerNeedsTenant,
} from "@/lib/auth";
import { useJoinRequestsStore } from "@/lib/store/join-requests";

type NavItem = {
  href: string;
  label: string;
  permission?: string;
  roles?: string[];
  hideForCustomerOnly?: boolean;
  requiresTenant?: boolean;
};

type NavGroup = {
  id: string;
  label: string | null;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    id: "root",
    label: null,
    items: [{ href: "/dashboard", label: "Dashboard" }],
  },
  {
    id: "scheduling",
    label: "Scheduling",
    items: [
      {
        href: "/dashboard/appointments",
        label: "Appointments",
        permission: "appointments:read",
        requiresTenant: true,
      },
      {
        href: "/dashboard/calendar",
        label: "Calendar",
        permission: "calendar:read",
        requiresTenant: true,
      },
      {
        href: "/dashboard/availability",
        label: "Availability",
        permission: "availability:read",
        requiresTenant: true,
        hideForCustomerOnly: true,
      },
      {
        href: "/dashboard/service-types",
        label: "Service Types",
        permission: "service-types:read",
        hideForCustomerOnly: true,
        requiresTenant: true,
      },
      {
        href: "/dashboard/booking",
        label: "Book Appointment",
        permission: "appointments:create",
        requiresTenant: true,
      },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    items: [
      {
        href: "/dashboard/inventory",
        label: "Inventory",
        permission: "inventory:read",
        requiresTenant: true,
      },
      {
        href: "/dashboard/operations",
        label: "Operations",
        permission: "operations:read",
        requiresTenant: true,
      },
    ],
  },
  {
    id: "assistant",
    label: "Assistant",
    items: [
      {
        href: "/dashboard/assistant",
        label: "Assistant",
        permission: "chat:use",
        requiresTenant: true,
      },
    ],
  },
  {
    id: "marketing",
    label: "Marketing & Growth",
    items: [
      {
        href: "/dashboard/campaigns",
        label: "Campaigns",
        permission: "campaigns:read",
        requiresTenant: true,
        hideForCustomerOnly: true,
      },
      {
        href: "/dashboard/whatsapp",
        label: "WhatsApp",
        permission: "whatsapp:read",
        requiresTenant: true,
        hideForCustomerOnly: true,
      },
      {
        href: "/dashboard/seo",
        label: "SEO Audit",
        permission: "seo:read",
        requiresTenant: true,
        hideForCustomerOnly: true,
      },
      {
        href: "/dashboard/analytics",
        label: "Analytics",
        permission: "analytics:read",
        requiresTenant: true,
        hideForCustomerOnly: true,
      },
    ],
  },
  {
    id: "admin",
    label: "Admin",
    items: [
      {
        href: "/dashboard/users",
        label: "Users",
        permission: "users:read",
        requiresTenant: true,
      },
      {
        href: "/dashboard/join-requests",
        label: "Join Requests",
        permission: "join-requests:manage",
        requiresTenant: true,
      },
      {
        href: "/dashboard/notifications",
        label: "Notifications",
        permission: "notifications:read",
        requiresTenant: true,
      },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      {
        href: "/dashboard/settings",
        label: "Settings",
        permission: "tenants:update",
        requiresTenant: true,
      },
      {
        href: "/dashboard/modules",
        label: "Modules",
        permission: "tenants:update",
        requiresTenant: true,
      },
    ],
  },
];

const PENDING_TENANT_NAV: NavItem[] = [
  { href: "/dashboard/pending-tenant", label: "Organization access" },
];

function isVisible(item: NavItem, user: AuthUser | null): boolean {
  if (!user) return false;
  if (item.roles?.length) return item.roles.some((r) => user.roles.includes(r));
  if (item.permission && !hasPermission(user, item.permission)) return false;
  if (item.hideForCustomerOnly && isCustomerOnly(user)) return false;
  if (item.requiresTenant && customerNeedsTenant(user)) return false;
  return true;
}

function getStorageKey(groupId: string) {
  return `nav-section-${groupId}`;
}

export type SidebarProps = {
  isOpen?: boolean;
  onClose?: () => void;
};

function SidebarBrand({ user }: { user: AuthUser | null }) {
  return (
    <div className="border-b border-[var(--na-border-subtle)] px-5 py-5">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2.5 text-[15px] font-semibold tracking-tight text-[var(--na-text)] transition-opacity hover:opacity-80"
      >
        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white"
          style={{
            background: "linear-gradient(135deg, #3c72e8 0%, #6232d4 100%)",
            boxShadow: "0 0 12px rgba(60,114,232,0.5)",
          }}
        >
          N
        </span>
        NexaAssist
      </Link>
      {user?.tenant && (
        <p
          className="mt-2 truncate rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest"
          style={{
            color: "rgba(122,173,255,0.7)",
            background: "rgba(60,114,232,0.08)",
            border: "1px solid rgba(60,114,232,0.12)",
          }}
        >
          {user.tenant.name}
        </p>
      )}
    </div>
  );
}

function SidebarFooter() {
  return (
    <div className="border-t border-[var(--na-border-subtle)] px-4 py-3">
      <p
        className="text-[9px] font-medium uppercase tracking-[0.15em]"
        style={{ color: "rgba(175,200,240,0.28)" }}
      >
        NexaAssist OS
      </p>
    </div>
  );
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const pendingCount = useJoinRequestsStore((s) => s.pendingCount);
  const fetchPendingCount = useJoinRequestsStore((s) => s.fetchPendingCount);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const stored: Record<string, boolean> = {};
    for (const group of NAV_GROUPS) {
      const val = localStorage.getItem(getStorageKey(group.id));
      if (val !== null) {
        stored[group.id] = val === "true";
      }
    }
    // Auto-expand the group that contains the active route
    for (const group of NAV_GROUPS) {
      const hasActive = group.items.some((item) =>
        item.href === "/dashboard"
          ? pathname === "/dashboard"
          : pathname?.startsWith(item.href),
      );
      if (hasActive) {
        stored[group.id] = false;
      }
    }
    setCollapsed(stored);
  }, [pathname]);

  const toggleGroup = useCallback((groupId: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [groupId]: !prev[groupId] };
      localStorage.setItem(getStorageKey(groupId), String(next[groupId]));
      return next;
    });
  }, []);

  useEffect(() => {
    if (user && hasPermission(user, "join-requests:manage") && !customerNeedsTenant(user)) {
      void fetchPendingCount();
    }
  }, [user, fetchPendingCount, pathname]);

  const handleNavClick = useCallback(() => {
    onClose?.();
  }, [onClose]);

  const asideClass = [
    "fixed inset-y-0 left-0 z-50 flex w-60 shrink-0 flex-col",
    "border-r border-[var(--na-border-subtle)] bg-[var(--na-bg-deep)]",
    "transition-transform duration-200",
    "md:static md:translate-x-0 lg:w-[264px]",
    isOpen ? "translate-x-0" : "-translate-x-full",
  ].join(" ");

  if (user && customerNeedsTenant(user)) {
    return (
      <>
        {isOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={onClose}
          />
        )}
        <aside className={asideClass}>
          <SidebarBrand user={user} />
          <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2.5">
            {PENDING_TENANT_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className={`na-nav-link ${pathname === item.href ? "active" : ""}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <SidebarFooter />
        </aside>
      </>
    );
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={onClose}
        />
      )}
      <aside className={asideClass}>
        <SidebarBrand user={user} />
        <nav className="flex flex-1 flex-col overflow-y-auto p-2.5">
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter((item) => isVisible(item, user));
            if (visibleItems.length === 0) return null;

            const isGroupCollapsed = collapsed[group.id] ?? false;

            // Root group (Dashboard only) — no collapsible header
            if (group.label === null) {
              return (
                <div key={group.id} className="mb-1">
                  {visibleItems.map((item) => {
                    const active = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={handleNavClick}
                        className={`na-nav-link ${active ? "active" : ""}`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              );
            }

            return (
              <div key={group.id} className="mb-1">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className="flex w-full items-center justify-between px-2.5 pb-1 pt-3"
                >
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-[var(--na-muted)]/50">
                    {group.label}
                  </span>
                  <svg
                    className={`h-3 w-3 text-[var(--na-muted)]/40 transition-transform duration-150 ${
                      isGroupCollapsed ? "-rotate-90" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {!isGroupCollapsed && (
                  <div>
                    {visibleItems.map((item) => {
                      const active =
                        item.href === "/dashboard"
                          ? pathname === "/dashboard"
                          : pathname?.startsWith(item.href);
                      const badge =
                        item.href === "/dashboard/join-requests" && pendingCount > 0
                          ? pendingCount
                          : null;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={handleNavClick}
                          className={`na-nav-link justify-between ${active ? "active" : ""}`}
                        >
                          <span>{item.label}</span>
                          {badge != null && (
                            <span
                              className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                              style={{
                                background: "rgba(122,173,255,0.18)",
                                color: "var(--na-accent)",
                              }}
                            >
                              {badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <SidebarFooter />
      </aside>
    </>
  );
}
