"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, ShieldCheck } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { PageShell } from "@/components/ui/page-shell";

export function LoginPage() {
  const router = useRouter();
  const { isConfigured, isAdmin, login, loginAsDemoAdmin } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await login(email, password);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to log in.");
    }
  }

  return (
    <PageShell title="Admin Login">
      <section className="login-panel">
        <div className="login-icon">
          <ShieldCheck size={28} />
        </div>
        <h2>{isAdmin ? "Admin mode is active" : "Sign in to manage records"}</h2>
        <p>
          Guests can view teams, players, match summaries, and statistics. Admins can manage teams, players, matches,
          uploads, and stats.
        </p>
        {error ? <p className="form-error">{error}</p> : null}
        <form className="form-stack" onSubmit={(event) => void submit(event)}>
          <label>
            Email
            <input
              autoComplete="email"
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            Password
            <input
              autoComplete="current-password"
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <button className="primary-button" type="submit">
            <LogIn size={17} />
            Login
          </button>
        </form>
        {!isConfigured ? (
          <button
            className="secondary-button"
            type="button"
            onClick={() => {
              loginAsDemoAdmin();
              router.push("/");
            }}
          >
            Use demo admin
          </button>
        ) : null}
        <p className="setup-note">
          {isConfigured
            ? "Admin access requires a matching row in admin_users."
            : "Supabase is not configured, so the app is using local seeded demo data."}
        </p>
      </section>
    </PageShell>
  );
}
