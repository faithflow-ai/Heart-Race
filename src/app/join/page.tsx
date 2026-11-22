"use client";
import { useEffect, useState } from "react";
import { api } from "@/components/client";

export default function JoinPage() {
  const [code, setCode] = useState("");
  const [me, setMe] = useState<{ name: string; email: string } | null | undefined>(undefined);
  const [info, setInfo] = useState<{ game: { name: string; code: string }; teams: { id: string; name: string; members: number }[] } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/me").then((r) => setMe(r.user)).catch(() => setMe(null));
  }, []);

  async function look(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      setInfo(await api(`/api/join?code=${encodeURIComponent(code)}`));
    } catch (err) {
      setError((err as Error).message);
    }
  }
  async function join(firmId: string, name: string) {
    if (!window.confirm(`Join ${name}? Only join the team your instructor assigned you to. (Your instructor can move you later if needed.)`)) return;
    setError("");
    try {
      await api("/api/join", { body: { code, firmId } });
      window.location.href = "/play";
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="center-card">
      <div className="panel">
        <h1>
          Heart <span style={{ color: "var(--accent)" }}>Race</span>
        </h1>
        <p className="muted">The MKT 475 marketing strategy simulation. Your team runs a smart health wearables company.</p>
        {me === null && (
          <div className="notice warn">
            You need to sign in first. <a href="/login">Sign in or create an account</a>, then come back to join your class.
          </div>
        )}
        {me && (
          <>
            <h2 style={{ marginTop: 8 }}>Join your class</h2>
            <p className="small">Your instructor gives you a <b>6-character class code</b> (letters and numbers). Enter it to see your class&apos;s teams, then join the team you were assigned to.</p>
            <form onSubmit={look}>
              <label>Class code</label>
              <div className="row">
                <input type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} style={{ flex: 1, letterSpacing: 2 }} maxLength={6} placeholder="ABC123" required autoFocus />
                <button className="primary">Find class</button>
              </div>
            </form>
          </>
        )}
        {error && <div className="notice bad">{error}</div>}
        {info && (
          <>
            <h2>{info.game.name}</h2>
            <p className="muted small">Pick the team your instructor assigned you to.</p>
            <table>
              <tbody>
                {info.teams.map((t) => (
                  <tr key={t.id}>
                    <td>{t.name}</td>
                    <td className="muted small">{t.members} joined</td>
                    <td className="num">
                      <button onClick={() => join(t.id, t.name)}>Join</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        {me && (
          <p className="small muted" style={{ marginTop: 14 }}>
            <b>What happens next:</b> once you join, you go straight to your team&apos;s home page. Start with the round briefing there, then open Decisions. Your teammates join the same team with the same code.
          </p>
        )}
        {me && (
          <p className="small" style={{ marginTop: 16 }}>
            Signed in as {me.email}.{" "}
            <a href="#" onClick={async (e) => { e.preventDefault(); await api("/api/auth/logout", { body: {} }); window.location.href = "/login"; }}>
              Sign out
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
