"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost, apiErrorMessage } from "@/lib/apiEnvelope";
import type { WhatsAppTemplate } from "@/lib/types/whatsapp";

function highlightVariables(text: string) {
  const parts = text.split(/({{[^}]+}})/g);
  return parts.map((part, i) =>
    part.startsWith("{{") ? (
      <span
        key={i}
        className="rounded bg-[var(--na-accent)]/15 px-1 font-mono text-[11px] text-[var(--na-accent)]"
      >
        {part}
      </span>
    ) : (
      part
    )
  );
}

export default function WhatsAppTemplatesPage() {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newContent, setNewContent] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<WhatsAppTemplate[]>("/whatsapp/templates");
      setTemplates(data);
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to load templates"));
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newName.trim() || !newContent.trim()) {
      setCreateError("Name and content are required");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      await apiPost("/whatsapp/templates", { name: newName, content: newContent });
      setNewName("");
      setNewContent("");
      setShowCreate(false);
      await load();
    } catch (err) {
      setCreateError(apiErrorMessage(err, "Failed to create template"));
    } finally {
      setCreating(false);
    }
  }

  const extractedVars = (content: string) => {
    const matches = content.match(/{{([^}]+)}}/g) ?? [];
    return [...new Set(matches)];
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[var(--na-border)] bg-[var(--na-surface-2)] px-3 py-1.5 text-xs font-medium text-[var(--na-muted)]">
            WhatsApp
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--na-text)]">
            Templates
          </h1>
          <p className="mt-1 text-sm text-[var(--na-muted)]">
            Manage WhatsApp message templates
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-md border border-[var(--na-accent)]/40 bg-[var(--na-accent)]/10 px-4 py-2 text-sm font-medium text-[var(--na-accent)] transition hover:bg-[var(--na-accent)]/20"
        >
          {showCreate ? "Cancel" : "+ New Template"}
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)] p-5">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-[var(--na-muted)]">
            New Template
          </h3>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wider text-[var(--na-muted)]">
                Template Name *
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. welcome_offer"
                className="w-full rounded-md border border-[var(--na-border)] bg-[var(--na-surface-2)] px-3 py-2 text-sm text-[var(--na-text)] placeholder:text-[var(--na-muted)]/50 focus:border-[var(--na-accent)]/50 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wider text-[var(--na-muted)]">
                Content * (use {"{{variable}}"} for dynamic values)
              </label>
              <textarea
                rows={4}
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder={"Hello {{name}}, we have a special offer just for you: {{offer}}"}
                className="w-full rounded-md border border-[var(--na-border)] bg-[var(--na-surface-2)] px-3 py-2 text-sm text-[var(--na-text)] placeholder:text-[var(--na-muted)]/50 focus:border-[var(--na-accent)]/50 focus:outline-none"
              />
            </div>
            {newContent && (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--na-muted)]">
                  Preview
                </p>
                <div className="rounded-md border border-[var(--na-border-subtle)] bg-[var(--na-surface-2)] p-3 text-sm leading-relaxed text-[var(--na-text)]">
                  {highlightVariables(newContent)}
                </div>
                {extractedVars(newContent).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-[var(--na-muted)]">Variables:</span>
                    {extractedVars(newContent).map((v) => (
                      <span
                        key={v}
                        className="rounded bg-[var(--na-accent)]/15 px-1.5 py-0.5 font-mono text-[11px] text-[var(--na-accent)]"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
            {createError && <p className="text-sm text-rose-400">{createError}</p>}
            <button
              type="button"
              disabled={creating}
              onClick={() => void handleCreate()}
              className="flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-40"
            >
              {creating ? "Creating…" : "Create Template"}
            </button>
          </div>
        </div>
      )}

      {/* Template List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)]/50"
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
      ) : templates.length === 0 ? (
        <div className="rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)] p-12 text-center">
          <p className="text-sm text-[var(--na-muted)]">No templates yet.</p>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="mt-3 text-xs font-medium text-[var(--na-accent)] hover:underline"
          >
            Create your first template →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <div
              key={t.id}
              className="rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)] p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-[var(--na-text)]">{t.name}</h3>
                    {t.approved ? (
                      <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-300">
                        Approved
                      </span>
                    ) : (
                      <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-300">
                        Pending
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--na-muted)]">
                    {highlightVariables(t.content)}
                  </p>
                  {t.variables.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {t.variables.map((v) => (
                        <span
                          key={v}
                          className="rounded bg-[var(--na-accent)]/15 px-1.5 py-0.5 font-mono text-[10px] text-[var(--na-accent)]"
                        >
                          {`{{${v}}}`}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <p className="shrink-0 text-xs text-[var(--na-muted)]">
                  {new Date(t.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
