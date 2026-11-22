import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { budgetEstimate, getDecision, getFirms, latestResult, processedRounds } from "@/lib/game";
import { studentContext } from "@/lib/access";
import { handle } from "@/lib/http";

/** Everything a team's screens need for the open round. */
export const GET = handle(async () => {
  const user = await requireUser();
  const { game, firm } = await studentContext(user);
  const round = Math.min(game.current_round, 7);
  const { data, updated_at } = await getDecision(firm.id, round);
  const latest = await latestResult(game);
  const fs = latest?.state.firms[firm.id] ?? null;
  const members = await q<{ name: string; email: string }>("select u.name, u.email from members m join users u on u.id = m.user_id where m.firm_id = $1 order by u.name", [firm.id]);
  const firms = await getFirms(game.id);
  const reports = await q<{ round: number; study: string }>("select round, study from research_reports where firm_id = $1 order by round, study", [firm.id]);
  return {
    user,
    game: { id: game.id, name: game.name, status: game.status, round: game.current_round, deadline: game.deadline, timezone: game.timezone },
    firm: { id: firm.id, name: firm.name },
    members,
    rivals: firms.filter((f) => f.id !== firm.id).map((f) => ({ id: f.id, name: f.name })),
    decision: data,
    updatedAt: updated_at,
    budget: budgetEstimate(game, latest, firm.id, data),
    // Accepted products (components locked) and what they cost now.
    committed: fs ? Object.values(fs.products).map((p) => ({ id: p.spec.id, launchRound: p.launchRound, retired: p.retired, unitCost: p.quotedUnitCost })) : [],
    regionsEntered: fs ? fs.regions : {},
    inventory: fs ? Object.fromEntries(Object.entries(fs.inventory).map(([pid, regs]) => [pid, Object.fromEntries(Object.entries(regs).map(([r, lots]) => [r, (lots ?? []).reduce((a, l) => a + l.units, 0)]))])) : {},
    processed: await processedRounds(game.id),
    research: reports.map((r) => ({ ...r, round: Number(r.round) })),
  };
});
