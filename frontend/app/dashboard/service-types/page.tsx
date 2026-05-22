"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPatch, apiErrorMessage } from "@/lib/apiEnvelope";
import type { ServiceType } from "@/lib/types/scheduling";
import { useToastStore } from "@/lib/store/toast";

export default function ServiceTypesPage() {
  const toast = useToastStore();
  const [rows, setRows] = useState<ServiceType[]>([]);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState(30);
  const [color, setColor] = useState("#4d93e5");

  async function load() {
    try {
      const data = await apiGet<ServiceType[]>("/service-types", {});
      setRows(data);
    } catch (e) {
      toast.show(apiErrorMessage(e, "Failed to load service types"), "error");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create() {
    try {
      await apiPost("/service-types", {
        name,
        durationMinutes: duration,
        colorCode: color,
        isActive: true,
      });
      toast.show("Service type created", "info");
      setName("");
      await load();
    } catch (e) {
      toast.show(apiErrorMessage(e, "Create failed"), "error");
    }
  }

  async function toggle(row: ServiceType) {
    try {
      await apiPatch(`/service-types/${row.id}`, { isActive: !row.isActive });
      await load();
    } catch (e) {
      toast.show(apiErrorMessage(e, "Update failed"), "error");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--na-text)]">
          Service types
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--na-muted)]">
          Configurable services with duration used by booking and free-slot generation.
        </p>
      </div>

      <div className="na-card grid gap-4 border border-[var(--na-border-subtle)] p-5 md:grid-cols-3">
        <label className="text-xs text-[var(--na-muted)]">
          Name
          <input className="na-input mt-1" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="text-xs text-[var(--na-muted)]">
          Duration (min)
          <input
            type="number"
            min={5}
            className="na-input mt-1"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
        </label>
        <label className="text-xs text-[var(--na-muted)]">
          Color
          <input
            type="color"
            className="mt-1 h-10 w-full rounded border border-[var(--na-border)] bg-[var(--na-bg-deep)]"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </label>
        <div className="md:col-span-3">
          <button type="button" className="na-btn-primary" onClick={() => void create()}>
            Add service type
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--na-border-subtle)] bg-[var(--na-bg-deep)] text-xs uppercase text-[var(--na-muted)]">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-[var(--na-border-subtle)] last:border-0">
                <td className="px-4 py-3 font-medium text-[var(--na-text)]">{r.name}</td>
                <td className="px-4 py-3 text-[var(--na-muted)]">{r.durationMinutes} min</td>
                <td className="px-4 py-3 text-[var(--na-muted)]">{r.isActive ? "Yes" : "No"}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    className="text-xs font-semibold text-[var(--na-accent)] hover:underline"
                    onClick={() => void toggle(r)}
                  >
                    Toggle active
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
