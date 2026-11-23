import { requireUser } from "@/lib/auth";
import { studentContext } from "@/lib/access";
import { average, boostFromAverage, isOpen, saveSubmission, submissionsForFirm } from "@/lib/creative";
import { handle } from "@/lib/http";
import { CREATIVE } from "@/sim/config";

/** The team's creative submissions (links) for each milestone, with grades once the instructor has graded them. */
export const GET = handle(async () => {
  const user = await requireUser();
  const { game, firm } = await studentContext(user);
  const subs = await submissionsForFirm(firm.id);
  return {
    round: game.current_round,
    milestones: CREATIVE.milestones.map((m) => {
      const s = subs.find((x) => x.milestone === m.id) ?? null;
      const avg = average(s?.scores ?? null);
      return { id: m.id, open: isOpen(game, m.id), submission: s, average: avg, boost: boostFromAverage(avg) };
    }),
  };
});

export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const { game, firm } = await studentContext(user);
  const b = (await req.json()) as { milestone: string; links: Record<string, string>; note?: string };
  return { submission: await saveSubmission(game, firm.id, user, b.milestone, b.links ?? {}, b.note ?? "") };
});
