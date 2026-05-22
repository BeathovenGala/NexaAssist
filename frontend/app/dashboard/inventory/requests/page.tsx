"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useInventoryStore } from "@/lib/store/inventory";
import { InventoryRequestsTable } from "@/components/inventory/InventoryRequestsTable";
import { hasPermission, useAuth } from "@/lib/auth";

export default function InventoryRequestsPage() {
  const { user } = useAuth();
  const canApprove = hasPermission(user, "inventory:approve");
  const {
    requests,
    requestsLoading,
    requestsError,
    requestMineOnly,
    setRequestMineOnly,
    fetchRequests,
  } = useInventoryStore();

  useEffect(() => {
    void fetchRequests();
  }, [fetchRequests, requestMineOnly]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--na-text)]">Restock requests</h2>
          <p className="mt-1 text-sm text-[var(--na-muted)]">
            Staff requests and manager approvals.
          </p>
        </div>
        {canApprove ? (
          <label className="flex items-center gap-2 text-xs text-[var(--na-muted)]">
            <input
              type="checkbox"
              checked={requestMineOnly}
              onChange={(e) => setRequestMineOnly(e.target.checked)}
            />
            Only my requests
          </label>
        ) : null}
      </div>
      {requestsError ? <p className="text-sm text-rose-400">{requestsError}</p> : null}
      <InventoryRequestsTable
        rows={requests?.items ?? []}
        loading={requestsLoading}
        canApprove={canApprove}
      />
      <p className="text-center text-xs text-[var(--na-muted)]">
        <Link href="/dashboard/inventory" className="text-[var(--na-accent)] hover:underline">
          Overview
        </Link>
      </p>
    </div>
  );
}
