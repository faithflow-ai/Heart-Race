import { requireInstructor } from "@/lib/auth";
import { getFirms, getResult, processedRounds } from "@/lib/game";
import { instructorGame } from "@/lib/access";
import { handle } from "@/lib/http";

/** Class results dashboard: every firm, every processed round, side by side. */
export const GET = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await requireInstructor();
  const g = await instructorGame(u, (await ctx.params).id);
  const firms = await getFirms(g.id);
  const rounds = await processedRounds(g.id);
  const out = [];
  for (const r of rounds) {
    const res = await getResult(g.id, r.round);
    if (!res) continue;
    const units = Object.fromEntries(Object.entries(res.market.unitsByFirmSegment).map(([id, segs]) => [id, Object.values(segs ?? {}).reduce((a, x) => a + (x ?? 0), 0)]));
    const totalUnits = Object.values(units).reduce((a, x) => a + x, 0) || 1;
    out.push({
      round: r.round,
      firms: firms.map((f) => {
        const rep = res.reports[f.id];
        const sc = res.scores[f.id];
        const goal = (k: string) => rep?.goals.find((x) => x.key === k) ?? null;
        return {
          id: f.id,
          rank: sc?.rank ?? null,
          total: sc?.total ?? null,
          points: sc?.points ?? null,
          revenue: rep?.pnl.revenue ?? 0,
          profit: rep?.pnl.operatingProfit ?? 0,
          unitShare: (units[f.id] ?? 0) / totalUnits,
          targetShare: goal("share")?.actual ?? null,
          awareness: goal("awareness")?.actual ?? null,
          satisfaction: goal("satisfaction")?.actual ?? null,
          goals: rep?.goals ?? [],
          forecastAccuracy: rep?.forecastAccuracy ?? null,
          carriedForward: rep?.carriedForward ?? false,
        };
      }),
    });
  }
  return { firms: firms.map((f) => ({ id: f.id, name: f.name, isAi: f.is_ai })), rounds: out };
});
