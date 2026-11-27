import { START_STEPS, type StartStepId } from "@/sim/start";
import type { TeamData } from "./TeamContext";

/** Start here steps this student has finished. The charter step is done once the team charter has text. */
export function startStepsDone(ob: Record<string, boolean>, t: TeamData): StartStepId[] {
  return START_STEPS.filter((s) => (s.id === "team" ? ob.team || !!t.decision.strategy.norms.trim() : !!ob[s.id])).map((s) => s.id);
}
