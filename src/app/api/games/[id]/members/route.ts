import { HttpError, requireInstructor, setPassword } from "@/lib/auth";
import { one, q } from "@/lib/db";
import { instructorGame } from "@/lib/access";
import { handle } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

/** Move a student to another team, or remove them. */
export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const u = await requireInstructor();
  const g = await instructorGame(u, (await ctx.params).id);
  const b = await req.json();
  if (b.remove) {
    await q("delete from members where user_id = $1 and game_id = $2", [b.userId, g.id]);
    return { ok: true };
  }
  const f = await one("select id from firms where id = $1 and game_id = $2 and not is_ai", [b.firmId, g.id]);
  if (!f) throw new HttpError(404, "Team not found.");
  await q("update members set firm_id = $1 where user_id = $2 and game_id = $3", [b.firmId, b.userId, g.id]);
  return { ok: true };
});

/** Set a temporary password for a student who is locked out. */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const u = await requireInstructor();
  const g = await instructorGame(u, (await ctx.params).id);
  const b = await req.json();
  const m = await one("select 1 from members where user_id = $1 and game_id = $2", [b.userId, g.id]);
  if (!m) throw new HttpError(404, "Student not in this class.");
  await setPassword(b.userId, String(b.password ?? ""));
  return { ok: true };
});
