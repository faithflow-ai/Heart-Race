import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { studentContext } from "@/lib/access";
import { handle } from "@/lib/http";
import { FLAG_RULES } from "@/lib/activity";

/**
 * Record an activity signal the change log can't see (for now, only a large paste into a text box).
 * Used only for the instructor's unusual activity flags. Instructors viewing a team: ignored.
 */
export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const { game, firm, viewAs } = await studentContext(user);
  if (viewAs) return { ok: true };
  const b = (await req.json()) as { kind?: string; chars?: number; field?: string };
  if (b.kind !== "paste") return { ok: true };
  const chars = Math.max(0, Math.min(1e6, Math.round(Number(b.chars) || 0)));
  if (chars < FLAG_RULES.pasteMinChars) return { ok: true };
  const field = String(b.field ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  await q("insert into activity_signals (firm_id, round, user_id, kind, detail) values ($1,$2,$3,'paste',$4)", [firm.id, game.current_round, user.id, JSON.stringify({ chars, field })]);
  return { ok: true };
});
