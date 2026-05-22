"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost, apiErrorMessage } from "@/lib/apiEnvelope";
import { useAuth } from "@/lib/auth";
import { useToastStore } from "@/lib/store/toast";

const STORAGE_KEY = "naFirstTimeServicesDone";

export function FirstTimeServiceModal() {
  const { user } = useAuth();
  const toast = useToastStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState([
    { name: "", durationMinutes: 30, colorCode: "#22d3ee" },
    { name: "", durationMinutes: 45, colorCode: "#a78bfa" },
  ]);

  const check = useCallback(async () => {
    if (!user?.roles?.includes("TENANT_ADMIN") || user.tenantId == null) {
      return;
    }
    if (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY)) {
      return;
    }
    setLoading(true);
    try {
      const list = await apiGet<Array<{ id: string }>>("/service-types", {});
      if (list.length === 0) {
        setOpen(true);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void check();
  }, [check]);

  async function submit() {
    const toCreate = rows.filter((r) => r.name.trim().length > 0);
    if (!toCreate.length) {
      toast.show("Add at least one service name", "error");
      return;
    }
    setSaving(true);
    try {
      for (const r of toCreate) {
        await apiPost("/service-types", {
          name: r.name.trim(),
          durationMinutes: r.durationMinutes,
          colorCode: r.colorCode,
          isActive: true,
        });
      }
      toast.show("Services created", "info");
      localStorage.setItem(STORAGE_KEY, "1");
      setOpen(false);
    } catch (e) {
      toast.show(apiErrorMessage(e, "Could not save services"), "error");
    } finally {
      setSaving(false);
    }
  }

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  }

  if (!open || loading) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[var(--na-border-subtle)] bg-[var(--na-surface)] p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fts-title"
      >
        <h2 id="fts-title" className="text-lg font-semibold text-[var(--na-text)]">
          Add your first services
        </h2>
        <p className="mt-2 text-sm text-[var(--na-muted)]">
          Customers book by service type and duration. You can add more later under Service types.
        </p>
        <div className="mt-6 space-y-4">
          {rows.map((r, i) => (
            <div
              key={i}
              className="grid gap-3 rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-bg-deep)] p-4 sm:grid-cols-2"
            >
              <label className="block text-xs text-[var(--na-muted)] sm:col-span-2">
                Service name
                <input
                  className="na-input mt-1 w-full"
                  value={r.name}
                  onChange={(e) => {
                    const next = [...rows];
                    next[i] = { ...next[i], name: e.target.value };
                    setRows(next);
                  }}
                  placeholder="e.g. Consultation"
                />
              </label>
              <label className="block text-xs text-[var(--na-muted)]">
                Duration (min)
                <input
                  type="number"
                  min={5}
                  max={480}
                  className="na-input mt-1 w-full"
                  value={r.durationMinutes}
                  onChange={(e) => {
                    const next = [...rows];
                    next[i] = { ...next[i], durationMinutes: Number(e.target.value) || 30 };
                    setRows(next);
                  }}
                />
              </label>
              <label className="block text-xs text-[var(--na-muted)]">
                Color
                <input
                  type="color"
                  className="mt-1 h-10 w-full cursor-pointer rounded border border-[var(--na-border)] bg-transparent"
                  value={r.colorCode}
                  onChange={(e) => {
                    const next = [...rows];
                    next[i] = { ...next[i], colorCode: e.target.value };
                    setRows(next);
                  }}
                />
              </label>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            className="rounded-md border border-[var(--na-border)] px-4 py-2 text-sm text-[var(--na-muted)] hover:bg-[var(--na-surface-2)]"
            onClick={dismiss}
          >
            Skip for now
          </button>
          <button
            type="button"
            className="na-btn-primary px-4 py-2 text-sm disabled:opacity-50"
            disabled={saving}
            onClick={() => void submit()}
          >
            {saving ? "Saving…" : "Save services"}
          </button>
        </div>
      </div>
    </div>
  );
}
