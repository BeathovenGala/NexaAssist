"use client";

import { useEffect, useState } from "react";
import { useJoinRequestsStore } from "@/lib/store/join-requests";

type RequestFilter = "PENDING" | "APPROVED" | "REJECTED" | "ALL";

export default function JoinRequestsPage() {
  const { items, loading, error, fetchList, approve, reject } = useJoinRequestsStore();
  const [filter, setFilter] = useState<RequestFilter>("PENDING");

  useEffect(() => {
    void fetchList(filter === "ALL" ? undefined : filter);
  }, [fetchList, filter]);

  function statusBadgeClass(status: string): string {
    switch (status) {
      case "PENDING":
        return "border border-amber-400/30 bg-amber-500/10 text-amber-200";
      case "APPROVED":
        return "border border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
      case "REJECTED":
        return "border border-rose-400/30 bg-rose-500/10 text-rose-200";
      default:
        return "border border-[var(--na-border)] bg-[var(--na-surface)] text-[var(--na-muted)]";
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--na-text)]">
          Join requests
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--na-muted)]">
          Approve customers who asked to join your organization.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {(["PENDING", "APPROVED", "REJECTED", "ALL"] as RequestFilter[]).map((value) => (
          <button
            key={value}
            type="button"
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
              filter === value
                ? "border-[var(--na-accent)] bg-[var(--na-accent)]/15 text-[var(--na-accent)]"
                : "border-[var(--na-border)] text-[var(--na-muted)] hover:bg-[var(--na-surface-2)]"
            }`}
            onClick={() => setFilter(value)}
          >
            {value === "ALL" ? "All" : value.charAt(0) + value.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
      {error && (
        <p className="rounded-md border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-100">
          {error}
        </p>
      )}
      <div className="space-y-3">
        {loading && <p className="text-sm text-[var(--na-muted)]">Loading…</p>}
        {!loading && items.length === 0 && (
          <p className="text-sm text-[var(--na-muted)]">No pending requests.</p>
        )}
        {items.map((r) => (
          <div
            key={r.id}
            className="flex flex-col gap-3 rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)] p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-[var(--na-text)]">
                  {r.user.firstName} {r.user.lastName ?? ""}
                </p>
                {filter === "ALL" && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusBadgeClass(r.status)}`}
                  >
                    {r.status}
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--na-muted)]">{r.user.email}</p>
              <p className="mt-1 font-mono text-[10px] text-[var(--na-muted)]">{r.user.userCode}</p>
              <p className="mt-1 text-[11px] text-[var(--na-muted)]">
                Requested {new Date(r.createdAt).toLocaleString()}
              </p>
            </div>
            {r.status === "PENDING" ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  className="na-btn-primary px-3 py-1.5 text-sm"
                  onClick={() => void approve(r.id)}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="rounded-md border border-[var(--na-border)] px-3 py-1.5 text-sm text-[var(--na-muted)] hover:bg-[var(--na-surface-2)]"
                  onClick={() => void reject(r.id)}
                >
                  Reject
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
