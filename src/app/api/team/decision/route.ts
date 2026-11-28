import { requireUser } from "@/lib/auth";
import { applyOps, type Op } from "@/lib/game";
import { studentContext } from "@/lib/access";
import { handle } from "@/lib/http";

/** Autosave: apply a batch of field edits and record them in the change log. */
export const PATCH = handle(async (req: Request) => {
  const user = await requireUser();
  const { game, firm } = await studentContext(user);
  const b = (await req.json()) as { round: number; ops: Op[] };
  const out = await applyOps(game, firm.id, Number(b.round), user, b.ops ?? []);
  return { decision: out.data, changed: out.changed, refused: out.refused, savedAt: new Date().toISOString() };
});
