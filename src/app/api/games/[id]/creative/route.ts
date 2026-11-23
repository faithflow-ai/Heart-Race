import { HttpError, requireInstructor } from "@/lib/auth";
import { instructorGame } from "@/lib/access";
import { average, boostFromAverage, gradeSubmission, submissionsForGame } from "@/lib/creative";
import { getDecision, getFirms } from "@/lib/game";
import { handle } from "@/lib/http";
import { ROUNDS } from "@/sim/config";

/** Instructor grading screen data: every student team's submissions for every milestone. */
export const GET = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await requireInstructor();
  const g = await instructorGame(u, (await ctx.params).id);
  const firms = (await getFirms(g.id)).filter((f) => !f.is_ai);
  const subs = await submissionsForGame(g.id);
  const round = Math.min(g.current_round, ROUNDS.final);
  const teams = [];
  for (const f of firms) {
    const d = (await getDecision(f.id, round)).data;
    teams.push({
      id: f.id,
      name: f.name,
      targets: d.strategy.targetSegments,
      positioning: d.strategy.positioning,
      campaigns: d.products.map((p) => ({ name: p.name, ...p.campaign, claims: p.claims })),
      submissions: subs.filter((s) => s.firm_id === f.id).map((s) => ({ ...s, average: average(s.scores), boost: boostFromAverage(average(s.scores)) })),
    });
  }
  return { game: { id: g.id, name: g.name, round: g.current_round }, teams };
});

export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await requireInstructor();
  const g = await instructorGame(u, (await ctx.params).id);
  const b = (await req.json()) as { firmId: string; milestone: string; scores: Record<string, number>; feedback?: string };
  const firm = (await getFirms(g.id)).find((f) => f.id === b.firmId && !f.is_ai);
  if (!firm) throw new HttpError(404, "Team not found.");
  await gradeSubmission(firm.id, b.milestone, b.scores ?? {}, b.feedback ?? "");
  return { ok: true };
});
