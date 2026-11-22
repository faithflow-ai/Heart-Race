"use client";
import { useState } from "react";
import { api, money } from "@/components/client";
import { useTeam } from "@/components/TeamContext";
import { ROUNDS, STUDIES, type StudyId } from "@/sim/config";
import type { StudyReport } from "@/sim/research";

export default function ResearchPage() {
  const { team, reload } = useTeam();
  const t = team!;
  const round = t.game.round;
  const [report, setReport] = useState<StudyReport | null>(null);
  const [err, setErr] = useState("");
  const bought = new Set(t.research.filter((r) => r.round === round).map((r) => r.study));
  const left = t.budget.available - t.budget.research;

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
      <p className="muted">Studies are paid from the marketing budget and delivered right away. Purchases can't be undone. Marketing budget left this round: <b>{money(left)}</b>.</p>
      {err && <div className="notice bad">{err}</div>}
      <div className="panel">
        <table>
          <thead><tr><th>Study</th><th className="num">Cost</th><th></th></tr></thead>
          <tbody>
            {(Object.keys(STUDIES) as StudyId[]).filter((s) => !("practiceOnly" in STUDIES[s]) || round === 0).map((s) => (
              <tr key={s}>
                <td>{STUDIES[s].name}</td>
                <td className="num">{STUDIES[s].cost ? money(STUDIES[s].cost) : "Free"}</td>
                <td className="num">
                  {bought.has(s) ? <span className="badge good">Bought this round</span> : <button onClick={() => buy(s)} disabled={round > ROUNDS.final}>Buy</button>}
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
