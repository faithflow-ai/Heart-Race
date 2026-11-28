"use client";
import { use, useEffect, useState } from "react";
import { api } from "@/components/client";
import { ReportView } from "@/components/ReportView";
import { DecisionsView } from "@/components/DecisionsView";
import { normalizeDecision } from "@/sim/product";
import { ROUNDS } from "@/sim/config";
import type { FirmDecision, FirmReport, ScoreBreakdown } from "@/sim/types";
import type { ProForma } from "@/sim/proforma";
import type { EventResponse } from "@/sim/events";

export default function FirmView({ params }: { params: Promise<{ id: string; firmId: string }> }) {
  const { id, firmId } = use(params);
  const [round, setRound] = useState<number | null>(null);
  const [data, setData] = useState<{ firm: { name: string; is_ai: boolean }; round: number; decision: FirmDecision | null; accepted?: Record<string, { briefedRound: number; launchRound: number }>; report: FirmReport | null; score: ScoreBreakdown | null; proforma?: ProForma | null } | null>(null);
  const [rounds, setRounds] = useState<number[]>([]);
  const [current, setCurrent] = useState(0);
  const [view, setView] = useState<"decisions" | "results" | "events">("decisions");
  const [events, setEvents] = useState<{ schedule: Record<string, number | null>; events: EventResponse[] } | null>(null);

  useEffect(() => {
    api(`/api/games/${id}`).then((o) => {
      setRounds(o.rounds.map((r: { round: number }) => r.round));
      setCurrent(o.game.current_round);
      const fromUrl = new URLSearchParams(window.location.search).get("round");
      setRound((r) => (r === null ? (fromUrl !== null ? Number(fromUrl) : Math.min(o.game.current_round, 7)) : r));
    });
  }, [id]);
  useEffect(() => {
    if (round === null) return;
    api(`/api/games/${id}/team?firmId=${firmId}&round=${round}`).then(setData);
  }, [id, firmId, round]);

  useEffect(() => {
    if (view === "events" && !events) api(`/api/games/${id}/team?firmId=${firmId}&events=1`).then(setEvents);
  }, [view, events, id, firmId]);

  const options = [...rounds, ...(current <= 7 ? [current] : [])];
  const names = Object.fromEntries((data?.decision?.products ?? []).map((p) => [p.id, p.name]));
  return (
    <>
      <div className="row">
        <h1 style={{ margin: 0 }}>{data?.firm.name ?? "…"} {data?.firm.is_ai && <span className="badge">AI</span>}</h1>
        <span className="spacer" />
        <select style={{ width: 200 }} value={round ?? 0} onChange={(e) => setRound(Number(e.target.value))}>
          {options.map((r) => <option key={r} value={r}>{ROUNDS.names[r]}{r === current ? " (open)" : ""}</option>)}
        </select>
        <a href={`/admin/${id}`}>← Console</a>
      </div>
      <div className="tabs" style={{ marginTop: 12 }}>
        <button className={view === "decisions" ? "active" : ""} onClick={() => setView("decisions")}>Decisions (inputs)</button>
        <button className={view === "results" ? "active" : ""} onClick={() => setView("results")}>Results report</button>
        <button className={view === "events" ? "active" : ""} onClick={() => setView("events")}>Event response</button>
      </div>
      {view === "decisions" && (
        <>
          {data && data.round === current && <div className="notice info">This round is still open: these are the team&apos;s decisions so far, and they can still change before the deadline.</div>}
          {data?.decision ? (
            <>
              <DecisionsView d={normalizeDecision(data.decision)} round={data.round} accepted={data.accepted} />
              <details className="small"><summary>Raw decision data (for troubleshooting)</summary><pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(data.decision, null, 2)}</pre></details>
            </>
          ) : (
            <p className="muted">AI decisions are made at processing time and appear here after the round runs.</p>
          )}
        </>
      )}
      {view === "events" && <EventResponseView data={events} />}
      {view === "results" && (data?.report ? <ReportView round={data.round} report={data.report} score={data.score} names={names} proforma={data.proforma} targets={data.decision?.strategy?.targetSegments ?? []} /> : <p className="muted">No results yet for this round. Results appear after the round is scored.</p>)}
    </>
  );
}

const STRENGTH: Record<string, string> = { strong: "Strong lever", medium: "Medium lever", weak: "Weak lever", small: "Small lever" };

/** Instructor only: which responses the team used in each event round, against the response rubric. */
function EventResponseView({ data }: { data: { schedule: Record<string, number | null>; events: EventResponse[] } | null }) {
  if (!data) return <p className="muted">Loading…</p>;
  return (
    <>
      <div className="notice info">
        Instructor only. Each market event is compared with the round before it. Results do the grading: this card shows which responses the team used so you can discuss them in debriefs and board meetings. The strength of each lever comes from the response rubric.
      </div>
      {data.events.length === 0 && <p className="muted">No market event round has been scored yet.</p>}
      {data.events.map((e) => {
        const used = e.levers.filter((l) => l.used && l.strength !== "weak").length;
        return (
          <div key={e.id} className="panel">
            <h2 style={{ marginTop: 0 }}>{e.name} <span className="muted small">({ROUNDS.names[e.round]})</span></h2>
            <table>
              <thead><tr><th>Response</th><th>Strength</th><th>Used?</th><th>Detail</th></tr></thead>
              <tbody>
                {e.levers.map((l, i) => (
                  <tr key={i}>
                    <td>{l.label}</td>
                    <td className="small">{STRENGTH[l.strength]}</td>
                    <td>{l.used ? <span className={`badge ${l.strength === "weak" ? "warn" : "good"}`}>Yes</span> : <span className="badge">No</span>}</td>
                    <td className="small">{l.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="small" style={{ marginBottom: 0 }}><b>Responses used (not counting weak ones):</b> {used} of {e.levers.filter((l) => l.strength !== "weak").length}. {e.outcome}</p>
          </div>
        );
      })}
    </>
  );
}
