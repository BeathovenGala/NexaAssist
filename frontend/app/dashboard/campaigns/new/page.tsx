"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, apiErrorMessage } from "@/lib/apiEnvelope";
import type {
  CampaignAudienceType,
  CampaignObjective,
  CampaignChannel,
  GeneratePosterResponse,
  PosterSource,
} from "@/lib/types/campaigns";

const STEPS = [
  "Campaign Details",
  "Audience Selection",
  "AI Copy & Image",
  "Review & Schedule",
];

const OBJECTIVES: { value: CampaignObjective; label: string }[] = [
  { value: "BRAND_AWARENESS", label: "Brand Awareness" },
  { value: "LEAD_GENERATION", label: "Lead Generation" },
  { value: "SALES_PROMOTION", label: "Sales Promotion" },
  { value: "CUSTOMER_RETENTION", label: "Customer Retention" },
  { value: "EVENT_PROMOTION", label: "Event Promotion" },
  { value: "PRODUCT_LAUNCH", label: "Product Launch" },
];

const CHANNELS: { value: CampaignChannel; label: string }[] = [
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "EMAIL", label: "Email" },
  { value: "SMS", label: "SMS" },
  { value: "PUSH", label: "Push Notification" },
];

interface TenantUser {
  id: string;
  email: string;
  name?: string | null;
  roles: { name: string }[];
}

interface WizardState {
  name: string;
  objective: CampaignObjective | "";
  startDate: string;
  endDate: string;
  budget: string;
  notes: string;
  audienceType: CampaignAudienceType;
  selectedUserIds: string[];
  generatedCopy: string;
  editedCopy: string;
  imageDescription: string;
  posterUrl: string | null;
  scheduledAt: string;
  scheduledTime: string;
  channels: CampaignChannel[];
}

export default function NewCampaignPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generationPhase, setGenerationPhase] = useState<"prompt" | "image" | null>(null);
  const [posterSource, setPosterSource] = useState<PosterSource | null>(null);
  const [posterStatus, setPosterStatus] = useState<"idle" | "loading" | "loaded" | "error">(
    "idle",
  );

  const [users, setUsers] = useState<TenantUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  const [form, setForm] = useState<WizardState>({
    name: "",
    objective: "",
    startDate: "",
    endDate: "",
    budget: "",
    notes: "",
    audienceType: "ALL_CUSTOMERS",
    selectedUserIds: [],
    generatedCopy: "",
    editedCopy: "",
    imageDescription: "",
    posterUrl: null,
    scheduledAt: "",
    scheduledTime: "",
    channels: ["WHATSAPP"],
  });

  function update(patch: Partial<WizardState>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function toggleChannel(ch: CampaignChannel) {
    setForm((prev) => ({
      ...prev,
      channels: prev.channels.includes(ch)
        ? prev.channels.filter((c) => c !== ch)
        : [...prev.channels, ch],
    }));
  }

  function toggleUser(id: string) {
    setForm((prev) => ({
      ...prev,
      selectedUserIds: prev.selectedUserIds.includes(id)
        ? prev.selectedUserIds.filter((u) => u !== id)
        : [...prev.selectedUserIds, id],
    }));
  }

  useEffect(() => {
    if (step === 1) void loadUsers();
  }, [step]);

  async function loadUsers() {
    setUsersLoading(true);
    try {
      const data = await apiGet<{ items: TenantUser[] }>("/users");
      setUsers(data.items ?? []);
    } catch {
      // non-fatal
    } finally {
      setUsersLoading(false);
    }
  }

  function applyPosterResult(result: GeneratePosterResponse) {
    const url = result.posterUrl?.trim();
    if (!url) {
      throw new Error("Server returned an empty poster URL");
    }
    const prompt = result.imagePrompt?.trim();
    if (!prompt) {
      throw new Error("Server returned an empty ad prompt");
    }
    setPosterSource(result.source);
    setPosterStatus("loading");
    update({
      posterUrl: url,
      generatedCopy: prompt,
      editedCopy: prompt,
    });
  }

  function posterPayload(useEditedPrompt = false) {
    const brief = [form.notes, form.imageDescription].filter(Boolean).join("\n");
    const editedPrompt = (form.editedCopy || form.generatedCopy).trim();
    if (useEditedPrompt && editedPrompt) {
      return {
        name: form.name,
        objective: form.objective || undefined,
        notes: form.notes || undefined,
        imagePrompt: editedPrompt,
        startAt: form.startDate || undefined,
        endAt: form.endDate || undefined,
      };
    }
    return {
      name: form.name,
      objective: form.objective || undefined,
      notes: form.notes || undefined,
      imageDescription: brief || undefined,
      startAt: form.startDate || undefined,
      endAt: form.endDate || undefined,
    };
  }

  async function handleGenerateAll() {
    setGenerating(true);
    setError(null);
    setPosterSource(null);
    setPosterStatus("idle");

    try {
      setGenerationPhase("prompt");
      const posterResult = await apiPost<GeneratePosterResponse>(
        "/campaigns/generate-poster",
        posterPayload(false),
      );
      setGenerationPhase("image");
      applyPosterResult(posterResult);
    } catch (err) {
      setPosterStatus("error");
      setError(apiErrorMessage(err, "Ad prompt and image generation failed. Please try again."));
    } finally {
      setGenerating(false);
      setGenerationPhase(null);
    }
  }

  async function handleRegenerateImage() {
    setGenerating(true);
    setGenerationPhase("image");
    setError(null);
    setPosterSource(null);
    setPosterStatus("idle");
    try {
      const posterResult = await apiPost<GeneratePosterResponse>(
        "/campaigns/generate-poster",
        posterPayload(true),
      );
      applyPosterResult(posterResult);
    } catch (err) {
      setPosterStatus("error");
      setError(apiErrorMessage(err, "Image generation failed"));
    } finally {
      setGenerating(false);
      setGenerationPhase(null);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const scheduledAt =
        form.scheduledAt && form.scheduledTime
          ? new Date(`${form.scheduledAt}T${form.scheduledTime}`).toISOString()
          : undefined;

      const result = await apiPost<{ id: string }>("/campaigns", {
        name: form.name,
        objective: form.objective || undefined,
        startAt: form.startDate || undefined,
        endAt: form.endDate || undefined,
        budget: form.budget ? Number(form.budget) : undefined,
        notes: [
          form.notes,
          form.editedCopy || form.generatedCopy
            ? `AI Ad Prompt:\n${form.editedCopy || form.generatedCopy}`
            : "",
        ]
          .filter(Boolean)
          .join("\n\n") || undefined,
        audienceType:
          form.audienceType !== "ALL_CUSTOMERS" ? form.audienceType : undefined,
        posterUrl: form.posterUrl || undefined,
      });

      router.push(`/dashboard/campaigns/${result.id}`);
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to create campaign"));
    } finally {
      setSubmitting(false);
    }
  }

  const filteredUsers = users.filter(
    (u) =>
      !userSearch ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.name ?? "").toLowerCase().includes(userSearch.toLowerCase()),
  );

  const stepValid = [
    !!form.name && !!form.objective,
    true,
    true,
    form.channels.length > 0,
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--na-text)]">
          New Campaign
        </h1>
        <p className="mt-1 text-sm text-[var(--na-muted)]">
          Build your campaign step by step
        </p>
      </div>

      {/* Progress */}
      <div className="space-y-3">
        {/* Mobile: dot indicators */}
        <div className="flex items-center gap-2 sm:hidden">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-bold transition-all ${
                i < step
                  ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300"
                  : i === step
                    ? "border-[var(--na-accent)] bg-[var(--na-accent)]/10 text-[var(--na-accent)]"
                    : "border-[var(--na-border)] text-[var(--na-muted)]"
              }`}
              title={s}
            >
              {i < step ? "✓" : i + 1}
            </div>
          ))}
          <span className="ml-1 text-xs text-[var(--na-muted)]">{STEPS[step]}</span>
        </div>
        {/* Desktop: bar + labels */}
        <div className="hidden sm:block space-y-2">
          <div className="flex gap-1">
            {STEPS.map((s, i) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-all ${
                  i <= step ? "bg-[var(--na-accent)]" : "bg-[var(--na-border)]"
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-[var(--na-muted)]">
            {STEPS.map((s, i) => (
              <span
                key={s}
                className={i === step ? "font-medium text-[var(--na-text)]" : ""}
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)] p-6">
        {error && (
          <div className="mb-4 rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-3">
            <p className="text-sm text-rose-400">{error}</p>
          </div>
        )}

        {/* Step 1: Campaign Details */}
        {step === 0 && (
          <div className="space-y-5">
            <h2 className="text-lg font-medium text-[var(--na-text)]">Campaign Details</h2>
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wider text-[var(--na-muted)]">
                Campaign Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="e.g. Summer Sale 2026"
                className="w-full rounded-md border border-[var(--na-border)] bg-[var(--na-surface-2)] px-3 py-2 text-sm text-[var(--na-text)] placeholder:text-[var(--na-muted)]/50 focus:border-[var(--na-accent)]/50 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wider text-[var(--na-muted)]">
                Objective *
              </label>
              <select
                value={form.objective}
                onChange={(e) => update({ objective: e.target.value as CampaignObjective })}
                className="w-full rounded-md border border-[var(--na-border)] bg-[var(--na-surface-2)] px-3 py-2 text-sm text-[var(--na-text)] focus:border-[var(--na-accent)]/50 focus:outline-none"
              >
                <option value="">Select objective…</option>
                {OBJECTIVES.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium uppercase tracking-wider text-[var(--na-muted)]">
                  Start Date
                </label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => update({ startDate: e.target.value })}
                  className="w-full rounded-md border border-[var(--na-border)] bg-[var(--na-surface-2)] px-3 py-2 text-sm text-[var(--na-text)] focus:border-[var(--na-accent)]/50 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium uppercase tracking-wider text-[var(--na-muted)]">
                  End Date
                </label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => update({ endDate: e.target.value })}
                  className="w-full rounded-md border border-[var(--na-border)] bg-[var(--na-surface-2)] px-3 py-2 text-sm text-[var(--na-text)] focus:border-[var(--na-accent)]/50 focus:outline-none"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wider text-[var(--na-muted)]">
                Budget (optional)
              </label>
              <input
                type="number"
                value={form.budget}
                onChange={(e) => update({ budget: e.target.value })}
                placeholder="0.00"
                className="w-full rounded-md border border-[var(--na-border)] bg-[var(--na-surface-2)] px-3 py-2 text-sm text-[var(--na-text)] placeholder:text-[var(--na-muted)]/50 focus:border-[var(--na-accent)]/50 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wider text-[var(--na-muted)]">
                Notes / Brief
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => update({ notes: e.target.value })}
                rows={3}
                placeholder="What should the AI know about this campaign? Describe your product, offer, or context…"
                className="w-full rounded-md border border-[var(--na-border)] bg-[var(--na-surface-2)] px-3 py-2 text-sm text-[var(--na-text)] placeholder:text-[var(--na-muted)]/50 focus:border-[var(--na-accent)]/50 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Step 2: Audience Selection — real users */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-medium text-[var(--na-text)]">Audience Selection</h2>

            {/* Audience type quick select */}
            <div className="space-y-2">
              {[
                {
                  value: "ALL_CUSTOMERS" as CampaignAudienceType,
                  label: "All Users",
                  desc: "Send to everyone in your org",
                },
                {
                  value: "CUSTOM_LIST" as CampaignAudienceType,
                  label: "Custom Selection",
                  desc: "Pick specific users below",
                },
              ].map((at) => (
                <label
                  key={at.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${
                    form.audienceType === at.value
                      ? "border-[var(--na-accent)]/50 bg-[var(--na-accent)]/5"
                      : "border-[var(--na-border-subtle)] hover:border-[var(--na-border)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="audienceType"
                    value={at.value}
                    checked={form.audienceType === at.value}
                    onChange={() => update({ audienceType: at.value })}
                    className="mt-0.5 accent-[var(--na-accent)]"
                  />
                  <div>
                    <p className="text-sm font-medium text-[var(--na-text)]">{at.label}</p>
                    <p className="text-xs text-[var(--na-muted)]">{at.desc}</p>
                  </div>
                  {at.value === "ALL_CUSTOMERS" && users.length > 0 && (
                    <span className="ml-auto text-xs text-[var(--na-muted)]">
                      {users.length} users
                    </span>
                  )}
                </label>
              ))}
            </div>

            {/* Custom user picker */}
            {form.audienceType === "CUSTOM_LIST" && (
              <div className="space-y-3">
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search users by name or email…"
                  className="w-full rounded-md border border-[var(--na-border)] bg-[var(--na-surface-2)] px-3 py-2 text-sm text-[var(--na-text)] placeholder:text-[var(--na-muted)]/50 focus:border-[var(--na-accent)]/50 focus:outline-none"
                />
                {usersLoading ? (
                  <div className="flex justify-center py-6">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--na-accent)] border-t-transparent" />
                  </div>
                ) : (
                  <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-[var(--na-border-subtle)] p-2">
                    {filteredUsers.length === 0 ? (
                      <p className="py-4 text-center text-xs text-[var(--na-muted)]">No users found</p>
                    ) : (
                      filteredUsers.map((u) => (
                        <label
                          key={u.id}
                          className={`flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 transition ${
                            form.selectedUserIds.includes(u.id)
                              ? "bg-[var(--na-accent)]/10"
                              : "hover:bg-[var(--na-surface-2)]"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={form.selectedUserIds.includes(u.id)}
                            onChange={() => toggleUser(u.id)}
                            className="accent-[var(--na-accent)]"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-[var(--na-text)]">
                              {u.name ?? u.email}
                            </p>
                            {u.name && (
                              <p className="truncate text-xs text-[var(--na-muted)]">{u.email}</p>
                            )}
                          </div>
                          {u.roles?.[0] && (
                            <span className="shrink-0 rounded-full border border-[var(--na-border)] px-2 py-0.5 text-[10px] text-[var(--na-muted)]">
                              {u.roles[0].name.replace(/_/g, " ")}
                            </span>
                          )}
                        </label>
                      ))
                    )}
                  </div>
                )}
                {form.selectedUserIds.length > 0 && (
                  <p className="text-xs text-[var(--na-accent)]">
                    {form.selectedUserIds.length} user{form.selectedUserIds.length !== 1 ? "s" : ""} selected
                  </p>
                )}
              </div>
            )}

            {form.audienceType === "ALL_CUSTOMERS" && (
              <div className="rounded-lg border border-[var(--na-accent)]/20 bg-[var(--na-accent)]/5 p-4">
                <p className="text-sm text-[var(--na-muted)]">Estimated reach</p>
                <p className="mt-1 text-2xl font-semibold text-[var(--na-accent)]">
                  {users.length > 0 ? `${users.length} users` : "All users in your organization"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: AI Copy & Image Generation — combined, auto-chained */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-medium text-[var(--na-text)]">AI Copy &amp; Image</h2>
            <p className="text-sm text-[var(--na-muted)]">
              Describe your ad in plain text. AI will expand it into a detailed image prompt, then generate the poster.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wider text-[var(--na-muted)]">
                Ad Image Description{" "}
                <span className="normal-case font-normal text-[var(--na-muted)]/60">
                  — describe exactly what you want in the image
                </span>
              </label>
              <textarea
                value={form.imageDescription}
                onChange={(e) => update({ imageDescription: e.target.value })}
                rows={3}
                placeholder="e.g. A smiling family at a bright modern dental clinic, warm lighting, professional photography style, clean white background…"
                className="w-full rounded-md border border-[var(--na-border)] bg-[var(--na-surface-2)] px-3 py-2 text-sm text-[var(--na-text)] placeholder:text-[var(--na-muted)]/50 focus:border-[var(--na-accent)]/50 focus:outline-none"
              />
              <p className="text-[11px] text-[var(--na-muted)]/70">
                Your description is expanded by AI into a detailed poster brief before image
                generation. Campaign start/end dates from step 1 appear on the poster when set.
              </p>
            </div>

            <button
              type="button"
              disabled={generating}
              onClick={() => void handleGenerateAll()}
              className="flex items-center gap-2 rounded-md border border-[var(--na-accent)]/40 bg-[var(--na-accent)]/10 px-5 py-2.5 text-sm font-medium text-[var(--na-accent)] transition hover:bg-[var(--na-accent)]/20 disabled:opacity-60"
            >
              {generating ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--na-accent)] border-t-transparent" />
                  {generationPhase === "prompt"
                    ? "Building ad prompt…"
                    : "Generating image…"}
                </>
              ) : (
                <>✦ Generate Ad Prompt &amp; Image</>
              )}
            </button>

            {/* Generated copy */}
            {(form.generatedCopy || form.editedCopy) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wider text-[var(--na-muted)]">
                    Generated Ad Prompt (editable)
                  </p>
                  <button
                    type="button"
                    disabled={generating}
                    onClick={() => void handleRegenerateImage()}
                    className="text-xs text-purple-400 hover:underline disabled:opacity-50"
                  >
                    Regenerate image →
                  </button>
                </div>
                <textarea
                  value={form.editedCopy || form.generatedCopy}
                  onChange={(e) => update({ editedCopy: e.target.value })}
                  rows={7}
                  className="w-full rounded-md border border-[var(--na-border)] bg-[var(--na-surface-2)] px-3 py-2 text-sm text-[var(--na-text)] focus:border-[var(--na-accent)]/50 focus:outline-none"
                />
              </div>
            )}

            {/* Generated poster */}
            {generating && generationPhase === "image" && !form.posterUrl && (
              <div className="flex h-48 items-center justify-center gap-3 rounded-lg border-2 border-dashed border-[var(--na-accent)]/30 bg-[var(--na-accent)]/5">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
                <p className="text-sm text-[var(--na-muted)]">Generating poster…</p>
              </div>
            )}

            {form.posterUrl && (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--na-muted)]">
                  AI Generated Poster
                </p>
                {posterStatus === "loading" && (
                  <p className="text-xs text-[var(--na-muted)]">Loading image in browser…</p>
                )}
                {posterStatus === "loaded" && posterSource && (
                  <p className="text-xs text-emerald-400/90">
                    Image loaded · source: {posterSource} ·{" "}
                    {form.posterUrl.startsWith("data:")
                      ? "embedded image data"
                      : form.posterUrl.slice(0, 60) + "…"}
                  </p>
                )}
                {posterStatus === "error" && (
                  <p className="text-xs text-rose-400">
                    Image URL was returned but could not be displayed. Check network or ad
                    blockers for pollinations.ai.
                  </p>
                )}
                <div className="overflow-hidden rounded-lg border border-[var(--na-border-subtle)]">
                  <img
                    src={form.posterUrl}
                    alt="Campaign poster"
                    className="max-h-80 w-full object-contain"
                    onLoad={() => setPosterStatus("loaded")}
                    onError={() => setPosterStatus("error")}
                  />
                </div>
              </div>
            )}

            {!form.generatedCopy && !form.editedCopy && !generating && (
              <div className="rounded-lg border border-dashed border-[var(--na-border)] p-6 text-center">
                <p className="text-sm text-[var(--na-muted)]">
                  Click Generate to turn your brief into a detailed ad prompt and campaign poster.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Review & Schedule */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-lg font-medium text-[var(--na-text)]">Review &amp; Schedule</h2>
            <div className="space-y-3 rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface-2)] p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--na-muted)]">Name</span>
                <span className="font-medium text-[var(--na-text)]">{form.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--na-muted)]">Objective</span>
                <span className="text-[var(--na-text)]">{form.objective?.replace(/_/g, " ")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--na-muted)]">Audience</span>
                <span className="text-[var(--na-text)]">
                  {form.audienceType === "CUSTOM_LIST"
                    ? `${form.selectedUserIds.length} selected users`
                    : "All users"}
                </span>
              </div>
              {form.budget && (
                <div className="flex justify-between">
                  <span className="text-[var(--na-muted)]">Budget</span>
                  <span className="text-[var(--na-text)]">${form.budget}</span>
                </div>
              )}
              {form.startDate && (
                <div className="flex justify-between">
                  <span className="text-[var(--na-muted)]">Dates</span>
                  <span className="text-[var(--na-text)]">
                    {form.startDate} → {form.endDate || "open ended"}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[var(--na-muted)]">Ad prompt</span>
                <span className="text-[var(--na-text)]">
                  {form.editedCopy || form.generatedCopy ? "✓ Ready" : "Not generated"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--na-muted)]">Poster</span>
                <span className="text-[var(--na-text)]">
                  {form.posterUrl ? "✓ Ready" : "Not generated"}
                </span>
              </div>
            </div>

            {form.posterUrl && (
              <div className="space-y-1">
                {posterStatus === "loaded" && posterSource && (
                  <p className="text-xs text-emerald-400/90">Poster ready ({posterSource})</p>
                )}
                <div className="overflow-hidden rounded-lg border border-[var(--na-border-subtle)]">
                  <img
                    src={form.posterUrl}
                    alt="Campaign poster preview"
                    className="max-h-48 w-full object-contain"
                    onLoad={() => setPosterStatus("loaded")}
                    onError={() => setPosterStatus("error")}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wider text-[var(--na-muted)]">
                Channels *
              </label>
              <div className="flex flex-wrap gap-2">
                {CHANNELS.map((ch) => (
                  <button
                    key={ch.value}
                    type="button"
                    onClick={() => toggleChannel(ch.value)}
                    className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                      form.channels.includes(ch.value)
                        ? "border-[var(--na-accent)] bg-[var(--na-accent)]/10 text-[var(--na-accent)]"
                        : "border-[var(--na-border)] text-[var(--na-muted)]"
                    }`}
                  >
                    {ch.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium uppercase tracking-wider text-[var(--na-muted)]">
                  Schedule Date (optional)
                </label>
                <input
                  type="date"
                  value={form.scheduledAt}
                  onChange={(e) => update({ scheduledAt: e.target.value })}
                  className="w-full rounded-md border border-[var(--na-border)] bg-[var(--na-surface-2)] px-3 py-2 text-sm text-[var(--na-text)] focus:border-[var(--na-accent)]/50 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium uppercase tracking-wider text-[var(--na-muted)]">
                  Schedule Time
                </label>
                <input
                  type="time"
                  value={form.scheduledTime}
                  onChange={(e) => update({ scheduledTime: e.target.value })}
                  className="w-full rounded-md border border-[var(--na-border)] bg-[var(--na-surface-2)] px-3 py-2 text-sm text-[var(--na-text)] focus:border-[var(--na-accent)]/50 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => (step === 0 ? router.push("/dashboard/campaigns") : setStep(step - 1))}
          className="rounded-md border border-[var(--na-border)] px-4 py-2 text-sm text-[var(--na-text)] transition hover:bg-[var(--na-surface-2)]"
        >
          {step === 0 ? "Cancel" : "← Back"}
        </button>
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            disabled={!stepValid[step]}
            onClick={() => setStep(step + 1)}
            className="rounded-md border border-[var(--na-accent)]/40 bg-[var(--na-accent)]/10 px-4 py-2 text-sm font-medium text-[var(--na-accent)] transition hover:bg-[var(--na-accent)]/20 disabled:opacity-40"
          >
            Next →
          </button>
        ) : (
          <button
            type="button"
            disabled={submitting || !stepValid[step]}
            onClick={() => void handleSubmit()}
            className="flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-40"
          >
            {submitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                Creating…
              </>
            ) : (
              "Create Campaign"
            )}
          </button>
        )}
      </div>
    </div>
  );
}
