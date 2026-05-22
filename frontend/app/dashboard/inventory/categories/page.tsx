"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  useInventoryStore,
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/lib/store/inventory";
import { hasPermission, useAuth } from "@/lib/auth";
import { apiErrorMessage } from "@/lib/apiEnvelope";
import { useToastStore } from "@/lib/store/toast";

export default function InventoryCategoriesPage() {
  const { user } = useAuth();
  const canWrite = hasPermission(user, "inventory:write");
  const showToast = useToastStore((s) => s.show);
  const { categories, categoriesLoading, categoriesError, fetchCategories } = useInventoryStore();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await createCategory({ name: name.trim(), description: desc.trim() || undefined });
      showToast("Category created", "info");
      setName("");
      setDesc("");
      void fetchCategories();
    } catch (err) {
      showToast(apiErrorMessage(err, "Failed"), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-[var(--na-text)]">Categories</h2>
      {categoriesError ? <p className="text-sm text-rose-400">{categoriesError}</p> : null}

      {canWrite ? (
        <form
          onSubmit={onCreate}
          className="flex max-w-xl flex-col gap-2 rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)]/40 p-4 sm:flex-row sm:items-end"
        >
          <label className="flex-1 text-xs font-bold uppercase text-[var(--na-muted)]">
            Name
            <input
              className="mt-1 w-full rounded-md border border-[var(--na-border)] bg-[var(--na-bg-deep)] px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="flex-[2] text-xs font-bold uppercase text-[var(--na-muted)]">
            Description
            <input
              className="mt-1 w-full rounded-md border border-[var(--na-border)] bg-[var(--na-bg-deep)] px-3 py-2 text-sm"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </label>
          <button type="submit" disabled={saving} className="na-btn-primary px-4 py-2 text-sm">
            {saving ? "…" : "Add"}
          </button>
        </form>
      ) : null}

      {categoriesLoading && !categories.length ? (
        <p className="text-sm text-[var(--na-muted)]">Loading…</p>
      ) : (
        <ul className="divide-y divide-[var(--na-border-subtle)] rounded-lg border border-[var(--na-border-subtle)]">
          {categories.map((c) => (
            <li key={c.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-[var(--na-text)]">{c.name}</p>
                <p className="text-xs text-[var(--na-muted)]">{c.description ?? "—"}</p>
              </div>
              {canWrite ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="text-xs text-[var(--na-accent)] hover:underline"
                    onClick={() => {
                      const n = window.prompt("Rename to:", c.name);
                      if (n == null || !n.trim()) return;
                      void (async () => {
                        try {
                          await updateCategory(c.id, { name: n.trim() });
                          showToast("Updated", "info");
                          void fetchCategories();
                        } catch (err) {
                          showToast(apiErrorMessage(err, "Update failed"), "error");
                        }
                      })();
                    }}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    className="text-xs text-rose-400 hover:underline"
                    onClick={() => {
                      if (!window.confirm("Delete this category?")) return;
                      void (async () => {
                        try {
                          await deleteCategory(c.id);
                          showToast("Deleted", "info");
                          void fetchCategories();
                        } catch (err) {
                          showToast(apiErrorMessage(err, "Delete failed"), "error");
                        }
                      })();
                    }}
                  >
                    Delete
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <p className="text-center text-xs text-[var(--na-muted)]">
        <Link href="/dashboard/inventory" className="text-[var(--na-accent)] hover:underline">
          Overview
        </Link>
      </p>
    </div>
  );
}
