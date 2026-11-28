import { HttpError, requireUser } from "@/lib/auth";
import { studentContext } from "@/lib/access";
import { getDecision } from "@/lib/game";
import { handle } from "@/lib/http";
import { avgOf, peerSettings, reviewsFor, statusOf, submitReviews, teammates, windowResults } from "@/lib/peer";
import { PEER, ROUNDS, type PeerWindowId } from "@/sim/config";

/** A student's peer evaluation screen: the open form, and their own released results. */
export const GET = handle(async () => {
  const user = await requireUser();
  const { game, firm, viewAs } = await studentContext(user);
  const ps = peerSettings(game);
  const windows = PEER.windows.map((w) => ({ id: w.id, name: w.name, weight: w.weight, status: statusOf(ps[w.id]), opensAt: ps[w.id].opensAt ?? null, closesAt: ps[w.id].closesAt ?? null, released: !!ps[w.id].released }));
  if (viewAs) return { viewAs: true, windows };
  const team = await teammates(firm.id);
  const charter = (await getDecision(firm.id, Math.min(game.current_round, ROUNDS.final))).data.strategy?.norms ?? "";
  const mine = await reviewsFor(game.id, "and (rater_id = $2 or ratee_id = $2)", [user.id]);
  const members = team.map((t) => ({ user_id: t.user_id, firm_id: firm.id }));
  const results = windows
    .filter((w) => w.released)
    .map((w) => {
      const allForTeam = mine.filter((r) => r.window_id === w.id);
      const r = windowResults(ps[w.id], allForTeam, members, w.id, w.status)[user.id];
      const got = allForTeam.filter((x) => x.ratee_id === user.id && x.rater_id !== user.id);
      const hidden = new Set(ps[w.id].hidden ?? []);
      const items = PEER.items.map((it) => {
        const v = got.map((x) => Number(x.scores[it.id])).filter((n) => n >= 1);
        const self = allForTeam.find((x) => x.rater_id === user.id && x.ratee_id === user.id);
        return { id: it.id, name: it.name, avg: v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null, self: self ? Number(self.scores[it.id]) : null };
      });
      // Comments without names, in a fixed but name-free order.
      const comments = got
        .filter((x) => !hidden.has(`${x.rater_id}:${x.ratee_id}`))
        .map((x) => ({ well: x.well, improve: x.improve }))
        .sort((a, b) => a.well.localeCompare(b.well));
      return { windowId: w.id, name: w.name, graded: w.weight > 0, received: r?.received ?? null, score: r?.score ?? null, submitted: !!r?.submitted, penalty: !r?.submitted && w.status === "closed" && !r?.override ? PEER.missPenalty : 0, overridden: !!r?.override, items, comments };
    });
  const open = windows.find((w) => w.status === "open") ?? null;
  const draft = open ? mine.filter((r) => r.window_id === open.id && r.rater_id === user.id) : [];
  return {
    viewAs: false,
    me: user.id,
    windows,
    team: team.map((t) => ({ id: t.user_id, name: t.name, self: t.user_id === user.id })),
    charter,
    open: open ? { ...open, submittedAt: draft[0]?.submitted_at ?? null, reviews: draft.map((r) => ({ rateeId: r.ratee_id, scores: r.scores, well: r.well, improve: r.improve, privateNote: r.private_note, avg: avgOf(r.scores) })) } : null,
    results,
  };
});

export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const { game, firm, viewAs } = await studentContext(user);
  if (viewAs) throw new HttpError(403, "Instructors can't submit a student's peer evaluation.");
  const b = (await req.json()) as { windowId: PeerWindowId; reviews: { rateeId: string; scores: Record<string, number>; well?: string; improve?: string; privateNote?: string }[] };
  await submitReviews(game, firm.id, user, b.windowId, b.reviews ?? []);
  return { ok: true };
});
