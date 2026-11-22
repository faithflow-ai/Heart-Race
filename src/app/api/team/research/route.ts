import { HttpError, requireUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { buyStudy, firmMeta, getFirms, latestResult } from "@/lib/game";
import { studentContext } from "@/lib/access";
import { handle } from "@/lib/http";
import { STUDIES, type StudyId } from "@/sim/config";
import { generateStudy } from "@/sim/research";

export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const { game, firm } = await studentContext(user);
  const b = await req.json();
  return { report: await buyStudy(game, firm.id, user, b.study as StudyId) };
});

export const GET = handle(async (req: Request) => {
  const user = await requireUser();
  const { game, firm, viewAs } = await studentContext(user);
  const u = new URL(req.url);
  const preview = u.searchParams.get("preview") as StudyId | null;
  if (preview) {
    // Instructor preview: build the report as this team would get it now, without buying or saving it.
    if (!viewAs) throw new HttpError(403, "Previews are for instructors.");
    if (!STUDIES[preview]) throw new HttpError(400, "Unknown study.");
    const round = Math.min(game.current_round, 7);
    const firms = (await getFirms(game.id)).map((f) => firmMeta(f, round));
    return { report: generateStudy(preview, { round, firmId: firm.id, firms, latest: await latestResult(game) }) };
  }
  const row = await one<{ data: unknown }>("select data from research_reports where firm_id = $1 and round = $2 and study = $3", [firm.id, Number(u.searchParams.get("round")), u.searchParams.get("study")]);
  return { report: row ? (typeof row.data === "string" ? JSON.parse(row.data) : row.data) : null };
});
