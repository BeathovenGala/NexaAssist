"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { hasPermission, useAuth } from "@/lib/auth";

type UserRow = {
  id: string;
  userCode: string;
  email: string;
  firstName: string;
  lastName: string | null;
  roles: string[];
};

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createFirstName, setCreateFirstName] = useState("");
  const [createLastName, setCreateLastName] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const refetchUsers = useCallback(async () => {
    if (!user) {
      return;
    }
    if (user.roles.includes("SUPER_ADMIN") && !user.tenantId) {
      return;
    }
    if (!user.tenantId) {
      return;
    }
    const params =
      user.roles.includes("SUPER_ADMIN") && user.tenantId
        ? { params: { tenantId: user.tenantId } }
        : {};
    const res = await api.get("/users", params);
    setUsers(res.data.data as UserRow[]);
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }
    if (user.roles.includes("SUPER_ADMIN") && !user.tenantId) {
      setLoading(false);
      setError("Open a tenant workspace to list users for that organization.");
      return;
    }
    if (!user.tenantId) {
      setLoading(false);
      return;
    }
    void refetchUsers()
      .catch((err: unknown) => {
        setError(extractMessage(err, "Unable to load users"));
      })
      .finally(() => setLoading(false));
  }, [user, refetchUsers]);

  async function onCreateCustomer(e: FormEvent) {
    e.preventDefault();
    if (!user?.tenantId) {
      return;
    }
    setCreateSubmitting(true);
    setCreateError(null);
    try {
      const body: Record<string, unknown> = {
        email: createEmail.trim(),
        password: createPassword,
        firstName: createFirstName.trim(),
        lastName: createLastName.trim() || undefined,
        role: "CUSTOMER",
      };
      if (user.roles.includes("SUPER_ADMIN")) {
        body.tenantId = user.tenantId;
      }
      await api.post("/users", body);
      setCreateEmail("");
      setCreatePassword("");
      setCreateFirstName("");
      setCreateLastName("");
      await refetchUsers();
    } catch (err: unknown) {
      setCreateError(extractMessage(err, "Unable to create customer"));
    } finally {
      setCreateSubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--na-muted)]">Loading…</p>;
  }

  const canCreateCustomer = Boolean(
    user?.tenantId && hasPermission(user, "users:create"),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--na-text)]">Users</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--na-muted)]">
          People in this workspace. Add a customer here for booking; use{" "}
          <Link
            href="/dashboard/settings"
            className="font-medium text-[var(--na-accent)] underline-offset-4 hover:underline"
          >
            Settings
          </Link>{" "}
          for staff roles and invitations.
        </p>
      </div>

      {hasPermission(user, "tenants:update") && (
        <p className="rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface-2)] px-4 py-3 text-sm text-[var(--na-muted)]">
          Organization defaults and staff invites live in{" "}
          <Link
            href="/dashboard/settings"
            className="font-medium text-[var(--na-accent)] underline-offset-4 hover:underline"
          >
            Settings
          </Link>
          .
        </p>
      )}

      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      {canCreateCustomer && (
        <section className="rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)] p-6 shadow-[0_25px_50px_rgba(0,0,0,0.35)]">
          <h2 className="text-lg font-medium text-[var(--na-text)]">Add customer</h2>
          <p className="mt-1 text-sm text-[var(--na-muted)]">
            Creates a sign-in for someone with the Customer role so they can be selected when
            booking.
          </p>
          <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={onCreateCustomer}>
            <div className="sm:col-span-2">
              <label className="block text-xs text-[var(--na-muted)]" htmlFor="cust-email">
                Email
              </label>
              <input
                id="cust-email"
                type="email"
                required
                autoComplete="email"
                className="na-input mt-1 w-full"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--na-muted)]" htmlFor="cust-first">
                First name
              </label>
              <input
                id="cust-first"
                required
                autoComplete="given-name"
                className="na-input mt-1 w-full"
                value={createFirstName}
                onChange={(e) => setCreateFirstName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-[var(--na-muted)]" htmlFor="cust-last">
                Last name <span className="text-[var(--na-muted)]/70">(optional)</span>
              </label>
              <input
                id="cust-last"
                autoComplete="family-name"
                className="na-input mt-1 w-full"
                value={createLastName}
                onChange={(e) => setCreateLastName(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-[var(--na-muted)]" htmlFor="cust-password">
                Password
              </label>
              <input
                id="cust-password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="na-input mt-1 w-full"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
              />
            </div>
            {createError && (
              <p className="sm:col-span-2 text-sm text-red-400" role="alert">
                {createError}
              </p>
            )}
            <div className="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                className="na-btn-primary px-4 py-2 disabled:opacity-50"
                disabled={createSubmitting}
              >
                {createSubmitting ? "Creating…" : "Add customer"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="overflow-hidden rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)] shadow-[0_25px_50px_rgba(0,0,0,0.35)]">
        <div className="border-b border-[var(--na-border-subtle)] px-6 py-4">
          <h2 className="text-lg font-medium text-[var(--na-text)]">Team members</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--na-bg-deep)] text-[var(--na-muted)]">
              <tr>
                <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wide">
                  Code
                </th>
                <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wide">
                  Email
                </th>
                <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wide">
                  Name
                </th>
                <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wide">
                  Roles
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-[var(--na-border-subtle)]">
                  <td className="px-6 py-3 font-mono text-xs text-[var(--na-text)]">
                    {u.userCode}
                  </td>
                  <td className="px-6 py-3 text-[var(--na-text)]">{u.email}</td>
                  <td className="px-6 py-3 text-[var(--na-text)]">
                    {u.firstName} {u.lastName ?? ""}
                  </td>
                  <td className="px-6 py-3 text-[var(--na-text)]">{u.roles.join(", ")}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td className="px-6 py-6 text-[var(--na-muted)]" colSpan={4}>
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
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
