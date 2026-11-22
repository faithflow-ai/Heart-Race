"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/components/client";
import { DecisionsView } from "@/components/DecisionsView";
import { useTeam } from "@/components/TeamContext";
import { ROUNDS } from "@/sim/config";
import { normalizeDecision } from "@/sim/product";
import type { FirmDecision } from "@/sim/types";

export default function HistoryPage() {
  return (
    <Suspense>
      <History />
    </Suspense>
  );
}

function History() {
  const { team } = useTeam();
  const sp = useSearchParams();
  const t = team!;
  const rounds = t.processed.map((p) => p.round);
  const round = sp.get("round") !== null ? Number(sp.get("round")) : rounds[rounds.length - 1];
  const [d, setD] = useState<FirmDecision | null>(null);
  const [accepted, setAccepted] = useState<Record<string, { briefedRound: number; launchRound: number }>>({});
  const [err, setErr] = useState("");

  useEffect(() => {
    if (round === undefined) return;
    setD(null);
    api(`/api/team/results?round=${round}`).then((r) => { setAccepted(r.accepted ?? {}); setD(normalizeDecision(r.decision)); }).catch((e) => setErr(e.message));
  }, [round]);

  if (!rounds.length)
    return (
      <div className="panel">
        <h1>Past decisions</h1>
        <p className="muted">Nothing here yet. After each deadline, the decisions your team made that round appear here, so you can look back at what you chose.</p>
      </div>
    );
  return (
    <>
      <div className="row">
        <h1 style={{ margin: 0 }}>Past decisions</h1>
        <span className="spacer" />
        <div className="tabs" style={{ margin: 0, border: "none" }}>
          {rounds.map((r) => (
            <a key={r} href={`/play/history?round=${r}`} className={r === round ? "active" : ""}>{ROUNDS.names[r]}</a>
          ))}
        </div>
      </div>
      <p className="muted">Exactly what your team had saved when {ROUNDS.names[round]} closed. Compare it with that round&apos;s <a href={`/play/results?round=${round}`}>results</a>.</p>
      {err && <div className="notice bad">{err}</div>}
      {!d && !err && <p className="muted">Loading…</p>}
      {d && <DecisionsView d={d} round={round} accepted={accepted} />}
    </>
  );
}
