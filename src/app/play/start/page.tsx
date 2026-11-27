"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTeam } from "@/components/TeamContext";
import { api } from "@/components/client";
import { Markdown } from "@/components/Markdown";
import { startStepsDone } from "@/components/start";
import { ROUNDS, SCORECARD_WEIGHTS } from "@/sim/config";
import { FAQ, ROUND_FOCUS } from "@/sim/content";
import { SCENARIO } from "@/sim/lessons";
import { QUIZ, START_STEPS, type StartStepId } from "@/sim/start";

export default function StartPage() {
  return (
    <Suspense>
      <Start />
    </Suspense>
  );
}

function Start() {
  const { team, reload } = useTeam();
  const sp = useSearchParams();
  const t = team!;
  const viewing = !t.onboarding; // instructor or guest viewing a team
  const done = new Set<StartStepId>(viewing ? [] : startStepsDone(t.onboarding!, t));
  const firstOpen = START_STEPS.find((s) => !done.has(s.id))?.id ?? "briefing";
  const stepId = (sp.get("step") as StartStepId) ?? firstOpen;
  const idx = Math.max(0, START_STEPS.findIndex((s) => s.id === stepId));
  const step = START_STEPS[idx];
  const next = START_STEPS[idx + 1];
  const allDone = !viewing && done.size === START_STEPS.length;
  const [busy, setBusy] = useState(false);

  async function finish(id: StartStepId) {
    setBusy(true);
    try {
      await api("/api/team/onboarding", { body: { step: id } });
      await reload();
      window.location.href = next ? `/play/start?step=${next.id}` : "/play/start?step=quiz";
    } finally {
      setBusy(false);
    }
  }

  const minutes = START_STEPS.filter((s) => !done.has(s.id)).reduce((a, s) => a + s.minutes, 0);

  return (
    <div className="start">
      <aside className="start-list">
        <div className="eyebrow">Welcome to Vibe Electronics</div>
        <h1>Start here</h1>
        <p className="muted small">
          {viewing
            ? "Every student's first stop. Each student checks off these steps; until they finish, the menu highlights Start here and Home sends them here."
            : allDone
              ? "All done. Everything here stays as your rules and FAQ reference."
              : `${START_STEPS.length} short steps, about ${minutes} minutes left.`}
        </p>
        {!viewing && (
          <div className="meter" aria-label={`${done.size} of ${START_STEPS.length} done`}>
            <i style={{ width: `${(done.size / START_STEPS.length) * 100}%` }} />
          </div>
        )}
        <ol className="start-steps">
          {START_STEPS.map((s, i) => (
            <li key={s.id}>
              <a href={`/play/start?step=${s.id}`} className={`step ${s.id === step.id ? "cur" : ""} ${done.has(s.id) ? "done" : ""}`}>
                <span className={`dot ${done.has(s.id) ? "done" : ""}`}>{done.has(s.id) ? "✓" : i + 1}</span>
                <span className="step-label">
                  {s.title}
                  <small>{s.minutes} min</small>
                </span>
              </a>
            </li>
          ))}
        </ol>
        {!viewing && !allDone && (
          <a
            className="small muted"
            href="/play"
            onClick={() => {
              try {
                sessionStorage.setItem("hr_skip_start", "1");
              } catch {}
            }}
          >
            Skip to Home for now
          </a>
        )}
        {allDone && <a className="btn primary" href="/play">Go to Home →</a>}
      </aside>

      <section className="start-main">
        <div className="eyebrow">Step {idx + 1} of {START_STEPS.length}</div>
        <h2 className="start-title">{step.title}</h2>
        {step.id === "briefing" && <Briefing />}
        {step.id === "team" && <TeamStep />}
        {step.id === "round" && <RoundStep />}
        {step.id === "scoring" && <ScoringStep />}
        {step.id === "quiz" && <Quiz viewing={viewing} done={done.has("quiz")} onPass={() => finish("quiz")} />}

        {step.id !== "quiz" && step.id !== "team" && !viewing && (
          <div className="start-actions">
            {done.has(step.id) ? (
              <span className="chip good">Done</span>
            ) : (
              <button className="primary" disabled={busy} onClick={() => finish(step.id)}>
                {busy ? "Saving…" : `I've read this. Next: ${next?.title ?? "finish"} →`}
              </button>
            )}
            {done.has(step.id) && next && <a className="btn" href={`/play/start?step=${next.id}`}>Next: {next.title} →</a>}
          </div>
        )}
        {step.id === "team" && !viewing && (
          <div className="start-actions">
            {done.has("team") ? (
              <>
                <span className="chip good">Done: your team has a charter</span>
                <a className="btn" href="/play/start?step=round">Next: How a round works →</a>
              </>
            ) : (
              <span className="muted small">This step checks itself off once your team charter has text in it.</span>
            )}
          </div>
        )}

        {allDone && (
          <div className="panel" style={{ marginTop: 24 }}>
            <h3 style={{ marginTop: 0 }}>Questions</h3>
            {FAQ.map((f) => (
              <details key={f.q} style={{ marginBottom: 8 }}>
                <summary><b>{f.q}</b></summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Briefing() {
  return (
    <div className="panel">
      <p className="small muted" style={{ marginTop: 0 }}>Click a heading to open it. Start with the first three, then read the rest before you make your first decisions.</p>
      {SCENARIO.map((s, i) => (
        <details key={s.title} open={i === 0} style={{ marginBottom: 8 }}>
          <summary><b>{i + 1}. {s.title}</b></summary>
          <Markdown text={s.body} />
        </details>
      ))}
    </div>
  );
}

function TeamStep() {
  const { team } = useTeam();
  const t = team!;
  return (
    <div className="panel">
      <p><b>Your team:</b> {t.members.map((m) => m.name).join(", ")}</p>
      <p>There are no fixed roles. Agree how you&apos;ll work together, then write it down as your team charter. Peer evaluation will refer back to it, and the change log records who did what.</p>
      <p>Write the charter, your company name and mission on the first decision step.</p>
      <a className="btn primary" href="/play/decide?tab=strategy">Open step 1: Strategy and goals →</a>
    </div>
  );
}

function RoundStep() {
  return (
    <>
      <div className="beats">
        <div className="beat"><b className="b1">1 · Decide</b><p>Work through the 6 decision steps with your team. Everything saves as you type, and anyone on the team can edit.</p></div>
        <div className="beat"><b className="b2">2 · Deadline</b><p>One round a week. Whatever is saved at the deadline is used. There&apos;s no submit button, and anything you leave alone carries forward.</p></div>
        <div className="beat"><b className="b3">3 · Results</b><p>Results post right after the deadline: scorecard, market reports and concerns to learn from.</p></div>
      </div>
      <div className="panel">
        <table>
          <thead><tr><th>Round</th><th>Focus</th><th className="num">Share of sim grade</th></tr></thead>
          <tbody>
            {ROUNDS.names.map((n, i) => (
              <tr key={n}><td>{n}</td><td><b>{ROUND_FOCUS[i].title}.</b> <span className="small">{ROUND_FOCUS[i].text}</span></td><td className="num">{Math.round(ROUNDS.gradeWeights[i] * 100)}%</td></tr>
            ))}
          </tbody>
        </table>
        <p className="small muted">Board meetings: your team presents to the Vibe Electronics board after Round 4 and after the Final round.</p>
      </div>
    </>
  );
}

function ScoringStep() {
  return (
    <div className="panel">
      <p>Each measure becomes 0 to 100 points against the best firm that round. Your round score is the weighted sum.</p>
      <table>
        <tbody>
          <tr><td>Market</td><td className="num">{SCORECARD_WEIGHTS.market * 100}%</td><td>Your share of units sold in your declared target segments, weighted by segment size.</td></tr>
          <tr><td>Customer</td><td className="num">{SCORECARD_WEIGHTS.customer * 100}%</td><td>How well your products fit those segments, plus awareness and satisfaction.</td></tr>
          <tr><td>Financial</td><td className="num">{SCORECARD_WEIGHTS.financial * 100}%</td><td>Operating profit after promotion (70%) and return on promotion spending (30%).</td></tr>
          <tr><td>Channel</td><td className="num">{SCORECARD_WEIGHTS.channel * 100}%</td><td>Share of target buyers in your target regions who can find you, minus margin paid above 15%.</td></tr>
          <tr><td>Goal accuracy</td><td className="num">{SCORECARD_WEIGHTS.goals * 100}%</td><td>Half sales-forecast accuracy, half closeness to your own numeric goals.</td></tr>
        </tbody>
      </table>
      <p className="small muted">Worked example: points of Market 80, Customer 70, Financial 50, Channel 90, Goals 60 give 0.3×80 + 0.2×70 + 0.2×50 + 0.2×90 + 0.1×60 = 72.</p>
      <p className="small muted">Later rounds count more toward your grade (see the table in step 3). Your instructor explains how the simulation fits into the course grade.</p>
    </div>
  );
}

function Quiz({ viewing, done, onPass }: { viewing: boolean; done: boolean; onPass: () => void }) {
  const [picks, setPicks] = useState<(number | null)[]>(QUIZ.map(() => null));
  const [checked, setChecked] = useState(false);
  const right = picks.filter((p, i) => p === QUIZ[i].answer).length;
  return (
    <div className="panel">
      <p className="muted small" style={{ marginTop: 0 }}>Five questions on the rules of the game. Get all five right to finish Start here. You can try again as often as you like.</p>
      {QUIZ.map((q, i) => (
        <fieldset key={q.q} className="quiz-q">
          <legend>{i + 1}. {q.q}</legend>
          {q.choices.map((c, j) => (
            <label key={c} className="inline" style={{ display: "flex" }}>
              <input type="radio" name={`q${i}`} checked={picks[i] === j} onChange={() => { setPicks(picks.map((p, k) => (k === i ? j : p))); setChecked(false); }} />
              {c}
            </label>
          ))}
          {checked && picks[i] !== null && (
            <div className={`notice ${picks[i] === q.answer ? "good" : "warn"}`}>{picks[i] === q.answer ? "Right. " : "Not quite. "}{picks[i] === q.answer ? q.why : "Look again at steps 3 and 4."}</div>
          )}
        </fieldset>
      ))}
      <div className="start-actions">
        {done ? (
          <><span className="chip good">Passed</span><a className="btn primary" href="/play">Go to Home →</a></>
        ) : (
          <>
            <button onClick={() => setChecked(true)} disabled={picks.some((p) => p === null)}>Check my answers</button>
            {checked && right === QUIZ.length && !viewing && <button className="primary" onClick={onPass}>All 5 right. Finish Start here →</button>}
            {checked && right < QUIZ.length && <span className="muted">{right} of {QUIZ.length} right</span>}
          </>
        )}
      </div>
    </div>
  );
}
