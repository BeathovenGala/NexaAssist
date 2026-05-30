"use client";

import { useRouter, usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { FirstTimeServiceModal } from "@/components/dashboard/FirstTimeServiceModal";
import { AssistantFloatingWidget } from "@/components/chat/AssistantFloatingWidget";
import { useAuth, customerNeedsTenant, isDemoUser } from "@/lib/auth";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    if (!localStorage.getItem("accessToken") || !user) {
      const next = encodeURIComponent(pathname ?? "/dashboard");
      router.replace(`/?auth=login&next=${next}`);
      return;
    }
    if (customerNeedsTenant(user) && pathname && !pathname.startsWith("/dashboard/pending-tenant")) {
      router.replace("/dashboard/pending-tenant");
    }
  }, [isLoading, user, router, pathname]);

  // Close drawer on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--na-bg)] text-sm text-[var(--na-muted)]">
        Loading…
      </div>
    );
  }

  return (
    <>
      <div className="dashboard-shell flex min-h-screen bg-[var(--na-bg)] text-[var(--na-text)]">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b border-white/[0.08] bg-[var(--na-header-bg)] px-4 backdrop-blur-2xl lg:px-8">
            <div className="flex items-center gap-3">
              {/* Hamburger — mobile only */}
              <button
                type="button"
                aria-label="Open navigation"
                onClick={() => setSidebarOpen(true)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--na-muted)] transition hover:bg-[var(--na-surface-2)] hover:text-[var(--na-text)] md:hidden"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="min-w-0 text-sm text-[var(--na-muted)]">
                <span className="hidden font-mono text-xs text-[var(--na-text)] sm:inline">
                  {user.userCode}
                </span>
                <span className="mx-2 hidden text-[var(--na-border)] sm:inline">·</span>
                <span className="truncate text-[var(--na-text)]">
                  {user.tenant?.name ?? "Platform"}
                </span>
              </div>
              {isDemoUser(user?.email) && (
                <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-medium text-amber-400 ring-1 ring-amber-500/30">
                  Demo Mode
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell />
              <span className="hidden max-w-[220px] truncate text-sm text-[var(--na-muted)] sm:inline">
                {user.email}
              </span>
              <button
                type="button"
                onClick={() => void logout().then(() => router.replace("/?auth=login"))}
                className="rounded-md border border-[var(--na-border)] bg-transparent px-3 py-1.5 text-sm text-[var(--na-text)] transition hover:border-[var(--na-muted)]/50 hover:bg-[var(--na-surface-2)]"
              >
                Log out
              </button>
            </div>
          </header>
          <main className="flex-1 overflow-auto px-4 py-6 lg:px-10 lg:py-10">
            <div className="mx-auto max-w-[1280px]">{children}</div>
          </main>
        </div>
      </div>
      <FirstTimeServiceModal />
      <AssistantFloatingWidget />
    </>
  );
}
