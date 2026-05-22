"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useInventoryStore } from "@/lib/store/inventory";
import { InventoryAlertsList } from "@/components/inventory/InventoryAlertsList";
import { hasPermission, useAuth } from "@/lib/auth";

export default function InventoryAlertsPage() {
  const { user } = useAuth();
  const canManage = hasPermission(user, "inventory:alerts");
  const { alerts, alertsLoading, alertsError, fetchAlerts } = useInventoryStore();

  useEffect(() => {
    void fetchAlerts();
  }, [fetchAlerts]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-[var(--na-text)]">Alerts</h2>
      <p className="text-sm text-[var(--na-muted)]">
        System-generated operational signals. Acknowledge or resolve to keep the queue clean.
      </p>
      {alertsError ? <p className="text-sm text-rose-400">{alertsError}</p> : null}
      <InventoryAlertsList rows={alerts?.items ?? []} loading={alertsLoading} canManage={canManage} />
      <p className="text-center text-xs text-[var(--na-muted)]">
        <Link href="/dashboard/inventory" className="text-[var(--na-accent)] hover:underline">
          Overview
        </Link>
      </p>
    </div>
  );
}
