"use client";
import { Fragment, use, useCallback, useEffect, useState } from "react";
import { api, fmtTime, money, timeLeft } from "@/components/client";
import { AI, ROUNDS, SEGMENTS, type AiStyle } from "@/sim/config";

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
  ready: boolean;
  lastScore: { total: number; rank: number } | null;
  plan?: { targets: string[]; positioning: string } | null;
}
interface Overview {
  game: {
    id: string; name: string; code: string; status: string; current_round: number; deadline: string | null;
    deadline_weekday: number; deadline_time: string; timezone: string; start_at: string | null;
    settings: { scorecardWeights: Record<string, number>; marketingBudget: { earnedBase: number; earnedRevenueShare: number; earnedFloor: number; earnedCapGrowth: number } };
  };
  firms: Firm[];
  rounds: { round: number; processed_at: string; run_count: number }[];
  flagged: { firm: string; title: string; detail: string }[];
  demo: { password: string; students: { name: string; email: string; team: string | null }[] } | null;
  showcase?: { guestEmail: string; guestPassword: string; built: number; stopAfter?: number } | null;
  guest?: boolean;
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
        <a href={`/admin/${id}/creative`}>Grade creative work</a>
        <a href="/admin">← All classes</a>
      </div>
      {msg && <div className={`notice ${msg.kind}`}>{msg.text}</div>}

      <div className="grid4" style={{ margin: "16px 0" }}>
        <div className="stat"><div className="k">Status</div><div className="v" style={{ fontSize: 18 }}>{over ? "Finished" : g.status === "setup" ? (g.current_round > 0 ? "Paused" : "Not started") : "Running"}</div>{g.status === "setup" && g.start_at && <div className="s">Starts {fmtTime(g.start_at, g.timezone)}</div>}</div>
        <div className="stat"><div className="k">Open round</div><div className="v" style={{ fontSize: 18 }}>{ROUNDS.names[g.current_round] ?? "–"}</div></div>
        <div className="stat"><div className="k">Deadline</div><div className="v" style={{ fontSize: 15 }}>{fmtTime(g.deadline, g.timezone)}</div><div className="s">{timeLeft(g.deadline)}</div></div>
        <div className="stat"><div className="k">Students joined</div><div className="v">{students.reduce((a, f) => a + f.members.length, 0)}</div></div>
      </div>

      {o.guest && <GuestStart firms={students} finished={o.game.current_round > ROUNDS.final} />}
      {o.showcase && <ShowcasePanel id={id} sc={o.showcase} />}
      {o.demo && <DemoPanel id={id} demo={o.demo} showcase={!!o.showcase} />}

      <div className="panel">
        <div className="row">
          {g.status === "setup" && !over && <button className="primary" disabled={busy} onClick={() => window.confirm("Start the deadline clock now? Rounds will then close and score automatically at each weekly deadline.") && patch({ start: true }, "Deadline clock started. Rounds will close and score automatically at each deadline.")}>{g.current_round > 0 ? "Resume automatic deadlines" : "Start now (turns on the deadline clock)"}</button>}
          {g.status === "active" && <button disabled={busy} onClick={() => patch({ pause: true }, "Automatic processing paused.")}>Pause automatic processing</button>}
          {!over && (
            <button disabled={busy} onClick={() => window.confirm(`Close and score ${ROUNDS.names[g.current_round]} now?\n\nTeams can no longer edit ${ROUNDS.names[g.current_round]}, results post right away and ${ROUNDS.names[g.current_round + 1] ?? "the end of the game"} opens. This can't be undone (you can only re-run it with the same decisions).`) && act(() => api(`/api/games/${id}/run`, { body: {} }), "Round closed and scored.")}>
              Close and score {ROUNDS.names[g.current_round]} now
            </button>
          )}
          {o.rounds.length > 0 && (
            <button disabled={busy} onClick={() => window.confirm(`Re-run ${ROUNDS.names[o.rounds[o.rounds.length - 1].round]} with the same decisions?`) && act(() => api(`/api/games/${id}/rerun`, { body: {} }), "Round re-run.")}>
              Re-run {ROUNDS.names[o.rounds[o.rounds.length - 1].round]}
            </button>
          )}
        </div>
        <p className="small muted">Rounds close and score on their own at each deadline once the deadline clock is on. <b>Close and score now</b> ends the open round early (for example to test) and opens the next one. <b>Re-run</b> recomputes the last scored round with the same decisions, after a fix. There is no tool to change a team&apos;s results.</p>
      </div>

      <Dashboard id={id} />

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
                <td className="small">{f.ready ? <div><span className="badge good">✓ Team says ready</span></div> : <div><span className="badge">Not marked ready</span></div>}{f.edits ? <span className="badge good">{f.edits} edits</span> : <span className="badge warn">No edits (will carry forward)</span>}<div className="muted">{f.lastEdit ? `last ${fmtTime(f.lastEdit, g.timezone)}` : ""}</div></td>
                <td className="num">{f.lastScore ? `${f.lastScore.total.toFixed(1)} (#${f.lastScore.rank})` : "–"}</td>
                <td className="num" style={{ whiteSpace: "nowrap" }}>
                  <a href={`/admin/${id}/firm/${f.id}`}>Decisions &amp; results</a>
                  {" · "}
                  <a href="#" onClick={async (e) => { e.preventDefault(); await api(`/api/games/${id}/viewas`, { body: { firmId: f.id } }); window.location.href = "/play"; }}>View as student</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="small muted">View as student opens the team&apos;s own screens, read-only: you see what they see, but nothing you do there changes their decisions.</p>
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
  const [startAt, setStartAt] = useState(g.start_at ? toLocalInput(g.start_at, g.timezone) : "");
  return (
    <div className="panel">
      {g.status === "setup" && g.current_round === 0 && (
        <>
          <h2 style={{ marginTop: 0 }}>Start date</h2>
          <p className="small muted">Pick when the game starts. On that date the deadline clock turns on by itself and the first deadline is the next weekly deadline after it. Or use &quot;Start now&quot; above.</p>
          <div className="row">
            <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} style={{ flex: 1 }} />
            <button disabled={!startAt} onClick={() => onSave({ startAt })}>Set start date</button>
            {g.start_at && <button onClick={() => { setStartAt(""); onSave({ startAt: null }); }}>Clear</button>}
          </div>
          <p className="small">{g.start_at ? <>Starts automatically: <b>{fmtTime(g.start_at, g.timezone)}</b></> : <span className="muted">No start date set.</span>}</p>
        </>
      )}
      <h2 style={{ marginTop: g.status === "setup" && g.current_round === 0 ? 20 : 0 }}>Weekly deadline</h2>
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

/** "2027-01-11T08:00" in the class time zone, for a datetime-local input. */
function toLocalInput(iso: string, tz: string) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

function ShowcasePanel({ id, sc }: { id: string; sc: NonNullable<Overview["showcase"]> }) {
  const [busy, setBusy] = useState<string | null>(null);
  const total = sc.stopAfter ?? ROUNDS.final + 1;
  async function finish() {
    try {
      let done = false;
      while (!done) {
        const st = await api(`/api/games/${id}/showcase`, { body: {} });
        setBusy(`Playing the rounds: ${st.built} of ${st.total} done…`);
        done = st.done;
      }
      window.location.reload();
    } catch (e) {
      setBusy((e as Error).message);
    }
  }
  const site = typeof window !== "undefined" ? window.location.origin : "";
  return (
    <div className="panel" style={{ borderColor: "var(--accent)" }}>
      <h2 style={{ marginTop: 0 }}>Showcase class: guest login for colleagues</h2>
      {sc.built < total && (
        <div className="notice warn">
          {sc.built} of {total} rounds are played. <button disabled={!!busy} onClick={finish}>{busy ?? "Continue building"}</button>
        </div>
      )}
      <p className="small">Give colleagues these details. The guest login sees only this class, and can&apos;t change anything.</p>
      <table style={{ maxWidth: 640 }}>
        <tbody>
          <tr><td>Website</td><td><code>{site}</code></td></tr>
          <tr><td>Email</td><td><code>{sc.guestEmail}</code></td></tr>
          <tr><td>Password</td><td><code>{sc.guestPassword}</code></td></tr>
        </tbody>
      </table>
    </div>
  );
}

function DemoPanel({ id, demo, showcase }: { id: string; demo: NonNullable<Overview["demo"]>; showcase?: boolean }) {
  const [busy, setBusy] = useState(false);
  async function del() {
    if (!window.confirm("Delete this sample class and all its fake accounts? This can't be undone. Your other classes are not affected.")) return;
    setBusy(true);
    await api(`/api/games/${id}`, { method: "DELETE" });
    window.location.href = "/admin";
  }
  return (
    <div className="panel" style={{ borderColor: "var(--warn)", background: "var(--warn-soft)" }}>
      <div className="row">
        <h2 style={{ margin: 0 }}>{showcase ? "Showcase class (sample data)" : "Demo class (sample data)"}</h2>
        <span className="spacer" />
        <button className="danger" disabled={busy} onClick={del}>{showcase ? "Delete showcase class" : "Delete demo class"}</button>
      </div>
      <p className="small">Fake students and sample decisions. To see the student side, sign out and sign in as any student below, or use <b>View as student</b> on a team. All fake students share one password: <code style={{ fontSize: 15 }}>{demo.password}</code></p>
      <details>
        <summary className="small"><b>Show fake student logins</b></summary>
        <table style={{ marginTop: 6 }}>
          <thead><tr><th>Student</th><th>Email (sign-in)</th><th>Team</th></tr></thead>
          <tbody>
            {demo.students.map((s) => (
              <tr key={s.email}><td>{s.name}</td><td><code>{s.email}</code></td><td>{s.team ?? <span className="badge">Not on a team yet: use to test joining with the class code</span>}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

interface Dash {
  firms: { id: string; name: string; isAi: boolean }[];
  rounds: {
    round: number;
    firms: {
      id: string; rank: number | null; total: number | null; points: Record<string, number> | null; revenue: number; profit: number;
      unitShare: number; targetShare: number | null; awareness: number | null; satisfaction: number | null;
      goals: { key: string; label: string; goal: number | null; actual: number }[]; forecastAccuracy: number | null; carriedForward: boolean;
    }[];
  }[];
}

function Dashboard({ id }: { id: string }) {
  const [d, setD] = useState<Dash | null>(null);
  const [round, setRound] = useState<number | null>(null);
  const [goalsFor, setGoalsFor] = useState<string | null>(null);
  useEffect(() => {
    api<Dash>(`/api/games/${id}/dashboard`).then((x) => {
      setD(x);
      setRound(x.rounds.length ? x.rounds[x.rounds.length - 1].round : null);
    });
  }, [id]);
  if (!d) return null;
  const scored = d.rounds.filter((r) => r.round >= 1);
  const name = (fid: string) => d.firms.find((f) => f.id === fid);
  if (!scored.length)
    return (
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Class results</h2>
        <p className="muted">No scored rounds yet. Results for all 8 firms appear here after Round 1 closes (the Practice round isn&apos;t scored).</p>
      </div>
    );
  const r = scored.find((x) => x.round === round) ?? scored[scored.length - 1];
  const rows = [...r.firms].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
  const pts = (v: number | undefined) => (v === undefined ? "–" : Math.round(v));
  return (
    <div className="panel">
      <div className="row">
        <h2 style={{ margin: 0 }}>Class results</h2>
        <span className="spacer" />
        <div className="tabs" style={{ margin: 0, border: "none" }}>
          {scored.map((x) => (
            <button key={x.round} className={x.round === r.round ? "active" : ""} onClick={() => setRound(x.round)}>{ROUNDS.names[x.round]}</button>
          ))}
        </div>
      </div>
      <div className="scroll">
        <table style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <th>#</th><th>Firm</th><th className="num">Total</th><th className="num">Market</th><th className="num">Customer</th><th className="num">Financial</th><th className="num">Channel</th><th className="num">Goals</th>
              <th className="num">Revenue</th><th className="num">Op. profit</th><th className="num">Unit share</th><th className="num">Awareness</th><th className="num">Satisfaction</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((f) => {
              const firm = name(f.id);
              return (
                <Fragment key={f.id}>
                  <tr>
                    <td>{f.rank}</td>
                    <td>
                      <a href={`/admin/${id}/firm/${f.id}?round=${r.round}`}>{firm?.name}</a> {firm?.isAi && <span className="badge">AI</span>}
                      {f.carriedForward && <span className="badge warn" style={{ marginLeft: 4 }}>carried forward</span>}
                    </td>
                    <td className="num"><b>{f.total?.toFixed(1) ?? "–"}</b></td>
                    <td className="num">{pts(f.points?.market)}</td>
                    <td className="num">{pts(f.points?.customer)}</td>
                    <td className="num">{pts(f.points?.financial)}</td>
                    <td className="num">{pts(f.points?.channel)}</td>
                    <td className="num">{pts(f.points?.goals)}</td>
                    <td className="num">{money(f.revenue, true)}</td>
                    <td className="num" style={{ color: f.profit < 0 ? "var(--bad)" : undefined }}>{money(f.profit, true)}</td>
                    <td className="num">{(f.unitShare * 100).toFixed(1)}%</td>
                    <td className="num">{f.awareness === null ? "–" : `${Math.round(f.awareness)}%`}</td>
                    <td className="num">{f.satisfaction === null ? "–" : `${Math.round(f.satisfaction)}%`}</td>
                    <td className="num"><a href="#" className="small" onClick={(e) => { e.preventDefault(); setGoalsFor(goalsFor === f.id ? null : f.id); }}>{goalsFor === f.id ? "hide goals" : "goals vs. actual"}</a></td>
                  </tr>
                  {goalsFor === f.id && (
                    <tr>
                      <td></td>
                      <td colSpan={13}>
                        <div className="kv small" style={{ maxWidth: 560, gridTemplateColumns: "1fr auto auto" }}>
                          <div className="muted">Goal</div><div className="muted">Set</div><div className="muted">Actual</div>
                          {f.goals.map((gl) => (
                            <Fragment key={gl.key}><div>{gl.label}</div><div>{gl.goal === null ? "–" : gl.key === "revenue" ? money(gl.goal, true) : gl.goal}</div><div>{gl.key === "revenue" ? money(gl.actual, true) : gl.actual}</div></Fragment>
                          ))}
                          <div>Sales forecast accuracy</div><div></div><div>{f.forecastAccuracy === null ? "–" : `${Math.round(f.forecastAccuracy * 100)}%`}</div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <h3>Total score by round</h3>
      <div className="scroll">
        <table>
          <thead><tr><th>Firm</th>{scored.map((x) => <th key={x.round} className="num">{ROUNDS.names[x.round]}</th>)}<th>Trend</th></tr></thead>
          <tbody>
            {rows.map((f) => {
              const series = scored.map((x) => x.firms.find((y) => y.id === f.id)?.total ?? null);
              return (
                <tr key={f.id}>
                  <td>{name(f.id)?.name} {name(f.id)?.isAi && <span className="badge">AI</span>}</td>
                  {scored.map((x, i) => {
                    const ff = x.firms.find((y) => y.id === f.id);
                    return <td key={x.round} className="num">{series[i]?.toFixed(1) ?? "–"} <span className="muted small">(#{ff?.rank ?? "–"})</span></td>;
                  })}
                  <td><Spark values={series} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="small muted">Scores are 0 to 100 points per measure against the best firm that round. Click a firm for its full report and decisions.</p>
    </div>
  );
}

function Spark({ values }: { values: (number | null)[] }) {
  const v = values.map((x) => x ?? 0);
  if (v.length < 2) return <span className="muted small">–</span>;
  const w = 90, h = 22, min = Math.min(...v) - 2, max = Math.max(...v) + 2;
  const pts = v.map((x, i) => `${(i / (v.length - 1)) * w},${h - ((x - min) / (max - min || 1)) * h}`).join(" ");
  return <svg width={w} height={h} aria-hidden><polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth={2} /></svg>;
}

/** Start here panel for the read-only showcase guest (colleagues reviewing the sim). */
function GuestStart({ firms, finished }: { firms: Firm[]; finished: boolean }) {
  const seg = (id: string) => SEGMENTS.find((x) => x.id === id)?.name ?? id;
  return (
    <div className="panel" style={{ borderLeft: "4px solid var(--accent)" }}>
      <h2 style={{ marginTop: 0 }}>Start here</h2>
      <p className="small" style={{ marginTop: 0 }}>
        {finished
          ? <>This is a finished class: {firms.length} student teams and 4 computer-run rivals played every round, Practice to Final. You&apos;re a read-only guest, so nothing you click changes anything. Everything on a team&apos;s screens was entered by that team.</>
          : <>This class is in progress: the same {firms.length} teams have played the Practice round and Round 1, and Round 2 is open with this week&apos;s inputs (prices, promotion, forecast, production and goals) blank. In <b>View as student</b> you can type in any field to try it. Nothing is saved and no round will run.</>}
      </p>
      <ol className="small" style={{ paddingLeft: 20 }}>
        <li><b>Class results</b> (below): pick a round to see every firm&apos;s scorecard.</li>
        <li><b>Decisions &amp; results</b> next to a team: every decision that team made in a round, on one page, with its results.</li>
        <li><b>View as student</b> next to a team: the screens students actually use. A note at the top of each screen says what students decide there and what this team chose.</li>
      </ol>
      {firms.some((f) => f.plan) && (
        <table className="small">
          <thead><tr><th>Team</th><th>Target segments</th><th>Positioning</th></tr></thead>
          <tbody>
            {firms.map((f) => (
              <tr key={f.id}>
                <td><b>{f.name}</b></td>
                <td>{f.plan?.targets.map(seg).join(", ") || <span className="muted">none</span>}</td>
                <td>{f.plan?.positioning || <span className="muted">(blank)</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
