"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, apiPatch, apiErrorMessage } from "@/lib/apiEnvelope";
import type {
  CampaignListItem,
  CampaignStats,
  CampaignStatus,
  GeneratePosterResponse,
  PaginatedCampaigns,
  PosterSource,
} from "@/lib/types/campaigns";

const STATUS_TABS: { label: string; value: CampaignStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Draft", value: "DRAFT" },
  { label: "Pending Approval", value: "PENDING_APPROVAL" },
  { label: "Active", value: "ACTIVE" },
  { label: "Completed", value: "COMPLETED" },
];

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

const STATUS_LABELS: Record<CampaignStatus, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending",
  APPROVED: "Approved",
  SCHEDULED: "Scheduled",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

interface InlineApprovalModal {
  campaignId: string;
  campaignName: string;
  action: "approve" | "reject";
  comment: string;
}

export default function CampaignsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CampaignStatus | "ALL">("ALL");

  // AI Quick Generate state
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiName, setAiName] = useState("");
  const [aiStartDate, setAiStartDate] = useState("");
  const [aiEndDate, setAiEndDate] = useState("");
  const [aiImageDescription, setAiImageDescription] = useState("");
  const [aiGeneratedCopy, setAiGeneratedCopy] = useState("");
  const [aiEditedCopy, setAiEditedCopy] = useState("");
  const [aiPosterUrl, setAiPosterUrl] = useState<string | null>(null);
  const [aiPosterSource, setAiPosterSource] = useState<PosterSource | null>(null);
  const [aiPosterStatus, setAiPosterStatus] = useState<"idle" | "loading" | "loaded" | "error">(
    "idle",
  );
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiPhase, setAiPhase] = useState<"prompt" | "image" | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showAiCard, setShowAiCard] = useState(true);

  // Inline approval modal state
  const [approvalModal, setApprovalModal] = useState<InlineApprovalModal | null>(null);
  const [approvalSubmitting, setApprovalSubmitting] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  // Poster lightbox
  const [posterLightbox, setPosterLightbox] = useState<{ url: string; name: string } | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [statsData, listData] = await Promise.all([
        apiGet<CampaignStats>("/campaigns/stats"),
        apiGet<PaginatedCampaigns>("/campaigns"),
      ]);
      setStats(statsData);
      setCampaigns(listData.items ?? []);
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to load campaigns"));
    } finally {
      setLoading(false);
    }
  }

  function applyAiPosterResult(result: GeneratePosterResponse) {
    const url = result.posterUrl?.trim();
    if (!url) {
      throw new Error("Server returned an empty poster URL");
    }
    const prompt = result.imagePrompt?.trim();
    if (!prompt) {
      throw new Error("Server returned an empty ad prompt");
    }
    setAiPosterSource(result.source);
    setAiPosterStatus("loading");
    setAiPosterUrl(url);
    setAiGeneratedCopy(prompt);
    setAiEditedCopy(prompt);
  }

  function aiPosterPayload(useEditedPrompt = false) {
    const brief = [aiPrompt, aiImageDescription].filter(Boolean).join("\n");
    const edited = (aiEditedCopy || aiGeneratedCopy).trim();
    if (useEditedPrompt && edited) {
      return {
        name: aiName || "Campaign",
        imagePrompt: edited,
      };
    }
    return {
      name: aiName || "Campaign",
      imageDescription: brief || aiPrompt || undefined,
    };
  }

  async function handleGenerateCopyAndImage() {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);
    setAiError(null);
    setAiPosterSource(null);
    setAiPosterStatus("idle");
    setAiPosterUrl(null);

    try {
      setAiPhase("prompt");
      const posterResult = await apiPost<GeneratePosterResponse>(
        "/campaigns/generate-poster",
        aiPosterPayload(false),
      );
      setAiPhase("image");
      applyAiPosterResult(posterResult);
    } catch (err) {
      setAiPosterStatus("error");
      setAiError(apiErrorMessage(err, "Ad prompt and image generation failed. Please try again."));
    } finally {
      setAiGenerating(false);
      setAiPhase(null);
    }
  }

  async function handleRegenerateImage() {
    setAiGenerating(true);
    setAiPhase("image");
    setAiError(null);
    setAiPosterSource(null);
    setAiPosterStatus("idle");
    try {
      const posterResult = await apiPost<GeneratePosterResponse>(
        "/campaigns/generate-poster",
        aiPosterPayload(true),
      );
      applyAiPosterResult(posterResult);
    } catch (err) {
      setAiPosterStatus("error");
      setAiError(apiErrorMessage(err, "Image generation failed"));
    } finally {
      setAiGenerating(false);
      setAiPhase(null);
    }
  }

  async function handleCreateDraft() {
    const copy = aiEditedCopy || aiGeneratedCopy;
    if (!copy.trim() && !aiPrompt.trim()) return;
    setAiSaving(true);
    setAiError(null);
    try {
      const campaign = await apiPost<{ id: string }>("/campaigns", {
        name: aiName || `AI Campaign — ${new Date().toLocaleDateString()}`,
        objective: "BRAND_AWARENESS",
        startAt: aiStartDate || undefined,
        endAt: aiEndDate || undefined,
        notes: [
          `Prompt: ${aiPrompt}`,
          copy ? `AI Copy:\n${copy}` : "",
        ]
          .filter(Boolean)
          .join("\n\n"),
        posterUrl: aiPosterUrl || undefined,
      });
      router.push(`/dashboard/campaigns/${campaign.id}`);
    } catch (err) {
      setAiError(apiErrorMessage(err, "Failed to create campaign draft."));
    } finally {
      setAiSaving(false);
    }
  }

  async function handleApprovalAction() {
    if (!approvalModal) return;
    setApprovalSubmitting(true);
    setApprovalError(null);
    try {
      await apiPatch(`/campaigns/${approvalModal.campaignId}/approve`, {
        action: approvalModal.action === "approve" ? "APPROVE" : "REJECT",
        ...(approvalModal.comment ? { comment: approvalModal.comment } : {}),
      });
      setApprovalModal(null);
      await load();
    } catch (err) {
      setApprovalError(apiErrorMessage(err, "Action failed"));
    } finally {
      setApprovalSubmitting(false);
    }
  }

  const filtered =
    activeTab === "ALL" ? campaigns : campaigns.filter((c) => c.status === activeTab);

  const isPendingTab = activeTab === "PENDING_APPROVAL";

  return (
    <div className="space-y-8">
      {/* Poster Lightbox */}
      {posterLightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPosterLightbox(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-3xl w-full overflow-hidden rounded-xl border border-[var(--na-border)] bg-[var(--na-bg-deep)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--na-border-subtle)] px-5 py-3">
              <p className="text-sm font-medium text-[var(--na-text)]">{posterLightbox.name}</p>
              <button
                type="button"
                onClick={() => setPosterLightbox(null)}
                className="text-[var(--na-muted)] hover:text-[var(--na-text)] text-lg leading-none"
              >
                ✕
              </button>
            </div>
            <img
              src={posterLightbox.url}
              alt={posterLightbox.name}
              className="max-h-[80vh] w-full object-contain"
            />
          </div>
        </div>
      )}

      {/* Inline Approval Modal */}
      {approvalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-[var(--na-border)] bg-[var(--na-bg-deep)] p-6 shadow-2xl">
            <h3 className="text-lg font-medium text-[var(--na-text)]">
              {approvalModal.action === "approve" ? "Approve" : "Reject"} Campaign
            </h3>
            <p className="mt-1 text-sm text-[var(--na-muted)]">{approvalModal.campaignName}</p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-[var(--na-muted)]">
                  Comment {approvalModal.action === "reject" ? "(recommended)" : "(optional)"}
                </label>
                <textarea
                  rows={3}
                  value={approvalModal.comment}
                  onChange={(e) =>
                    setApprovalModal((prev) => prev ? { ...prev, comment: e.target.value } : prev)
                  }
                  className="mt-1 w-full rounded-md border border-[var(--na-border)] bg-[var(--na-surface-2)] px-3 py-2 text-sm text-[var(--na-text)] focus:border-[var(--na-accent)]/50 focus:outline-none"
                  placeholder="Add a comment…"
                />
              </div>
              {approvalError && (
                <p className="text-sm text-rose-400">{approvalError}</p>
              )}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setApprovalModal(null); setApprovalError(null); }}
                  className="rounded-md border border-[var(--na-border)] px-4 py-2 text-sm text-[var(--na-text)] transition hover:bg-[var(--na-surface-2)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={approvalSubmitting}
                  onClick={() => void handleApprovalAction()}
                  className={`rounded-md border px-4 py-2 text-sm font-medium transition disabled:opacity-40 ${
                    approvalModal.action === "approve"
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                      : "border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
                  }`}
                >
                  {approvalSubmitting ? "Processing…" : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[var(--na-border)] bg-[var(--na-surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--na-muted)]">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_theme(colors.emerald.400)]" />
            Marketing &amp; Growth
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--na-text)]">
            Campaigns
          </h1>
          <p className="mt-1 text-sm text-[var(--na-muted)]">
            Manage and track all your marketing campaigns
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/campaigns/approvals"
            className="rounded-md border border-[var(--na-border)] bg-transparent px-4 py-2 text-sm text-[var(--na-text)] transition hover:bg-[var(--na-surface-2)]"
          >
            Approvals
            {stats?.pendingApproval ? (
              <span className="ml-2 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                {stats.pendingApproval}
              </span>
            ) : null}
          </Link>
          <Link
            href="/dashboard/campaigns/new"
            className="rounded-md border border-[var(--na-accent)]/40 bg-[var(--na-accent)]/10 px-4 py-2 text-sm font-medium text-[var(--na-accent)] transition hover:bg-[var(--na-accent)]/20"
          >
            + New Campaign
          </Link>
        </div>
      </div>

      {/* AI Quick Generate Card */}
      <div className="rounded-xl border border-[var(--na-accent)]/30 bg-gradient-to-br from-[var(--na-accent)]/8 to-purple-500/5 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--na-accent)]/30 bg-[var(--na-accent)]/10 text-lg">
              ✦
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--na-text)]">AI Quick Generate</p>
              <p className="text-xs text-[var(--na-muted)]">
                Describe your campaign, generate copy and poster, then save as a draft
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAiCard((v) => !v)}
            className="text-xs text-[var(--na-accent)] hover:underline"
          >
            {showAiCard ? "Collapse ↑" : "Open ↓"}
          </button>
        </div>

        {showAiCard && (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium uppercase tracking-wider text-[var(--na-muted)]">
                  Campaign Name (optional)
                </label>
                <input
                  type="text"
                  value={aiName}
                  onChange={(e) => setAiName(e.target.value)}
                  placeholder="e.g. Summer Sale 2026"
                  className="w-full rounded-md border border-[var(--na-border)] bg-[var(--na-surface-2)] px-3 py-2 text-sm text-[var(--na-text)] placeholder:text-[var(--na-muted)]/50 focus:border-[var(--na-accent)]/50 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium uppercase tracking-wider text-[var(--na-muted)]">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={aiStartDate}
                    onChange={(e) => setAiStartDate(e.target.value)}
                    className="w-full rounded-md border border-[var(--na-border)] bg-[var(--na-surface-2)] px-3 py-2 text-sm text-[var(--na-text)] focus:border-[var(--na-accent)]/50 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium uppercase tracking-wider text-[var(--na-muted)]">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={aiEndDate}
                    onChange={(e) => setAiEndDate(e.target.value)}
                    className="w-full rounded-md border border-[var(--na-border)] bg-[var(--na-surface-2)] px-3 py-2 text-sm text-[var(--na-text)] focus:border-[var(--na-accent)]/50 focus:outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wider text-[var(--na-muted)]">
                Describe your campaign *
              </label>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={3}
                placeholder="e.g. 40% off all dental services this summer. Target families. Friendly and urgent tone."
                className="w-full rounded-md border border-[var(--na-border)] bg-[var(--na-surface-2)] px-3 py-2 text-sm text-[var(--na-text)] placeholder:text-[var(--na-muted)]/50 focus:border-[var(--na-accent)]/50 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wider text-[var(--na-muted)]">
                Ad Image Description{" "}
                <span className="normal-case font-normal text-[var(--na-muted)]/60">
                  — optional; guides poster generation
                </span>
              </label>
              <textarea
                value={aiImageDescription}
                onChange={(e) => setAiImageDescription(e.target.value)}
                rows={2}
                placeholder="e.g. Bright summer promo banner, smiling family, warm lighting, no text overlays…"
                className="w-full rounded-md border border-[var(--na-border)] bg-[var(--na-surface-2)] px-3 py-2 text-sm text-[var(--na-text)] placeholder:text-[var(--na-muted)]/50 focus:border-[var(--na-accent)]/50 focus:outline-none"
              />
            </div>

            {aiError && (
              <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
                {aiError}
              </p>
            )}

            <button
              type="button"
              disabled={aiGenerating || !aiPrompt.trim()}
              onClick={() => void handleGenerateCopyAndImage()}
              className="flex items-center gap-2 rounded-md border border-[var(--na-accent)]/40 bg-[var(--na-accent)]/10 px-5 py-2.5 text-sm font-medium text-[var(--na-accent)] transition hover:bg-[var(--na-accent)]/20 disabled:opacity-50"
            >
              {aiGenerating ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--na-accent)] border-t-transparent" />
                  {aiPhase === "prompt" ? "Building ad prompt…" : "Generating image…"}
                </>
              ) : (
                "✦ Generate Copy & Image"
              )}
            </button>

            {(aiGeneratedCopy || aiEditedCopy) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wider text-[var(--na-muted)]">
                    Generated Ad Prompt (editable)
                  </p>
                  <button
                    type="button"
                    disabled={aiGenerating}
                    onClick={() => void handleRegenerateImage()}
                    className="text-xs text-purple-400 hover:underline disabled:opacity-50"
                  >
                    Regenerate image →
                  </button>
                </div>
                <textarea
                  value={aiEditedCopy || aiGeneratedCopy}
                  onChange={(e) => setAiEditedCopy(e.target.value)}
                  rows={6}
                  className="w-full rounded-md border border-[var(--na-border)] bg-[var(--na-surface-2)] px-3 py-2 text-sm text-[var(--na-text)] focus:border-[var(--na-accent)]/50 focus:outline-none"
                />
              </div>
            )}

            {aiGenerating && aiPhase === "image" && !aiPosterUrl && (
              <div className="flex h-48 items-center justify-center gap-3 rounded-lg border-2 border-dashed border-[var(--na-accent)]/30 bg-[var(--na-accent)]/5">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
                <p className="text-sm text-[var(--na-muted)]">Generating poster… (may take up to 90s)</p>
              </div>
            )}

            {aiPosterUrl && (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--na-muted)]">
                  AI Generated Poster
                </p>
                {aiPosterStatus === "loading" && (
                  <p className="text-xs text-[var(--na-muted)]">Loading image in browser…</p>
                )}
                {aiPosterStatus === "loaded" && aiPosterSource && (
                  <p className="text-xs text-emerald-400/90">
                    Image loaded · source: {aiPosterSource} ·{" "}
                    {aiPosterUrl.startsWith("data:")
                      ? "embedded image data"
                      : aiPosterUrl.slice(0, 60) + "…"}
                  </p>
                )}
                {aiPosterStatus === "error" && (
                  <p className="text-xs text-rose-400">
                    Image URL was returned but could not be displayed. Check network or ad
                    blockers for pollinations.ai.
                  </p>
                )}
                <div className="overflow-hidden rounded-lg border border-[var(--na-border-subtle)]">
                  <img
                    src={aiPosterUrl}
                    alt="Campaign poster preview"
                    className="max-h-64 w-full object-contain"
                    onLoad={() => setAiPosterStatus("loaded")}
                    onError={() => setAiPosterStatus("error")}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 border-t border-[var(--na-border-subtle)] pt-4">
              <button
                type="button"
                disabled={
                  aiSaving ||
                  aiGenerating ||
                  (!aiPrompt.trim() && !(aiEditedCopy || aiGeneratedCopy).trim())
                }
                onClick={() => void handleCreateDraft()}
                className="flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
              >
                {aiSaving ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                    Creating draft…
                  </>
                ) : (
                  "Create Campaign Draft"
                )}
              </button>
              <p className="text-xs text-[var(--na-muted)]">
                Or use the{" "}
                <Link href="/dashboard/campaigns/new" className="text-[var(--na-accent)] hover:underline">
                  full campaign builder →
                </Link>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total", value: stats.total },
            { label: "Active", value: stats.active, color: "text-emerald-400" },
            { label: "Pending Approval", value: stats.pendingApproval, color: "text-amber-400" },
            { label: "Scheduled", value: stats.scheduled, color: "text-sky-400" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)] p-4"
            >
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--na-muted)]">
                {s.label}
              </p>
              <p className={`mt-2 text-3xl font-semibold tabular-nums ${s.color ?? "text-[var(--na-text)]"}`}>
                {s.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => {
          const isPending = tab.value === "PENDING_APPROVAL";
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={`relative rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                activeTab === tab.value
                  ? "border-[var(--na-accent)] bg-[var(--na-surface-2)] text-[var(--na-accent)]"
                  : "border-[var(--na-border)] text-[var(--na-muted)] hover:text-[var(--na-text)]"
              }`}
            >
              {tab.label}
              {isPending && stats?.pendingApproval ? (
                <span className="ml-1.5 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-300">
                  {stats.pendingApproval}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Pending Approval helper hint */}
      {isPendingTab && filtered.length > 0 && (
        <p className="text-xs text-[var(--na-muted)]">
          Click a campaign to view details, or use the inline buttons to approve or reject.
        </p>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)]/50"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4">
          <p className="text-sm text-rose-400">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-2 text-xs text-rose-400 underline"
          >
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)] p-12 text-center">
          <p className="text-sm text-[var(--na-muted)]">No campaigns found.</p>
          <Link
            href="/dashboard/campaigns/new"
            className="mt-4 inline-block text-xs font-medium text-[var(--na-accent)] hover:underline"
          >
            Create your first campaign →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((campaign) => {
            if (isPendingTab) {
              return (
                <div
                  key={campaign.id}
                  className="flex flex-col gap-3 rounded-lg border border-amber-500/20 bg-[var(--na-surface)]/50 px-5 py-4 transition hover:border-amber-500/30 hover:bg-[var(--na-surface)] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/dashboard/campaigns/${campaign.id}`}
                        className="font-medium text-[var(--na-text)] hover:text-[var(--na-accent)]"
                      >
                        {campaign.name}
                      </Link>
                      <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-300">
                        Pending
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--na-muted)]">
                      {campaign.objective.replace(/_/g, " ")} ·{" "}
                      {(campaign.channels ?? []).join(", ") || "—"} ·{" "}
                      {campaign.createdBy?.email ? `by ${campaign.createdBy.email}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setApprovalModal({
                          campaignId: campaign.id,
                          campaignName: campaign.name,
                          action: "approve",
                          comment: "",
                        })
                      }
                      className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/20"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setApprovalModal({
                          campaignId: campaign.id,
                          campaignName: campaign.name,
                          action: "reject",
                          comment: "",
                        })
                      }
                      className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 transition hover:bg-rose-500/20"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={campaign.id}
                className="group flex items-center gap-4 rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)]/50 px-5 py-4 transition hover:border-[var(--na-accent)]/30 hover:bg-[var(--na-surface)]"
              >
                {/* Poster thumbnail */}
                {campaign.posterUrl ? (
                  <button
                    type="button"
                    title="View ad image"
                    onClick={() =>
                      setPosterLightbox({ url: campaign.posterUrl!, name: campaign.name })
                    }
                    className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[var(--na-border-subtle)] transition hover:border-[var(--na-accent)]/50 hover:shadow-lg"
                  >
                    <img
                      src={campaign.posterUrl}
                      alt="Ad poster"
                      className="h-full w-full object-cover"
                    />
                  </button>
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-[var(--na-border-subtle)] text-xl text-[var(--na-muted)]/40">
                    ✦
                  </div>
                )}

                <Link
                  href={`/dashboard/campaigns/${campaign.id}`}
                  className="min-w-0 flex-1"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-[var(--na-text)] group-hover:text-[var(--na-accent)]">
                      {campaign.name}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                        STATUS_COLORS[campaign.status]
                      }`}
                    >
                      {STATUS_LABELS[campaign.status]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--na-muted)]">
                    {campaign.objective.replace(/_/g, " ")} ·{" "}
                    {(campaign.channels ?? []).join(", ") || "—"} ·{" "}
                    {campaign.createdBy?.email ? `by ${campaign.createdBy.email}` : ""}
                  </p>
                </Link>

                <div className="ml-4 shrink-0 text-right">
                  <p className="text-xs text-[var(--na-muted)]">
                    {campaign.scheduledAt
                      ? `Scheduled ${new Date(campaign.scheduledAt).toLocaleDateString()}`
                      : campaign.startDate
                        ? new Date(campaign.startDate).toLocaleDateString()
                        : new Date(campaign.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
