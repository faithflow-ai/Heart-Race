"use client";
import { useEffect, useState } from "react";
import { api, fmtTime } from "@/components/client";
import { ROUNDS } from "@/sim/config";

interface G { id: string; name: string; code: string; status: string; current_round: number; deadline: string | null; timezone: string }

export default function AdminHome() {
  const [games, setGames] = useState<G[] | null>(null);
  const [name, setName] = useState("MKT 475 Spring 2027");
  const [teams, setTeams] = useState(6);
  const [err, setErr] = useState("");
  useEffect(() => {
    api("/api/games").then((r) => setGames(r.games));
  }, []);
  async function create(e: React.FormEvent) {
    e.preventDefault();
    try {
      const r = await api("/api/games", { body: { name, teams } });
      window.location.href = `/admin/${r.game.id}`;
    } catch (e) {
      setErr((e as Error).message);
    }
  }
  return (
    <>
      <h1>Your classes</h1>
      <div className="panel">
        {!games && <p className="muted">Loading…</p>}
        {games && !games.length && <p className="muted">No classes yet. Create one below.</p>}
        {games && games.length > 0 && (
          <table>
            <thead><tr><th>Class</th><th>Code</th><th>Status</th><th>Round</th><th>Next deadline</th></tr></thead>
            <tbody>
              {games.map((g) => (
                <tr key={g.id}>
                  <td><a href={`/admin/${g.id}`}>{g.name}</a></td>
                  <td><code>{g.code}</code></td>
                  <td>{g.status}</td>
                  <td>{ROUNDS.names[g.current_round] ?? "Finished"}</td>
                  <td>{fmtTime(g.deadline, g.timezone)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="panel" style={{ maxWidth: 520 }}>
        <h2 style={{ marginTop: 0 }}>Create a class</h2>
        <form onSubmit={create}>
          <label>Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
          <label>Number of student teams (1 to 7)</label>
          <input type="number" min={1} max={7} value={teams} onChange={(e) => setTeams(Number(e.target.value))} />
          <p className="small muted">AI rivals fill the market to 8 firms ({8 - teams} AI with {teams} teams). You can change this until Round 1.</p>
          {err && <div className="notice bad">{err}</div>}
          <button className="primary">Create class</button>
        </form>
      </div>
    </>
  );
}
