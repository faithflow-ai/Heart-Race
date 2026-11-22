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
  const [demoBusy, setDemoBusy] = useState(false);
  async function createDemo() {
    if (!window.confirm("Create a demo class? It adds a separate class labeled DEMO with 13 fake students, 4 teams and 3 rounds already played. Your other classes are not touched, and you can delete the demo any time.")) return;
    setDemoBusy(true);
    setErr("");
    try {
      const r = await api("/api/games/demo", { body: {} });
      window.location.href = `/admin/${r.game.id}`;
    } catch (e) {
      setErr((e as Error).message);
      setDemoBusy(false);
    }
  }
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
      <h1 style={{ marginBottom: 2 }}>Your classes</h1>
      <p className="muted" style={{ marginTop: 0 }}>Heart Race: the MKT 475 Marketing Capstone simulation. Student teams run smart health wearables companies and compete with each other and AI rivals.</p>
      <div className="panel">
        {!games && <p className="muted">Loading…</p>}
        {games && !games.length && <p className="muted">No classes yet. Create one below.</p>}
        {games && games.length > 0 && (
          <table>
            <thead><tr><th>Class</th><th>Code</th><th>Status</th><th>Round</th><th>Next deadline</th></tr></thead>
            <tbody>
              {games.map((g) => (
                <tr key={g.id}>
                  <td><a href={`/admin/${g.id}`}>{g.name}</a>{g.name.startsWith("DEMO") && <span className="badge warn" style={{ marginLeft: 6 }}>Demo</span>}</td>
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
      <div className="panel" style={{ maxWidth: 520 }}>
        <h2 style={{ marginTop: 0 }}>Try it with sample data</h2>
        <p className="small">Creates a separate class labeled <b>DEMO</b> with fake students on 4 teams, sample decisions and the Practice round, Round 1 and Round 2 already scored. Use it to review the results screens, the student view and the CSV exports. It never touches your other classes, and you can delete it from its class screen.</p>
        <button disabled={demoBusy} onClick={createDemo}>{demoBusy ? "Building the demo class (about 10 seconds)…" : "Create demo class"}</button>
      </div>
    </>
  );
}
