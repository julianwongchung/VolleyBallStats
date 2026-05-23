"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { confirmAction } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageShell } from "@/components/ui/page-shell";

export function AdminUsersPage() {
  const { adminUsers, addAdminUser, isAdmin, removeAdminUser, userId } = useApp();
  const [authUid, setAuthUid] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await addAdminUser({ userId: authUid, email });
      setAuthUid("");
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add admin user.");
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
          Copy the user UID from Supabase Authentication &gt; Users. After adding it here, that account can log in as an
          admin without running SQL again.
        </p>
        {error ? <p className="form-error">{error}</p> : null}
        <form className="form-stack" onSubmit={(event) => void submit(event)}>
          <label>
            Auth user UID
            <input
              required
              value={authUid}
              onChange={(event) => setAuthUid(event.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@example.com"
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
                <code>{admin.userId}</code>
              </div>
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
            </article>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
