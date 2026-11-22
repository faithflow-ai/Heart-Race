"use client";
import { use, useCallback, useEffect, useState } from "react";
import { api, fmtTime, money, timeLeft } from "@/components/client";
import { AI, ROUNDS, type AiStyle } from "@/sim/config";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const ZONES = ["America/Los_Angeles", "America/Denver", "America/Chicago", "America/New_York"];

interface Member { user_id: string; firm_id: string; name: string; email: string }
interface Firm {
  id: string;
  name: string;
  is_ai: boolean;
  ai_level: number | null;
  ai_style: AiStyle;
  effectiveLevel: number;
  members: Member[];
  edits: number;
  lastEdit: string | null;
  lastScore: { total: number; rank: number } | null;
}
interface Overview {
  game: {
    id: string; name: string; code: string; status: string; current_round: number; deadline: string | null;
    deadline_weekday: number; deadline_time: string; timezone: string;
    settings: { scorecardWeights: Record<string, number>; marketingBudget: { earnedBase: number; earnedRevenueShare: number; earnedFloor: number; earnedCapGrowth: number } };
  };
  firms: Firm[];
  rounds: { round: number; processed_at: string; run_count: number }[];
  flagged: { firm: string; title: string; detail: string }[];
}

export default function Console({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [o, setO] = useState<Overview | null>(null);
  const [msg, setMsg] = useState<{ kind: "good" | "bad"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => api<Overview>(`/api/games/${id}`).then(setO).catch((e) => setMsg({ kind: "bad", text: e.message })), [id]);
  useEffect(() => {
    load();
  }, [load]);

  async function act(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      setMsg({ kind: "good", text: ok });
      await load();
    } catch (e) {
      setMsg({ kind: "bad", text: (e as Error).message });
    }
    setBusy(false);
  }
  const patch = (body: unknown, ok = "Saved.") => act(() => api(`/api/games/${id}`, { method: "PATCH", body }), ok);
  const patchFirm = (body: unknown, ok = "Saved.") => act(() => api(`/api/games/${id}/firms`, { method: "PATCH", body }), ok);

  if (!o) return <p className="muted">{msg?.text ?? "Loading…"}</p>;
  const g = o.game;
  const students = o.firms.filter((f) => !f.is_ai);
  const ais = o.firms.filter((f) => f.is_ai);
  const over = g.current_round > ROUNDS.final;

  return (
    <>
      <div className="row">
        <h1 style={{ margin: 0 }}>{g.name}</h1>
        <span className="badge accent" style={{ fontSize: 16, padding: "4px 12px" }}>Class code: {g.code}</span>
        <span className="spacer" />
        <a href="/admin">← All classes</a>
      </div>
      {msg && <div className={`notice ${msg.kind}`}>{msg.text}</div>}

      <div className="grid4" style={{ margin: "16px 0" }}>
        <div className="stat"><div className="k">Status</div><div className="v" style={{ fontSize: 18 }}>{over ? "Finished" : g.status === "setup" ? "Not started" : "Running"}</div></div>
        <div className="stat"><div className="k">Open round</div><div className="v" style={{ fontSize: 18 }}>{ROUNDS.names[g.current_round] ?? "–"}</div></div>
        <div className="stat"><div className="k">Deadline</div><div className="v" style={{ fontSize: 15 }}>{fmtTime(g.deadline, g.timezone)}</div><div className="s">{timeLeft(g.deadline)}</div></div>
        <div className="stat"><div className="k">Students joined</div><div className="v">{students.reduce((a, f) => a + f.members.length, 0)}</div></div>
      </div>

      <div className="panel">
        <div className="row">
          {g.status === "setup" && !over && <button className="primary" disabled={busy} onClick={() => patch({ start: true }, "Game started. Rounds will process automatically at each deadline.")}>Start game (deadlines on)</button>}
          {g.status === "active" && <button disabled={busy} onClick={() => patch({ pause: true }, "Automatic processing paused.")}>Pause automatic processing</button>}
          {!over && (
            <button disabled={busy} onClick={() => window.confirm(`Process ${ROUNDS.names[g.current_round]} now? Teams can't edit it afterwards.`) && act(() => api(`/api/games/${id}/run`, { body: {} }), "Round processed.")}>
              Run {ROUNDS.names[g.current_round]} now
            </button>
          )}
          {o.rounds.length > 0 && (
            <button disabled={busy} onClick={() => window.confirm(`Re-run ${ROUNDS.names[o.rounds[o.rounds.length - 1].round]} with the same decisions?`) && act(() => api(`/api/games/${id}/rerun`, { body: {} }), "Round re-run.")}>
              Re-run {ROUNDS.names[o.rounds[o.rounds.length - 1].round]}
            </button>
          )}
        </div>
        <p className="small muted">Rounds process on their own at the deadline. Use Run now to process early (for example to test), and Re-run after a fix to recompute the last round with the same decisions. There is no tool to change a team's results.</p>
      </div>

      <div className="grid2">
        <Schedule g={g} onSave={(b) => patch(b)} />
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Exports (CSV)</h2>
          <ul>
            <li><a href={`/api/games/${id}/export?type=scores`}>Scores by round</a> (every firm, every measure)</li>
            <li><a href={`/api/games/${id}/export?type=final`}>Final weighted scores and grade bands</a> (one row per student)</li>
            <li><a href={`/api/games/${id}/export?type=roster`}>Roster</a></li>
            <li><a href={`/api/games/${id}/export?type=reflections`}>Round reflections</a></li>
            <li><a href={`/api/games/${id}/export?type=log`}>Change log</a> (who changed what, for peer-evaluation disputes)</li>
          </ul>
          <h3>Processed rounds</h3>
          {!o.rounds.length && <p className="muted small">None yet.</p>}
          {o.rounds.map((r) => (
            <div key={r.round} className="small">{ROUNDS.names[r.round]}: {fmtTime(r.processed_at, g.timezone)}{r.run_count > 1 ? ` (re-run ${r.run_count - 1}×)` : ""}</div>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="row">
          <h2 style={{ margin: 0 }}>Student teams</h2>
          <span className="spacer" />
          {g.current_round === 0 && (
            <label className="inline">
              Number of teams:
              <select value={students.length} onChange={(e) => patch({ teams: Number(e.target.value) }, "Teams updated. AI rivals refilled to 8 firms.")}>
                {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n}>{n}</option>)}
              </select>
            </label>
          )}
        </div>
        <table style={{ marginTop: 8 }}>
          <thead><tr><th>Team</th><th>Students</th><th>This round</th><th className="num">Last score</th><th></th></tr></thead>
          <tbody>
            {students.map((f) => (
              <tr key={f.id}>
                <td style={{ width: 180 }}><input type="text" defaultValue={f.name} onBlur={(e) => e.target.value !== f.name && patchFirm({ firmId: f.id, name: e.target.value })} /></td>
                <td>
                  {!f.members.length && <span className="muted small">Nobody yet</span>}
                  {f.members.map((m) => (
                    <div key={m.user_id} className="row small" style={{ gap: 6 }}>
                      <span title={m.email}>{m.name}</span>
                      <select style={{ width: "auto", padding: "1px 4px", fontSize: 12 }} value={m.firm_id} onChange={(e) => act(() => api(`/api/games/${id}/members`, { method: "PATCH", body: { userId: m.user_id, firmId: e.target.value } }), `Moved ${m.name}.`)}>
                        {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      <a href="#" onClick={(e) => { e.preventDefault(); const pw = window.prompt(`New temporary password for ${m.name} (8+ characters):`); if (pw) act(() => api(`/api/games/${id}/members`, { body: { userId: m.user_id, password: pw } }), `Password reset for ${m.name}. Tell them the new password.`); }}>reset password</a>
                    </div>
                  ))}
                </td>
                <td className="small">{f.edits ? <span className="badge good">{f.edits} edits</span> : <span className="badge warn">No edits (will carry forward)</span>}<div className="muted">{f.lastEdit ? `last ${fmtTime(f.lastEdit, g.timezone)}` : ""}</div></td>
                <td className="num">{f.lastScore ? `${f.lastScore.total.toFixed(1)} (#${f.lastScore.rank})` : "–"}</td>
                <td className="num"><a href={`/admin/${id}/firm/${f.id}`}>View</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>AI rivals</h2>
        <p className="small muted">Level 0 to 10. Leave blank to follow the default ramp (about 4 early, rising to 7.5 by the final round). Change between rounds whenever you like.</p>
        <table>
          <thead><tr><th>Firm</th><th>Style</th><th>Level</th><th className="num">Level now</th><th className="num">Last score</th><th></th></tr></thead>
          <tbody>
            {ais.map((f) => (
              <tr key={f.id}>
                <td>{f.name}</td>
                <td style={{ width: 230 }}>
                  <select value={f.ai_style} onChange={(e) => patchFirm({ firmId: f.id, aiStyle: e.target.value })}>
                    {Object.entries(AI.styles).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
                  </select>
                </td>
                <td style={{ width: 120 }}><input type="number" step={0.5} min={0} max={10} defaultValue={f.ai_level ?? ""} placeholder="default" onBlur={(e) => patchFirm({ firmId: f.id, aiLevel: e.target.value === "" ? null : Number(e.target.value) })} /></td>
                <td className="num">{f.effectiveLevel}</td>
                <td className="num">{f.lastScore ? `${f.lastScore.total.toFixed(1)} (#${f.lastScore.rank})` : "–"}</td>
                <td className="num"><a href={`/admin/${id}/firm/${f.id}`}>View</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {o.flagged.length > 0 && (
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Flagged ad claims (last round)</h2>
          {o.flagged.map((f, i) => <div key={i} className="notice warn"><b>{f.firm}:</b> {f.title}. {f.detail}</div>)}
        </div>
      )}

      <MarketRules g={g} onSave={(b) => patch(b)} />
    </>
  );
}

function Schedule({ g, onSave }: { g: Overview["game"]; onSave: (b: unknown) => void }) {
  const [weekday, setWeekday] = useState(g.deadline_weekday);
  const [time, setTime] = useState(g.deadline_time);
  const [tz, setTz] = useState(g.timezone);
  const [oneOff, setOneOff] = useState("");
  return (
    <div className="panel">
      <h2 style={{ marginTop: 0 }}>Weekly deadline</h2>
      <div className="grid3">
        <div>
          <label>Day</label>
          <select value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}>{WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}</select>
        </div>
        <div>
          <label>Time</label>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <div>
          <label>Time zone</label>
          <select value={tz} onChange={(e) => setTz(e.target.value)}>{ZONES.map((z) => <option key={z}>{z}</option>)}</select>
        </div>
      </div>
      <p><button onClick={() => onSave({ schedule: { weekday, time, timezone: tz } })}>Save weekly schedule</button></p>
      <label>Or set a one-off deadline for the open round</label>
      <div className="row">
        <input type="datetime-local" value={oneOff} onChange={(e) => setOneOff(e.target.value)} style={{ flex: 1 }} />
        <button disabled={!oneOff} onClick={() => onSave({ deadline: oneOff })}>Set</button>
      </div>
      <p className="small muted">After each round, the next deadline is the next {WEEKDAYS[g.deadline_weekday]} at {g.deadline_time}.</p>
    </div>
  );
}

function MarketRules({ g, onSave }: { g: Overview["game"]; onSave: (b: unknown) => void }) {
  const w = g.settings.scorecardWeights;
  const [weights, setWeights] = useState<Record<string, number>>(Object.fromEntries(Object.entries(w).map(([k, v]) => [k, Math.round(v * 100)])));
  const mb = g.settings.marketingBudget;
  const [budget, setBudget] = useState({ ...mb });
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  return (
    <div className="grid2">
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Scorecard weights (%)</h2>
        <div className="grid3">
          {Object.keys(weights).map((k) => (
            <div key={k}>
              <label>{k}</label>
              <input type="number" value={weights[k]} onChange={(e) => setWeights({ ...weights, [k]: Number(e.target.value) })} />
            </div>
          ))}
        </div>
        <p className="small" style={{ color: total === 100 ? undefined : "var(--bad)" }}>Total {total}%</p>
        <button disabled={total !== 100} onClick={() => onSave({ weights })}>Save weights</button>
        <p className="small muted">Applies to rounds processed (or re-run) after saving.</p>
      </div>
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Earned marketing budget</h2>
        <p className="small muted">From Round 2, each team earns base + share × last round's revenue, never below the floor, growing at most by the cap each round.</p>
        <div className="grid2">
          <div><label>Base ($)</label><input type="number" value={budget.earnedBase} onChange={(e) => setBudget({ ...budget, earnedBase: Number(e.target.value) })} /></div>
          <div><label>Revenue share (0.10 = 10%)</label><input type="number" step={0.01} value={budget.earnedRevenueShare} onChange={(e) => setBudget({ ...budget, earnedRevenueShare: Number(e.target.value) })} /></div>
          <div><label>Floor ($)</label><input type="number" value={budget.earnedFloor} onChange={(e) => setBudget({ ...budget, earnedFloor: Number(e.target.value) })} /></div>
          <div><label>Cap: max growth per round (0.5 = 50%)</label><input type="number" step={0.05} value={budget.earnedCapGrowth} onChange={(e) => setBudget({ ...budget, earnedCapGrowth: Number(e.target.value) })} /></div>
        </div>
        <p><button onClick={() => onSave({ budget })}>Save budget rules</button></p>
        <p className="small muted">Fixed releases: {money(500_000)} in Round 1, {money(500_000)} in Round 2, {money(1_000_000)} in Round 3 to pace through the final round.</p>
      </div>
    </div>
  );
}
