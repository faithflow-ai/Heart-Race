import { requireInstructor } from "@/lib/auth";
import { q } from "@/lib/db";
import { getFirms, processedRounds } from "@/lib/game";
import { instructorGame } from "@/lib/access";
import { handle } from "@/lib/http";
import { computeFlags, heatmap, type EditRow, type MemberRow, type SignalRow } from "@/lib/activity";
import { START_STEPS } from "@/sim/start";

type Ctx = { params: Promise<{ id: string }> };

/** Class heatmap and unusual activity flags (instructor only). */
export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const u = await requireInstructor();
  const g = await instructorGame(u, (await ctx.params).id);
  const teams = (await getFirms(g.id)).filter((f) => !f.is_ai).map((f) => ({ id: f.id, name: f.name }));
  const ids = teams.map((t) => t.id);
  const members = await q<MemberRow & { onboarding: unknown }>("select m.user_id, m.firm_id, u.name, m.onboarding from members m join users u on u.id = m.user_id where m.game_id = $1 order by u.name", [g.id]);
  const edits = ids.length ? await q<EditRow>("select firm_id, round, user_id, at, path from change_log where firm_id = any($1) order by at", [ids]) : [];
  const signals = ids.length ? await q<SignalRow>("select firm_id, round, user_id, at, kind, detail from activity_signals where firm_id = any($1) order by at", [ids]) : [];
  const decs = ids.length ? await q<{ firm_id: string; round: number; data: unknown }>("select firm_id, round, data from decisions where firm_id = any($1)", [ids]) : [];
  const parse = (v: unknown) => (typeof v === "string" ? JSON.parse(v) : v) as { reflection?: string; ready?: boolean };
  const reflections: Record<string, Record<number, string>> = {};
  const ready: Record<string, Record<number, boolean>> = {};
  for (const d of decs) {
    const x = parse(d.data);
    (reflections[d.firm_id] ??= {})[d.round] = x?.reflection ?? "";
    (ready[d.firm_id] ??= {})[d.round] = !!x?.ready;
  }
  const closedRounds = (await processedRounds(g.id)).map((r) => r.round);
  const lastRound = Math.min(g.current_round, 7);
  const rounds = Array.from({ length: lastRound + 1 }, (_, i) => i);
  const sig = signals.map((s) => ({ ...s, detail: (typeof s.detail === "string" ? JSON.parse(s.detail) : s.detail) as SignalRow["detail"] }));
  const flags = computeFlags({ teams, members, edits, signals: sig, reflections, closedRounds, timezone: g.timezone });
  const onboarding = Object.fromEntries(members.map((m) => {
    const o = (typeof m.onboarding === "string" ? JSON.parse(m.onboarding) : m.onboarding) as Record<string, boolean> | null;
    return [m.user_id, START_STEPS.filter((s) => o?.[s.id]).length];
  }));
  return {
    game: { id: g.id, name: g.name, current_round: g.current_round, timezone: g.timezone },
    rounds,
    closedRounds,
    startSteps: START_STEPS.length,
    onboarding,
    heatmap: heatmap({ teams, members, edits }, rounds).map((t) => ({ ...t, ready: rounds.map((r) => !!ready[t.firmId]?.[r]), reflection: rounds.map((r) => !!(reflections[t.firmId]?.[r] ?? "").trim()) })),
    flags,
  };
});
