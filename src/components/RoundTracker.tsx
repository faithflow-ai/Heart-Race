"use client";
import { ROUNDS } from "@/sim/config";
import { countdown, fmtTime } from "./client";
import { checklistItems } from "./checklist";
import type { TeamData } from "./TeamContext";

/** Rounds that end with a board meeting (mid-term after Round 4, and the Final round). */
const BOARD = new Set([4, ROUNDS.final]);

/** Pinned under the menu on every team screen: where the class is, the deadline, what's left. */
export function RoundTracker({ team }: { team: TeamData }) {
  const round = team.game.round;
  const over = round > ROUNDS.final;
  const items = over ? [] : checklistItems(team);
  return (
    <div className="tracker" role="region" aria-label="Round tracker">
      <b className="tracker-now">{over ? "Game over" : round === 0 ? "Practice round" : round === ROUNDS.final ? "Final round" : `Round ${round} of ${ROUNDS.final - 1}`}</b>
      <ol className="tracker-steps">
        {ROUNDS.names.map((n, i) => (
          <li key={n} className={`${i < round ? "done" : i === round ? "now" : ""} ${BOARD.has(i) ? "board" : ""}`} title={BOARD.has(i) ? `${n}: board meeting after this round` : n}>
            {i === 0 ? "Practice" : i === ROUNDS.final ? "Final" : `R${i}`}
            {BOARD.has(i) && <span className="board-tag"> · Board</span>}
          </li>
        ))}
      </ol>
      {!over && (
        <div className="tracker-right">
          <span className={`deadline ${team.game.deadline ? "set" : ""}`} title={team.game.deadline ? fmtTime(team.game.deadline, team.game.timezone) : undefined}>
            {team.game.deadline ? countdown(team.game.deadline) : "Deadline not set yet"}
          </span>
          <a href="/play/decide?tab=review" className={`chip ${items.length ? "warn" : "good"}`}>
            {items.length ? `${items.length} to check` : "All filled in"}
          </a>
          {team.decision.ready && <span className="chip good">Team ready</span>}
        </div>
      )}
    </div>
  );
}
