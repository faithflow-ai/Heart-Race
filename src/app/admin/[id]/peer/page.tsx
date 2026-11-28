"use client";
import { Fragment, use, useEffect, useState } from "react";
import { api, fmtTime } from "@/components/client";
import { PEER } from "@/sim/config";
import type { PeerFlag, PeerResult, ReviewRow } from "@/lib/peer";

interface Member { id: string; name: string; email: string; edits: number; combined: number | null }
interface Win {
  id: string; name: string; weight: number; when: string; status: string;
  opensAt: string | null; closesAt: string | null; opensLocal: string; closesLocal: string;
  released: boolean; hidden: string[]; results: Record<string, PeerResult>; flags: PeerFlag[]; reviews: ReviewRow[];
}
interface Data { game: { id: string; name: string; timezone: string }; teams: { id: string; name: string; members: Member[] }[]; windows: Win[] }

const STATUS: Record<string, string> = { not_set: "Dates not set", scheduled: "Scheduled", open: "Open now", closed: "Closed" };
const avg = (s: Record<string, number>) => {
  const v = PEER.items.map((i) => Number(s[i.id])).filter((n) => n >= 1);
  return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : "–";
};

function Override({ gameId, w, m, onSaved }: { gameId: string; w: Win; m: Member; onSaved: () => void }) {
  const cur = w.results[m.id]?.override;
  const [score, setScore] = useState(cur ? String(cur.score) : "");
  const [note, setNote] = useState(cur?.note ?? "");
  const save = async (clear = false) => {
    await api(`/api/games/${gameId}/peer`, { body: { windowId: w.id, action: "override", userId: m.id, score: clear ? null : score === "" ? null : Number(score), note } });
    onSaved();
  };
  return (
    <span className="row" style={{ gap: 4 }}>
      <input type="number" min={0} max={100} value={score} onChange={(e) => setScore(e.target.value)} style={{ width: 90 }} placeholder="0 to 100" />
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason (for your records)" style={{ width: 170 }} />
      <button onClick={() => save()} disabled={score === ""}>Set</button>
      {cur && <button onClick={() => save(true)}>Clear</button>}
    </span>
  );
}

export default function PeerAdmin({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [d, setD] = useState<Data | null>(null);
  const [wid, setWid] = useState<string>("mid");
  const [dates, setDates] = useState<{ opens: string; closes: string }>({ opens: "", closes: "" });
  const [msg, setMsg] = useState<{ kind: string; text: string } | null>(null);
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const load = () => api<Data>(`/api/games/${id}/peer`).then((x) => { setD(x); return x; });
  useEffect(() => {
    load().then((x) => {
      const w = x.windows.find((y) => y.status === "open") ?? x.windows.find((y) => y.id === "mid")!;
      setWid(w.id);
      setDates({ opens: w.opensLocal, closes: w.closesLocal });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  if (!d) return <p className="muted">Loading…</p>;
  const w = d.windows.find((x) => x.id === wid)!;
  const tz = d.game.timezone;
  const act = async (body: Record<string, unknown>, ok: string) => {
    setMsg(null);
    try {
      await api(`/api/games/${id}/peer`, { body: { windowId: w.id, ...body } });
      const x = await load();
      const nw = x.windows.find((y) => y.id === w.id)!;
      setDates({ opens: nw.opensLocal, closes: nw.closesLocal });
      setMsg({ kind: "good", text: ok });
    } catch (e) {
      setMsg({ kind: "bad", text: (e as Error).message });
    }
  };
  const pick = (x: Win) => {
    setWid(x.id);
    setDates({ opens: x.opensLocal, closes: x.closesLocal });
    setMsg(null);
  };
  const flagsFor = (fid: string) => w.flags.filter((f) => f.firmId === fid);
  return (
    <>
      <div className="row">
        <h1 style={{ margin: 0 }}>Peer evaluation · {d.game.name}</h1>
        <span className="spacer" />
        <a href={`/api/games/${id}/export?type=peer`}>Download every rating (CSV)</a>
        <a href={`/admin/${id}`}>← Class screen</a>
      </div>
      <p className="muted">
        Students rate each teammate and themselves from 1 to 10 on five items, and write one thing each teammate did well and one thing to improve. A student&apos;s score for an evaluation is the average from teammates times 10 (self-ratings don&apos;t count), minus {PEER.missPenalty} if they didn&apos;t submit.
        The peer score is {Math.round(PEER.shareOfSimGrade * 100)}% of the sim grade in the Final scores CSV, with evaluation 1 at {Math.round(PEER.windows[1].weight * 100)}% and evaluation 2 at {Math.round(PEER.windows[2].weight * 100)}%. The early check-in isn&apos;t graded. Students never see who said what.
      </p>
      <div className="row" style={{ marginBottom: 12 }}>
        {d.windows.map((x) => {
          const n = new Set(x.reviews.map((r) => r.rater_id)).size;
          return <button key={x.id} className={x.id === wid ? "primary" : ""} onClick={() => pick(x)}>{x.name} · {STATUS[x.status]}{x.status !== "not_set" ? ` · ${n} submitted` : ""}</button>;
        })}
      </div>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>{w.name} <span className="small muted">(suggested: {w.when}{w.weight ? `, ${Math.round(w.weight * 100)}% of the peer score` : ""})</span></h2>
        <p className="small" style={{ marginTop: 0 }}>
          <b>{STATUS[w.status]}.</b> {w.opensAt ? `Opens ${fmtTime(w.opensAt, tz)}, closes ${fmtTime(w.closesAt, tz)}.` : "Pick dates, or click Open now (it stays open 5 days unless you set a closing time)."}
        </p>
        <div className="row">
          <span>Opens <input type="datetime-local" value={dates.opens} onChange={(e) => setDates({ ...dates, opens: e.target.value })} style={{ width: "auto" }} /></span>
          <span>Closes <input type="datetime-local" value={dates.closes} onChange={(e) => setDates({ ...dates, closes: e.target.value })} style={{ width: "auto" }} /></span>
          <button onClick={() => act({ action: "dates", opens: dates.opens, closes: dates.closes }, "Dates saved.")}>Save dates</button>
          {w.status !== "open" && <button onClick={() => act({ action: "openNow" }, "Open now. Students see it in their menu.")}>Open now</button>}
          {w.status === "open" && <button onClick={() => act({ action: "closeNow" }, "Closed.")}>Close now</button>}
        </div>
        <p className="small muted">Times are in the class time zone ({tz}).</p>
        <label className="row" style={{ gap: 6, fontWeight: "normal" }}>
          <input type="checkbox" checked={w.released} onChange={(e) => act({ action: "release", released: e.target.checked }, e.target.checked ? "Released. Each student can now see their own average and the comments, without names." : "Hidden from students again.")} style={{ width: "auto" }} />
          Release results to students (each sees only their own average and comments, without names). Hide any comment first in the team boxes below.
        </label>
        {msg && <div className={`notice ${msg.kind}`}>{msg.text}</div>}
      </div>

      {w.flags.length > 0 && (
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Worth a closer look ({w.flags.length})</h2>
          <p className="small muted" style={{ marginTop: 0 }}>A reason to look, not proof. Compare with the edit counts and the change log.</p>
          <ul className="small">{w.flags.map((f, i) => <li key={i}><b>{d.teams.find((t) => t.id === f.firmId)?.name}:</b> {f.text}</li>)}</ul>
        </div>
      )}

      {!d.teams.length && <p className="muted">No student teams yet.</p>}
      {d.teams.map((t) => {
        const rv = w.reviews.filter((r) => r.firm_id === t.id);
        const given = (rater: string, ratee: string) => rv.find((r) => r.rater_id === rater && r.ratee_id === ratee);
        const fl = flagsFor(t.id);
        return (
          <div className="panel" key={t.id}>
            <div className="row">
              <h2 style={{ margin: 0 }}>{t.name}</h2>
              {fl.length > 0 && <span className="badge warn">{fl.length} flag{fl.length === 1 ? "" : "s"}</span>}
              <span className="spacer" />
              <a href="#" className="small" onClick={(e) => { e.preventDefault(); setShowComments({ ...showComments, [t.id]: !showComments[t.id] }); }}>{showComments[t.id] ? "Hide comments" : "Show comments"}</a>
            </div>
            <div className="scroll">
              <table className="small">
                <thead>
                  <tr>
                    <th>Rater ↓ / rated →</th>
                    {t.members.map((m) => <th key={m.id} className="num">{m.name.split(" ")[0]}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {t.members.map((r) => (
                    <tr key={r.id}>
                      <td>{r.name}{!w.results[r.id]?.submitted && w.status !== "not_set" && w.status !== "scheduled" && <span className="badge warn" style={{ marginLeft: 4 }}>not submitted</span>}</td>
                      {t.members.map((m) => {
                        const g = given(r.id, m.id);
                        return <td key={m.id} className="num" style={r.id === m.id ? { color: "var(--muted)", fontStyle: "italic" } : undefined} title={g ? PEER.items.map((i) => `${i.name}: ${g.scores[i.id]}`).join("\n") : ""}>{g ? avg(g.scores) : "–"}</td>;
                      })}
                    </tr>
                  ))}
                  <tr><td><b>Average from teammates</b></td>{t.members.map((m) => <td key={m.id} className="num"><b>{w.results[m.id]?.received?.toFixed(1) ?? "–"}</b></td>)}</tr>
                  {w.weight > 0 && <tr><td><b>Score (0-100)</b></td>{t.members.map((m) => { const r = w.results[m.id]; return <td key={m.id} className="num"><b>{r?.score?.toFixed(1) ?? "–"}</b>{r?.override ? " *" : ""}</td>; })}</tr>}
                  <tr><td>Combined peer score so far</td>{t.members.map((m) => <td key={m.id} className="num">{m.combined?.toFixed(1) ?? "–"}</td>)}</tr>
                  <tr><td>Decision edits, whole game (change log)</td>{t.members.map((m) => <td key={m.id} className="num">{m.edits}</td>)}</tr>
                </tbody>
              </table>
            </div>
            <p className="small muted" style={{ margin: "4px 0 0" }}>Grey italic cells are self-ratings (not counted). Hover a cell to see the five item scores. * = your override.</p>
            {showComments[t.id] && (
              <div style={{ marginTop: 8 }}>
                {t.members.map((m) => {
                  const got = rv.filter((r) => r.ratee_id === m.id && r.rater_id !== m.id);
                  const self = given(m.id, m.id);
                  return (
                    <Fragment key={m.id}>
                      <h3 style={{ margin: "10px 0 4px" }}>About {m.name}</h3>
                      {!got.length && <p className="small muted">No ratings yet.</p>}
                      <ul className="small" style={{ marginTop: 0 }}>
                        {got.map((r) => {
                          const key = `${r.rater_id}:${r.ratee_id}`;
                          const hidden = w.hidden.includes(key);
                          return (
                            <li key={key} style={{ marginBottom: 6, opacity: hidden ? 0.55 : 1 }}>
                              <b>From {t.members.find((x) => x.id === r.rater_id)?.name}</b> ({avg(r.scores)}): <i>Did well:</i> {r.well} <i>Could improve:</i> {r.improve}{" "}
                              <label style={{ display: "inline", fontWeight: "normal" }}>
                                <input type="checkbox" checked={hidden} onChange={(e) => act({ action: "hide", key, hidden: e.target.checked }, e.target.checked ? "Comment hidden from the student." : "Comment shown to the student.")} style={{ width: "auto" }} /> hide from student
                              </label>
                            </li>
                          );
                        })}
                        {self?.private_note && <li><b>{m.name}&apos;s private note to you:</b> {self.private_note}</li>}
                      </ul>
                      {w.weight > 0 && <div className="small">Override {m.name}&apos;s score: <Override key={JSON.stringify(w.results[m.id]?.override ?? null)} gameId={id} w={w} m={m} onSaved={load} /></div>}
                    </Fragment>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
