import { requireUser } from "@/lib/auth";
import { getDecision, getFirms, latestResult, projection } from "@/lib/game";
import { studentContext } from "@/lib/access";
import { handle } from "@/lib/http";

/** Planning tool: projected sales and profit for the current draft. */
export const POST = handle(async () => {
  const user = await requireUser();
  const { game, firm } = await studentContext(user);
  const { data } = await getDecision(firm.id, game.current_round);
  return { projection: await projection(game, await getFirms(game.id), await latestResult(game), firm.id, data) };
});
