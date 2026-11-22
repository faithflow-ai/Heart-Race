import { cookies } from "next/headers";
import { HttpError, requireInstructor } from "@/lib/auth";
import { one } from "@/lib/db";
import { VIEW_AS_COOKIE, instructorGame } from "@/lib/access";
import { handle } from "@/lib/http";

/** Start "View as student" for one team (read-only). */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await requireInstructor();
  const g = await instructorGame(u, (await ctx.params).id);
  const b = await req.json();
  const f = await one("select id from firms where id = $1 and game_id = $2 and not is_ai", [b.firmId, g.id]);
  if (!f) throw new HttpError(404, "Team not found.");
  (await cookies()).set(VIEW_AS_COOKIE, String(b.firmId), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 8 });
  return { ok: true };
});

/** Leave "View as student". */
export const DELETE = handle(async () => {
  await requireInstructor();
  (await cookies()).delete(VIEW_AS_COOKIE);
  return { ok: true };
});
