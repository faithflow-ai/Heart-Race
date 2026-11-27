import { requireUser } from "@/lib/auth";
import { getFirms, getResult, processedRounds } from "@/lib/game";
import { studentContext } from "@/lib/access";
import { handle } from "@/lib/http";

/** Round-by-round numbers for the Results charts: every firm's total score, and this team's revenue and profit. */
export const GET = handle(async () => {
  const user = await requireUser();
  const { game, firm } = await studentContext(user);
  const firms = await getFirms(game.id);
  const rounds = (await processedRounds(game.id)).map((p) => p.round).filter((r) => r >= 1 && r < game.current_round);
  const points: { round: number; scores: Record<string, number>; revenue: number; profit: number }[] = [];
  for (const r of rounds) {
    const res = await getResult(game.id, r);
    if (!res) continue;
    const rep = res.reports[firm.id];
    points.push({
      round: r,
      scores: Object.fromEntries(Object.entries(res.scores).map(([id, s]) => [id, s.total])),
      revenue: rep?.pnl.revenue ?? 0,
      profit: rep?.pnl.operatingProfit ?? 0,
    });
  }
  return { firms: firms.map((f) => ({ id: f.id, name: f.name, isAi: f.is_ai, mine: f.id === firm.id })), points };
});
