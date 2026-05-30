"use client";

import {
  BarChart3,
  Bell,
  Bot,
  Calendar,
  LayoutDashboard,
  Megaphone,
  Package,
  Search,
  Settings,
  Users,
} from "lucide-react";

const NAV_ICONS = [
  { icon: LayoutDashboard, active: true },
  { icon: Calendar, active: false },
  { icon: Package, active: false },
  { icon: Bot, active: false },
  { icon: Megaphone, active: false },
  { icon: BarChart3, active: false },
  { icon: Users, active: false },
  { icon: Settings, active: false },
] as const;

const QUICK_LINKS = [
  { label: "Appointments", hint: "Schedule & calendar", icon: Calendar, accent: "text-sky-300" },
  { label: "Inventory", hint: "Stock & movements", icon: Package, accent: "text-emerald-300" },
  { label: "Assistant", hint: "AI operations", icon: Bot, accent: "text-violet-300" },
  { label: "Analytics", hint: "KPIs & insights", icon: BarChart3, accent: "text-amber-300" },
] as const;

const STATS = [
  { label: "Today’s bookings", value: "24", delta: "+12%" },
  { label: "Low stock SKUs", value: "3", delta: "Action" },
  { label: "Campaign reach", value: "1.2k", delta: "Live" },
] as const;

/** Static dashboard mock for the marketing hero — matches real dashboard glass styling */
export function HeroDashboardPreview() {
  return (
    <div
      className="flex aspect-[15/9] min-h-[280px] w-full overflow-hidden rounded-xl bg-[#0a0a0f] text-[var(--na-text,#f4f4f5)]"
      aria-hidden
    >
      <aside className="hidden w-14 shrink-0 flex-col border-r border-white/[0.08] bg-[rgba(8,8,12,0.95)] py-4 sm:flex">
        <div className="mb-6 flex justify-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20 text-xs font-bold text-white">
            N
          </div>
        </div>
        <nav className="flex flex-1 flex-col items-center gap-1.5 px-2">
          {NAV_ICONS.map(({ icon: Icon, active }, i) => (
            <div
              key={i}
              className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                active
                  ? "bg-white/10 text-violet-300"
                  : "text-[var(--na-muted,#a1a1aa)]"
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} />
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-11 shrink-0 items-center justify-between border-b border-white/[0.08] bg-[rgba(12,12,18,0.85)] px-3 backdrop-blur-xl sm:px-4">
          <div className="flex items-center gap-2 text-[10px] text-[var(--na-muted,#a1a1aa)] sm:text-xs">
            <span className="hidden font-mono text-[var(--na-text)] sm:inline">NX-2401</span>
            <span className="hidden sm:inline">·</span>
            <span className="truncate font-medium text-white/90">Acme Clinic</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden h-7 max-w-[140px] items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.04] px-2 text-[10px] text-[var(--na-muted)] md:flex">
              <Search className="h-3 w-3" />
              <span>Search…</span>
            </div>
            <div className="relative flex h-7 w-7 items-center justify-center rounded-md text-[var(--na-muted)]">
              <Bell className="h-3.5 w-3.5" />
              <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-violet-400" />
            </div>
          </div>
        </header>

        <div className="flex-1 space-y-4 overflow-hidden p-3 sm:p-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-[var(--na-muted)]">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_6px_theme(colors.violet.400)]" />
              Overview
            </div>
            <h2 className="mt-2 text-base font-semibold tracking-tight text-white sm:text-lg">
              Dashboard
            </h2>
            <p className="mt-0.5 text-[10px] text-[var(--na-muted)] sm:text-xs">
              Your operations workspace
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {QUICK_LINKS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="rounded-xl border border-white/[0.08] bg-[rgba(12,12,18,0.72)] p-2.5 backdrop-blur-xl sm:p-3"
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 ${item.accent}`}
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </div>
                  <p className="mt-2 text-[11px] font-semibold text-white sm:text-xs">{item.label}</p>
                  <p className="mt-0.5 text-[9px] text-[var(--na-muted)] sm:text-[10px]">{item.hint}</p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 py-2 sm:px-3"
              >
                <p className="text-[9px] text-[var(--na-muted)] sm:text-[10px]">{stat.label}</p>
                <p className="mt-0.5 text-sm font-semibold text-white">{stat.value}</p>
                <p className="mt-0.5 text-[9px] text-violet-300/90">{stat.delta}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
