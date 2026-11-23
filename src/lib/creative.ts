/**
 * Creative work: teams submit links to their creative brief, ads, videos and landing page at three
 * milestones. The instructor grades each submission with a rubric; the average score becomes a
 * creative quality boost to the team's campaign in the rounds that follow.
 */
import { CREATIVE, type MilestoneId } from "@/sim/config";
import { HttpError, type User } from "./auth";
import { one, q } from "./db";
import type { GameRow } from "./game";

export interface Submission {
  firm_id: string;
  milestone: MilestoneId;
  links: Record<string, string>;
  note: string;
  submitted_by: string | null;
  submitted_by_name?: string | null;
  submitted_at: string | null;
  scores: Record<string, number> | null;
  feedback: string;
  graded_at: string | null;
}

const parse = <T>(v: unknown): T => (typeof v === "string" ? JSON.parse(v) : v) as T;

function clean(row: Record<string, unknown>): Submission {
  return {
    firm_id: String(row.firm_id),
    milestone: row.milestone as MilestoneId,
    links: parse<Record<string, string>>(row.links) ?? {},
    note: String(row.note ?? ""),
    submitted_by: (row.submitted_by as string) ?? null,
    submitted_by_name: (row.submitted_by_name as string) ?? null,
    submitted_at: row.submitted_at ? String(row.submitted_at) : null,
    scores: row.scores ? parse<Record<string, number>>(row.scores) : null,
    feedback: String(row.feedback ?? ""),
    graded_at: row.graded_at ? String(row.graded_at) : null,
  };
}

export function milestone(id: string) {
  const m = CREATIVE.milestones.find((x) => x.id === id);
  if (!m) throw new HttpError(400, "Unknown milestone.");
  return m;
}

/** Average rubric score (1-5), or null if not graded. */
export function average(scores: Record<string, number> | null): number | null {
  if (!scores) return null;
  const vals = CREATIVE.rubric.map((r) => Number(scores[r.id])).filter((v) => v >= 1 && v <= 5);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

export function boostFromAverage(avg: number | null): number {
  return avg === null ? 0 : (avg - 3) * CREATIVE.boostPerPoint;
}

export async function submissionsForFirm(firmId: string): Promise<Submission[]> {
  const rows = await q<Record<string, unknown>>(
    "select s.*, u.name as submitted_by_name from creative_submissions s left join users u on u.id = s.submitted_by where s.firm_id = $1",
    [firmId],
  );
  return rows.map(clean);
}

export async function submissionsForGame(gameId: string): Promise<Submission[]> {
  const rows = await q<Record<string, unknown>>(
    "select s.*, u.name as submitted_by_name from creative_submissions s join firms f on f.id = s.firm_id left join users u on u.id = s.submitted_by where f.game_id = $1",
    [gameId],
  );
  return rows.map(clean);
}

/** Students can submit or update a milestone until that round's deadline has been processed. */
export function isOpen(g: GameRow, milestoneId: string) {
  return g.current_round <= milestone(milestoneId).round && g.status !== "done";
}

function validLink(u: string) {
  if (!u) return true;
  try {
    const url = new URL(u);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export async function saveSubmission(g: GameRow, firmId: string, user: User, milestoneId: string, links: Record<string, string>, note: string) {
  if (user.role === "instructor") throw new HttpError(403, "View as student is read-only.");
  const m = milestone(milestoneId);
  if (!isOpen(g, m.id)) throw new HttpError(409, `${m.title} closed at the ${m.round === 7 ? "Final round" : "Round " + m.round} deadline.`);
  const clean: Record<string, string> = {};
  for (const item of m.items) {
    const v = String(links[item.id] ?? "").trim().slice(0, 1000);
    if (!validLink(v)) throw new HttpError(400, `"${item.label}" needs a full link starting with https://`);
    if (v) clean[item.id] = v;
  }
  await q(
    `insert into creative_submissions (firm_id, milestone, links, note, submitted_by, submitted_at)
     values ($1,$2,$3,$4,$5, now())
     on conflict (firm_id, milestone) do update set links = excluded.links, note = excluded.note, submitted_by = excluded.submitted_by, submitted_at = now()`,
    [firmId, m.id, JSON.stringify(clean), String(note ?? "").slice(0, 4000), user.id],
  );
  return (await submissionsForFirm(firmId)).find((s) => s.milestone === m.id)!;
}

export async function gradeSubmission(firmId: string, milestoneId: string, scores: Record<string, number>, feedback: string) {
  const m = milestone(milestoneId);
  const clean: Record<string, number> = {};
  for (const r of CREATIVE.rubric) {
    const v = Number(scores[r.id]);
    if (!(v >= 1 && v <= 5)) throw new HttpError(400, `Give "${r.name}" a score from 1 to 5.`);
    clean[r.id] = Math.round(v);
  }
  const exists = await one("select 1 from creative_submissions where firm_id = $1 and milestone = $2", [firmId, m.id]);
  if (!exists) await q("insert into creative_submissions (firm_id, milestone, links, note) values ($1,$2,'{}'::jsonb,'')", [firmId, m.id]);
  await q("update creative_submissions set scores = $1, feedback = $2, graded_at = now() where firm_id = $3 and milestone = $4", [JSON.stringify(clean), String(feedback ?? "").slice(0, 4000), firmId, m.id]);
}

/**
 * Creative boost for each firm in a round: from the most recent graded milestone whose round is
 * before this one (e.g. the Round 1 launch grade lifts Rounds 2 to 4).
 */
export async function creativeBoosts(gameId: string, round: number): Promise<Record<string, number>> {
  const subs = await submissionsForGame(gameId);
  const out: Record<string, number> = {};
  const order = [...CREATIVE.milestones].sort((a, b) => b.round - a.round);
  const byFirm = new Map<string, Submission[]>();
  for (const s of subs) byFirm.set(s.firm_id, [...(byFirm.get(s.firm_id) ?? []), s]);
  for (const [fid, list] of byFirm) {
    for (const m of order) {
      if (m.round >= round) continue;
      const s = list.find((x) => x.milestone === m.id);
      const avg = average(s?.scores ?? null);
      if (avg !== null) {
        out[fid] = boostFromAverage(avg);
        break;
      }
    }
  }
  return out;
}
