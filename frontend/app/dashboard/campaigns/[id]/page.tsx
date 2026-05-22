"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiGet, apiPatch, apiPost, apiErrorMessage } from "@/lib/apiEnvelope";
import { useAuth, hasPermission } from "@/lib/auth";
import type {
  Campaign,
  CampaignAnalytics,
  ApprovalHistoryEntry,
  CampaignStatus,
} from "@/lib/types/campaigns";

const STATUS_COLORS: Record<CampaignStatus, string> = {
  DRAFT: "border-[var(--na-border)] text-[var(--na-muted)] bg-[var(--na-surface-2)]",
  PENDING_APPROVAL: "border-amber-500/40 text-amber-300 bg-amber-500/10",
  APPROVED: "border-blue-500/40 text-blue-300 bg-blue-500/10",
  SCHEDULED: "border-sky-500/40 text-sky-300 bg-sky-500/10",
  ACTIVE: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
  COMPLETED: "border-purple-500/40 text-purple-300 bg-purple-500/10",
  REJECTED: "border-rose-500/40 text-rose-300 bg-rose-500/10",
  CANCELLED: "border-[var(--na-border)] text-[var(--na-muted)] bg-transparent",
};

const TABS = ["Overview", "Messages", "Assets", "Executions", "Analytics", "Approval History"];

interface CampaignDetailData {
  campaign: Campaign;
  analytics: CampaignAnalytics | null;
  approvalHistory: ApprovalHistoryEntry[];
}

export default function CampaignDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();

  const [data, setData] = useState<CampaignDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Sticky approval bar state
  const [approvalComment, setApprovalComment] = useState("");
  const [approvalSubmitting, setApprovalSubmitting] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [posterGenerating, setPosterGenerating] = useState(false);
  const [posterError, setPosterError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, [id]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [campaign, analytics, approvalHistory] = await Promise.all([
        apiGet<Campaign>(`/campaigns/${id}`),
        apiGet<CampaignAnalytics>(`/campaigns/${id}/analytics`).catch(() => null),
        apiGet<ApprovalHistoryEntry[]>(`/campaigns/${id}/approval-history`).catch(() => []),
      ]);
      setData({ campaign, analytics, approvalHistory });
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to load campaign"));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitForApproval() {
    setSubmitting(true);
    try {
      await apiPost(`/campaigns/${id}/request-approval`, {});
      await load();
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to submit campaign"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove() {
    setApprovalSubmitting(true);
    setApprovalError(null);
    try {
      await apiPatch(`/campaigns/${id}/approve`, {
        action: "APPROVE",
        comment: approvalComment || undefined,
      });
      setApprovalComment("");
      await load();
    } catch (err) {
      setApprovalError(apiErrorMessage(err, "Failed to approve campaign"));
    } finally {
      setApprovalSubmitting(false);
    }
  }

  async function handleReject() {
    setApprovalSubmitting(true);
    setApprovalError(null);
    try {
      await apiPatch(`/campaigns/${id}/approve`, {
        action: "REJECT",
        comment: approvalComment || undefined,
      });
      setApprovalComment("");
      await load();
    } catch (err) {
      setApprovalError(apiErrorMessage(err, "Failed to reject campaign"));
    } finally {
      setApprovalSubmitting(false);
    }
  }

  async function handleGeneratePoster() {
    setPosterGenerating(true);
    setPosterError(null);
    try {
      await apiPost(`/campaigns/${id}/generate-poster`, {
        name: data?.campaign.name,
        copy: data?.campaign.generatedCopy?.slice(0, 200) ?? undefined,
      });
      await load();
    } catch (err) {
      setPosterError(apiErrorMessage(err, "Failed to generate poster"));
    } finally {
      setPosterGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-[var(--na-surface)]" />
        <div className="h-48 animate-pulse rounded-lg bg-[var(--na-surface)]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4">
        <p className="text-sm text-rose-400">{error ?? "Campaign not found"}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-2 text-xs text-rose-400 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  const { campaign, analytics, approvalHistory } = data;

  const canApprove =
    campaign.status === "PENDING_APPROVAL" && hasPermission(user, "campaigns:approve");

  const timelineEvents = [
    { label: "Created", date: campaign.createdAt, show: true },
    { label: "Submitted", date: campaign.submittedAt, show: !!campaign.submittedAt },
    { label: "Approved", date: campaign.approvedAt, show: !!campaign.approvedAt },
    { label: "Scheduled", date: campaign.scheduledAt, show: !!campaign.scheduledAt },
    { label: "Completed", date: campaign.completedAt, show: !!campaign.completedAt },
  ].filter((e) => e.show);

  return (
    <div className={`space-y-8 ${canApprove ? "pb-56" : ""}`}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[var(--na-muted)]">
        <Link href="/dashboard/campaigns" className="hover:text-[var(--na-accent)]">
          Campaigns
        </Link>
        <span>/</span>
        <span className="text-[var(--na-text)]">{campaign.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--na-text)]">
              {campaign.name}
            </h1>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-bold uppercase ${
                STATUS_COLORS[campaign.status]
              }`}
            >
              {campaign.status.replace(/_/g, " ")}
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--na-muted)]">
            {campaign.objective.replace(/_/g, " ")}
            {campaign.createdBy?.email ? ` · by ${campaign.createdBy.email}` : ""}
          </p>
        </div>
        {campaign.status === "DRAFT" && (
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleSubmitForApproval()}
            className="shrink-0 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-40"
          >
            {submitting ? "Submitting…" : "Submit for Approval"}
          </button>
        )}
      </div>

      {/* Timeline */}
      <div className="flex flex-wrap items-center gap-0">
        {timelineEvents.map((event, i) => (
          <div key={event.label} className="flex items-center">
            <div className="text-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--na-accent)]/40 bg-[var(--na-accent)]/10 text-xs font-bold text-[var(--na-accent)]">
                {i + 1}
              </div>
              <p className="mt-1 text-[10px] font-medium text-[var(--na-text)]">{event.label}</p>
              <p className="text-[9px] text-[var(--na-muted)]">
                {event.date ? new Date(event.date).toLocaleDateString() : ""}
              </p>
            </div>
            {i < timelineEvents.length - 1 && (
              <div className="mx-2 mb-5 h-px w-8 bg-[var(--na-border)]" />
            )}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--na-border-subtle)]">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(i)}
              className={`shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                activeTab === i
                  ? "border-[var(--na-accent)] text-[var(--na-accent)]"
                  : "border-transparent text-[var(--na-muted)] hover:text-[var(--na-text)]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Overview */}
      {activeTab === 0 && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--na-muted)]">
              Campaign Info
            </h3>
            <div className="space-y-2 rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)] p-4 text-sm">
              {[
                { label: "Objective", value: campaign.objective.replace(/_/g, " ") },
                { label: "Audience", value: campaign.audienceType?.replace(/_/g, " ") ?? "—" },
                {
                  label: "Est. Reach",
                  value: campaign.estimatedReach?.toLocaleString() ?? "—",
                },
                {
                  label: "Budget",
                  value: campaign.budget ? `$${campaign.budget.toLocaleString()}` : "—",
                },
                {
                  label: "Channels",
                  value: (campaign.channels ?? []).join(", ") || "—",
                },
                {
                  label: "Start Date",
                  value: campaign.startDate
                    ? new Date(campaign.startDate).toLocaleDateString()
                    : "—",
                },
                {
                  label: "End Date",
                  value: campaign.endDate
                    ? new Date(campaign.endDate).toLocaleDateString()
                    : "—",
                },
              ].map((row) => (
                <div key={row.label} className="flex justify-between gap-2">
                  <span className="text-[var(--na-muted)]">{row.label}</span>
                  <span className="text-right font-medium text-[var(--na-text)]">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
          {campaign.notes && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--na-muted)]">
                Notes
              </h3>
              <div className="rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)] p-4 text-sm text-[var(--na-muted)]">
                {campaign.notes}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Analytics */}
      {activeTab === 4 && (
        <div>
          {analytics ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Total Sent", value: analytics.totalSent },
                {
                  label: "Delivery Rate",
                  value: `${analytics.deliveryRate.toFixed(1)}%`,
                  color: "text-emerald-400",
                },
                { label: "Clicks", value: analytics.clicks },
                { label: "Conversions", value: analytics.conversions, color: "text-purple-400" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)] p-4"
                >
                  <p className="text-xs uppercase tracking-wider text-[var(--na-muted)]">
                    {s.label}
                  </p>
                  <p
                    className={`mt-2 text-2xl font-semibold tabular-nums ${
                      s.color ?? "text-[var(--na-text)]"
                    }`}
                  >
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--na-muted)]">
              Analytics not available yet. Run the campaign to see metrics.
            </p>
          )}
        </div>
      )}

      {/* Tab: Assets */}
      {activeTab === 2 && (
        <div className="space-y-4">
          {campaign.generatedCopy && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--na-muted)]">
                Campaign Copy
              </h3>
              <div className="rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)] p-4 text-sm text-[var(--na-text)]">
                {campaign.generatedCopy}
              </div>
            </div>
          )}
          {campaign.posterUrl && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--na-muted)]">
                Campaign Poster
              </h3>
              <div className="overflow-hidden rounded-lg border border-[var(--na-border-subtle)]">
                <img
                  src={campaign.posterUrl}
                  alt="Campaign poster"
                  className="max-h-80 object-contain"
                />
              </div>
            </div>
          )}
          {!campaign.generatedCopy && !campaign.posterUrl && (
            <p className="text-sm text-[var(--na-muted)]">No assets generated yet.</p>
          )}
          {!campaign.posterUrl && hasPermission(user, "campaigns:write") && (
            <div className="space-y-2">
              {posterError && <p className="text-sm text-rose-400">{posterError}</p>}
              <button
                type="button"
                disabled={posterGenerating}
                onClick={() => void handleGeneratePoster()}
                className="rounded-md border border-[var(--na-accent)]/40 bg-[var(--na-accent)]/10 px-4 py-2 text-sm font-medium text-[var(--na-accent)] transition hover:bg-[var(--na-accent)]/20 disabled:opacity-40"
              >
                {posterGenerating ? "Generating poster…" : "Generate poster with AI"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab: Approval History */}
      {activeTab === 5 && (
        <div className="space-y-3">
          {approvalHistory.length === 0 ? (
            <p className="text-sm text-[var(--na-muted)]">No approval activity yet.</p>
          ) : (
            <ul className="space-y-3">
              {approvalHistory.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)] p-4 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                        entry.action === "APPROVED"
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                          : entry.action === "REJECTED"
                            ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                            : "border-[var(--na-border)] bg-[var(--na-surface-2)] text-[var(--na-muted)]"
                      }`}
                    >
                      {entry.action.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-[var(--na-muted)]">
                      {new Date(entry.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 text-[var(--na-muted)]">
                    {entry.performedBy?.email ? `by ${entry.performedBy.email}` : ""}
                  </p>
                  {entry.comment && (
                    <p className="mt-2 text-[var(--na-text)]">{entry.comment}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Placeholder tabs */}
      {(activeTab === 1 || activeTab === 3) && (
        <div className="rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)] p-12 text-center">
          <p className="text-sm text-[var(--na-muted)]">
            {TABS[activeTab]} will appear here once the campaign is executed.
          </p>
        </div>
      )}

      {/* Sticky approval bar — visible only when PENDING_APPROVAL and user has campaigns:approve */}
      {canApprove && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-amber-500/20 bg-[var(--na-bg-deep)]/95 px-4 py-4 backdrop-blur-xl md:left-60 lg:left-[264px]">
          <div className="mx-auto max-w-[1280px] space-y-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_6px_theme(colors.amber.400)]" />
              <p className="text-xs font-medium text-amber-300">
                This campaign is awaiting your approval
              </p>
            </div>
            <textarea
              rows={2}
              value={approvalComment}
              onChange={(e) => setApprovalComment(e.target.value)}
              placeholder="Add a comment (optional)…"
              className="w-full rounded-md border border-[var(--na-border)] bg-[var(--na-surface-2)] px-3 py-2 text-sm text-[var(--na-text)] placeholder:text-[var(--na-muted)]/50 focus:border-[var(--na-accent)]/50 focus:outline-none"
            />
            {approvalError && (
              <p className="text-sm text-rose-400">{approvalError}</p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={approvalSubmitting}
                onClick={() => void handleApprove()}
                className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-5 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-40"
              >
                {approvalSubmitting ? "Processing…" : "✓ Approve"}
              </button>
              <button
                type="button"
                disabled={approvalSubmitting}
                onClick={() => void handleReject()}
                className="rounded-md border border-rose-500/40 bg-rose-500/10 px-5 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-40"
              >
                ✕ Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
