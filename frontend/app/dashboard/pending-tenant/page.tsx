"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { apiErrorMessage, apiGet, apiPost } from "@/lib/apiEnvelope";

type JoinRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

type JoinRequestRow = {
  id: string;
  status: JoinRequestStatus;
  createdAt: string;
  tenant: { id: string; name: string; slug: string };
};

type PublicTenant = {
  id: string;
  name: string;
  slug: string;
  businessType: string | null;
};

export default function PendingTenantPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<JoinRequestRow[]>([]);
  const [tenants, setTenants] = useState<PublicTenant[]>([]);
  const [tenantSlug, setTenantSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [mine, publicTenants] = await Promise.all([
        apiGet<JoinRequestRow[]>("/join-requests/mine"),
        apiGet<PublicTenant[]>("/tenants/public"),
      ]);
      setRequests(mine);
      setTenants(publicTenants);
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to load organization requests"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const requestedTenantSlugs = useMemo(
    () => new Set(requests.map((row) => row.tenant.slug)),
    [requests],
  );

  const availableTenants = useMemo(
    () => tenants.filter((tenant) => !requestedTenantSlugs.has(tenant.slug)),
    [tenants, requestedTenantSlugs],
  );

  async function submitRequest() {
    if (!tenantSlug) {
      setError("Select an organization first");
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await apiPost<JoinRequestRow>("/join-requests", { tenantSlug });
      setTenantSlug("");
      setSuccessMessage("Access request sent successfully");
      await loadData();
    } catch (err) {
      setError(apiErrorMessage(err, "Could not send access request"));
    } finally {
      setSubmitting(false);
    }
  }

  function statusBadgeClass(status: JoinRequestStatus): string {
    switch (status) {
      case "PENDING":
        return "border border-amber-400/30 bg-amber-500/10 text-amber-200";
      case "APPROVED":
        return "border border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
      case "REJECTED":
        return "border border-rose-400/30 bg-rose-500/10 text-rose-200";
      default:
        return "border border-[var(--na-border)] bg-[var(--na-surface)] text-[var(--na-muted)]";
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold text-[var(--na-text)]">Awaiting organization access</h1>
        <p className="text-sm leading-relaxed text-[var(--na-muted)]">
          Hi {user?.firstName ?? "there"} — once an organization admin approves your request,
          you&apos;ll get full booking access.
        </p>
      </div>

      {error && (
        <p className="rounded-md border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-100">
          {error}
        </p>
      )}
      {successMessage && (
        <p className="rounded-md border border-emerald-500/30 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-100">
          {successMessage}
        </p>
      )}

      <section className="rounded-xl border border-[var(--na-border-subtle)] bg-[var(--na-surface)] p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--na-muted)]">
            Your organization requests
          </h2>
          <button
            type="button"
            className="rounded-md border border-[var(--na-border)] px-3 py-1 text-xs text-[var(--na-muted)] hover:bg-[var(--na-surface-2)]"
            onClick={() => void loadData()}
          >
            Refresh
          </button>
        </div>
        {loading ? (
          <p className="text-sm text-[var(--na-muted)]">Loading requests…</p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-[var(--na-muted)]">
            No organization requests yet. Use the form below to send one.
          </p>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <div
                key={request.id}
                className="rounded-lg border border-[var(--na-border)] bg-[var(--na-bg-deep)] p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-[var(--na-text)]">{request.tenant.name}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusBadgeClass(request.status)}`}
                  >
                    {request.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--na-muted)]">Slug: {request.tenant.slug}</p>
                <p className="mt-1 text-xs text-[var(--na-muted)]">
                  Requested: {new Date(request.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-[var(--na-border-subtle)] bg-[var(--na-surface)] p-4 sm:p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--na-muted)]">
          Request another organization
        </h2>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <select
            className="na-input w-full"
            value={tenantSlug}
            onChange={(e) => setTenantSlug(e.target.value)}
            disabled={submitting || availableTenants.length === 0}
          >
            <option value="">
              {availableTenants.length === 0
                ? "No additional organizations available"
                : "Select organization…"}
            </option>
            {availableTenants.map((tenant) => (
              <option key={tenant.id} value={tenant.slug}>
                {tenant.name} ({tenant.slug})
              </option>
            ))}
          </select>
          <button
            type="button"
            className="na-btn-primary px-4 py-2 text-sm"
            onClick={() => void submitRequest()}
            disabled={submitting || availableTenants.length === 0}
          >
            {submitting ? "Sending…" : "Send request"}
          </button>
        </div>
      </section>

      <div className="flex justify-center">
        <button
          type="button"
          className="rounded-md border border-[var(--na-border)] px-4 py-2 text-sm text-[var(--na-text)] hover:bg-[var(--na-surface-2)]"
          onClick={() => void logout().then(() => router.replace("/?auth=login"))}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
