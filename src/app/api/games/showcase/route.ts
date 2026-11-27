import { requireInstructor } from "@/lib/auth";
import { handle } from "@/lib/http";
import { createShowcase } from "@/lib/showcase";

export const maxDuration = 60;

/** Create a showcase class (no rounds played yet; the page then plays them one at a time). */
export const POST = handle(async () => {
  const u = await requireInstructor();
  return await createShowcase(u);
});
