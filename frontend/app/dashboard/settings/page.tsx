"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { api } from "@/lib/api";
import { hasPermission, useAuth } from "@/lib/auth";

type Tab = "organization" | "users" | "invites";

type RoleRow = { name: string; description: string | null };
type UserRow = {
  id: string;
  userCode: string;
  email: string;
  firstName: string;
  lastName: string | null;
  roles: string[];
};

type InvitationRow = {
  id: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
};

export default function SettingsPage() {
  const { user, refreshMe } = useAuth();
  const [tab, setTab] = useState<Tab>("organization");

  const canOrg = hasPermission(user, "tenants:update");
  const canUsers = hasPermission(user, "users:read");
  const canInvite = hasPermission(user, "invitations:create");
  const canListInvites = hasPermission(user, "invitations:read");

  const tenantId = user?.tenantId ?? null;

  const [tenantName, setTenantName] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [orgLoading, setOrgLoading] = useState(false);
  const [orgSaving, setOrgSaving] = useState(false);
  const [orgMessage, setOrgMessage] = useState<string | null>(null);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("DOCTOR");

  const [invites, setInvites] = useState<InvitationRow[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteRole, setInviteRole] = useState("DOCTOR");
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [lastInvite, setLastInvite] = useState<{
    inviteUrl: string;
    token: string;
  } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const assignableRoles = useMemo(
    () =>
      roles.filter(
        (r) => r.name !== "SUPER_ADMIN" && r.name !== "TENANT_ADMIN",
      ),
    [roles],
  );

  const loadTenant = useCallback(async () => {
    if (!tenantId || !canOrg) {
      return;
    }
    setOrgLoading(true);
    setOrgMessage(null);
    try {
      const { data } = await api.get(`/tenants/${tenantId}`);
      const t = data.data as {
        name: string;
        slug: string;
        businessType: string | null;
      };
      setTenantName(t.name);
      setTenantSlug(t.slug);
      setBusinessType(t.businessType ?? "");
    } catch {
      setOrgMessage("Could not load organization.");
    } finally {
      setOrgLoading(false);
    }
  }, [tenantId, canOrg]);

  const loadUsersAndRoles = useCallback(async () => {
    if (!tenantId || !canUsers) {
      return;
    }
    setUserError(null);
    setUsersLoading(true);
    try {
      const params =
        user?.roles?.includes("SUPER_ADMIN") && tenantId
          ? { params: { tenantId } }
          : {};
      const [uRes, rRes] = await Promise.all([
        api.get("/users", params),
        api.get("/roles"),
      ]);
      setUsers(uRes.data.data as UserRow[]);
      const items = (rRes.data.data as { items: RoleRow[] }).items;
      setRoles(items);
      const assign = items.filter(
        (r) => r.name !== "SUPER_ADMIN" && r.name !== "TENANT_ADMIN",
      );
      if (assign.length > 0) {
        setRole((current) =>
          assign.some((r) => r.name === current) ? current : assign[0].name,
        );
        setInviteRole((current) =>
          assign.some((r) => r.name === current) ? current : assign[0].name,
        );
      }
    } catch (err: unknown) {
      setUserError(extractMessage(err, "Unable to load users"));
    } finally {
      setUsersLoading(false);
    }
  }, [tenantId, canUsers, user?.roles]);

  const loadInvites = useCallback(async () => {
    if (!tenantId || !canListInvites) {
      return;
    }
    setInvitesLoading(true);
    try {
      const params = user?.roles?.includes("SUPER_ADMIN")
        ? { params: { tenantId } }
        : {};
      const { data } = await api.get("/invitations", params);
      setInvites(data.data as InvitationRow[]);
    } catch {
      setInvites([]);
    } finally {
      setInvitesLoading(false);
    }
  }, [tenantId, canListInvites, user?.roles]);

  useEffect(() => {
    if (!tenantId) {
      return;
    }
    const allowed: Tab[] = [];
    if (canOrg) {
      allowed.push("organization");
    }
    if (canUsers) {
      allowed.push("users");
    }
    if (canInvite || canListInvites) {
      allowed.push("invites");
    }
    setTab((current) =>
      allowed.includes(current) ? current : allowed[0] ?? "organization",
    );
  }, [tenantId, canOrg, canUsers, canInvite, canListInvites]);

  useEffect(() => {
    if (!tenantId || tab !== "invites" || !canInvite) {
      return;
    }
    if (roles.length > 0) {
      return;
    }
    void api.get("/roles").then((rRes) => {
      const items = (rRes.data.data as { items: RoleRow[] }).items;
      setRoles(items);
      const assign = items.filter(
        (r) => r.name !== "SUPER_ADMIN" && r.name !== "TENANT_ADMIN",
      );
      if (assign.length > 0) {
        setInviteRole((c) =>
          assign.some((r) => r.name === c) ? c : assign[0].name,
        );
      }
    });
  }, [tenantId, tab, canInvite, roles.length]);

  useEffect(() => {
    void loadTenant();
  }, [loadTenant]);

  useEffect(() => {
    if (tab === "users") {
      void loadUsersAndRoles();
    }
    if (tab === "invites") {
      void loadInvites();
    }
  }, [tab, loadUsersAndRoles, loadInvites]);

  useEffect(() => {
    if (!lastInvite?.inviteUrl) {
      setQrDataUrl(null);
      return;
    }
    void QRCode.toDataURL(lastInvite.inviteUrl, { width: 200, margin: 1 }).then(
      setQrDataUrl,
    );
  }, [lastInvite?.inviteUrl]);

  async function onSaveOrg(e: FormEvent) {
    e.preventDefault();
    if (!tenantId) {
      return;
    }
    setOrgSaving(true);
    setOrgMessage(null);
    try {
      await api.patch(`/tenants/${tenantId}`, {
        name: tenantName,
        slug: tenantSlug,
        businessType: businessType || null,
      });
      setOrgMessage("Saved.");
      void refreshMe();
    } catch (err: unknown) {
      setOrgMessage(extractMessage(err, "Save failed"));
    } finally {
      setOrgSaving(false);
    }
  }

  async function onCreateUser(e: FormEvent) {
    e.preventDefault();
    if (!tenantId) {
      return;
    }
    setCreating(true);
    setUserError(null);
    try {
      const body: Record<string, unknown> = {
        email,
        password,
        firstName,
        lastName: lastName || undefined,
        role,
      };
      if (user?.roles?.includes("SUPER_ADMIN")) {
        body.tenantId = tenantId;
      }
      await api.post("/users", body);
      setEmail("");
      setPassword("");
      setFirstName("");
      setLastName("");
      await loadUsersAndRoles();
    } catch (err: unknown) {
      setUserError(extractMessage(err, "Unable to create user"));
    } finally {
      setCreating(false);
    }
  }

  async function onCreateInvite(e: FormEvent) {
    e.preventDefault();
    setInviteError(null);
    setLastInvite(null);
    setInviteSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        role: inviteRole,
      };
      if (inviteEmail.trim()) {
        body.email = inviteEmail.trim();
      }
      if (invitePhone.trim()) {
        body.phone = invitePhone.trim();
      }
      if (user?.roles?.includes("SUPER_ADMIN") && tenantId) {
        body.tenantId = tenantId;
      }
      const { data } = await api.post("/invitations", body);
      const payload = data.data as {
        inviteUrl: string;
        token: string;
      };
      setLastInvite({ inviteUrl: payload.inviteUrl, token: payload.token });
      setInviteEmail("");
      setInvitePhone("");
      await loadInvites();
    } catch (err: unknown) {
      setInviteError(extractMessage(err, "Could not create invite"));
    } finally {
      setInviteSubmitting(false);
    }
  }

  async function resendInvite(id: string) {
    try {
      const { data } = await api.post(`/invitations/${id}/resend`);
      const payload = data.data as { inviteUrl: string; token: string };
      setLastInvite({ inviteUrl: payload.inviteUrl, token: payload.token });
      await loadInvites();
    } catch {
      /* ignore */
    }
  }

  async function revokeInvite(id: string) {
    try {
      await api.delete(`/invitations/${id}`);
      await loadInvites();
    } catch {
      /* ignore */
    }
  }

  if (!tenantId) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--na-text)]">Settings</h1>
        <p className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Organization settings are available when you are signed in to a tenant
          workspace. Platform accounts should open a specific tenant context first.
        </p>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: "organization", label: "Organization", show: canOrg },
    { id: "users", label: "Users", show: canUsers },
    { id: "invites", label: "Invites", show: canInvite || canListInvites },
  ];

  const visibleTabs = tabs.filter((t) => t.show);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--na-text)]">Settings</h1>
        <p className="mt-1 text-sm text-[var(--na-muted)]">
          Organization details, team members, and staff invitations.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-[var(--na-border-subtle)] pb-2">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              tab === t.id
                ? "bg-[var(--na-surface-2)] text-[var(--na-accent)] ring-1 ring-[var(--na-accent)]/25"
                : "text-[var(--na-muted)] hover:bg-[var(--na-surface)]/80 hover:text-[var(--na-text)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "organization" && canOrg && (
        <section className="rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)] p-6 shadow-[0_25px_50px_rgba(0,0,0,0.35)]">
          <h2 className="text-lg font-medium text-[var(--na-text)]">Organization</h2>
          {orgLoading ? (
            <p className="mt-4 text-sm text-[var(--na-muted)]/80">Loading…</p>
          ) : (
            <form className="mt-4 max-w-lg space-y-4" onSubmit={onSaveOrg}>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-[var(--na-muted)]">
                  Name
                </label>
                <input
                  className="na-input mt-1"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-[var(--na-muted)]">
                  Slug
                </label>
                <input
                  className="na-input mt-1"
                  value={tenantSlug}
                  onChange={(e) => setTenantSlug(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-[var(--na-muted)]">
                  Business type
                </label>
                <input
                  className="na-input mt-1"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                />
              </div>
              {orgMessage && (
                <p className="text-sm text-[var(--na-muted)]" role="status">
                  {orgMessage}
                </p>
              )}
              <button
                type="submit"
                disabled={orgSaving}
                className="na-btn-primary"
              >
                {orgSaving ? "Saving…" : "Save changes"}
              </button>
            </form>
          )}
        </section>
      )}

      {tab === "users" && canUsers && (
        <div className="space-y-8">
          {hasPermission(user, "users:create") && (
            <section className="rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)] p-6 shadow-[0_25px_50px_rgba(0,0,0,0.35)]">
              <h2 className="text-lg font-medium text-[var(--na-text)]">Create user</h2>
              <form
                className="mt-4 grid gap-4 sm:grid-cols-2"
                onSubmit={onCreateUser}
              >
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-[var(--na-muted)]">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    className="na-input mt-1"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-[var(--na-muted)]">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    className="na-input mt-1"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-[var(--na-muted)]">
                    First name
                  </label>
                  <input
                    required
                    className="na-input mt-1"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-[var(--na-muted)]">
                    Last name
                  </label>
                  <input
                    className="na-input mt-1"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-[var(--na-muted)]">
                    Role
                  </label>
                  <select
                    className="na-input mt-1"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    {assignableRoles.map((r) => (
                      <option key={r.name} value={r.name}>
                        {r.name}
                        {r.description ? ` — ${r.description}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={creating}
                    className="na-btn-primary"
                  >
                    {creating ? "Creating…" : "Create user"}
                  </button>
                </div>
              </form>
            </section>
          )}

          {userError && (
            <p className="text-sm text-red-400" role="alert">
              {userError}
            </p>
          )}

          <section className="rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)] shadow-[0_25px_50px_rgba(0,0,0,0.35)]">
            <div className="border-b border-[var(--na-border-subtle)] px-6 py-4">
              <h2 className="text-lg font-medium text-[var(--na-text)]">Team members</h2>
            </div>
            {usersLoading ? (
              <p className="px-6 py-8 text-sm text-[var(--na-muted)]/80">Loading…</p>
            ) : (
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
                        <td className="px-6 py-3 text-[var(--na-text)]">
                          {u.roles.join(", ")}
                        </td>
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
            )}
          </section>
        </div>
      )}

      {tab === "invites" && (canInvite || canListInvites) && (
        <div className="space-y-8">
          {canInvite && (
            <section className="rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)] p-6 shadow-[0_25px_50px_rgba(0,0,0,0.35)]">
              <h2 className="text-lg font-medium text-[var(--na-text)]">Invite staff</h2>
              <p className="mt-1 text-sm text-[var(--na-muted)]">
                Send an email or phone invite. The recipient opens the link, sets a
                password, and joins your workspace with the selected role.
              </p>
              <form
                className="mt-4 max-w-lg space-y-4"
                onSubmit={onCreateInvite}
              >
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-[var(--na-muted)]">
                    Email (optional if phone set)
                  </label>
                  <input
                    type="email"
                    className="na-input mt-1"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-[var(--na-muted)]">
                    Phone (optional if email set)
                  </label>
                  <input
                    className="na-input mt-1"
                    value={invitePhone}
                    onChange={(e) => setInvitePhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-[var(--na-muted)]">
                    Role
                  </label>
                  <select
                    className="na-input mt-1"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                  >
                    {assignableRoles.map((r) => (
                      <option key={r.name} value={r.name}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                {inviteError && (
                  <p className="text-sm text-red-400" role="alert">
                    {inviteError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={inviteSubmitting}
                  className="na-btn-primary"
                >
                  {inviteSubmitting ? "Creating…" : "Generate invite"}
                </button>
              </form>

              {lastInvite && (
                <div className="mt-6 rounded-md border border-[var(--na-border-subtle)] bg-[var(--na-surface-2)] p-4">
                  <p className="text-sm font-medium text-[var(--na-text)]">Invite link</p>
                  <p className="mt-2 break-all font-mono text-xs text-[var(--na-muted)]">
                    {lastInvite.inviteUrl}
                  </p>
                  {qrDataUrl && (
                    <div className="mt-4 flex flex-col items-start gap-2 sm:flex-row sm:items-center">
                      {/* eslint-disable-next-line @next/next/no-img-element -- data URL from qrcode */}
                      <img
                        src={qrDataUrl}
                        alt="Invite QR code"
                        width={200}
                        height={200}
                      />
                      <p className="max-w-xs text-xs text-[var(--na-muted)]">
                        Scan to open the invite on a phone. The QR encodes the same URL
                        as the link above.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {canListInvites && (
            <section className="rounded-lg border border-[var(--na-border-subtle)] bg-[var(--na-surface)] shadow-[0_25px_50px_rgba(0,0,0,0.35)]">
              <div className="border-b border-[var(--na-border-subtle)] px-6 py-4">
                <h2 className="text-lg font-medium text-[var(--na-text)]">Invitations</h2>
              </div>
              {invitesLoading ? (
                <p className="px-6 py-8 text-sm text-[var(--na-muted)]/80">Loading…</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-[var(--na-bg-deep)] text-[var(--na-muted)]">
                      <tr>
                        <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide">
                          Target
                        </th>
                        <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide">
                          Role
                        </th>
                        <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide">
                          Status
                        </th>
                        <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide">
                          Expires
                        </th>
                        <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {invites.map((inv) => (
                        <tr key={inv.id} className="border-t border-[var(--na-border-subtle)]">
                          <td className="px-4 py-3 text-[var(--na-text)]">
                            {inv.email ?? inv.phone ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-[var(--na-text)]">{inv.role}</td>
                          <td className="px-4 py-3 text-[var(--na-text)]">{inv.status}</td>
                          <td className="px-4 py-3 text-[var(--na-muted)]">
                            {new Date(inv.expiresAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            {inv.status === "PENDING" && canInvite ? (
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  className="text-xs font-medium text-[var(--na-accent)] underline-offset-2 hover:underline"
                                  onClick={() => void resendInvite(inv.id)}
                                >
                                  Resend
                                </button>
                                <button
                                  type="button"
                                  className="text-xs font-medium text-red-400 underline"
                                  onClick={() => void revokeInvite(inv.id)}
                                >
                                  Revoke
                                </button>
                              </div>
                            ) : (
                              <span className="text-[var(--na-muted)]/50">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {invites.length === 0 && (
                        <tr>
                          <td className="px-6 py-6 text-[var(--na-muted)]" colSpan={5}>
                            No invitations yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </div>
      )}

      <p className="text-sm text-[var(--na-muted)]/80">
        Tip: staff should use{" "}
        <Link href="/join" className="text-[var(--na-accent)] underline-offset-4 hover:underline">
          client / booking entry
        </Link>{" "}
        for a simpler path than admin invites.
      </p>
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
