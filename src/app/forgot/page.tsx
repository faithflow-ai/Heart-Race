"use client";
import { useState } from "react";
import { api } from "@/components/client";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/api/auth/forgot", { body: { email } });
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    }
  }
  return (
    <div className="center-card">
      <div className="panel">
        <h1>Reset your password</h1>
        {sent ? (
          <p>If an account uses <b>{email}</b>, we&apos;ve emailed it a link to choose a new password. The link works for 1 hour. Check your junk folder if it doesn&apos;t arrive.</p>
        ) : (
          <form onSubmit={submit}>
            <p className="muted">Enter the Concordia email you signed up with. We&apos;ll email you a link to choose a new password.</p>
            <label>Concordia email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            {error && <div className="notice bad">{error}</div>}
            <p><button className="primary">Email me a reset link</button></p>
          </form>
        )}
        <p className="small"><a href="/login">← Back to sign in</a></p>
      </div>
    </div>
  );
}
