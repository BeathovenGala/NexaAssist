"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api, persistTokens } from "@/lib/api";
import { apiErrorMessage } from "@/lib/apiEnvelope";
import { useAuth, defaultDashboardPath } from "@/lib/auth";
import { useAuthModal } from "@/lib/auth-modal";
import { AuthField } from "@/components/auth/AuthField";
import { AuthPrimaryButton } from "@/components/auth/AuthPrimaryButton";
import { AuthError } from "@/components/auth/AuthError";

export function LoginFormContent() {
  const router = useRouter();
  const { refreshMe } = useAuth();
  const { switchToRegister, close } = useAuthModal();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      if (!data.success) {
        setError(data.message ?? "Login failed");
        return;
      }
      persistTokens(data.data.accessToken, data.data.refreshToken);
      await refreshMe();
      const me = await api.get<{
        success: boolean;
        data: { user: { roles: string[]; tenantId?: string | null } };
      }>("/auth/me");
      const u = me.data.data.user;
      const dest = defaultDashboardPath(u.roles, u.tenantId);
      const next = new URLSearchParams(window.location.search).get("next");
      close();
      if (next && next.startsWith("/") && !next.startsWith("//")) {
        router.push(next);
      } else {
        router.push(dest);
      }
    } catch (err: unknown) {
      setError(apiErrorMessage(err, "Login failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form className="space-y-4" onSubmit={onSubmit}>
        <AuthField
          id="modal-email"
          label="Email address"
          placeholder="operator@your-company.io"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <AuthField
          id="modal-password"
          label="Password"
          placeholder="••••••••••••••••"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
        <div className="flex items-center justify-between gap-4 text-sm">
          <label className="flex cursor-pointer items-center gap-2 text-[var(--na-muted)]">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border border-[var(--na-border)] bg-[var(--na-bg-deep)] text-[var(--na-accent-solid)]"
            />
            Remember me
          </label>
          <span className="text-xs text-[var(--na-muted)]/70">Forgot password — coming soon</span>
        </div>
        <AuthError message={error} />
        <AuthPrimaryButton disabled={loading}>
          {loading ? "Signing in…" : "Sign In"}
        </AuthPrimaryButton>
      </form>
      <p className="mt-6 text-center text-sm text-[var(--na-muted)]">
        Need an organization?{" "}
        <button
          type="button"
          className="text-[var(--na-accent)] transition hover:underline"
          onClick={() => switchToRegister("org")}
        >
          Create workspace
        </button>
      </p>
      <p className="mt-2 text-center text-sm text-[var(--na-muted)]">
        Joining as a customer?{" "}
        <button
          type="button"
          className="text-[var(--na-accent)] transition hover:underline"
          onClick={() => switchToRegister("customer")}
        >
          Sign up as customer
        </button>
      </p>
    </div>
  );
}

