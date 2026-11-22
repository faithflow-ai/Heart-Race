import { requireInstructor } from "@/lib/auth";
import { processCurrentRound } from "@/lib/game";
import { instructorGame } from "@/lib/access";
import { handle } from "@/lib/http";

export const POST = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await requireInstructor();
  const g = await instructorGame(u, (await ctx.params).id);
  const r = await processCurrentRound(g);
  return { processed: r.round };
});
