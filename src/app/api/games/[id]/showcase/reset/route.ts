import { requireInstructor } from "@/lib/auth";
import { handle } from "@/lib/http";
import { resetShowcase } from "@/lib/showcase";

export const maxDuration = 60;

/** Start both showcase classes over at the Practice round (same teams and guest login); the page then replays them. */
export const POST = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await requireInstructor();
  return await resetShowcase(u, (await ctx.params).id);
});
