"use client";
import { useEffect, useState } from "react";
import { api, fmtTime } from "@/components/client";
import { useTeam } from "@/components/TeamContext";
import { PEER } from "@/sim/config";

interface Win { id: string; name: string; weight: number; status: string; opensAt: string | null; closesAt: string | null; released: boolean }
interface Rev { rateeId: string; scores: Record<string, number>; well: string; improve: string; privateNote: string }
interface Result { windowId: string; name: string; graded: boolean; received: number | null; score: number | null; submitted: boolean; penalty: number; overridden: boolean; items: { id: string; name: string; avg: number | null; self: number | null }[]; comments: { well: string; improve: string }[] }
interface Data { viewAs: boolean; me?: string; windows: Win[]; team?: { id: string; name: string; self: boolean }[]; charter?: string; open?: (Win & { submittedAt: string | null; reviews: Rev[] }) | null; results?: Result[] }

const SCALE = Array.from({ length: PEER.scale.max }, (_, i) => i + 1);

function Form({ d, tz, onSaved }: { d: Data; tz: string; onSaved: () => void }) {
  const open = d.open!;
  const team = [...d.team!].sort((a, b) => Number(a.self) - Number(b.self));
  const init = (id: string): Rev => open.reviews.find((r) => r.rateeId === id) ?? { rateeId: id, scores: {}, well: "", improve: "", privateNote: "" };
  const [revs, setRevs] = useState<Record<string, Rev>>(() => Object.fromEntries(team.map((t) => [t.id, init(t.id)])));
  const [msg, setMsg] = useState<{ kind: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (id: string, patch: Partial<Rev>) => setRevs({ ...revs, [id]: { ...revs[id], ...patch } });
  const nameOf = (t: { name: string; self: boolean }) => (t.self ? "You" : t.name.split(" ")[0]);
  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await api("/api/team/peer", { body: { windowId: open.id, reviews: Object.values(revs) } });
      setMsg({ kind: "good", text: "Submitted. You can change your answers until the evaluation closes." });
      onSaved();
    } catch (e) {
      setMsg({ kind: "bad", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };
  if (team.length < 2) return <div className="panel"><p className="muted" style={{ margin: 0 }}>You&apos;re the only member of your team, so there&apos;s no one to rate. Your instructor will handle your peer score.</p></div>;
  return (
    <div className="panel">
      <div className="row">
        <h2 style={{ margin: 0 }}>{open.name}</h2>
        <span className="spacer" />
        <span className="badge accent">Open until {fmtTime(open.closesAt, tz)}</span>
      </div>
      {open.submittedAt && <p className="small muted">You submitted on {fmtTime(open.submittedAt, tz)}. You can still change it.</p>}
      <p className="small">
        Rate each teammate, and yourself, from 1 to 10 on each item. 1 = {PEER.anchors[1]}, 4 = {PEER.anchors[4]}, 7 = {PEER.anchors[7]}, 10 = {PEER.anchors[10]}.
        Be honest and fair: your teammates never see who said what, and your rating of yourself doesn&apos;t count toward your grade.
      </p>
      {d.charter ? (
        <details className="small" style={{ marginBottom: 8 }}>
          <summary>Your team charter</summary>
          <p style={{ whiteSpace: "pre-wrap" }}>{d.charter}</p>
        </details>
      ) : (
        <p className="small muted">Your team hasn&apos;t written a charter yet (Decisions, step 1). Rate &quot;Follows the team charter&quot; on what your team agreed to.</p>
      )}
      <div className="scroll">
        <table>
          <thead><tr><th>Item</th>{team.map((t) => <th key={t.id} className="num">{nameOf(t)}</th>)}</tr></thead>
          <tbody>
            {PEER.items.map((it) => (
              <tr key={it.id}>
                <td><b>{it.name}</b><br /><span className="small muted">{it.help}</span></td>
                {team.map((t) => (
                  <td key={t.id} className="num">
                    <select aria-label={`${it.name}: ${t.name}`} value={revs[t.id].scores[it.id] ?? ""} onChange={(e) => set(t.id, { scores: { ...revs[t.id].scores, [it.id]: Number(e.target.value) } })} style={{ width: 64 }}>
                      <option value="">–</option>
                      {SCALE.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {team.filter((t) => !t.self).map((t) => (
        <div key={t.id} style={{ marginTop: 10 }}>
          <h3 style={{ margin: "6px 0" }}>{t.name}</h3>
          <label>One thing {t.name.split(" ")[0]} did well (required)</label>
          <textarea value={revs[t.id].well} onChange={(e) => set(t.id, { well: e.target.value })} style={{ minHeight: 44 }} />
          <label>One thing {t.name.split(" ")[0]} could improve (required)</label>
          <textarea value={revs[t.id].improve} onChange={(e) => set(t.id, { improve: e.target.value })} style={{ minHeight: 44 }} />
        </div>
      ))}
      <label style={{ marginTop: 10 }}>Private note to your instructor (optional, never shown to your team)</label>
      {(() => {
        const me = team.find((t) => t.self)!;
        return <textarea value={revs[me.id].privateNote} onChange={(e) => set(me.id, { privateNote: e.target.value })} style={{ minHeight: 44 }} placeholder="Anything your instructor should know about how the team is working." />;
      })()}
      <div className="row" style={{ marginTop: 8 }}>
        <button className="primary" disabled={busy} onClick={save}>{open.submittedAt ? "Update my evaluation" : "Submit my evaluation"}</button>
      </div>
      {msg && <div className={`notice ${msg.kind}`}>{msg.text}</div>}
    </div>
  );
}

export default function PeerPage() {
  const { team } = useTeam();
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const load = () => api<Data>("/api/team/peer").then(setD).catch((e) => setErr((e as Error).message));
  useEffect(() => {
    load();
  }, []);
  const tz = team?.game.timezone;
  return (
    <>
      <h1>Peer evaluation</h1>
      <p className="muted">
        Twice in the term, after each board meeting, you rate every teammate and yourself on five items from 1 to 10 and write one thing each teammate did well and one thing they could improve.
        Your peer score is the average your teammates give you, times 10. It counts for {Math.round(PEER.shareOfSimGrade * 100)}% of your sim grade (evaluation 1 counts {Math.round(PEER.windows[1].weight * 100)}% of that and evaluation 2 counts {Math.round(PEER.windows[2].weight * 100)}%).
        If you don&apos;t submit, you lose {PEER.missPenalty} points off your own peer score. Your instructor may also run an early check-in that isn&apos;t graded.
      </p>
      {err && <div className="notice bad">{err}</div>}
      {!d && !err && <p className="muted">Loading…</p>}
      {d?.viewAs && <div className="notice">Peer evaluations are private to each student. Open <b>Peer evaluation</b> on your class screen to see every rating.</div>}
      {d && !d.viewAs && (
        <>
          {d.open ? <Form key={d.open.id + (d.open.submittedAt ?? "")} d={d} tz={tz ?? "America/Los_Angeles"} onSaved={load} /> : (
            <div className="panel">
              <p style={{ margin: 0 }}>No evaluation is open right now.</p>
              {d.windows.filter((w) => w.status === "scheduled").map((w) => <p key={w.id} className="small muted" style={{ marginBottom: 0 }}>{w.name} opens {fmtTime(w.opensAt, tz)}.</p>)}
            </div>
          )}
          {(d.results ?? []).map((r) => (
            <div className="panel" key={r.windowId}>
              <h2 style={{ marginTop: 0 }}>Your results: {r.name}</h2>
              {r.received === null && !r.overridden ? <p className="muted">No teammate ratings were received.</p> : (
                <>
                  <p>
                    Teammates&apos; average: <b>{r.received?.toFixed(1) ?? "–"} out of 10</b>.{" "}
                    {r.graded ? <>Peer score: <b>{r.score?.toFixed(1)}</b> out of 100{r.penalty ? ` (includes −${r.penalty} for not submitting)` : ""}{r.overridden ? " (set by your instructor)" : ""}.</> : "This check-in isn't graded."}
                  </p>
                  <table>
                    <thead><tr><th>Item</th><th className="num">Teammates</th><th className="num">You (self)</th></tr></thead>
                    <tbody>{r.items.map((i) => <tr key={i.id}><td>{i.name}</td><td className="num">{i.avg?.toFixed(1) ?? "–"}</td><td className="num">{i.self ?? "–"}</td></tr>)}</tbody>
                  </table>
                </>
              )}
              {r.comments.length > 0 && (
                <>
                  <h3>What teammates said (no names)</h3>
                  <ul>{r.comments.map((c, i) => <li key={i} style={{ marginBottom: 6 }}><b>Did well:</b> {c.well}<br /><b>Could improve:</b> {c.improve}</li>)}</ul>
                </>
              )}
            </div>
          ))}
        </>
      )}
    </>
  );
}
