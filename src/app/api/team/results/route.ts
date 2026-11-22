import { HttpError, requireUser } from "@/lib/auth";
import { getFirms, getResult } from "@/lib/game";
import { studentContext } from "@/lib/access";
import { handle } from "@/lib/http";

/** A team's own reports for a round, plus the public leaderboard. */
export const GET = handle(async (req: Request) => {
  const user = await requireUser();
  const { game, firm } = await studentContext(user);
  const round = Number(new URL(req.url).searchParams.get("round"));
  if (!(round < game.current_round)) throw new HttpError(404, "That round hasn't been processed yet.");
  const res = await getResult(game.id, round);
  if (!res) throw new HttpError(404, "No results for that round.");
  const firms = await getFirms(game.id);
  return {
    round,
    report: res.reports[firm.id],
    score: res.scores[firm.id] ?? null,
    decision: res.decisions[firm.id],
    accepted: Object.fromEntries(Object.values(res.state.firms[firm.id]?.products ?? {}).map((p) => [p.spec.id, { briefedRound: p.briefedRound, launchRound: p.launchRound }])),
    products: Object.fromEntries(Object.values(res.state.firms[firm.id].products).map((p) => [p.spec.id, p.spec])),
    leaderboard: firms
      .map((f) => ({ id: f.id, name: f.name, isAi: f.is_ai, mine: f.id === firm.id, total: res.scores[f.id]?.total ?? null, rank: res.scores[f.id]?.rank ?? null, points: res.scores[f.id]?.points ?? null }))
      .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99)),
  };
});
