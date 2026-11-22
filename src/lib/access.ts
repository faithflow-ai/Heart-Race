import { HttpError, type User } from "./auth";
import { one } from "./db";
import { getGame, processDue, type FirmRow, type GameRow } from "./game";

/** The game and team a student belongs to (their most recent class). */
export async function studentContext(user: User): Promise<{ game: GameRow; firm: FirmRow }> {
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
