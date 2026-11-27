"use client";
import { Fragment, use, useEffect, useState } from "react";
import { api } from "@/components/client";
import { ROUNDS } from "@/sim/config";
import type { Flag } from "@/lib/activity";

interface Team {
  firmId: string; name: string;
  members: { userId: string; name: string; edits: number[] }[];
  teamEdits: number[]; activeMembers: number[]; ready: boolean[]; reflection: boolean[];
}
interface Data {
  game: { id: string; name: string; current_round: number; timezone: string };
  rounds: number[]; closedRounds: number[]; startSteps: number; onboarding: Record<string, number>;
  heatmap: Team[]; flags: Flag[];
}

/** Shade a heatmap cell: white for none, darker navy for more edits (relative to the busiest cell). */
function shade(n: number, max: number) {
  if (!n) return { background: "#f3f5f8", color: "var(--muted)" };
  const t = Math.min(1, Math.sqrt(n / Math.max(1, max)));
  const a = 0.12 + 0.78 * t;
  return { background: `rgba(14, 26, 43, ${a.toFixed(2)})`, color: a > 0.5 ? "#fff" : "var(--ink)" };
}

export default function Activity({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [roundFilter, setRoundFilter] = useState<number | "all">("all");
  useEffect(() => {
    api<Data>(`/api/games/${id}/activity`).then(setD).catch((e) => setErr(e.message));
  }, [id]);
  if (err) return <div className="notice bad">{err}</div>;
  if (!d) return <p className="muted">Loading…</p>;

  const max = Math.max(1, ...d.heatmap.flatMap((t) => t.members.flatMap((m) => m.edits)));
  const name = (fid: string) => d.heatmap.find((t) => t.firmId === fid)?.name ?? "Team";
  const flags = d.flags.filter((f) => roundFilter === "all" || f.round === roundFilter);
  const flagRounds = [...new Set(d.flags.map((f) => f.round))].sort((a, b) => b - a);
  const closed = new Set(d.closedRounds);

  return (
    <>
      <div className="row">
        <h1 style={{ margin: 0 }}>Activity and flags</h1>
        <span className="muted">{d.game.name}</span>
        <span className="spacer" />
        <a href={`/api/games/${id}/export?type=log`}>Download the full change log (CSV)</a>
        <a href={`/admin/${id}`}>← Class screen</a>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Who&apos;s working: edits per student, per round</h2>
        <p className="small muted" style={{ marginTop: 0 }}>Each box counts the decision fields a student changed that round (several quick changes to the same field count once). Darker means more. ✓ under a round means the team marked itself ready; ✎ means it wrote a reflection.</p>
        <div className="scroll">
          <table className="heat">
            <thead>
              <tr>
                <th>Team / student</th>
                <th className="num" title="Start here steps finished">Start here</th>
                {d.rounds.map((r) => <th key={r} style={{ textAlign: "center" }}>{ROUNDS.names[r].replace("Round ", "R")}{r === d.game.current_round && r <= ROUNDS.final ? " (open)" : ""}</th>)}
              </tr>
            </thead>
            <tbody>
              {d.heatmap.map((t) => (
                <Fragment key={t.firmId}>
                  <tr>
                    <td className="team" colSpan={2}>{t.name} {d.flags.some((f) => f.firmId === t.firmId) && <span className="badge warn">{d.flags.filter((f) => f.firmId === t.firmId).length} flag{d.flags.filter((f) => f.firmId === t.firmId).length === 1 ? "" : "s"}</span>}</td>
                    {d.rounds.map((r, i) => (
                      <td key={r} className="small team" style={{ textAlign: "center" }}>
                        <span className="ready" title="Team marked ready">{t.ready[i] ? "✓" : ""}</span>{" "}
                        <span title={t.reflection[i] ? "Reflection written" : closed.has(r) && r >= 1 ? "No reflection" : ""}>{t.reflection[i] ? "✎" : closed.has(r) && r >= 1 ? <span style={{ color: "var(--warn)" }}>–</span> : ""}</span>
                      </td>
                    ))}
                  </tr>
                  {!t.members.length && <tr><td colSpan={d.rounds.length + 2} className="small muted">Nobody has joined this team yet.</td></tr>}
                  {t.members.map((m) => (
                    <tr key={m.userId}>
                      <td style={{ paddingLeft: 18 }}>{m.name}</td>
                      <td className="num small">{d.onboarding[m.userId] ?? 0}/{d.startSteps}</td>
                      {m.edits.map((n, i) => <td key={i} className="cell" style={shade(n, max)} title={`${m.name}, ${ROUNDS.names[d.rounds[i]]}: ${n} edit${n === 1 ? "" : "s"}`}>{n || ""}</td>)}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="row">
          <h2 style={{ margin: 0 }}>Unusual activity flags</h2>
          <span className="spacer" />
          {flagRounds.length > 0 && (
            <label className="inline">Round:
              <select value={String(roundFilter)} onChange={(e) => setRoundFilter(e.target.value === "all" ? "all" : Number(e.target.value))} style={{ width: "auto" }}>
                <option value="all">All rounds</option>
                {flagRounds.map((r) => <option key={r} value={r}>{ROUNDS.names[r]}</option>)}
              </select>
            </label>
          )}
        </div>
        <div className="notice warn">
          <b>A flag is a reason to look closer, not proof.</b> These patterns are common when software, such as an AI agent, fills in decisions for students. People also produce them: a team may plan on paper and type it all in at once, or let one person do the data entry. Look at the team&apos;s change log and talk with the team before drawing any conclusion. Students never see these flags.
        </div>
        {!flags.length && <p className="muted">No flags{roundFilter === "all" ? "" : ` for ${ROUNDS.names[roundFilter]}`}.</p>}
        {flags.length > 0 && (
          <table>
            <thead><tr><th>Round</th><th>Team</th><th>Flag</th><th>What was seen</th></tr></thead>
            <tbody>
              {flags.map((f, i) => (
                <tr key={i}>
                  <td style={{ whiteSpace: "nowrap" }}>{ROUNDS.names[f.round]}</td>
                  <td style={{ whiteSpace: "nowrap" }}><a href={`/admin/${id}/firm/${f.firmId}?round=${f.round}`}>{name(f.firmId)}</a></td>
                  <td style={{ minWidth: 190 }}><span className={`badge ${f.level === "look" ? "warn" : ""}`}>{f.level === "look" ? "Look closer" : "Note"}</span><div><b>{f.title}</b></div></td>
                  <td className="small">{f.why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <details className="small" style={{ marginTop: 12 }}>
          <summary>What each flag checks</summary>
          <ul>
            <li><b>Whole round entered in one quick sitting:</b> 25 or more field edits in a round, all within 10 minutes.</li>
            <li><b>Steady, machine-like pace:</b> one person saved 16 or more edits in a row with a typical gap of 6 seconds or less, and the gaps barely vary.</li>
            <li><b>Only one teammate active:</b> on a team of 2 or more, one person made every edit in the round (10 or more).</li>
            <li><b>Large block of text pasted:</b> 300 or more characters pasted into a text box at once, such as the reflection or positioning statement. Recorded from this update on.</li>
            <li><b>Edits mostly between 1 and 5 AM:</b> three quarters or more of a team&apos;s saves in a round, class time. Weak on its own.</li>
            <li><b>No round reflection:</b> the round closed with the reflection blank.</li>
          </ul>
          <p className="muted">&quot;Look closer&quot; flags are stronger signals. &quot;Note&quot; flags are weak on their own and matter mostly alongside others.</p>
        </details>
      </div>
    </>
  );
}
