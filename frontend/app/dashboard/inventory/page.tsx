"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useInventoryStore } from "@/lib/store/inventory";
import { InventoryMetricsBar } from "@/components/inventory/InventoryMetricsBar";
import { StockMovementTimeline } from "@/components/inventory/StockMovementTimeline";
import { InventoryRequestsTable } from "@/components/inventory/InventoryRequestsTable";
import { hasPermission, useAuth } from "@/lib/auth";

export default function InventoryDashboardPage() {
  const { user } = useAuth();
  const canApprove = hasPermission(user, "inventory:approve");
  const { dashboard, dashboardLoading, dashboardError, fetchDashboard } = useInventoryStore();

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  if (dashboardLoading && !dashboard) {
    return <p className="text-sm text-[var(--na-muted)]">Loading dashboard…</p>;
  }
  if (dashboardError) {
    return <p className="text-sm text-rose-400">{dashboardError}</p>;
  }
  if (!dashboard) {
    return null;
  }

  const healthEntries = Object.entries(dashboard.inventoryHealth).filter(([, v]) => v > 0);

  return (
    <div className="space-y-8">
      <InventoryMetricsBar data={dashboard.metrics} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--na-muted)]">
              Active alerts
            </h2>
            <Link
              href="/dashboard/inventory/alerts"
              className="text-xs font-semibold text-[var(--na-accent)] hover:underline"
            >
              View all
            </Link>
          </div>
          <ul className="space-y-2">
            {dashboard.activeAlerts.slice(0, 8).map((a) => (
              <li
                key={a.id}
                className="rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)]/50 px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase text-[var(--na-accent)]">
                  {a.type}
                  <span className="text-[var(--na-muted)]">{a.severity}</span>
                </div>
                <p className="mt-1 text-[var(--na-text)]">{a.message}</p>
                <p className="text-xs text-[var(--na-muted)]">
                  {a.item.name} · {new Date(a.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
            {!dashboard.activeAlerts.length ? (
              <p className="text-sm text-[var(--na-muted)]">No active alerts.</p>
            ) : null}
          </ul>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--na-muted)]">
              Pending requests
            </h2>
            <Link
              href="/dashboard/inventory/requests"
              className="text-xs font-semibold text-[var(--na-accent)] hover:underline"
            >
              View all
            </Link>
          </div>
          <InventoryRequestsTable
            rows={dashboard.pendingRequestItems.map((p) => ({
              id: p.id,
              tenantId: "",
              itemId: p.item.id,
              item: { ...p.item, quantity: 0 },
              requestedById: p.requestedBy.id,
              requestedBy: p.requestedBy,
              quantityRequested: p.quantityRequested,
              approvedQuantity: null,
              fulfilledQuantity: 0,
              priority: p.priority,
              reason: p.reason,
              status: "PENDING",
              managerNotes: null,
              approvedById: null,
              approvedAt: null,
              approvedBy: null,
              createdAt: p.createdAt,
              updatedAt: p.createdAt,
            }))}
            loading={false}
            canApprove={canApprove}
          />
        </section>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--na-muted)]">
          Inventory health (by status)
        </h2>
        <div className="flex flex-wrap gap-2">
          {healthEntries.length ? (
            healthEntries.map(([k, v]) => (
              <span
                key={k}
                className="rounded-full border border-[var(--na-border-subtle)] bg-[var(--na-surface)]/60 px-3 py-1 text-xs font-medium text-[var(--na-text)]"
              >
                {k}: <span className="tabular-nums">{v}</span>
              </span>
            ))
          ) : (
            <p className="text-sm text-[var(--na-muted)]">No items yet.</p>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--na-muted)]">
            Recent movements
          </h2>
          <Link
            href="/dashboard/inventory/movements"
            className="text-xs font-semibold text-[var(--na-accent)] hover:underline"
          >
            Full audit
          </Link>
        </div>
        <StockMovementTimeline
          movements={dashboard.recentMovements.map((m) => ({
            id: m.id,
            tenantId: "",
            itemId: m.item.id,
            item: m.item,
            movementType: m.movementType,
            quantity: m.quantity,
            previousQuantity: m.previousQuantity,
            newQuantity: m.newQuantity,
            reason: null,
            referenceType: null,
            referenceId: null,
            locationId: null,
            performedBy: m.performedBy,
            createdAt: m.createdAt,
          }))}
        />
      </section>
    </div>
  );
}
