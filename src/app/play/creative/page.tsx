"use client";
import { useEffect, useState } from "react";
import { api } from "@/components/client";
import { useTeam } from "@/components/TeamContext";
import { CREATIVE, ROUNDS, SEGMENTS, TONES, type ToneId } from "@/sim/config";

interface Sub { links: Record<string, string>; note: string; submitted_at: string | null; submitted_by_name?: string | null; scores: Record<string, number> | null; feedback: string; graded_at: string | null }
interface M { id: string; open: boolean; submission: Sub | null; average: number | null; boost: number }

const segName = (id: string) => SEGMENTS.find((s) => s.id === id)?.name ?? "not set";
const when = (s: string) => new Date(s).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

function Milestone({ m, state, readOnly, onSaved }: { m: (typeof CREATIVE.milestones)[number]; state: M; readOnly: boolean; onSaved: () => void }) {
  const [links, setLinks] = useState<Record<string, string>>(state.submission?.links ?? {});
  const [note, setNote] = useState(state.submission?.note ?? "");
  const [msg, setMsg] = useState<{ kind: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const s = state.submission;
  const due = m.round === ROUNDS.final ? "the Final round deadline" : `the Round ${m.round} deadline`;
  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await api("/api/team/creative", { body: { milestone: m.id, links, note } });
      setMsg({ kind: "good", text: "Saved. You can update the links until the deadline." });
      onSaved();
    } catch (e) {
      setMsg({ kind: "bad", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="panel">
      <div className="row">
        <h2 style={{ margin: 0 }}>{m.title}</h2>
        <span className="spacer" />
        {state.open ? <span className="badge accent">Open until {due}</span> : <span className="badge">Closed</span>}
      </div>
      {s?.submitted_at && <p className="small muted">Last saved {when(s.submitted_at)}{s.submitted_by_name ? ` by ${s.submitted_by_name}` : ""}.</p>}
      <fieldset disabled={readOnly || !state.open} style={{ border: 0, padding: 0, margin: 0 }}>
        {m.items.map((it) => (
          <div key={it.id}>
            <label>{it.label}{it.required ? "" : ""}</label>
            <input type="url" placeholder="https://…" value={links[it.id] ?? ""} onChange={(e) => setLinks({ ...links, [it.id]: e.target.value })} />
          </div>
        ))}
        <label>Note to your instructor (optional)</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} style={{ minHeight: 50 }} placeholder="Anything the grader should know, such as which product each piece is for." />
        {!readOnly && state.open && <button className="primary" disabled={busy} onClick={save} style={{ marginTop: 8 }}>Save links</button>}
      </fieldset>
      {msg && <div className={`notice ${msg.kind}`}>{msg.text}</div>}
      {!state.open && !s?.submitted_at && <p className="small muted">Nothing was submitted for this milestone.</p>}
      {s?.scores && (
        <div style={{ marginTop: 12 }}>
          <h3 style={{ marginBottom: 4 }}>Instructor grade: {state.average?.toFixed(1)} out of 5</h3>
          <table>
            <tbody>
              {CREATIVE.rubric.map((r) => (
                <tr key={r.id}><td>{r.name}</td><td className="num">{s.scores?.[r.id]}</td><td className="small muted">{r.help}</td></tr>
              ))}
            </tbody>
          </table>
          {s.feedback && <p><b>Feedback:</b> {s.feedback}</p>}
          <p className="small muted">
            Effect in the sim: {state.boost === 0 ? "none (a 3 out of 5 is neutral)" : `${state.boost > 0 ? "+" : ""}${Math.round(state.boost * 100)}% ad effectiveness`} with each product&apos;s campaign segment, from the next round until your next creative milestone is graded.
          </p>
        </div>
      )}
    </div>
  );
}

export default function CreativePage() {
  const { team } = useTeam();
  const [data, setData] = useState<{ round: number; milestones: M[] } | null>(null);
  const [err, setErr] = useState("");
  const load = () => api("/api/team/creative").then(setData).catch((e) => setErr((e as Error).message));
  useEffect(() => {
    load();
  }, []);
  const t = team!;
  return (
    <>
      <h1>Creative work</h1>
      <p className="muted">
        Three times in the game your team turns its campaign into real creative work and submits links to it (Google Drive, Canva, YouTube, a website builder and so on). Make sure anyone with the link can view it. Your instructor grades each set on five criteria. A grade above 3 out of 5 makes your ads work better in the sim with each product&apos;s campaign segment; a grade below 3 makes them work worse.
      </p>
      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Your campaigns (set on the Price &amp; promotion tab)</h3>
        {!t.decision.products.length && <p className="muted small">No products yet.</p>}
        {t.decision.products.length > 0 && (
          <table>
            <thead><tr><th>Product</th><th>Target segment</th><th>Tone</th><th>Main message</th></tr></thead>
            <tbody>
              {t.decision.products.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{segName(p.campaign?.segment ?? "")}</td>
                  <td>{p.campaign?.tone ? TONES[p.campaign.tone as ToneId].name : "not set"}</td>
                  <td className="small">{p.campaign?.message || <span className="muted">not set</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="small muted" style={{ marginBottom: 0 }}>Grading criteria: {CREATIVE.rubric.map((r) => r.name).join(", ")}. See the Learn tab for how to write a creative brief.</p>
      </div>
      {err && <div className="notice bad">{err}</div>}
      {!data && !err && <p className="muted">Loading…</p>}
      {data &&
        CREATIVE.milestones.map((m) => {
          const st = data.milestones.find((x) => x.id === m.id)!;
          return <Milestone key={m.id} m={m} state={st} readOnly={!!t.viewAs} onSaved={load} />;
        })}
    </>
  );
}
