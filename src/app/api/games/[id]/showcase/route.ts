import { requireInstructor } from "@/lib/auth";
import { handle } from "@/lib/http";
import { showcaseStep } from "@/lib/showcase";

export const maxDuration = 60;

/** Play and score the next round of a showcase class. */
export const POST = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await requireInstructor();
  return await showcaseStep(u, (await ctx.params).id);
});
