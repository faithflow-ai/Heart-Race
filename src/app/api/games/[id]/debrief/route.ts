import { requireInstructor } from "@/lib/auth";
import { getFirms, getResult, processedRounds } from "@/lib/game";
import { instructorGame } from "@/lib/access";
import { handle } from "@/lib/http";
import { debriefRound, debriefSeason } from "@/lib/debrief";
import type { RoundResult } from "@/sim/types";

type Ctx = { params: Promise<{ id: string }> };

/** Debrief data for one scored round (?round=N), plus the season so far through that round (instructor only). */
export const GET = handle(async (req: Request, ctx: Ctx) => {
  const u = await requireInstructor();
  const g = await instructorGame(u, (await ctx.params).id);
  const firms = await getFirms(g.id);
  const scored = (await processedRounds(g.id)).map((r) => r.round).filter((r) => r >= 1);
  const firmList = firms.map((f) => ({ id: f.id, name: f.name, isAi: f.is_ai, slot: f.slot }));
  if (!scored.length) return { game: { id: g.id, name: g.name }, scored, firms: firmList, round: null, season: null };
  const asked = Number(new URL(req.url).searchParams.get("round"));
  const round = scored.includes(asked) ? asked : scored[scored.length - 1];
  const results: RoundResult[] = [];
  for (const r of scored.filter((x) => x <= round)) {
    const res = await getResult(g.id, r);
    if (res) results.push(res);
  }
  const cur = results.find((r) => r.round === round)!;
  const prev = results.find((r) => r.round === round - 1) ?? null;
  return {
    game: { id: g.id, name: g.name },
    scored,
    firms: firmList.map((f) => ({ ...f, color: cur.decisions?.[f.id]?.strategy?.teamColor ?? null })),
    round: debriefRound(cur, prev, firms),
    season: debriefSeason(results, firms),
  };
});
