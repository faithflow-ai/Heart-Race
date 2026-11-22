"use client";
import { use, useEffect, useState } from "react";
import { api } from "@/components/client";
import { ReportView } from "@/components/ReportView";
import { DecisionsView } from "@/components/DecisionsView";
import { normalizeDecision } from "@/sim/product";
import { ROUNDS } from "@/sim/config";
import type { FirmDecision, FirmReport, ScoreBreakdown } from "@/sim/types";

export default function FirmView({ params }: { params: Promise<{ id: string; firmId: string }> }) {
  const { id, firmId } = use(params);
  const [round, setRound] = useState<number | null>(null);
  const [data, setData] = useState<{ firm: { name: string; is_ai: boolean }; round: number; decision: FirmDecision | null; report: FirmReport | null; score: ScoreBreakdown | null } | null>(null);
  const [rounds, setRounds] = useState<number[]>([]);
  const [current, setCurrent] = useState(0);
  const [view, setView] = useState<"decisions" | "results">("decisions");

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
      </div>
      {view === "decisions" && (
        <>
          {data && data.round === current && <div className="notice info">This round is still open: these are the team&apos;s decisions so far, and they can still change before the deadline.</div>}
          {data?.decision ? (
            <>
              <DecisionsView d={normalizeDecision(data.decision)} round={data.round} />
              <details className="small"><summary>Raw decision data (for troubleshooting)</summary><pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(data.decision, null, 2)}</pre></details>
            </>
          ) : (
            <p className="muted">AI decisions are made at processing time and appear here after the round runs.</p>
          )}
        </>
      )}
      {view === "results" && (data?.report ? <ReportView round={data.round} report={data.report} score={data.score} names={names} /> : <p className="muted">No results yet for this round. Results appear after the round is scored.</p>)}
    </>
  );
}
