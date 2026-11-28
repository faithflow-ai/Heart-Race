import { HttpError, requireUser } from "@/lib/auth";
import { one, q } from "@/lib/db";
import { getFirms, type GameRow } from "@/lib/game";
import { handle } from "@/lib/http";

const MAX_TEAM_SIZE = 6;

/** GET ?code=ABC123 lists the teams; POST {code, firmId} joins one. */
export const GET = handle(async (req: Request) => {
  const u = await requireUser();
  const code = new URL(req.url).searchParams.get("code")?.trim().toUpperCase() ?? "";
  const g = await one<GameRow>("select * from games where code = $1", [code]);
  if (!g) throw new HttpError(404, "No class has that code. Check with your instructor.");
  const firms = (await getFirms(g.id)).filter((f) => !f.is_ai);
  const counts = await q<{ firm_id: string; n: number }>("select firm_id, count(*)::int as n from members where game_id = $1 group by firm_id", [g.id]);
  const cur = await one<{ firm_id: string }>("select firm_id from members where user_id = $1 and game_id = $2", [u.id, g.id]);
  return { game: { name: g.name, code: g.code }, myTeam: cur?.firm_id ?? null, teams: firms.map((f) => ({ id: f.id, name: f.name, members: counts.find((c) => c.firm_id === f.id)?.n ?? 0 })) };
});

export const POST = handle(async (req: Request) => {
  const u = await requireUser();
  const b = await req.json();
  const g = await one<GameRow>("select * from games where code = $1", [String(b.code ?? "").trim().toUpperCase()]);
  if (!g) throw new HttpError(404, "No class has that code.");
  const firm = (await getFirms(g.id)).find((f) => f.id === b.firmId && !f.is_ai);
  if (!firm) throw new HttpError(400, "Pick a team.");
  // Once on a team, a student stays there: only the instructor can move them (class screen).
  const cur = await one<{ firm_id: string }>("select firm_id from members where user_id = $1 and game_id = $2", [u.id, g.id]);
  if (cur && cur.firm_id !== firm.id) throw new HttpError(400, "You're already on a team in this class. To switch teams, ask your instructor to move you.");
  if (cur) return { ok: true };
  const n = await one<{ n: number }>("select count(*)::int as n from members where firm_id = $1", [firm.id]);
  if ((n?.n ?? 0) >= MAX_TEAM_SIZE) throw new HttpError(400, "That team is full.");
  await q("insert into members (user_id, game_id, firm_id) values ($1,$2,$3) on conflict (user_id, game_id) do update set firm_id = excluded.firm_id, joined_at = now()", [u.id, g.id, firm.id]);
  return { ok: true };
});
