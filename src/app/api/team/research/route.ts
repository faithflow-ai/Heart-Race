import { requireUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { buyStudy } from "@/lib/game";
import { studentContext } from "@/lib/access";
import { handle } from "@/lib/http";
import type { StudyId } from "@/sim/config";

export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const { game, firm } = await studentContext(user);
  const b = await req.json();
  return { report: await buyStudy(game, firm.id, user, b.study as StudyId) };
});

export const GET = handle(async (req: Request) => {
  const user = await requireUser();
  const { firm } = await studentContext(user);
  const u = new URL(req.url);
  const row = await one<{ data: unknown }>("select data from research_reports where firm_id = $1 and round = $2 and study = $3", [firm.id, Number(u.searchParams.get("round")), u.searchParams.get("study")]);
  return { report: row ? (typeof row.data === "string" ? JSON.parse(row.data) : row.data) : null };
});
