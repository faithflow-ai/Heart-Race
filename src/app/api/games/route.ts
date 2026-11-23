import { isGuest, requireInstructor } from "@/lib/auth";
import { q } from "@/lib/db";
import { createGame } from "@/lib/game";
import { handle } from "@/lib/http";

export const GET = handle(async () => {
  const u = await requireInstructor();
  return { guest: isGuest(u), games: await q("select id, name, code, status, current_round, deadline, timezone from games where instructor_id = $1 or settings->'showcase'->>'guestUserId' = $1 order by created_at desc", [u.id]) };
});

export const POST = handle(async (req: Request) => {
  const u = await requireInstructor();
  const b = await req.json();
  const g = await createGame(u, String(b.name ?? ""), Number(b.teams ?? 6));
  return { game: g };
});
