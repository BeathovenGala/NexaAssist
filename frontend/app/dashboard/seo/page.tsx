"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { apiGet, apiPost, apiErrorMessage } from "@/lib/apiEnvelope";
import type { SeoProject, SeoProjectStats } from "@/lib/types/seo";

interface QuickAuditResult {
  url: string;
  projectId: string;
  scanId: string;
  crawlSucceeded: boolean;
  overallScore: number;
  categories: {
    technicalSeo: number;
    content: number;
    performance: number;
    ux: number;
  };
  issues: Array<{
    type: string;
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
    description: string;
  }>;
  whatIsGood: string[];
  whatToFix: Array<{
    title: string;
    severity: string;
    detail: string;
    fix: string;
  }>;
  summary: string;
  crawledAt: string;
}

type AuditState = "idle" | "loading" | "results";

interface ActivityItem {
  id: string;
  projectName: string;
  projectId: string;
  scanId: string;
  issuesFound: number;
  score: number | null;
  createdAt: string;
}

interface SeoDashboardData {
  stats: SeoProjectStats;
  projects: SeoProject[];
  recentActivity: ActivityItem[];
}

const LOAD_STEPS = ["Fetching page", "Analyzing issues", "Generating AI report"];

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-rose-500/20 text-rose-300 border-rose-500/40",
  HIGH: "bg-orange-500/20 text-orange-300 border-orange-500/40",
  MEDIUM: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  LOW: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  INFO: "bg-zinc-500/20 text-zinc-300 border-zinc-500/40",
};

const ALL_SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"] as const;

function ScoreRing({ score }: { score: number }) {
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);
  const color =
    score >= 70 ? "#34d399" : score >= 40 ? "#fbbf24" : "#f87171";

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="var(--na-border)"
          strokeWidth="10"
        />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 70 70)"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
        <text
          x="70"
          y="70"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="28"
          fontWeight="700"
          fill={color}
        >
          {score}
        </text>
        <text
          x="70"
          y="95"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="11"
          fill="var(--na-muted)"
        >
          / 100
        </text>
      </svg>
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--na-muted)]">
        Overall Score
      </p>
    </div>
  );
}

function CategoryBar({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  const color =
    value >= 70
      ? "bg-emerald-400"
      : value >= 40
        ? "bg-amber-400"
        : "bg-rose-400";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[var(--na-muted)]">{label}</span>
        <span className="font-semibold tabular-nums text-[var(--na-text)]">
          {value}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--na-border)]">
        <div
          className={`h-full rounded-full ${color} transition-all duration-700`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export default function SeoDashboardPage() {
  const [dashboardData, setDashboardData] = useState<SeoDashboardData | null>(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [dashError, setDashError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [auditUrl, setAuditUrl] = useState("");
  const [auditState, setAuditState] = useState<AuditState>("idle");
  const [auditStep, setAuditStep] = useState(0);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditResult, setAuditResult] = useState<QuickAuditResult | null>(null);

  const [severityFilter, setSeverityFilter] = useState<string>("ALL");

  const stepTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function loadDashboard() {
    setDashLoading(true);
    setDashError(null);
    try {
      const [stats, projects] = await Promise.all([
        apiGet<SeoProjectStats>("/seo/stats"),
        apiGet<SeoProject[]>("/seo/projects"),
      ]);
      setDashboardData({ stats, projects, recentActivity: [] });
    } catch (err) {
      setDashError(apiErrorMessage(err, "Failed to load SEO dashboard"));
    } finally {
      setDashLoading(false);
    }
  }

  async function handleCreateProject() {
    if (!newName.trim() || !newUrl.trim()) {
      setCreateError("Name and URL are required");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      await apiPost("/seo/projects", { name: newName, baseUrl: newUrl });
      setNewName("");
      setNewUrl("");
      setShowCreate(false);
      await loadDashboard();
    } catch (err) {
      setCreateError(apiErrorMessage(err, "Failed to create project"));
    } finally {
      setCreating(false);
    }
  }

  function clearStepTimers() {
    stepTimers.current.forEach(clearTimeout);
    stepTimers.current = [];
  }

  async function handleRunAudit() {
    const url = auditUrl.trim();
    if (!url) return;
    setAuditState("loading");
    setAuditStep(0);
    setAuditError(null);
    setAuditResult(null);

    clearStepTimers();

    const t1 = setTimeout(() => setAuditStep(1), 500);
    const t2 = setTimeout(() => setAuditStep(2), 2000);
    stepTimers.current = [t1, t2];

    try {
      const result = await apiPost<QuickAuditResult>("/seo/quick-audit", { url });
      clearStepTimers();
      setAuditResult(result);
      setAuditState("results");
      await loadDashboard();
    } catch (err) {
      clearStepTimers();
      setAuditError(apiErrorMessage(err, "Audit failed. Please try again."));
      setAuditState("idle");
    }
  }

  function handleNewAudit() {
    setAuditState("idle");
    setAuditResult(null);
    setAuditError(null);
    setAuditUrl("");
    setSeverityFilter("ALL");
  }

  function downloadAuditJson(data: QuickAuditResult) {
    try {
      const hostname = new URL(data.url).hostname;
      const filename = `seo-audit-${hostname}-${Date.now()}.json`;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // fallback: open raw JSON in new tab
      const win = window.open();
      win?.document.write(`<pre>${JSON.stringify(data, null, 2)}</pre>`);
    }
  }

  const formatScore = (score: number | null | undefined) => {
    if (score == null || Number.isNaN(score)) return "—";
    return String(Math.round(score));
  };

  const scoreColor = (score: number | null | undefined) => {
    if (score == null || Number.isNaN(score)) return "text-[var(--na-muted)]";
    if (score >= 90) return "text-emerald-400";
    if (score >= 70) return "text-amber-400";
    return "text-rose-400";
  };

  const filteredIssues = auditResult?.issues.filter(
    (i) => severityFilter === "ALL" || i.severity === severityFilter,
  ) ?? [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[var(--na-border)] bg-[var(--na-surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--na-muted)]">
            <span className="h-2 w-2 rounded-full bg-blue-400 shadow-[0_0_8px_theme(colors.blue.400)]" />
            Marketing &amp; Growth
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--na-text)]">
            SEO Audit
          </h1>
          <p className="mt-1 text-sm text-[var(--na-muted)]">
            Scan and optimize your web properties
          </p>
        </div>
        {auditState === "idle" && (
          <button
            type="button"
            onClick={() => setShowCreate(!showCreate)}
            className="rounded-md border border-[var(--na-accent)]/40 bg-[var(--na-accent)]/10 px-4 py-2 text-sm font-medium text-[var(--na-accent)] transition hover:bg-[var(--na-accent)]/20"
          >
            {showCreate ? "Cancel" : "+ New Project"}
          </button>
        )}
      </div>

      {/* ── MODE B: LOADING ── */}
      {auditState === "loading" && (
        <div className="flex flex-col items-center gap-8 py-12">
          <p className="text-sm font-medium text-[var(--na-muted)]">
            Auditing <span className="text-[var(--na-text)]">{auditUrl}</span>…
          </p>
          <div className="flex w-full max-w-md flex-col gap-4">
            {LOAD_STEPS.map((label, i) => {
              const done = i < auditStep;
              const active = i === auditStep;
              return (
                <div key={label} className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-all ${
                      done
                        ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300"
                        : active
                          ? "border-[var(--na-accent)]/50 bg-[var(--na-accent)]/10 text-[var(--na-accent)]"
                          : "border-[var(--na-border)] text-[var(--na-muted)]"
                    }`}
                  >
                    {done ? (
                      "✓"
                    ) : active ? (
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--na-accent)] border-t-transparent" />
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span
                    className={`text-sm ${
                      done
                        ? "text-emerald-400 line-through"
                        : active
                          ? "font-medium text-[var(--na-text)]"
                          : "text-[var(--na-muted)]"
                    }`}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MODE C: RESULTS ── */}
      {auditState === "results" && auditResult && (
        <div className="space-y-6">
          {/* Top bar */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleNewAudit}
              className="rounded-md border border-[var(--na-border)] px-3 py-1.5 text-xs font-medium text-[var(--na-muted)] transition hover:bg-[var(--na-surface-2)] hover:text-[var(--na-text)]"
            >
              ← Back / New Audit
            </button>
            <span className="rounded-full border border-[var(--na-border-subtle)] bg-[var(--na-surface-2)] px-3 py-1 font-mono text-xs text-[var(--na-text)]">
              {auditResult.url}
            </span>
            <span className="ml-auto text-xs text-[var(--na-muted)]">
              Scanned {new Date(auditResult.crawledAt).toLocaleString()}
              {auditResult.crawlSucceeded ? " · saved" : " · crawl limited"}
            </span>
            <Link
              href={`/dashboard/seo/scans/${auditResult.scanId}`}
              className="rounded-md border border-[var(--na-accent)]/40 bg-[var(--na-accent)]/10 px-3 py-1.5 text-xs font-medium text-[var(--na-accent)] transition hover:bg-[var(--na-accent)]/20"
            >
              View saved scan →
            </Link>
            <button
              type="button"
              onClick={() => downloadAuditJson(auditResult)}
              className="rounded-md border border-[var(--na-border)] px-3 py-1.5 text-xs font-medium text-[var(--na-muted)] transition hover:bg-[var(--na-surface-2)] hover:text-[var(--na-text)]"
              title="Download full audit report as JSON"
            >
              ↓ JSON
            </button>
          </div>

          {/* Row 1: Score + Categories */}
          <div className="flex flex-col gap-6 rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)] p-6 sm:flex-row sm:items-center">
            <div className="flex justify-center sm:justify-start">
              <ScoreRing score={auditResult.overallScore} />
            </div>
            <div className="flex-1 space-y-4">
              <CategoryBar label="Technical SEO" value={auditResult.categories.technicalSeo} />
              <CategoryBar label="Content" value={auditResult.categories.content} />
              <CategoryBar label="Performance" value={auditResult.categories.performance} />
              <CategoryBar label="UX" value={auditResult.categories.ux} />
            </div>
          </div>

          {/* Row 2: What's Working + What to Fix */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* What's Working */}
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-emerald-300">
                <span className="text-base">✓</span> What&apos;s Working
              </h2>
              {auditResult.whatIsGood.length === 0 ? (
                <p className="text-xs text-[var(--na-muted)]">No positives found.</p>
              ) : (
                <ul className="space-y-2">
                  {auditResult.whatIsGood.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-emerald-100">
                      <span className="mt-0.5 text-emerald-400">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* What to Fix */}
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-rose-300">
                <span className="text-base">✗</span> What to Fix
              </h2>
              {auditResult.whatToFix.length === 0 ? (
                <p className="text-xs text-[var(--na-muted)]">Nothing critical to fix.</p>
              ) : (
                <div className="space-y-3">
                  {auditResult.whatToFix.map((item, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                            SEVERITY_COLORS[item.severity.toUpperCase()] ?? SEVERITY_COLORS.INFO
                          }`}
                        >
                          {item.severity}
                        </span>
                        <span className="text-xs font-medium text-[var(--na-text)]">
                          {item.title}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--na-muted)]">{item.detail}</p>
                      <p className="text-xs text-sky-300">→ {item.fix}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Row 3: Issues Table */}
          <div className="rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--na-border-subtle)] px-5 py-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--na-muted)]">
                Issues ({auditResult.issues.length})
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {["ALL", ...ALL_SEVERITIES].map((sev) => (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setSeverityFilter(sev)}
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase transition ${
                      severityFilter === sev
                        ? "border-[var(--na-accent)] bg-[var(--na-accent)]/10 text-[var(--na-accent)]"
                        : "border-[var(--na-border)] text-[var(--na-muted)] hover:border-[var(--na-border-subtle)]"
                    }`}
                  >
                    {sev}
                    {sev !== "ALL" && (
                      <span className="ml-1 opacity-60">
                        {auditResult.issues.filter((i) => i.severity === sev).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--na-border-subtle)] bg-[var(--na-surface-2)]">
                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-[var(--na-muted)]">
                      Type
                    </th>
                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-[var(--na-muted)]">
                      Severity
                    </th>
                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-[var(--na-muted)]">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIssues.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-5 py-6 text-center text-sm text-[var(--na-muted)]">
                        No issues match this filter.
                      </td>
                    </tr>
                  ) : (
                    filteredIssues.map((issue, i) => (
                      <tr key={i} className="border-b border-[var(--na-border-subtle)] last:border-0">
                        <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-[var(--na-text)]">
                          {issue.type.replace(/_/g, " ")}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                              SEVERITY_COLORS[issue.severity] ?? SEVERITY_COLORS.INFO
                            }`}
                          >
                            {issue.severity}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs text-[var(--na-muted)]">
                          {issue.description}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Row 4: AI Summary */}
          <div className="rounded-lg border border-[var(--na-accent)]/20 bg-[var(--na-accent)]/5 p-6">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--na-muted)]">
                AI Summary
              </h2>
              <span className="rounded-full border border-[var(--na-accent)]/30 bg-[var(--na-accent)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--na-accent)]">
                ✦ AI
              </span>
            </div>
            <p className="text-sm leading-relaxed text-[var(--na-muted)]">{auditResult.summary}</p>
            {!auditResult.crawlSucceeded && (
              <p className="mt-3 text-xs text-amber-400">
                We could not fully fetch this page (bot blocking or network). Results use partial
                data — set OPENROUTER_API_KEY for richer AI analysis.
              </p>
            )}
          </div>

          {/* Run Another */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleNewAudit}
              className="rounded-md border border-[var(--na-accent)]/40 bg-[var(--na-accent)]/10 px-6 py-2.5 text-sm font-medium text-[var(--na-accent)] transition hover:bg-[var(--na-accent)]/20"
            >
              Run Another Audit
            </button>
          </div>
        </div>
      )}

      {/* ── MODE A: IDLE ── */}
      {auditState === "idle" && (
        <>
          {/* Hero Audit Card */}
          <div className="rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)] p-8 text-center shadow-[0_25px_50px_rgba(0,0,0,0.35)]">
            <h2 className="text-xl font-semibold text-[var(--na-text)]">Audit any website</h2>
            <p className="mt-2 text-sm text-[var(--na-muted)]">
              Submit a URL and get an AI-powered SEO report in seconds
            </p>
            {auditError && (
              <p className="mt-3 text-sm text-rose-400">{auditError}</p>
            )}
            <div className="mx-auto mt-6 flex max-w-lg flex-col gap-3 sm:flex-row">
              <input
                type="url"
                value={auditUrl}
                onChange={(e) => setAuditUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleRunAudit();
                }}
                placeholder="https://example.com"
                className="flex-1 rounded-md border border-[var(--na-border)] bg-[var(--na-surface-2)] px-4 py-2.5 text-sm text-[var(--na-text)] placeholder:text-[var(--na-muted)]/50 focus:border-[var(--na-accent)]/50 focus:outline-none"
              />
              <button
                type="button"
                disabled={!auditUrl.trim()}
                onClick={() => void handleRunAudit()}
                className="rounded-md border border-[var(--na-accent)]/40 bg-[var(--na-accent)]/10 px-5 py-2.5 text-sm font-medium text-[var(--na-accent)] transition hover:bg-[var(--na-accent)]/20 disabled:opacity-40"
              >
                Run Audit
              </button>
            </div>
          </div>

          {/* Stats */}
          {dashboardData && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Total Projects", value: dashboardData.stats.total },
                { label: "Scans This Month", value: dashboardData.stats.scansThisMonth },
                {
                  label: "Issues Found",
                  value: dashboardData.stats.issuesFound,
                  color: "text-rose-400",
                },
                {
                  label: "Avg SEO Score",
                  value: formatScore(dashboardData.stats.avgScore),
                  color: scoreColor(dashboardData.stats.avgScore),
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)] p-4"
                >
                  <p className="text-xs font-medium uppercase tracking-wider text-[var(--na-muted)]">
                    {s.label}
                  </p>
                  <p
                    className={`mt-2 text-3xl font-semibold tabular-nums ${
                      s.color ?? "text-[var(--na-text)]"
                    }`}
                  >
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Create Form */}
          {showCreate && (
            <div className="rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)] p-5">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-[var(--na-muted)]">
                New SEO Project
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium uppercase tracking-wider text-[var(--na-muted)]">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="My Website"
                    className="w-full rounded-md border border-[var(--na-border)] bg-[var(--na-surface-2)] px-3 py-2 text-sm text-[var(--na-text)] focus:border-[var(--na-accent)]/50 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium uppercase tracking-wider text-[var(--na-muted)]">
                    Base URL *
                  </label>
                  <input
                    type="url"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full rounded-md border border-[var(--na-border)] bg-[var(--na-surface-2)] px-3 py-2 text-sm text-[var(--na-text)] focus:border-[var(--na-accent)]/50 focus:outline-none"
                  />
                </div>
              </div>
              {createError && (
                <p className="mt-3 text-sm text-rose-400">{createError}</p>
              )}
              <button
                type="button"
                disabled={creating}
                onClick={() => void handleCreateProject()}
                className="mt-4 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 disabled:opacity-40"
              >
                {creating ? "Creating…" : "Create Project"}
              </button>
            </div>
          )}

          {/* Your Projects */}
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--na-muted)]">
              Your Projects
            </h2>
            {dashLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-20 animate-pulse rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)]/50"
                  />
                ))}
              </div>
            ) : dashError ? (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4">
                <p className="text-sm text-rose-400">{dashError}</p>
                <button
                  type="button"
                  onClick={() => void loadDashboard()}
                  className="mt-2 text-xs text-rose-400 underline"
                >
                  Retry
                </button>
              </div>
            ) : dashboardData?.projects.length === 0 ? (
              <div className="rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)] p-12 text-center">
                <p className="text-sm text-[var(--na-muted)]">No SEO projects yet.</p>
                <button
                  type="button"
                  onClick={() => setShowCreate(true)}
                  className="mt-3 text-xs font-medium text-[var(--na-accent)] hover:underline"
                >
                  Create your first project →
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {dashboardData?.projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/dashboard/seo/projects/${project.id}`}
                    className="group flex items-center justify-between rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)]/50 px-5 py-4 transition hover:border-[var(--na-accent)]/30 hover:bg-[var(--na-surface)]"
                  >
                    <div>
                      <p className="font-medium text-[var(--na-text)] group-hover:text-[var(--na-accent)]">
                        {project.name}
                      </p>
                      <p className="text-xs text-[var(--na-muted)]">{project.baseUrl}</p>
                      <p className="mt-1 text-xs text-[var(--na-muted)]">
                        {project.issueCount ?? 0} issues ·{" "}
                        {project.lastScanAt
                          ? `Last scan ${new Date(project.lastScanAt).toLocaleDateString()}`
                          : "Never scanned"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-2xl font-semibold tabular-nums ${scoreColor(project.avgScore)}`}
                      >
                        {formatScore(project.avgScore)}
                      </p>
                      <p className="text-xs text-[var(--na-muted)]">avg score</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
