"use client";

import Link from "next/link";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, persistTokens } from "@/lib/api";
import { useAuth, defaultDashboardPath } from "@/lib/auth";
import { AuthSplitShell } from "@/components/auth/AuthSplitShell";
import { AuthField } from "@/components/auth/AuthField";
import { AuthPrimaryButton } from "@/components/auth/AuthPrimaryButton";
import { AuthError } from "@/components/auth/AuthError";

type PublicTenant = {
  id: string;
  name: string;
  slug: string;
  businessType: string | null;
};

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--na-bg)] text-[var(--na-muted)]">
          Loading…
        </div>
      }
    >
      <JoinInner />
    </Suspense>
  );
}

function JoinInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slugFromUrl = (searchParams.get("t") ?? "").trim().toLowerCase();
  const { refreshMe } = useAuth();

  const [tenants, setTenants] = useState<PublicTenant[]>([]);
  const [tenantSlug, setTenantSlug] = useState(slugFromUrl);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { data } = await api.get<{ success: boolean; data: PublicTenant[] }>(
          "/tenants/public",
        );
        if (!cancelled && data.success && Array.isArray(data.data)) {
          setTenants(data.data);
        }
      } catch {
        if (!cancelled) setTenants([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (slugFromUrl) setTenantSlug(slugFromUrl);
  }, [slugFromUrl]);

  const selectedTenant = tenants.find((t) => t.slug === tenantSlug);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!tenantSlug) {
      setError("Choose an organization");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register/customer", {
        email,
        password,
        firstName,
        lastName: lastName || undefined,
      });
      if (!data.success) {
        setError(typeof data.message === "string" ? data.message : "Registration failed");
        return;
      }
      persistTokens(data.data.accessToken, data.data.refreshToken);
      await refreshMe();
      const joinRes = await api.post("/join-requests", { tenantSlug });
      if (!joinRes.data.success) {
        setError(
          typeof joinRes.data.message === "string"
            ? joinRes.data.message
            : "Could not submit join request",
        );
        return;
      }
      setDone(true);
      const me = await api.get<{
        success: boolean;
        data: { user: { roles: string[]; tenantId?: string | null } };
      }>("/auth/me");
      const u = me.data.data.user;
      router.push(defaultDashboardPath(u.roles, u.tenantId));
    } catch (err: unknown) {
      setError(extractErr(err));
    } finally {
      setLoading(false);
    }
  }

  const left = (
    <div className="flex max-w-lg flex-col justify-center gap-6">
      <h1 className="text-[32px] font-semibold leading-tight tracking-tight text-[var(--na-text)]">
        Join an organization
      </h1>
      <p className="max-w-sm text-base leading-relaxed text-[var(--na-muted)]">
        Create a customer account and send a join request to the business you want to book with.
      </p>
      {selectedTenant ? (
        <p className="text-sm text-[var(--na-muted)]">
          Target:{" "}
          <span className="font-medium text-[var(--na-text)]">{selectedTenant.name}</span>
        </p>
      ) : tenantSlug ? (
        <p className="text-sm text-amber-200/90">
          Slug <span className="font-mono">{tenantSlug}</span> — select a matching organization
          below if it appears in the list.
        </p>
      ) : (
        <p className="text-sm text-[var(--na-muted)]">
          Pick an organization from the list, or open this page with{" "}
          <span className="font-mono">?t=your-tenant-slug</span>.
        </p>
      )}
      {done && (
        <p className="rounded-md border border-emerald-500/30 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100">
          Request sent. Redirecting…
        </p>
      )}
    </div>
  );

  const right = (
    <div>
      <form className="space-y-5" onSubmit={onSubmit}>
        {(!slugFromUrl || !tenants.some((t) => t.slug === slugFromUrl)) && (
          <label className="block text-xs font-medium text-[var(--na-muted)]">
            Organization
            <select
              className="na-input mt-1 w-full"
              value={tenantSlug}
              onChange={(e) => setTenantSlug(e.target.value)}
              required
            >
              <option value="">Select…</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.slug}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <AuthField
          id="firstName"
          label="First name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
          autoComplete="given-name"
        />
        <AuthField
          id="lastName"
          label="Last name (optional)"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          autoComplete="family-name"
        />
        <AuthField
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <AuthField
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />
        <AuthError message={error} />
        <AuthPrimaryButton type="submit" disabled={loading || done}>
          {loading ? "Working…" : "Register & request access"}
        </AuthPrimaryButton>
      </form>
      <p className="mt-8 text-center text-sm text-[var(--na-muted)]">
        Staff member?{" "}
        <Link href="/?auth=login" className="text-[var(--na-accent)] hover:underline">
          Sign in with your account
        </Link>
      </p>
    </div>
  );

  return <AuthSplitShell left={left} right={right} />;
}

function extractErr(err: unknown): string {
  if (
    err &&
    typeof err === "object" &&
    "response" in err &&
    err.response &&
    typeof err.response === "object" &&
    "data" in err.response &&
    err.response.data &&
    typeof err.response.data === "object" &&
    "message" in err.response.data
  ) {
    return String((err.response.data as { message?: string }).message);
  }
  return "Something went wrong";
}
