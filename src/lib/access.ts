import { cookies } from "next/headers";
import { HttpError, type User } from "./auth";
import { one } from "./db";
import { getGame, processDue, type FirmRow, type GameRow } from "./game";

/** The game and team a student belongs to (their most recent class). */
export const VIEW_AS_COOKIE = "hr_viewas";

export async function studentContext(user: User): Promise<{ game: GameRow; firm: FirmRow; viewAs?: boolean }> {
  if (user.role === "instructor") {
    // "View as student": an instructor sees one of their teams' screens, read-only.
    const firmId = (await cookies()).get(VIEW_AS_COOKIE)?.value;
    const f = firmId ? await one<FirmRow>("select f.* from firms f join games g on g.id = f.game_id where f.id = $1 and g.instructor_id = $2 and not f.is_ai", [firmId, user.id]) : null;
    if (!f) throw new HttpError(404, "Instructors: open a team from your class screen with \"View as student\".");
    await processDue(f.game_id);
    return { game: (await getGame(f.game_id))!, firm: f, viewAs: true };
  }
  const m = await one<{ game_id: string; firm_id: string }>("select game_id, firm_id from members where user_id = $1 order by joined_at desc limit 1", [user.id]);
  if (!m) throw new HttpError(404, "You haven't joined a class yet.");
  await processDue(m.game_id);
  const game = (await getGame(m.game_id))!;
  const firm = (await one<FirmRow>("select * from firms where id = $1", [m.firm_id]))!;
  return { game, firm };
}

export async function instructorGame(user: User, gameId: string): Promise<GameRow> {
  await processDue(gameId);
  const g = await getGame(gameId);
  if (!g || g.instructor_id !== user.id) throw new HttpError(404, "Class not found.");
  return g;
}
