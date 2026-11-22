import { requireInstructor } from "@/lib/auth";
import { createDemoGame } from "@/lib/demo";
import { handle } from "@/lib/http";

// Building the demo plays three rounds, which can take a little while on the free tier.
export const maxDuration = 60;

/** Create a demo class with fake students and three processed rounds. */
export const POST = handle(async () => {
  const u = await requireInstructor();
  const g = await createDemoGame(u);
  return { game: g };
});
