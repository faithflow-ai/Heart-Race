import { HttpError, requireInstructor } from "@/lib/auth";
import { one, q } from "@/lib/db";
import { instructorGame } from "@/lib/access";
import { handle } from "@/lib/http";

/** Rename a team, or set an AI rival's level and style. */
export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await requireInstructor();
  const g = await instructorGame(u, (await ctx.params).id);
  const b = await req.json();
  const f = await one<{ id: string; is_ai: boolean }>("select id, is_ai from firms where id = $1 and game_id = $2", [b.firmId, g.id]);
  if (!f) throw new HttpError(404, "Firm not found.");
  if (typeof b.name === "string" && b.name.trim()) await q("update firms set name = $1 where id = $2", [b.name.trim(), f.id]);
  if (f.is_ai && b.aiLevel !== undefined) await q("update firms set ai_level = $1 where id = $2", [b.aiLevel === null || b.aiLevel === "" ? null : Math.max(0, Math.min(10, Number(b.aiLevel))), f.id]);
  if (f.is_ai && b.aiStyle) await q("update firms set ai_style = $1 where id = $2", [b.aiStyle, f.id]);
  return { ok: true };
});
