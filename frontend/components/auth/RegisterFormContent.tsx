"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, persistTokens } from "@/lib/api";
import { useAuth, defaultDashboardPath } from "@/lib/auth";
import { useAuthModal, type RegisterModalMode } from "@/lib/auth-modal";
import { AuthField } from "@/components/auth/AuthField";
import { AuthSelect } from "@/components/auth/AuthSelect";
import { AuthPrimaryButton } from "@/components/auth/AuthPrimaryButton";
import { AuthError } from "@/components/auth/AuthError";

type PublicTenant = {
  id: string;
  name: string;
  slug: string;
  businessType: string | null;
};

type RegisterFormContentProps = {
  mode: RegisterModalMode;
  onModeChange: (mode: RegisterModalMode) => void;
};

export function RegisterFormContent({ mode, onModeChange }: RegisterFormContentProps) {
  const router = useRouter();
  const { refreshMe } = useAuth();
  const { switchToLogin, close } = useAuthModal();

  const [companyName, setCompanyName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminFirstName, setAdminFirstName] = useState("");
  const [adminLastName, setAdminLastName] = useState("");

  const [cFirstName, setCFirstName] = useState("");
  const [cLastName, setCLastName] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cPassword, setCPassword] = useState("");
  const [tenants, setTenants] = useState<PublicTenant[]>([]);
  const [tenantSlug, setTenantSlug] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode !== "customer") return;
    let cancelled = false;
    void (async () => {
      try {
        const { data } = await api.get<{
          success: boolean;
          data: PublicTenant[];
        }>("/tenants/public");
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
  }, [mode]);

  async function onSubmitOrg(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register/tenant", {
        companyName,
        businessType: businessType || undefined,
        adminEmail,
        adminPassword,
        adminFirstName,
        adminLastName: adminLastName || undefined,
      });
      if (!data.success) {
        setError(data.message ?? "Registration failed");
        return;
      }
      persistTokens(data.data.accessToken, data.data.refreshToken);
      await refreshMe();
      const me = await api.get<{
        success: boolean;
        data: { user: { roles: string[]; tenantId?: string | null } };
      }>("/auth/me");
      const u = me.data.data.user;
      close();
      router.push(defaultDashboardPath(u.roles, u.tenantId));
    } catch (err: unknown) {
      setError(extractErr(err));
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitCustomer(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register/customer", {
        email: cEmail,
        password: cPassword,
        firstName: cFirstName,
        lastName: cLastName || undefined,
      });
      if (!data.success) {
        setError(data.message ?? "Registration failed");
        return;
      }
      persistTokens(data.data.accessToken, data.data.refreshToken);
      await refreshMe();
      if (tenantSlug) {
        const joinRes = await api.post("/join-requests", { tenantSlug });
        if (!joinRes.data.success) {
          setError(
            typeof joinRes.data.message === "string"
              ? joinRes.data.message
              : "Could not submit join request",
          );
          return;
        }
      }
      const me = await api.get<{
        success: boolean;
        data: { user: { roles: string[]; tenantId?: string | null } };
      }>("/auth/me");
      const u = me.data.data.user;
      close();
      router.push(defaultDashboardPath(u.roles, u.tenantId));
    } catch (err: unknown) {
      setError(extractErr(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-2 rounded-xl border border-[var(--na-border-subtle)] bg-[var(--na-surface)]/60 p-1 backdrop-blur-md">
        <button
          type="button"
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
            mode === "org"
              ? "bg-[var(--na-surface-2)] text-[var(--na-accent)] ring-1 ring-[var(--na-accent)]/25"
              : "text-[var(--na-muted)] hover:text-[var(--na-text)]"
          }`}
          onClick={() => {
            onModeChange("org");
            setError(null);
          }}
        >
          Create organization
        </button>
        <button
          type="button"
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
            mode === "customer"
              ? "bg-[var(--na-surface-2)] text-[var(--na-accent)] ring-1 ring-[var(--na-accent)]/25"
              : "text-[var(--na-muted)] hover:text-[var(--na-text)]"
          }`}
          onClick={() => {
            onModeChange("customer");
            setError(null);
          }}
        >
          Customer signup
        </button>
      </div>

      {mode === "org" ? (
        <form className="space-y-4" onSubmit={onSubmitOrg}>
          <AuthField
            id="modal-companyName"
            label="Business name"
            placeholder="e.g. Acme Intelligence"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
            autoComplete="organization"
          />
          <AuthSelect
            id="modal-businessType"
            label="Business type"
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
          >
            <option value="">Select business type</option>
            <option value="healthcare">Healthcare</option>
            <option value="retail">Retail</option>
            <option value="studio">Studio</option>
            <option value="other">Other</option>
          </AuthSelect>
          <AuthField
            id="modal-adminFirstName"
            label="Admin name"
            placeholder="Operator designate"
            value={adminFirstName}
            onChange={(e) => setAdminFirstName(e.target.value)}
            required
            autoComplete="given-name"
          />
          <AuthField
            id="modal-adminLastName"
            label="Last name (optional)"
            placeholder="Optional"
            value={adminLastName}
            onChange={(e) => setAdminLastName(e.target.value)}
            autoComplete="family-name"
          />
          <AuthField
            id="modal-adminEmail"
            label="Admin email"
            placeholder="admin@domain.com"
            type="email"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <AuthField
            id="modal-adminPassword"
            label="Password"
            placeholder="••••••••"
            type="password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
          <AuthError message={error} />
          <AuthPrimaryButton disabled={loading}>
            {loading ? "Provisioning…" : "Create Workspace"}
          </AuthPrimaryButton>
        </form>
      ) : (
        <form className="space-y-4" onSubmit={onSubmitCustomer}>
          <AuthField
            id="modal-cFirstName"
            label="First name"
            value={cFirstName}
            onChange={(e) => setCFirstName(e.target.value)}
            required
            autoComplete="given-name"
          />
          <AuthField
            id="modal-cLastName"
            label="Last name (optional)"
            value={cLastName}
            onChange={(e) => setCLastName(e.target.value)}
            autoComplete="family-name"
          />
          <AuthField
            id="modal-cEmail"
            label="Email"
            type="email"
            value={cEmail}
            onChange={(e) => setCEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <AuthField
            id="modal-cPassword"
            label="Password"
            type="password"
            value={cPassword}
            onChange={(e) => setCPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
          <label className="block text-xs font-medium text-[var(--na-muted)]">
            Organization to join
            <select
              className="na-input mt-1 w-full"
              value={tenantSlug}
              onChange={(e) => setTenantSlug(e.target.value)}
            >
              <option value="">Select company (optional)…</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.slug}>
                  {t.name} ({t.slug})
                </option>
              ))}
            </select>
          </label>
          <AuthError message={error} />
          <AuthPrimaryButton disabled={loading}>
            {loading ? "Submitting…" : "Register & request access"}
          </AuthPrimaryButton>
        </form>
      )}

      <p className="text-center text-sm text-[var(--na-muted)]">
        Already have an account?{" "}
        <button
          type="button"
          className="text-[var(--na-accent)] transition hover:underline"
          onClick={() => switchToLogin()}
        >
          Sign in
        </button>
      </p>
      {mode === "customer" ? (
        <p className="text-center text-xs text-[var(--na-muted)]">
          Have an invite link?{" "}
          <Link href="/join" className="text-[var(--na-accent)] hover:underline" onClick={close}>
            Open join page
          </Link>
        </p>
      ) : null}
    </div>
  );
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
  return "Registration failed";
}
