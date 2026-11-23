import { AI, type AiStyle } from "./config";
import { aiDecide } from "./ai";
import { processRound } from "./engine";
import type { FirmDecision, FirmMeta, RoundResult } from "./types";
import type { GameSettings } from "./config";

/** Run one round: AI firms decide, student decisions are used as given (or carried forward). */
export function runRound(opts: {
  round: number;
  seed: number;
  firms: FirmMeta[];
  prevResult: RoundResult | null;
  studentDecisions: Record<string, FirmDecision | null>;
  carriedForward?: Set<string>;
  settings?: GameSettings;
  creativeBoost?: Record<string, number>;
}): RoundResult {
  const decisions: Record<string, FirmDecision | null> = { ...opts.studentDecisions };
  for (const f of opts.firms) {
    if (!f.isAi) continue;
    decisions[f.id] = aiDecide(f, { round: opts.round, seed: opts.seed, state: opts.prevResult?.state ?? null, prevResult: opts.prevResult, firms: opts.firms });
  }
  return processRound({
    round: opts.round,
    seed: opts.seed,
    firms: opts.firms,
    prevState: opts.prevResult?.state ?? null,
    prevResult: opts.prevResult,
    decisions,
    carriedForward: opts.carriedForward,
    settings: opts.settings,
    creativeBoost: opts.creativeBoost,
  });
}

/** Default AI level for a round (console can override per firm). */
export function defaultAiLevel(round: number) {
  return AI.defaultLevelByRound[round] ?? 5;
}

export function makeAiFirms(n: number, startSlot: number): FirmMeta[] {
  const styles: AiStyle[] = ["premium", "lowcost", "follower"];
  return Array.from({ length: n }, (_, i) => ({
    id: `ai-${startSlot + i}`,
    name: AI.names[i % AI.names.length],
    isAi: true,
    aiLevel: defaultAiLevel(0),
    aiStyle: styles[i % 3],
    slot: startSlot + i,
  }));
}
