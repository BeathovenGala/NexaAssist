"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiPatch, apiPost, apiErrorMessage } from "@/lib/apiEnvelope";
import type { CampaignListItem, Campaign } from "@/lib/types/campaigns";

export default function CampaignApprovalsPage() {
  const [pending, setPending] = useState<CampaignListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Campaign | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    void loadPending();
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    void loadDetail(selectedId);
  }, [selectedId]);

  async function loadPending() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<CampaignListItem[]>("/campaigns", {
        status: "PENDING_APPROVAL",
      });
      const items = Array.isArray(data) ? data : (data as { items?: CampaignListItem[] }).items ?? [];
      setPending(items);
      if (items.length > 0 && !selectedId) {
        setSelectedId(items[0].id);
      }
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to load pending campaigns"));
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(id: string) {
    setDetailLoading(true);
    try {
      const data = await apiGet<Campaign>(`/campaigns/${id}`);
      setDetail(data);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleAction(action: "approve" | "reject" | "revision") {
    if (!selectedId) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const actionMap = {
        approve: "APPROVE",
        reject: "REJECT",
        revision: "REQUEST_REVISION",
      } as const;
      await apiPatch(`/campaigns/${selectedId}/approve`, {
        action: actionMap[action],
        comment: comment || undefined,
      });
      // Remove from pending list
      setPending((prev) => prev.filter((c) => c.id !== selectedId));
      setComment("");
      setDetail(null);
      setSelectedId(null);
    } catch (err) {
      setActionError(apiErrorMessage(err, "Action failed"));
    } finally {
      setSubmitting(false);
    }
  }

  // After removal, auto-select next pending item
  useEffect(() => {
    if (!selectedId && pending.length > 0) {
      setSelectedId(pending[0].id);
    }
  }, [pending, selectedId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[var(--na-border)] bg-[var(--na-surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--na-muted)]">
          <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_theme(colors.amber.400)]" />
          Campaigns
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--na-text)]">
              Approval Center
            </h1>
            <p className="mt-1 text-sm text-[var(--na-muted)]">
              Review and action pending campaign approval requests
            </p>
          </div>
          <Link
            href="/dashboard/campaigns"
            className="shrink-0 text-xs text-[var(--na-muted)] hover:text-[var(--na-accent)]"
          >
            ← All campaigns
          </Link>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4">
          <p className="text-sm text-rose-400">{error}</p>
          <button
            type="button"
            onClick={() => void loadPending()}
            className="mt-2 text-xs text-rose-400 underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="flex gap-4">
          <div className="w-full md:w-1/3 space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)]/50"
              />
            ))}
          </div>
          <div className="hidden md:block md:w-2/3 h-64 animate-pulse rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)]/50" />
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && pending.length === 0 && (
        <div className="rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)] p-16 text-center">
          <p className="text-2xl">✓</p>
          <p className="mt-3 text-sm font-medium text-[var(--na-text)]">All caught up!</p>
          <p className="mt-1 text-sm text-[var(--na-muted)]">No campaigns pending approval.</p>
          <Link
            href="/dashboard/campaigns"
            className="mt-4 inline-block text-xs font-medium text-[var(--na-accent)] hover:underline"
          >
            Back to campaigns →
          </Link>
        </div>
      )}

      {/* Split panel */}
      {!loading && !error && pending.length > 0 && (
        <div className="flex flex-col gap-4 md:flex-row md:gap-0 md:divide-x md:divide-[var(--na-border-subtle)]">
          {/* Left: Pending list */}
          <div className="md:w-1/3 md:pr-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--na-muted)]">
              Pending ({pending.length})
            </p>
            <div className="space-y-1.5 overflow-y-auto md:max-h-[calc(100vh-280px)]">
              {pending.map((campaign) => {
                const isSelected = campaign.id === selectedId;
                return (
                  <button
                    key={campaign.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(campaign.id);
                      setComment("");
                      setActionError(null);
                    }}
                    className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                      isSelected
                        ? "border-amber-500/40 bg-amber-500/10"
                        : "border-[var(--na-border-subtle)] bg-[var(--na-surface)]/50 hover:border-[var(--na-border)] hover:bg-[var(--na-surface)]"
                    }`}
                  >
                    <p
                      className={`text-sm font-medium truncate ${
                        isSelected ? "text-amber-200" : "text-[var(--na-text)]"
                      }`}
                    >
                      {campaign.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-[var(--na-muted)]">
                      {campaign.objective.replace(/_/g, " ")}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--na-muted)]">
                      by {campaign.createdBy?.email ?? "—"} ·{" "}
                      {new Date(campaign.createdAt).toLocaleDateString()}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Detail + actions */}
          <div className="md:w-2/3 md:pl-6">
            {detailLoading && (
              <div className="space-y-3">
                <div className="h-8 w-56 animate-pulse rounded bg-[var(--na-surface)]" />
                <div className="h-48 animate-pulse rounded-lg bg-[var(--na-surface)]" />
              </div>
            )}

            {!detailLoading && !detail && !selectedId && (
              <div className="flex h-40 items-center justify-center rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)]/30">
                <p className="text-sm text-[var(--na-muted)]">Select a campaign to review</p>
              </div>
            )}

            {!detailLoading && detail && (
              <div className="space-y-5">
                {/* Campaign summary */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold text-[var(--na-text)]">{detail.name}</h2>
                      <p className="mt-0.5 text-sm text-[var(--na-muted)]">
                        {detail.objective.replace(/_/g, " ")}
                        {detail.createdBy?.email ? ` · by ${detail.createdBy.email}` : ""}
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/campaigns/${detail.id}`}
                      className="shrink-0 text-xs text-[var(--na-accent)] hover:underline"
                    >
                      Full detail →
                    </Link>
                  </div>
                </div>

                {/* Detail grid */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)] p-4 space-y-2 text-sm">
                    {[
                      { label: "Audience", value: detail.audienceType?.replace(/_/g, " ") ?? "—" },
                      { label: "Est. Reach", value: detail.estimatedReach?.toLocaleString() ?? "—" },
                      { label: "Budget", value: detail.budget ? `$${detail.budget.toLocaleString()}` : "—" },
                      { label: "Channels", value: (detail.channels ?? []).join(", ") || "—" },
                      {
                        label: "Start",
                        value: detail.startDate
                          ? new Date(detail.startDate).toLocaleDateString()
                          : "—",
                      },
                      {
                        label: "End",
                        value: detail.endDate
                          ? new Date(detail.endDate).toLocaleDateString()
                          : "—",
                      },
                    ].map((row) => (
                      <div key={row.label} className="flex justify-between gap-2">
                        <span className="text-[var(--na-muted)]">{row.label}</span>
                        <span className="text-right font-medium text-[var(--na-text)]">{row.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Notes + assets */}
                  <div className="space-y-3">
                    {detail.notes && (
                      <div className="rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)] p-4 text-sm text-[var(--na-muted)]">
                        <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[var(--na-muted)]/60">
                          Notes
                        </p>
                        <p className="line-clamp-4">{detail.notes}</p>
                      </div>
                    )}
                    {detail.posterUrl && (
                      <div className="overflow-hidden rounded-lg border border-[var(--na-border-subtle)]">
                        <img
                          src={detail.posterUrl}
                          alt="Campaign poster"
                          className="max-h-40 w-full object-contain"
                        />
                      </div>
                    )}
                    {!detail.notes && !detail.posterUrl && (
                      <div className="rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)] p-4">
                        <p className="text-xs text-[var(--na-muted)]">No notes or assets.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Comment textarea */}
                <div className="space-y-1">
                  <label className="text-xs font-medium uppercase tracking-wider text-[var(--na-muted)]">
                    Comment (optional)
                  </label>
                  <textarea
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add feedback or notes for the campaign owner…"
                    className="w-full rounded-md border border-[var(--na-border)] bg-[var(--na-surface-2)] px-3 py-2 text-sm text-[var(--na-text)] placeholder:text-[var(--na-muted)]/50 focus:border-[var(--na-accent)]/50 focus:outline-none"
                  />
                </div>

                {actionError && (
                  <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
                    {actionError}
                  </p>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void handleAction("approve")}
                    className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-5 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-40"
                  >
                    {submitting ? "Processing…" : "✓ Approve"}
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void handleAction("revision")}
                    className="rounded-md border border-amber-500/40 bg-amber-500/10 px-5 py-2 text-sm font-medium text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-40"
                  >
                    ↩ Request Revision
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void handleAction("reject")}
                    className="rounded-md border border-rose-500/40 bg-rose-500/10 px-5 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-40"
                  >
                    ✕ Reject
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
