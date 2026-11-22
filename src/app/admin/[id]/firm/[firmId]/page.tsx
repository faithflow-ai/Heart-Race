"use client";
import { use, useEffect, useState } from "react";
import { api } from "@/components/client";
import { ReportView } from "@/components/ReportView";
import { ROUNDS } from "@/sim/config";
import type { FirmDecision, FirmReport, ScoreBreakdown } from "@/sim/types";

export default function FirmView({ params }: { params: Promise<{ id: string; firmId: string }> }) {
  const { id, firmId } = use(params);
  const [round, setRound] = useState<number | null>(null);
  const [data, setData] = useState<{ firm: { name: string; is_ai: boolean }; round: number; decision: FirmDecision | null; report: FirmReport | null; score: ScoreBreakdown | null } | null>(null);
  const [rounds, setRounds] = useState<number[]>([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    api(`/api/games/${id}`).then((o) => {
      setRounds(o.rounds.map((r: { round: number }) => r.round));
      setCurrent(o.game.current_round);
      setRound((r) => (r === null ? Math.min(o.game.current_round, 7) : r));
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
      {data?.report && <div style={{ marginTop: 16 }}><ReportView round={data.round} report={data.report} score={data.score} names={names} /></div>}
      <div className="panel" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Decisions{data && data.round === current ? " so far (round still open)" : ""}</h2>
        {data?.decision ? (
          <>
            <p><b>Mission:</b> {data.decision.strategy.mission || <span className="muted">–</span>}</p>
            <p><b>Positioning:</b> {data.decision.strategy.positioning || <span className="muted">–</span>}</p>
            <p><b>Targets:</b> {data.decision.strategy.targetSegments.join(", ") || "–"} in {data.decision.strategy.targetRegions.join(", ") || "–"}</p>
            {data.decision.reflection && <p><b>Reflection:</b> {data.decision.reflection}</p>}
            <details><summary>All decision data</summary><pre className="small" style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(data.decision, null, 2)}</pre></details>
          </>
        ) : (
          <p className="muted">AI decisions are made at processing time and appear here after the round runs.</p>
        )}
      </div>
    </>
  );
}
