"use client";
import { useState } from "react";
import { api } from "@/components/client";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`/api/auth/${mode}`, { body: { email, name, password } });
      window.location.href = "/";
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="center-card">
      <div className="panel">
        <h1>
          Heart <span style={{ color: "var(--accent)" }}>Race</span>
        </h1>
        <p className="muted">The MKT 475 marketing strategy simulation. Your team runs a smart health wearables company.</p>
        <div className="tabs">
          <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")} type="button">
            Sign in
          </button>
          <button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")} type="button">
            Create account
          </button>
        </div>
        <form onSubmit={submit}>
          {mode === "signup" && (
            <>
              <label>Your name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
            </>
          )}
          <label>Concordia email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          <label>Password {mode === "signup" && <span className="muted">(at least 8 characters)</span>}</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <div className="notice bad">{error}</div>}
          <div className="row" style={{ marginTop: 14 }}>
            <button className="primary" disabled={busy}>
              {mode === "login" ? "Sign in" : "Create account"}
            </button>
            {mode === "login" && <span className="small muted">Forgot your password? Ask your instructor to reset it.</span>}
          </div>
        </form>
      </div>
    </div>
  );
}
