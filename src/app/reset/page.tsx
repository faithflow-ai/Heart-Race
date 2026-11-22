"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/components/client";

export default function ResetPage() {
  return (
    <Suspense>
      <Reset />
    </Suspense>
  );
}

function Reset() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/api/auth/reset", { body: { token, password } });
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    }
  }
  return (
    <div className="center-card">
      <div className="panel">
        <h1>Choose a new password</h1>
        {done ? (
          <p>Your password is changed. <a href="/login">Sign in</a> with your new password.</p>
        ) : (
          <form onSubmit={submit}>
            <label>New password <span className="muted">(at least 8 characters)</span></label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoFocus />
            {error && <div className="notice bad">{error}</div>}
            <p><button className="primary">Save new password</button></p>
          </form>
        )}
      </div>
    </div>
  );
}
