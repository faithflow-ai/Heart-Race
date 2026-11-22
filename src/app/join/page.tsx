"use client";
import { useState } from "react";
import { api } from "@/components/client";

export default function JoinPage() {
  const [code, setCode] = useState("");
  const [info, setInfo] = useState<{ game: { name: string; code: string }; teams: { id: string; name: string; members: number }[] } | null>(null);
  const [error, setError] = useState("");

  async function look(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      setInfo(await api(`/api/join?code=${encodeURIComponent(code)}`));
    } catch (err) {
      setError((err as Error).message);
    }
  }
  async function join(firmId: string) {
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
        <h1>Join your class</h1>
        <form onSubmit={look}>
          <label>Class code from your instructor</label>
          <div className="row">
            <input type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} style={{ flex: 1, letterSpacing: 2 }} required autoFocus />
            <button className="primary">Find class</button>
          </div>
        </form>
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
                      <button onClick={() => join(t.id)}>Join</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        <p className="small" style={{ marginTop: 16 }}>
          <a href="#" onClick={async (e) => { e.preventDefault(); await api("/api/auth/logout", { body: {} }); window.location.href = "/login"; }}>
            Sign out
          </a>
        </p>
      </div>
    </div>
  );
}
