"use client";

import {
  BarChart3,
  Bot,
  Calendar,
  Package,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { DashboardCard, DashboardCardLink } from "@/components/dashboard/DashboardCard";
import { AnimatedRobotFallback } from "@/components/ui/animated-robot-fallback";

const QUICK_LINKS = [
  {
    label: "Appointments",
    href: "/dashboard/appointments",
    hint: "Schedule & calendar",
    icon: Calendar,
    accent: "text-sky-300",
  },
  {
    label: "Inventory",
    href: "/dashboard/inventory",
    hint: "Stock & movements",
    icon: Package,
    accent: "text-emerald-300",
  },
  {
    label: "Assistant",
    href: "/dashboard/assistant",
    hint: "AI operations",
    icon: Bot,
    accent: "text-violet-300",
  },
  {
    label: "Analytics",
    href: "/dashboard/analytics",
    hint: "KPIs & insights",
    icon: BarChart3,
    accent: "text-amber-300",
  },
] as const;

export default function DashboardPage() {
  const { user, isLoading } = useAuth();

  if (isLoading || !user) {
    return <p className="text-sm text-[var(--na-muted)]">Loading…</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-[var(--na-muted)] backdrop-blur-md">
          <span className="h-2 w-2 rounded-full bg-violet-400 shadow-[0_0_8px_theme(colors.violet.400)]" />
          Overview
        </div>
        <div className="mt-4 flex items-center gap-4">
          <div className="h-12 w-12 sm:h-16 sm:w-16">
            <AnimatedRobotFallback />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Dashboard</h1>
        </div>
        <p className="mt-2 max-w-xl text-sm text-[var(--na-muted)]">
          Your operations workspace — same dark glass theme as the marketing home.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK_LINKS.map((item) => {
          const Icon = item.icon;
          return (
            <DashboardCardLink key={item.href} href={item.href} className="group">
              <div className="flex items-start justify-between gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 ${item.accent}`}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </div>
              </div>
              <p className="mt-4 text-sm font-semibold text-white group-hover:text-violet-200">
                {item.label}
              </p>
              <p className="mt-1 text-xs text-[var(--na-muted)]">{item.hint}</p>
            </DashboardCardLink>
          );
        })}
      </div>

      <DashboardCard hover={false} className="p-8">
        <p className="text-sm text-[var(--na-muted)]">Signed in as</p>
        <p className="mt-1 text-lg font-medium text-white">{user.email}</p>
        <p className="mt-3 text-sm text-[var(--na-muted)]">
          User code: <span className="font-mono text-white/90">{user.userCode}</span>
        </p>
        <p className="mt-2 text-sm text-[var(--na-muted)]">
          Roles: <span className="font-medium text-white/90">{user.roles.join(", ")}</span>
        </p>
        {user.tenant && (
          <p className="mt-2 text-sm text-[var(--na-muted)]">
            Organization:{" "}
            <span className="font-medium text-white/90">
              {user.tenant.name} ({user.tenant.slug})
            </span>
          </p>
        )}
      </DashboardCard>
    </div>
  );
}
