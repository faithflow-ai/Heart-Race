"use client";
import { use, useEffect, useState } from "react";
import { api } from "@/components/client";
import { CREATIVE, ROUNDS, SEGMENTS, TONES, type ToneId } from "@/sim/config";

interface Sub { milestone: string; links: Record<string, string>; note: string; submitted_at: string | null; submitted_by_name?: string | null; scores: Record<string, number> | null; feedback: string; graded_at: string | null; average: number | null; boost: number }
interface Team { id: string; name: string; targets: string[]; positioning: string; campaigns: { name: string; message: string; tone: string; segment: string; claims: string[] }[]; submissions: Sub[] }

const segName = (id: string) => SEGMENTS.find((s) => s.id === id)?.name ?? "not set";

function GradeForm({ gameId, team, m, sub, onSaved }: { gameId: string; team: Team; m: (typeof CREATIVE.milestones)[number]; sub: Sub | undefined; onSaved: () => void }) {
  const [scores, setScores] = useState<Record<string, number>>(sub?.scores ?? {});
  const [feedback, setFeedback] = useState(sub?.feedback ?? "");
  const [msg, setMsg] = useState<{ kind: string; text: string } | null>(null);
  const done = CREATIVE.rubric.every((r) => scores[r.id] >= 1);
  const avg = done ? CREATIVE.rubric.reduce((a, r) => a + scores[r.id], 0) / CREATIVE.rubric.length : null;
  const save = async () => {
    try {
      await api(`/api/games/${gameId}/creative`, { body: { firmId: team.id, milestone: m.id, scores, feedback } });
      setMsg({ kind: "good", text: "Grade saved. The team can see it now." });
      onSaved();
    } catch (e) {
      setMsg({ kind: "bad", text: (e as Error).message });
    }
  };
  return (
    <div style={{ borderTop: "1px solid var(--line, #ddd)", paddingTop: 10, marginTop: 10 }}>
      <h3 style={{ margin: "0 0 6px" }}>{m.title}</h3>
      {!sub?.submitted_at && <p className="small muted">Not submitted yet.</p>}
      {sub?.submitted_at && (
        <ul className="small" style={{ marginTop: 0 }}>
          {m.items.map((it) =>
            sub.links[it.id] ? (
              <li key={it.id}>{it.label}: <a href={sub.links[it.id]} target="_blank" rel="noreferrer noopener">{sub.links[it.id]}</a></li>
            ) : (
              <li key={it.id} className="muted">{it.label}: {it.required ? "missing" : "not included"}</li>
            ),
          )}
          {sub.note && <li>Team note: {sub.note}</li>}
          <li className="muted">Submitted {new Date(sub.submitted_at).toLocaleString()}{sub.submitted_by_name ? ` by ${sub.submitted_by_name}` : ""}</li>
        </ul>
      )}
      <table>
        <thead><tr><th>Criterion</th>{[1, 2, 3, 4, 5].map((n) => <th key={n} className="num">{n}</th>)}</tr></thead>
        <tbody>
          {CREATIVE.rubric.map((r) => (
            <tr key={r.id}>
              <td title={r.help}>{r.name} <span className="small muted">{r.help}</span></td>
              {[1, 2, 3, 4, 5].map((n) => (
                <td key={n} className="num">
                  <input type="radio" name={`${team.id}-${m.id}-${r.id}`} checked={scores[r.id] === n} onChange={() => setScores({ ...scores, [r.id]: n })} style={{ width: "auto" }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <label>Feedback to the team</label>
      <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} style={{ minHeight: 50 }} />
      <div className="row" style={{ marginTop: 6 }}>
        <button className="primary" disabled={!done} onClick={save}>Save grade</button>
        {avg !== null && <span className="small">Average {avg.toFixed(1)} → sim effect {avg === 3 ? "none" : `${avg > 3 ? "+" : ""}${Math.round((avg - 3) * CREATIVE.boostPerPoint * 100)}%`} ad effectiveness in each campaign segment</span>}
        {sub?.graded_at && <span className="small muted">Last graded {new Date(sub.graded_at).toLocaleString()}</span>}
      </div>
      {msg && <div className={`notice ${msg.kind}`}>{msg.text}</div>}
    </div>
  );
}

export default function CreativeGrading({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<{ game: { id: string; name: string; round: number }; teams: Team[] } | null>(null);
  const [ms, setMs] = useState<string>("launch");
  const load = () => api(`/api/games/${id}/creative`).then(setData);
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  if (!data) return <p className="muted">Loading…</p>;
  const m = CREATIVE.milestones.find((x) => x.id === ms)!;
  return (
    <>
      <div className="row">
        <h1 style={{ margin: 0 }}>Creative grading · {data.game.name}</h1>
        <span className="spacer" />
        <a href={`/admin/${id}`}>← Class screen</a>
      </div>
      <p className="muted">
        Open each team&apos;s links, score the five criteria from 1 to 5 and add feedback. Teams see the grade right away. The average affects the sim from the next round processed: 3 is neutral, and each point above or below 3 moves ad effectiveness in each product&apos;s campaign segment by {Math.round(CREATIVE.boostPerPoint * 100)}%. You can change a grade later; it affects only rounds processed after the change.
      </p>
      <div className="row" style={{ marginBottom: 12 }}>
        {CREATIVE.milestones.map((x) => {
          const n = data.teams.filter((t) => t.submissions.some((s) => s.milestone === x.id && s.submitted_at)).length;
          const g = data.teams.filter((t) => t.submissions.some((s) => s.milestone === x.id && s.graded_at)).length;
          return (
            <button key={x.id} className={x.id === ms ? "primary" : ""} onClick={() => setMs(x.id)}>
              {x.title} ({ROUNDS.names[x.round]}) · {n} submitted, {g} graded
            </button>
          );
        })}
      </div>
      {!data.teams.length && <p className="muted">No student teams yet.</p>}
      {data.teams.map((t) => (
        <div className="panel" key={t.id + ms}>
          <h2 style={{ marginTop: 0 }}>{t.name}</h2>
          <p className="small" style={{ marginTop: 0 }}>
            <b>Target segments:</b> {t.targets.map(segName).join(", ") || "none"}
            {t.positioning && <><br /><b>Positioning:</b> {t.positioning}</>}
          </p>
          {t.campaigns.length > 0 && (
            <table className="small">
              <thead><tr><th>Product</th><th>Campaign segment</th><th>Tone</th><th>Main message</th></tr></thead>
              <tbody>
                {t.campaigns.map((c) => (
                  <tr key={c.name}><td>{c.name}</td><td>{segName(c.segment)}</td><td>{c.tone ? TONES[c.tone as ToneId]?.name : "not set"}</td><td>{c.message || <span className="muted">not set</span>}</td></tr>
                ))}
              </tbody>
            </table>
          )}
          <GradeForm key={(t.submissions.find((s) => s.milestone === ms)?.graded_at ?? "") + ms} gameId={id} team={t} m={m} sub={t.submissions.find((s) => s.milestone === ms)} onSaved={load} />
        </div>
      ))}
    </>
  );
}
