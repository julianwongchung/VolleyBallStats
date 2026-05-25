"use client";

import Link from "next/link";
import { useState } from "react";
import { KeyRound, Plus, Trash2 } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { confirmAction } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageShell } from "@/components/ui/page-shell";
import { formatDateTime } from "@/lib/utils";

export function AdminUsersPage() {
  const { adminUsers, addAdminUser, isAdmin, removeAdminUser, resetAdminPassword, userId } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setStatus("");
    try {
      await addAdminUser({ email, password });
      setEmail("");
      setPassword("");
      setStatus("Admin user created and added.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add admin user.");
    }
  }

  async function submitPasswordReset(adminUserId: string, adminEmail: string | null) {
    const nextPassword = resetPasswords[adminUserId] ?? "";
    if (nextPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      setStatus("");
      return;
    }
    if (!confirmAction(`Reset password for ${adminEmail ?? "this admin"}?`)) return;
    setError("");
    setStatus("");
    try {
      await resetAdminPassword({ userId: adminUserId, password: nextPassword });
      setResetPasswords((current) => ({ ...current, [adminUserId]: "" }));
      setStatus(`Password updated for ${adminEmail ?? "admin user"}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reset password.");
    }
  }

  if (!isAdmin) {
    return (
      <PageShell title="Admin Users">
        <EmptyState title="Admin only" body="Log in as an admin to manage who can edit VolleyStats records." />
        <Link className="primary-button" href="/login">
          Admin Login
        </Link>
      </PageShell>
    );
  }

  return (
    <PageShell title="Admin Users">
      <section className="form-panel">
        <div className="form-title">
          <h2>Add Admin</h2>
        </div>
        <p className="setup-note">
          Create a Supabase Auth user and admin access in one step. No Auth user ID is needed.
        </p>
        {error ? <p className="form-error">{error}</p> : null}
        {status ? <p className="form-success">{status}</p> : null}
        <form className="form-stack" onSubmit={(event) => void submit(event)}>
          <label>
            Email
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@example.com"
            />
          </label>
          <label>
            Temporary password
            <input
              required
              minLength={6}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
            />
          </label>
          <button className="primary-button" type="submit">
            <Plus size={17} />
            Add Admin
          </button>
        </form>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <h2>Current Admins</h2>
        </div>
        <div className="admin-user-list">
          {adminUsers.length === 0 ? (
            <EmptyState title="No admin rows loaded" body="Add an admin user or refresh after logging in." />
          ) : null}
          {adminUsers.map((admin) => (
            <article className="admin-user-card" key={admin.userId}>
              <div>
                <strong>{admin.email || "No email saved"}</strong>
                <span>Admin access active</span>
                <dl className="admin-user-dates">
                  <div>
                    <dt>Last edit</dt>
                    <dd>{formatAdminDate(admin.updatedAt ?? admin.createdAt)}</dd>
                  </div>
                  <div>
                    <dt>Created</dt>
                    <dd>{formatAdminDate(admin.createdAt)}</dd>
                  </div>
                </dl>
              </div>
              <div className="admin-user-actions">
                <label>
                  New password
                  <input
                    minLength={6}
                    type="password"
                    value={resetPasswords[admin.userId] ?? ""}
                    onChange={(event) =>
                      setResetPasswords((current) => ({ ...current, [admin.userId]: event.target.value }))
                    }
                    placeholder="Set new password"
                  />
                </label>
                <button
                  className="secondary-button compact-button"
                  disabled={(resetPasswords[admin.userId] ?? "").length < 6}
                  type="button"
                  onClick={() => void submitPasswordReset(admin.userId, admin.email)}
                >
                  <KeyRound size={16} />
                  Reset
                </button>
                <button
                  className="danger-button compact-button"
                  disabled={admin.userId === userId}
                  title={admin.userId === userId ? "You cannot remove your own admin access" : "Remove admin"}
                  type="button"
                  onClick={() => {
                    if (confirmAction("Remove admin access for this user?")) void removeAdminUser(admin.userId);
                  }}
                >
                  <Trash2 size={16} />
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </PageShell>
  );
}

function formatAdminDate(value?: string | null) {
  if (!value) return "Not available";
  return formatDateTime(value);
}
