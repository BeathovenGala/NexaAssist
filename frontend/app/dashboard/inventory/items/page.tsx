"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useInventoryStore, createInventoryItem } from "@/lib/store/inventory";
import { InventoryItemsTable } from "@/components/inventory/InventoryItemsTable";
import { hasPermission, useAuth } from "@/lib/auth";
import { apiErrorMessage } from "@/lib/apiEnvelope";
import { useToastStore } from "@/lib/store/toast";

export default function InventoryItemsPage() {
  const { user } = useAuth();
  const canWrite = hasPermission(user, "inventory:write");
  const showToast = useToastStore((s) => s.show);
  const {
    items,
    itemsLoading,
    itemsError,
    itemFilters,
    itemSkip,
    itemTake,
    setItemFilters,
    setItemPagination,
    fetchItems,
    fetchCategories,
    categories,
  } = useInventoryStore();

  const [search, setSearch] = useState(itemFilters.search ?? "");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    sku: "",
    unit: "piece",
    minimumThreshold: "5",
    initialQuantity: "0",
  });

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems, itemSkip, itemTake, itemFilters]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.sku.trim()) {
      showToast("Name and SKU required", "error");
      return;
    }
    setCreating(true);
    try {
      await createInventoryItem({
        name: form.name.trim(),
        sku: form.sku.trim(),
        unit: form.unit.trim(),
        minimumThreshold: Number(form.minimumThreshold) || 0,
        initialQuantity: Number(form.initialQuantity) || 0,
      });
      showToast("Item created", "info");
      setForm({ name: "", sku: "", unit: "piece", minimumThreshold: "5", initialQuantity: "0" });
      void fetchItems();
    } catch (err) {
      showToast(apiErrorMessage(err, "Create failed"), "error");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-xl font-semibold text-[var(--na-text)]">Items</h2>
          <p className="mt-1 max-w-xl text-sm text-[var(--na-muted)]">
            Searchable catalog. Quantity changes only via movements.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)]/40 p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="block flex-1 min-w-[200px] text-xs font-bold uppercase text-[var(--na-muted)]">
          Search
          <input
            className="mt-1 w-full rounded-md border border-[var(--na-border)] bg-[var(--na-bg-deep)] px-3 py-2 text-sm text-[var(--na-text)]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setItemFilters({ search: search.trim() || undefined });
              }
            }}
            placeholder="Name or SKU"
          />
        </label>
        <label className="block text-xs font-bold uppercase text-[var(--na-muted)]">
          Category
          <select
            className="mt-1 w-full min-w-[160px] rounded-md border border-[var(--na-border)] bg-[var(--na-bg-deep)] px-3 py-2 text-sm text-[var(--na-text)]"
            value={itemFilters.categoryId ?? ""}
            onChange={(e) =>
              setItemFilters({ categoryId: e.target.value || undefined })
            }
          >
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-[var(--na-muted)]">
          <input
            type="checkbox"
            checked={Boolean(itemFilters.lowStockOnly)}
            onChange={(e) => setItemFilters({ lowStockOnly: e.target.checked || undefined })}
          />
          Low / out only
        </label>
        <button
          type="button"
          className="na-btn-primary px-4 py-2 text-sm"
          onClick={() => setItemFilters({ search: search.trim() || undefined })}
        >
          Apply
        </button>
      </div>

      {canWrite ? (
        <form
          onSubmit={onCreate}
          className="grid gap-3 rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)]/30 p-4 md:grid-cols-5"
        >
          <p className="md:col-span-5 text-xs font-bold uppercase text-[var(--na-muted)]">
            New item
          </p>
          <input
            required
            placeholder="Name"
            className="rounded-md border border-[var(--na-border)] bg-[var(--na-bg-deep)] px-3 py-2 text-sm"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <input
            required
            placeholder="SKU"
            className="rounded-md border border-[var(--na-border)] bg-[var(--na-bg-deep)] px-3 py-2 text-sm"
            value={form.sku}
            onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
          />
          <input
            placeholder="Unit"
            className="rounded-md border border-[var(--na-border)] bg-[var(--na-bg-deep)] px-3 py-2 text-sm"
            value={form.unit}
            onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
          />
          <input
            placeholder="Min threshold"
            className="rounded-md border border-[var(--na-border)] bg-[var(--na-bg-deep)] px-3 py-2 text-sm"
            value={form.minimumThreshold}
            onChange={(e) => setForm((f) => ({ ...f, minimumThreshold: e.target.value }))}
          />
          <input
            placeholder="Initial qty"
            className="rounded-md border border-[var(--na-border)] bg-[var(--na-bg-deep)] px-3 py-2 text-sm"
            value={form.initialQuantity}
            onChange={(e) => setForm((f) => ({ ...f, initialQuantity: e.target.value }))}
          />
          <button type="submit" disabled={creating} className="na-btn-primary px-4 py-2 text-sm md:col-span-5">
            {creating ? "Creating…" : "Create item"}
          </button>
        </form>
      ) : null}

      {itemsError ? <p className="text-sm text-rose-400">{itemsError}</p> : null}

      <InventoryItemsTable rows={items?.items ?? []} loading={itemsLoading} />

      {items && items.total > itemTake ? (
        <div className="flex items-center justify-between text-sm text-[var(--na-muted)]">
          <span>
            Showing {itemSkip + 1}–{Math.min(itemSkip + itemTake, items.total)} of {items.total}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded border border-[var(--na-border)] px-3 py-1 text-xs disabled:opacity-40"
              disabled={itemSkip === 0}
              onClick={() => setItemPagination(Math.max(0, itemSkip - itemTake), itemTake)}
            >
              Previous
            </button>
            <button
              type="button"
              className="rounded border border-[var(--na-border)] px-3 py-1 text-xs disabled:opacity-40"
              disabled={itemSkip + itemTake >= items.total}
              onClick={() => setItemPagination(itemSkip + itemTake, itemTake)}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      <p className="text-center text-xs text-[var(--na-muted)]">
        <Link href="/dashboard/inventory" className="text-[var(--na-accent)] hover:underline">
          Back to overview
        </Link>
      </p>
    </div>
  );
}
