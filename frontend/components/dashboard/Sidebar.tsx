"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  BarChart3,
  Bot,
  Box,
  Calendar,
  CalendarClock,
  ClipboardList,
  LayoutDashboard,
  Megaphone,
  MessageCircle,
  Package,
  Search,
  Settings,
  Shield,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import {
  hasPermission,
  useAuth,
  type AuthUser,
  isCustomerOnly,
  customerNeedsTenant,
} from "@/lib/auth";
import { useJoinRequestsStore } from "@/lib/store/join-requests";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
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
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    id: "scheduling",
    label: "Scheduling",
    items: [
      {
        href: "/dashboard/appointments",
        label: "Appointments",
        icon: Calendar,
        permission: "appointments:read",
        requiresTenant: true,
      },
      {
        href: "/dashboard/calendar",
        label: "Calendar",
        icon: CalendarClock,
        permission: "calendar:read",
        requiresTenant: true,
      },
      {
        href: "/dashboard/availability",
        label: "Availability",
        icon: ClipboardList,
        permission: "availability:read",
        requiresTenant: true,
        hideForCustomerOnly: true,
      },
      {
        href: "/dashboard/service-types",
        label: "Service Types",
        icon: Wrench,
        permission: "service-types:read",
        hideForCustomerOnly: true,
        requiresTenant: true,
      },
      {
        href: "/dashboard/booking",
        label: "Book Appointment",
        icon: Calendar,
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
        icon: Package,
        permission: "inventory:read",
        requiresTenant: true,
      },
      {
        href: "/dashboard/operations",
        label: "Operations",
        icon: Box,
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
        icon: Bot,
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
        icon: Megaphone,
        permission: "campaigns:read",
        requiresTenant: true,
        hideForCustomerOnly: true,
      },
      {
        href: "/dashboard/whatsapp",
        label: "WhatsApp",
        icon: MessageCircle,
        permission: "whatsapp:read",
        requiresTenant: true,
        hideForCustomerOnly: true,
      },
      {
        href: "/dashboard/seo",
        label: "SEO Audit",
        icon: Search,
        permission: "seo:read",
        requiresTenant: true,
        hideForCustomerOnly: true,
      },
      {
        href: "/dashboard/analytics",
        label: "Analytics",
        icon: BarChart3,
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
        icon: Users,
        permission: "users:read",
        requiresTenant: true,
      },
      {
        href: "/dashboard/join-requests",
        label: "Join Requests",
        icon: Shield,
        permission: "join-requests:manage",
        requiresTenant: true,
      },
      {
        href: "/dashboard/notifications",
        label: "Notifications",
        icon: MessageCircle,
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
        icon: Settings,
        permission: "tenants:update",
        requiresTenant: true,
      },
      {
        href: "/dashboard/modules",
        label: "Modules",
        icon: LayoutDashboard,
        permission: "tenants:update",
        requiresTenant: true,
      },
    ],
  },
];

const PENDING_TENANT_NAV: NavItem[] = [
  { href: "/dashboard/pending-tenant", label: "Organization access", icon: Shield },
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
    <div className="border-b border-white/[0.08] px-5 py-5">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2.5 text-[15px] font-semibold tracking-tight text-white transition-opacity hover:opacity-85"
      >
        <span
          className="na-sidebar-brand-glow flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white"
          style={{
            background: "linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)",
          }}
        >
          N
        </span>
        NexaAssist
      </Link>
      {user?.tenant && (
        <p className="mt-2 truncate rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-white/50">
          {user.tenant.name}
        </p>
      )}
    </div>
  );
}

function SidebarFooter() {
  return (
    <div className="border-t border-white/[0.08] px-4 py-3">
      <p className="text-[9px] font-medium uppercase tracking-[0.15em] text-white/30">
        NexaAssist OS
      </p>
    </div>
  );
}

function NavLinkContent({
  item,
  active,
  badge,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  badge: number | null;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn("na-nav-link gap-3", active && "active", badge != null && "justify-between")}
    >
      <span className="flex min-w-0 items-center gap-3">
        <Icon
          className={cn(
            "h-4 w-4 shrink-0",
            active ? "text-white" : "text-white/45",
          )}
          strokeWidth={active ? 2.25 : 1.75}
        />
        <span className="truncate">{item.label}</span>
      </span>
      {badge != null && (
        <span className="rounded-full border border-violet-400/30 bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold text-violet-200">
          {badge}
        </span>
      )}
    </Link>
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

  const asideClass = cn(
    "fixed inset-y-0 left-0 z-50 flex w-60 shrink-0 flex-col",
    "border-r border-white/[0.08] bg-black/90 backdrop-blur-xl",
    "transition-transform duration-200",
    "md:static md:translate-x-0 lg:w-[264px]",
    isOpen ? "translate-x-0" : "-translate-x-full",
  );

  if (user && customerNeedsTenant(user)) {
    return (
      <>
        {isOpen && (
          <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={onClose} />
        )}
        <aside className={asideClass}>
          <SidebarBrand user={user} />
          <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2.5">
            {PENDING_TENANT_NAV.map((item) => (
              <NavLinkContent
                key={item.href}
                item={item}
                active={pathname === item.href}
                badge={null}
                onNavigate={handleNavClick}
              />
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
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={onClose} />
      )}
      <aside className={asideClass}>
        <SidebarBrand user={user} />
        <nav className="flex flex-1 flex-col overflow-y-auto p-2.5">
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter((item) => isVisible(item, user));
            if (visibleItems.length === 0) return null;

            const isGroupCollapsed = collapsed[group.id] ?? false;

            if (group.label === null) {
              return (
                <div key={group.id} className="mb-1">
                  {visibleItems.map((item) => (
                    <NavLinkContent
                      key={item.href}
                      item={item}
                      active={pathname === item.href}
                      badge={null}
                      onNavigate={handleNavClick}
                    />
                  ))}
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
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/35">
                    {group.label}
                  </span>
                  <svg
                    className={cn(
                      "h-3 w-3 text-white/30 transition-transform duration-150",
                      isGroupCollapsed && "-rotate-90",
                    )}
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
                        <NavLinkContent
                          key={item.href}
                          item={item}
                          active={!!active}
                          badge={badge}
                          onNavigate={handleNavClick}
                        />
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
