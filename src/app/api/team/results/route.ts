import { HttpError, requireUser } from "@/lib/auth";
import { getFirms, getResult, proFormaFor, settingsOf } from "@/lib/game";
import { normalizeDecision } from "@/sim/product";
import { studentContext } from "@/lib/access";
import { handle } from "@/lib/http";
import { one } from "@/lib/db";
import { realityCheck, segmentPanels } from "@/lib/insights";

/** A team's own reports for a round, plus the public leaderboard. */
export const GET = handle(async (req: Request) => {
  const user = await requireUser();
  const { game, firm } = await studentContext(user);
  const round = Number(new URL(req.url).searchParams.get("round"));
  if (!(round < game.current_round)) throw new HttpError(404, "That round hasn't been processed yet.");
  const res = await getResult(game.id, round);
  if (!res) throw new HttpError(404, "No results for that round.");
  const firms = await getFirms(game.id);
  const rep = res.reports[firm.id];
  const prev = round >= 1 ? await getResult(game.id, round - 1) : null;
  const proforma = round >= 1 && rep ? proFormaFor(round, normalizeDecision(res.decisions[firm.id]), prev?.state.firms[firm.id], settingsOf(game), rep.budget.start + rep.budget.release + rep.budget.earned) : null;
  const needs = await one("select 1 as x from research_reports where firm_id = $1 and study = 'needs' and round <= $2 limit 1", [firm.id, round]);
  const prevScore = prev?.scores[firm.id] ?? null;
  return {
    proforma,
    prevRank: round >= 2 && prevScore ? prevScore.rank : null,
    segments: round >= 1 ? segmentPanels(res, firms, firm.id, !!needs) : [],
    reality: round >= 1 ? realityCheck(res, firms, firm.id, res.decisions[firm.id]?.strategy?.positionMap, !!needs) : null,
    needsBought: !!needs,
    round,
    report: res.reports[firm.id],
    score: res.scores[firm.id] ?? null,
    decision: res.decisions[firm.id],
    accepted: Object.fromEntries(Object.values(res.state.firms[firm.id]?.products ?? {}).map((p) => [p.spec.id, { briefedRound: p.briefedRound, launchRound: p.launchRound }])),
    products: Object.fromEntries(Object.values(res.state.firms[firm.id].products).map((p) => [p.spec.id, p.spec])),
    leaderboard: firms
      .map((f) => ({ id: f.id, name: f.name, isAi: f.is_ai, mine: f.id === firm.id, color: f.is_ai ? null : (res.decisions[f.id]?.strategy?.teamColor ?? null), slot: f.slot, total: res.scores[f.id]?.total ?? null, rank: res.scores[f.id]?.rank ?? null, points: res.scores[f.id]?.points ?? null }))
      .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99)),
  };
});
