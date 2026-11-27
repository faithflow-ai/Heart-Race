"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/components/client";
import { ReportView, type LeaderRow } from "@/components/ReportView";
import { useTeam } from "@/components/TeamContext";
import { RealityMap, RoundSummary, SegmentPanels, Trends, type RealityData, type SegmentPanelData } from "@/components/Insights";
import { teamColor } from "@/components/team";

const CONTENTS: [string, string][] = [
  ["scorecard", "Scorecard"],
  ["concerns", "Concerns"],
  ["pnl", "Profit and loss"],
  ["goals", "Goals"],
  ["promotion", "Promotion"],
  ["segments", "Segments"],
  ["trends", "Round by round"],
];
import { ROUNDS } from "@/sim/config";
import type { FirmDecision, FirmReport, ProductSpec, ScoreBreakdown } from "@/sim/types";
import type { ProForma } from "@/sim/proforma";

export default function ResultsPage() {
  return (
    <Suspense>
      <Results />
    </Suspense>
  );
}

function Results() {
  const { team } = useTeam();
  const sp = useSearchParams();
  const t = team!;
  const rounds = t.processed.map((p) => p.round);
  const round = sp.get("round") !== null ? Number(sp.get("round")) : rounds[rounds.length - 1];
  const [data, setData] = useState<{ report: FirmReport; score: ScoreBreakdown | null; leaderboard: LeaderRow[]; products: Record<string, ProductSpec>; proforma: ProForma | null; decision: FirmDecision | null; prevRank: number | null; segments: SegmentPanelData[]; reality: RealityData | null; needsBought: boolean } | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (round === undefined) return;
    setData(null);
    api(`/api/team/results?round=${round}`).then(setData).catch((e) => setErr(e.message));
  }, [round]);

  if (!rounds.length) return <div className="panel"><h1>Results</h1><p className="muted">No rounds have been processed yet. Results post automatically after each deadline.</p></div>;
  const targets = data?.decision?.strategy?.targetSegments ?? [];
  const names = Object.fromEntries(Object.entries(data?.products ?? {}).map(([id, p]) => [id, p.name]));
  return (
    <>
      <div className="row">
        <h1 style={{ margin: 0 }}>Results</h1>
        <span className="spacer" />
        <div className="tabs" style={{ margin: 0, border: "none" }}>
          {rounds.map((r) => (
            <a key={r} href={`/play/results?round=${r}`} className={r === round ? "active" : ""}>{ROUNDS.names[r]}</a>
          ))}
        </div>
      </div>
      <p className="small muted">See what your team decided in this round: <a href={`/play/history?round=${round}`}>Past decisions, {ROUNDS.names[round]}</a></p>
      {err && <div className="notice bad">{err}</div>}
      {!data && !err && <p className="muted">Loading…</p>}
      {data && round >= 1 && data.score && <RoundSummary roundName={ROUNDS.names[round]} score={data.score} prevRank={data.prevRank} report={data.report} />}
      {data && round >= 1 && (
        <nav className="contents" aria-label="On this page">
          <span className="contents-head">{ROUNDS.names[round]} report · {t.decision.strategy.companyName || t.firm.name}</span>
          {CONTENTS.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
        </nav>
      )}
      {data && <ReportView round={round} report={data.report} score={data.score} leaderboard={data.leaderboard} names={names} proforma={data.proforma} targets={targets} />}
      {data && round >= 1 && data.segments.length > 0 && (
        <SegmentPanels
          segments={data.segments}
          targets={targets}
          colors={Object.fromEntries(data.leaderboard.map((l) => [l.id, teamColor(l.color, l.slot, l.isAi)]))}
          reality={
            data.reality ? (
              <RealityMap data={data.reality} planned={data.decision?.strategy?.positionMap?.dots ?? []} names={names} targets={targets} />
            ) : (
              <p className="small muted" style={{ marginTop: 16 }}>Reality check: your team hadn&apos;t drawn a positioning map for this round. Draw one on <a href="/play/decide?tab=strategy#positioning-map">step 1 of Decisions</a> and next round&apos;s results will show where buyers actually put you.</p>
            )
          }
        />
      )}
      {data && round >= 1 && <Trends />}
    </>
  );
}
