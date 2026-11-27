import { HttpError, requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { studentContext } from "@/lib/access";
import { handle } from "@/lib/http";
import { START_STEPS } from "@/sim/start";

/** Mark one Start here step done for the signed-in student. Instructors viewing a team: no-op. */
export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const { firm, viewAs } = await studentContext(user);
  const b = await req.json();
  const step = String(b.step ?? "");
  if (!START_STEPS.some((s) => s.id === step)) throw new HttpError(400, "Unknown step.");
  if (viewAs) return { ok: true };
  await q("update members set onboarding = onboarding || jsonb_build_object($1::text, true) where user_id = $2 and firm_id = $3", [step, user.id, firm.id]);
  return { ok: true };
});
