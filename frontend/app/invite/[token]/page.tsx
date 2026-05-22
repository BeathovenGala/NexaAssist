"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api, persistTokens } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { AuthSplitShell } from "@/components/auth/AuthSplitShell";
import { AuthField } from "@/components/auth/AuthField";
import { AuthPrimaryButton } from "@/components/auth/AuthPrimaryButton";
import { AuthError } from "@/components/auth/AuthError";

type ValidatePayload = {
  tenantName: string;
  tenantSlug: string;
  role: string;
  email: string | null;
  phone: string | null;
  expiresAt: string;
};

export default function InviteAcceptPage() {
  const params = useParams();
  const router = useRouter();
  const { refreshMe } = useAuth();
  const rawToken = typeof params.token === "string" ? params.token : "";

  const [info, setInfo] = useState<ValidatePayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!rawToken) {
      setLoadError("Missing invite token.");
      return;
    }
    void api
      .get(`/invitations/validate/${rawToken}`)
      .then((res) => {
        setInfo(res.data.data as ValidatePayload);
        if ((res.data.data as ValidatePayload).email) {
          setEmail((res.data.data as ValidatePayload).email ?? "");
        }
      })
      .catch((err: unknown) => {
        setLoadError(extractMessage(err, "Invalid or expired invite"));
      });
  }, [rawToken]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      const { data } = await api.post("/invitations/accept", {
        token: rawToken,
        password,
        firstName,
        lastName: lastName || undefined,
        email: info?.email ? undefined : email || undefined,
      });
      if (!data.success || !data.data?.accessToken) {
        setSubmitError("Could not complete signup");
        return;
      }
      persistTokens(data.data.accessToken, data.data.refreshToken);
      await refreshMe();
      router.replace("/dashboard");
    } catch (err: unknown) {
      setSubmitError(extractMessage(err, "Could not complete signup"));
    } finally {
      setSubmitting(false);
    }
  }

  const left = (
    <div className="flex max-w-lg flex-col justify-center gap-6">
      <h1 className="text-[32px] font-semibold leading-tight tracking-tight text-[var(--na-text)]">
        Join workspace
      </h1>
      <p className="max-w-sm text-base leading-relaxed text-[var(--na-muted)]">
        You were invited to NexaAssist. Set your password to activate your account.
      </p>
    </div>
  );

  if (loadError) {
    return (
      <AuthSplitShell
        left={left}
        right={
          <div>
            <AuthError message={loadError} />
            <p className="mt-6 text-center text-sm text-[var(--na-muted)]">
              <Link href="/?auth=login" className="text-[var(--na-accent)] hover:underline">
                Back to sign in
              </Link>
            </p>
          </div>
        }
      />
    );
  }

  if (!info) {
    return (
      <AuthSplitShell
        left={left}
        right={<p className="text-sm text-[var(--na-muted)]">Checking invite…</p>}
      />
    );
  }

  const right = (
    <div>
      <div className="mb-6 rounded-md border border-[var(--na-border)] bg-[var(--na-surface)] p-4 text-sm text-[var(--na-muted)]">
        <p className="font-medium text-[var(--na-text)]">{info.tenantName}</p>
        <p className="mt-1">
          Role: <span className="text-[var(--na-text)]">{info.role}</span>
        </p>
        {info.email && (
          <p className="mt-1">
            Email: <span className="text-[var(--na-text)]">{info.email}</span>
          </p>
        )}
        {info.phone && !info.email && (
          <p className="mt-1">
            Phone on file: <span className="text-[var(--na-text)]">{info.phone}</span>
          </p>
        )}
      </div>
      <form className="space-y-5" onSubmit={onSubmit}>
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
          label="Last name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          autoComplete="family-name"
        />
        {!info.email && (
          <AuthField
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        )}
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
        <AuthError message={submitError} />
        <AuthPrimaryButton disabled={submitting}>
          {submitting ? "Creating account…" : "Join workspace"}
        </AuthPrimaryButton>
      </form>
      <p className="mt-8 text-center text-sm text-[var(--na-muted)]">
        Already have an account?{" "}
        <Link href="/?auth=login" className="text-[var(--na-accent)] hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );

  return <AuthSplitShell left={left} right={right} />;
}

function extractMessage(err: unknown, fallback: string): string {
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
  return fallback;
}
