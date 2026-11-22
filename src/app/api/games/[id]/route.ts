import { HttpError, requireInstructor } from "@/lib/auth";
import { q } from "@/lib/db";
import { firmMeta, getFirms, getResult, processedRounds, setTeamCount, settingsOf } from "@/lib/game";
import { instructorGame } from "@/lib/access";
import { deleteDemoGame, demoInfo } from "@/lib/demo";
import { handle } from "@/lib/http";
import { nextDeadline, zonedToUtc } from "@/lib/time";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const u = await requireInstructor();
  const g = await instructorGame(u, (await ctx.params).id);
  const firms = await getFirms(g.id);
  const members = await q<{ user_id: string; firm_id: string; name: string; email: string }>("select m.user_id, m.firm_id, u.name, u.email from members m join users u on u.id = m.user_id where m.game_id = $1 order by u.name", [g.id]);
  const status = await q<{ firm_id: string; edits: number; last: string }>(
    "select firm_id, count(*)::int as edits, max(at) as last from change_log where round = $1 and firm_id in (select id from firms where game_id = $2) group by firm_id",
    [g.current_round, g.id],
  );
  const rounds = await processedRounds(g.id);
  const latest = rounds.length ? await getResult(g.id, rounds[rounds.length - 1].round) : null;
  const flagged = latest
    ? firms.flatMap((f) => (latest.reports[f.id]?.concerns ?? []).filter((c) => c.title.startsWith("Ad claims")).map((c) => ({ firm: f.name, ...c })))
    : [];
  return {
    game: { ...g, settings: settingsOf(g) },
    demo: demoInfo(g),
    firms: firms.map((f) => ({
      ...f,
      effectiveLevel: firmMeta(f, Math.min(g.current_round, 7)).aiLevel,
      members: members.filter((m) => m.firm_id === f.id),
      edits: status.find((s) => s.firm_id === f.id)?.edits ?? 0,
      lastEdit: status.find((s) => s.firm_id === f.id)?.last ?? null,
      lastScore: latest?.scores[f.id] ?? null,
    })),
    rounds,
    flagged,
  };
});

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const u = await requireInstructor();
  const g = await instructorGame(u, (await ctx.params).id);
  const b = await req.json();
  if (typeof b.name === "string") await q("update games set name = $1 where id = $2", [b.name, g.id]);
  if (b.teams !== undefined) {
    if (g.current_round > 0) throw new HttpError(400, "Teams can only change before round 1.");
    await setTeamCount(g.id, Math.max(1, Math.min(7, Number(b.teams))));
  }
  if (b.schedule) {
    const { weekday, time, timezone } = b.schedule;
    if (!/^\d{2}:\d{2}$/.test(time)) throw new HttpError(400, "Time must look like 23:59.");
    await q("update games set deadline_weekday = $1, deadline_time = $2, timezone = $3 where id = $4", [Number(weekday), time, timezone, g.id]);
    if (g.status === "active") {
      const d = nextDeadline(new Date(), Number(weekday), time, timezone);
      await q("update games set deadline = $1 where id = $2", [d.toISOString(), g.id]);
    }
  }
  if (b.deadline) {
    // One-off deadline for the current round, given as local "YYYY-MM-DDTHH:MM".
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(b.deadline);
    if (!m) throw new HttpError(400, "Bad date.");
    const d = zonedToUtc(g.timezone, +m[1], +m[2], +m[3], +m[4], +m[5]);
    await q("update games set deadline = $1 where id = $2", [d.toISOString(), g.id]);
  }
  if (b.startAt !== undefined) {
    if (b.startAt === null) await q("update games set start_at = null where id = $1", [g.id]);
    else {
      const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(b.startAt);
      if (!m) throw new HttpError(400, "Pick a start date and time.");
      if (g.status !== "setup" || g.current_round > 0) throw new HttpError(400, "The game has already started.");
      const d = zonedToUtc(g.timezone, +m[1], +m[2], +m[3], +m[4], +m[5]);
      await q("update games set start_at = $1 where id = $2", [d.toISOString(), g.id]);
    }
  }
  if (b.start) {
    if (g.status !== "setup") throw new HttpError(400, "The game has already started.");
    const d = nextDeadline(new Date(), g.deadline_weekday, g.deadline_time, g.timezone);
    await q("update games set status = 'active', start_at = null, deadline = coalesce(deadline, $1) where id = $2", [d.toISOString(), g.id]);
  }
  if (b.pause !== undefined) {
    await q("update games set status = $1 where id = $2 and status <> 'done'", [b.pause ? "setup" : "active", g.id]);
  }
  if (b.weights) {
    const s = settingsOf(g);
    const w = { ...s.scorecardWeights };
    for (const k of Object.keys(w) as (keyof typeof w)[]) if (b.weights[k] !== undefined) w[k] = Number(b.weights[k]) / 100;
    const total = Object.values(w).reduce((a, x) => a + x, 0);
    if (Math.abs(total - 1) > 0.001) throw new HttpError(400, "Weights must add up to 100.");
    await q("update games set settings = $1 where id = $2", [JSON.stringify({ ...s, scorecardWeights: w }), g.id]);
  }
  if (b.budget) {
    const s = settingsOf(g);
    const mb = { ...s.marketingBudget };
    for (const k of ["earnedBase", "earnedRevenueShare", "earnedFloor", "earnedCapGrowth"] as const) if (b.budget[k] !== undefined) mb[k] = Number(b.budget[k]);
    await q("update games set settings = $1 where id = $2", [JSON.stringify({ ...s, marketingBudget: mb }), g.id]);
  }
  return { ok: true };
});

/** Delete a demo class and its fake student accounts (real classes can't be deleted here). */
export const DELETE = handle(async (_req: Request, ctx: Ctx) => {
  const u = await requireInstructor();
  await deleteDemoGame(u, (await ctx.params).id);
  return { ok: true };
});
