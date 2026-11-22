import { requireInstructor } from "@/lib/auth";
import { q } from "@/lib/db";
import { getFirms, getResult, processedRounds } from "@/lib/game";
import { instructorGame } from "@/lib/access";
import { csv, handle } from "@/lib/http";
import { productNames, readable, type RawLog } from "@/lib/logtext";
import { GRADE_BANDS, ROUNDS } from "@/sim/config";

/** CSV exports for the gradebook: scores, final, roster, reflections, log. */
export const GET = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await requireInstructor();
  const g = await instructorGame(u, (await ctx.params).id);
  const type = new URL(req.url).searchParams.get("type") ?? "scores";
  const firms = await getFirms(g.id);
  const rounds = await processedRounds(g.id);
  const results = await Promise.all(rounds.map((r) => getResult(g.id, r.round)));
  const slug = g.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();

  if (type === "scores") {
    const rows: (string | number | null)[][] = [["team", "is_ai", "round", "total_score", "rank", "market", "customer", "financial", "channel", "goals", "operating_profit", "revenue", "carried_forward"]];
    for (const res of results) {
      if (!res || res.round < 1) continue;
      for (const f of firms) {
        const s = res.scores[f.id];
        const rep = res.reports[f.id];
        if (!s) continue;
        rows.push([f.name, f.is_ai ? "yes" : "no", ROUNDS.names[res.round], s.total, s.rank, s.points.market, s.points.customer, s.points.financial, s.points.channel, s.points.goals, rep.pnl.operatingProfit, rep.pnl.revenue, rep.carriedForward ? "yes" : "no"]);
      }
    }
    return csv(`${slug}-scores-by-round.csv`, rows);
  }

  if (type === "final") {
    const weighted: Record<string, number> = {};
    for (const res of results) {
      if (!res) continue;
      for (const f of firms) weighted[f.id] = (weighted[f.id] ?? 0) + (res.scores[f.id]?.total ?? 0) * (ROUNDS.gradeWeights[res.round] ?? 0);
    }
    const counted = results.filter(Boolean).reduce((a, r) => a + (ROUNDS.gradeWeights[r!.round] ?? 0), 0) || 1;
    const sorted = [...firms].sort((a, b) => (weighted[b.id] ?? 0) - (weighted[a.id] ?? 0));
    const bestStudent = Math.max(0.0001, ...firms.filter((f) => !f.is_ai).map((f) => weighted[f.id] ?? 0));
    const members = await q<{ firm_id: string; name: string; email: string }>("select m.firm_id, u.name, u.email from members m join users u on u.id = m.user_id where m.game_id = $1", [g.id]);
    const rows: (string | number | null)[][] = [["team", "is_ai", "weighted_score", "rank", "pct_of_best_team", "grade_band", "student", "email", "peer_multiplier", "student_sim_score"]];
    sorted.forEach((f, i) => {
      const score = Math.round(((weighted[f.id] ?? 0) / counted) * 10) / 10;
      const pctBest = f.is_ai ? null : Math.round(((weighted[f.id] ?? 0) / bestStudent) * 1000) / 10;
      const band = pctBest === null ? "" : GRADE_BANDS.find((b) => pctBest >= b.min)!.band;
      const ms = members.filter((m) => m.firm_id === f.id);
      if (f.is_ai || !ms.length) rows.push([f.name, f.is_ai ? "yes" : "no", score, i + 1, pctBest, band, "", "", "", ""]);
      // Peer evaluation is not built yet: multiplier defaults to 1.
      for (const m of ms) rows.push([f.name, "no", score, i + 1, pctBest, band, m.name, m.email, 1, score]);
    });
    return csv(`${slug}-final-scores.csv`, rows);
  }

  if (type === "roster") {
    const members = await q<{ name: string; email: string; team: string }>("select u.name, u.email, f.name as team from members m join users u on u.id = m.user_id join firms f on f.id = m.firm_id where m.game_id = $1 order by f.name, u.name", [g.id]);
    return csv(`${slug}-roster.csv`, [["student", "email", "team"], ...members.map((m) => [m.name, m.email, m.team])]);
  }

  if (type === "reflections") {
    const rows: (string | number)[][] = [["team", "round", "reflection"]];
    for (const res of results) {
      if (!res) continue;
      for (const f of firms.filter((x) => !x.is_ai)) {
        const text = res.decisions[f.id]?.reflection;
        if (text) rows.push([f.name, ROUNDS.names[res.round], text]);
      }
    }
    return csv(`${slug}-reflections.csv`, rows);
  }

  // Change log, in plain language (no-op edits left out).
  const log = await q<RawLog & { team: string; round: number; at: string; name: string; email: string }>(
    "select c.firm_id, f.name as team, c.round, c.at, u.name, u.email, c.path, c.old_value, c.new_value from change_log c join firms f on f.id = c.firm_id join users u on u.id = c.user_id where f.game_id = $1 order by c.at",
    [g.id],
  );
  const rowsOut = readable(log, await productNames({ gameId: g.id }));
  return csv(`${slug}-change-log.csv`, [
    ["team", "round", "time", "student", "email", "change"],
    ...rowsOut.map((l) => [l.team, ROUNDS.names[Number(l.round)], new Date(l.at).toLocaleString("en-US", { timeZone: g.timezone }), l.name, l.email, `${l.name} ${l.text}`]),
  ]);
});
