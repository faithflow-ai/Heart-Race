"use client";
import { useEffect, useState } from "react";
import { api, fmtTime, money, timeLeft } from "@/components/client";
import { useTeam } from "@/components/TeamContext";
import { ROUNDS } from "@/sim/config";
import { ROUND_FOCUS } from "@/sim/content";
import type { FirmReport, ScoreBreakdown } from "@/sim/types";

export default function TeamHome() {
  const { team } = useTeam();
  const [last, setLast] = useState<{ round: number; report: FirmReport; score: ScoreBreakdown | null } | null>(null);
  const t = team!;
  const lastRound = t.processed.length ? t.processed[t.processed.length - 1].round : null;

  useEffect(() => {
    if (lastRound !== null) api(`/api/team/results?round=${lastRound}`).then(setLast).catch(() => {});
  }, [lastRound]);

  if (t.game.round > ROUNDS.final)
    return (
      <div className="panel">
        <h1>The game is over</h1>
        <p>Thanks for playing. See your final results on the <a href="/play/results">Results</a> page.</p>
      </div>
    );

  const focus = ROUND_FOCUS[t.game.round];
  const d = t.decision;
  return (
    <>
      <div className="row" style={{ alignItems: "baseline" }}>
        <h1 style={{ margin: 0 }}>
          {d.strategy.companyName || t.firm.name}: {ROUNDS.names[t.game.round]}
        </h1>
        <span className="spacer" />
        <span className="muted">{t.game.name}</span>
      </div>
      <div className="grid4" style={{ margin: "16px 0" }}>
        <div className="stat">
          <div className="k">Deadline</div>
          <div className="v" style={{ fontSize: 16 }}>{t.game.deadline ? fmtTime(t.game.deadline, t.game.timezone) : "Not set yet"}</div>
          <div className="s">{t.game.deadline ? timeLeft(t.game.deadline) : "Your instructor will set it"}</div>
        </div>
        <div className="stat">
          <div className="k">Marketing budget left</div>
          <div className="v">{money(t.budget.remaining, true)}</div>
          <div className="s">of {money(t.budget.available, true)} available this round</div>
        </div>
        <div className="stat">
          <div className="k">Company capital</div>
          <div className="v">{money(t.budget.capital, true)}</div>
          <div className="s">for engineering, production, entry</div>
        </div>
        <div className="stat">
          <div className="k">Last score</div>
          <div className="v">{last?.score ? `${last.score.total.toFixed(1)}` : "–"}</div>
          <div className="s">{last?.score ? `Rank ${last.score.rank} of 8` : "No scored round yet"}</div>
        </div>
      </div>

      <div className="grid2">
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>This round: {focus.title}</h2>
          <p>{focus.text}</p>
          <p>
            <a className="btn primary" href="/play/decide">Go to decisions</a>
          </p>
          <p className="small muted">Changes save automatically. Whatever is saved at the deadline is submitted. If you change nothing, last round's decisions carry forward.</p>
        </div>
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Last round</h2>
          {!last && <p className="muted">No results yet. Results post automatically after each deadline.</p>}
          {last && (
            <>
              <p>
                <b>{ROUNDS.names[last.round]}</b>
                {last.round >= 1 && <> · revenue {money(last.report.pnl.revenue, true)} · operating profit {money(last.report.pnl.operatingProfit, true)}</>}
                {last.report.carriedForward && <span className="badge warn" style={{ marginLeft: 8 }}>Carried forward</span>}
              </p>
              {last.report.notes.map((n, i) => (
                <div key={i} className="notice info">{n}</div>
              ))}
              {last.report.concerns.length > 0 && <h3>Top Concerns</h3>}
              {last.report.concerns.slice(0, 4).map((c, i) => (
                <div key={i} className="notice warn">
                  <b>{c.title}.</b> {c.detail} <i>Fix: {c.fix}</i>
                </div>
              ))}
              <a href={`/play/results?round=${last.round}`}>Full results →</a>
            </>
          )}
        </div>
      </div>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Your team</h2>
        <p>{t.members.map((m) => m.name).join(", ")}</p>
        <p className="small muted">No fixed roles: organize yourselves. Write your team norms on the Strategy screen.</p>
      </div>
    </>
  );
}
