"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";

interface AuthScreenProps {
  message: string | null;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
}

export function AuthScreen({ message, onSignIn, onSignUp }: AuthScreenProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    try {
      const email = String(data.get("email") ?? "");
      const password = String(data.get("password") ?? "");
      if (mode === "signin") await onSignIn(email, password);
      else await onSignUp(email, password);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to continue.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark">
            <Icon name="pigs" />
          </span>
          <div>
            <strong>PiggyTrack</strong>
            <span>Farm records, simplified.</span>
          </div>
        </div>
        <p className="eyebrow">Shared family workspace</p>
        <h1>{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
        <p className="auth-intro">
          {mode === "signin"
            ? "Sign in to manage your farm records."
            : "After signing in, you can manage your own farm or join a family workspace."}
        </p>
        {(error || message) && (
          <div className={error ? "form-error" : "form-success"} role="status">
            {error ?? message}
          </div>
        )}
        <form className="record-form" onSubmit={submit}>
          <label>
            Email
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              minLength={8}
              required
              placeholder="At least 8 characters"
            />
          </label>
          <button className="primary-button full-button" disabled={busy}>
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
        <button
          className="auth-switch"
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
          }}
        >
          {mode === "signin"
            ? "New to PiggyTrack? Create an account"
            : "Already have an account? Sign in"}
        </button>
      </section>
    </main>
  );
}
