import { isGuest, requireUser } from "@/lib/auth";
import { one, q } from "@/lib/db";
import { budgetEstimate, getDecision, getFirms, latestResult, processedRounds, settingsOf } from "@/lib/game";
import { studentContext } from "@/lib/access";
import { handle } from "@/lib/http";
import { stepOfPath } from "@/lib/steps";

/** Everything a team's screens need for the open round. */
export const GET = handle(async () => {
  const user = await requireUser();
  const { game, firm, viewAs } = await studentContext(user);
  const round = Math.min(game.current_round, 7);
  const { data, updated_at } = await getDecision(firm.id, round);
  const latest = await latestResult(game);
  const fs = latest?.state.firms[firm.id] ?? null;
  const members = await q<{ name: string; email: string }>("select u.name, u.email from members m join users u on u.id = m.user_id where m.firm_id = $1 order by u.name", [firm.id]);
  const firms = await getFirms(game.id);
  // Latest edit per decision step this round, for "Last edited by" on the Decisions screen.
  const edits = await q<{ path: string; at: string; name: string }>(
    "select c.path, c.at, u.name from change_log c join users u on u.id = c.user_id where c.firm_id = $1 and c.round = $2 order by c.at desc limit 400",
    [firm.id, round],
  );
  const lastEdits: Record<string, { name: string; at: string }> = {};
  for (const e of edits) {
    const step = stepOfPath(e.path);
    if (step && !lastEdits[step]) lastEdits[step] = { name: e.name, at: new Date(e.at).toISOString() };
  }
  // Start here progress (students only; instructors and guests viewing a team skip it).
  const ob = viewAs ? null : await one<{ onboarding: Record<string, boolean> }>("select onboarding from members where user_id = $1 and firm_id = $2", [user.id, firm.id]);
  const reports = await q<{ round: number; study: string }>("select round, study from research_reports where firm_id = $1 order by round, study", [firm.id]);
  return {
    user,
    viewAs: !!viewAs,
    guest: isGuest(user),
    // Class in progress: the guest can type in the fields to try them; nothing is saved.
    tryIt: isGuest(user) && !!(settingsOf(game) as unknown as { showcase?: { stopAfter?: number } }).showcase?.stopAfter,
    game: { id: game.id, name: game.name, status: game.status, round: game.current_round, deadline: game.deadline, timezone: game.timezone },
    firm: { id: firm.id, name: firm.name },
    members,
    rivals: firms.filter((f) => f.id !== firm.id).map((f) => ({ id: f.id, name: f.name })),
    decision: data,
    updatedAt: updated_at,
    budget: budgetEstimate(game, latest, firm.id, data),
    // Accepted products (components locked) and what they cost now.
    committed: fs ? Object.values(fs.products).map((p) => ({ id: p.spec.id, launchRound: p.launchRound, retired: p.retired, unitCost: p.quotedUnitCost })) : [],
    regionsEntered: fs ? fs.regions : {},
    channelsOpen: fs ? fs.channelsOpen : {},
    inventory: fs ? Object.fromEntries(Object.entries(fs.inventory).map(([pid, regs]) => [pid, Object.fromEntries(Object.entries(regs).map(([r, lots]) => [r, (lots ?? []).reduce((a, l) => a + l.units, 0)]))])) : {},
    processed: await processedRounds(game.id),
    lastEdits,
    onboarding: viewAs ? null : (ob?.onboarding ?? {}),
    research: reports.map((r) => ({ ...r, round: Number(r.round) })),
  };
});
