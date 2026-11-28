"use client";
import { useState } from "react";
import { api, money } from "@/components/client";
import { useTeam } from "@/components/TeamContext";
import { ROUNDS, STUDIES, studyFromRound, type StudyId } from "@/sim/config";
import type { StudyReport } from "@/sim/research";
import { STUDY_INFO } from "@/sim/content";

export default function ResearchPage() {
  const { team, reload } = useTeam();
  const t = team!;
  const round = t.game.round;
  const [report, setReport] = useState<StudyReport | null>(null);
  const [err, setErr] = useState("");
  const bought = new Set(t.research.filter((r) => r.round === round).map((r) => r.study));
  // Same "left" as Home and Decisions: available minus planned promotion and research already bought.
  const left = t.budget.remaining;
  // Room under this round's spending limit (promotion + research), from Round 1 on.
  const limitRoom = round >= 1 ? t.budget.limit - t.budget.promotion - t.budget.research : Infinity;
  const blocked = (cost: number) => cost > 0 && (cost > left ? "Not enough marketing budget left. Lower planned promotion on Price and promotion first." : cost > limitRoom ? "This would go over this round's spending limit (promotion plus research). Lower planned promotion on Price and promotion first." : "");

  async function buy(study: StudyId) {
    setErr("");
    const st = STUDIES[study];
    if (st.cost > 0 && !confirmBuy(st.name, st.cost)) return;
    try {
      const r = await api("/api/team/research", { body: { study } });
      setReport(r.report);
      await reload();
    } catch (e) {
      setErr((e as Error).message);
    }
  }
  async function preview(study: StudyId) {
    setErr("");
    try {
      const res = await api(`/api/team/research?preview=${study}`);
      setReport(res.report);
      window.scrollTo({ top: 0 });
    } catch (e) {
      setErr((e as Error).message);
    }
  }
  async function open(r: number, study: string) {
    const res = await api(`/api/team/research?round=${r}&study=${study}`);
    setReport(res.report);
    window.scrollTo({ top: 0 });
  }

  if (report)
    return (
      <>
        <button onClick={() => setReport(null)}>← Back to research</button>
        <div className="panel" style={{ marginTop: 12 }}>
          <h1>{report.title}</h1>
          <p>{report.intro}</p>
          {report.tables.map((tb, i) => (
            <div key={i} className="scroll">
              <h3>{tb.title}</h3>
              <table>
                <thead><tr>{tb.columns.map((c, j) => <th key={j}>{c}</th>)}</tr></thead>
                <tbody>{tb.rows.map((row, j) => <tr key={j}>{row.map((c, k) => <td key={k}>{c}</td>)}</tr>)}</tbody>
              </table>
            </div>
          ))}
        </div>
      </>
    );

  return (
    <>
      <h1>Market research</h1>
      <p className="muted">Studies are paid from the marketing budget and delivered right away. Purchases can't be undone. Marketing budget left this round, after planned promotion: <b>{money(left)}</b>.</p>
      {err && <div className="notice bad">{err}</div>}
      {t.viewAs && <div className="notice warn">Instructor preview: click <b>Preview</b> to see any study as this team would get it right now. Nothing is bought or charged.</div>}
      <div className="panel">
        <table>
          <thead><tr><th>Study</th><th className="num">Cost</th><th></th></tr></thead>
          <tbody>
            {(Object.keys(STUDIES) as StudyId[]).filter((s) => !("practiceOnly" in STUDIES[s]) || round === 0).map((s) => (
              <tr key={s}>
                <td>
                  <b>{STUDIES[s].name}</b>
                  {STUDY_INFO[s] && (
                    <>
                      <div className="small">{STUDY_INFO[s].answers}</div>
                      <details className="small">
                        <summary className="muted">More about this study</summary>
                        <p style={{ margin: "4px 0" }}><b>What&apos;s in it:</b> {STUDY_INFO[s].contents}</p>
                        <p style={{ margin: "4px 0" }}><b>Most useful:</b> {STUDY_INFO[s].when}</p>
                        <p style={{ margin: "4px 0" }}><b>Marketing idea:</b> {STUDY_INFO[s].concept}</p>
                      </details>
                    </>
                  )}
                </td>
                <td className="num">{STUDIES[s].cost ? money(STUDIES[s].cost) : "Free"}</td>
                <td className="num">
                  {t.viewAs ? (
                    <button onClick={() => preview(s)}>Preview</button>
                  ) : bought.has(s) ? (
                    <span className="badge good">{STUDIES[s].cost ? "Bought this round" : "Received"}</span>
                  ) : STUDIES[s].cost > 0 && round < studyFromRound(s) ? (
                    <span className="badge" title={studyFromRound(s) > 1 ? "This study reports on products already on the market" : "Your marketing budget starts in Round 1"}>Available from {ROUNDS.names[studyFromRound(s)]}</span>
                  ) : (
                    <>
                      <button className={STUDIES[s].cost ? "" : "primary"} onClick={() => buy(s)} disabled={round > ROUNDS.final || !!blocked(STUDIES[s].cost)} title={blocked(STUDIES[s].cost) || undefined}>{STUDIES[s].cost ? "Buy" : "Get free survey"}</button>
                      {blocked(STUDIES[s].cost) && <div className="small muted" style={{ maxWidth: 220, marginLeft: "auto" }}>{blocked(STUDIES[s].cost)}</div>}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2>Your reports</h2>
      {!t.research.length && <p className="muted">None yet.</p>}
      <ul>
        {[...t.research].reverse().map((r) => (
          <li key={`${r.round}-${r.study}`}>
            <a href="#" onClick={(e) => { e.preventDefault(); open(r.round, r.study); }}>{STUDIES[r.study as StudyId]?.name}</a> <span className="muted small">({ROUNDS.names[r.round]})</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function confirmBuy(name: string, cost: number) {
  // A simple in-page confirm keeps accidental clicks from spending money.
  return window.confirm(`Buy "${name}" for $${cost.toLocaleString()}? This can't be undone.`);
}
