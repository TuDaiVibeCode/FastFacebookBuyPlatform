"use client";

import { FormEvent, useState } from "react";

import {
  AuthRequest,
  AuthTokenResponse,
  getCurrentUser,
  loginUser,
  registerUser,
  setStoredAuthToken,
} from "@/lib/api";

type AuthFormMode = "login" | "register";

export function AuthForm({ mode }: { mode: AuthFormMode }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (!email || !password || password.length < 6) {
      setError("Use valid email and password (min 6 chars).");
      return;
    }

    const payload: AuthRequest = {
      email: email.trim().toLowerCase(),
      password,
    };

    setLoading(true);
    setError("");
    setNotice("");

    try {
      const response: AuthTokenResponse =
        mode === "register" ? await registerUser(payload) : await loginUser(payload);

      setStoredAuthToken(response.access_token);
      let userLine = response.user.email;
      try {
        const current = await getCurrentUser();
        userLine = current.email;
      } catch {
        // Endpoint may be unavailable in non-auth deployments.
      }
      setNotice(`Signed ${mode === "register" ? "up" : "in"} as ${userLine}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auth failed");
    } finally {
      setLoading(false);
    }
  }

  const title = mode === "register" ? "Register" : "Login";
  const actionLabel = loading ? "Working..." : title;

  return (
    <form className="auth-shell" onSubmit={submit}>
      <h1>{title}</h1>
      <label className="auth-field">
        <span>Email</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
        />
      </label>
      <label className="auth-field">
        <span>Password</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 6 chars"
          required
        />
      </label>
      <button type="submit" disabled={loading}>
        {actionLabel}
      </button>
      {error ? <p className="auth-error">{error}</p> : null}
      {notice ? <p className="auth-success">{notice}</p> : null}
    </form>
  );
}
