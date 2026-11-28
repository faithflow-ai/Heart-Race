import { HttpError, type User } from "./auth";
import { q } from "./db";
import { settingsOf, type GameRow } from "./game";
import { PEER, type PeerWindowId } from "@/sim/config";

/**
 * Peer evaluation. Each student rates every teammate and themselves on the
 * PEER.items criteria (1 to 10), with one thing done well and one thing to
 * improve for each teammate. Self-ratings never count toward a grade.
 *
 * Window settings (dates, release, hidden comments, overrides) are stored in
 * games.settings.peer.windows[windowId]; the ratings are in peer_reviews.
 */
export interface PeerWindowSettings {
  opensAt?: string | null;
  closesAt?: string | null;
  released?: boolean;
  /** Comments the instructor hid from the student view: "raterId:rateeId". */
  hidden?: string[];
  /** Instructor overrides of a student's score for this window (0 to 100). */
  overrides?: Record<string, { score: number; note: string }>;
}
export type PeerStatus = "not_set" | "scheduled" | "open" | "closed";

export interface ReviewRow {
  window_id: string;
  firm_id: string;
  rater_id: string;
  ratee_id: string;
  scores: Record<string, number>;
  well: string;
  improve: string;
  private_note: string;
  submitted_at: string;
}

export function peerSettings(g: GameRow): Record<PeerWindowId, PeerWindowSettings> {
  const s = (settingsOf(g) as unknown as { peer?: { windows?: Partial<Record<PeerWindowId, PeerWindowSettings>> } }).peer?.windows ?? {};
  return Object.fromEntries(PEER.windows.map((w) => [w.id, { hidden: [], overrides: {}, ...(s[w.id] ?? {}) }])) as Record<PeerWindowId, PeerWindowSettings>;
}

export async function savePeerSettings(g: GameRow, windowId: PeerWindowId, patch: Partial<PeerWindowSettings>) {
  const all = peerSettings(g);
  all[windowId] = { ...all[windowId], ...patch };
  const s = settingsOf(g) as unknown as Record<string, unknown>;
  await q("update games set settings = $1 where id = $2", [JSON.stringify({ ...s, peer: { windows: all } }), g.id]);
}

export function statusOf(w: PeerWindowSettings, now = Date.now()): PeerStatus {
  if (!w.opensAt || !w.closesAt) return "not_set";
  if (now < new Date(w.opensAt).getTime()) return "scheduled";
  if (now < new Date(w.closesAt).getTime()) return "open";
  return "closed";
}

export const avgOf = (scores: Record<string, number> | null | undefined) => {
  const v = PEER.items.map((i) => Number(scores?.[i.id])).filter((n) => n >= 1);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};
const round1 = (n: number) => Math.round(n * 10) / 10;

export async function teammates(firmId: string) {
  return q<{ user_id: string; name: string; email: string }>("select m.user_id, u.name, u.email from members m join users u on u.id = m.user_id where m.firm_id = $1 order by u.name", [firmId]);
}

export async function reviewsFor(gameId: string, where = "", params: unknown[] = []) {
  return q<ReviewRow>(`select window_id, firm_id, rater_id, ratee_id, scores, well, improve, private_note, submitted_at from peer_reviews where game_id = $1 ${where}`, [gameId, ...params]);
}

/** Save one student's whole evaluation for a window (all teammates plus self). */
export async function submitReviews(
  game: GameRow,
  firmId: string,
  user: User,
  windowId: PeerWindowId,
  reviews: { rateeId: string; scores: Record<string, number>; well?: string; improve?: string; privateNote?: string }[],
) {
  if (!PEER.windows.some((w) => w.id === windowId)) throw new HttpError(400, "Unknown evaluation.");
  if (statusOf(peerSettings(game)[windowId]) !== "open") throw new HttpError(400, "This evaluation isn't open right now.");
  const team = await teammates(firmId);
  for (const t of team) {
    const r = reviews.find((x) => x.rateeId === t.user_id);
    const who = t.user_id === user.id ? "yourself" : t.name;
    if (!r) throw new HttpError(400, `Please rate ${who}.`);
    for (const it of PEER.items) {
      const n = Number(r.scores?.[it.id]);
      if (!Number.isInteger(n) || n < PEER.scale.min || n > PEER.scale.max) throw new HttpError(400, `Please give ${who} a score from 1 to 10 for "${it.name}".`);
    }
    if (t.user_id !== user.id && (!(r.well ?? "").trim() || !(r.improve ?? "").trim())) throw new HttpError(400, `Please write one thing ${t.name} did well and one thing they could improve.`);
  }
  for (const t of team) {
    const r = reviews.find((x) => x.rateeId === t.user_id)!;
    const scores = Object.fromEntries(PEER.items.map((i) => [i.id, Number(r.scores[i.id])]));
    await q(
      `insert into peer_reviews (game_id, window_id, firm_id, rater_id, ratee_id, scores, well, improve, private_note, submitted_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9, now())
       on conflict (game_id, window_id, rater_id, ratee_id) do update set firm_id = $3, scores = $6, well = $7, improve = $8, private_note = $9, submitted_at = now()`,
      [game.id, windowId, firmId, user.id, t.user_id, JSON.stringify(scores), (r.well ?? "").trim().slice(0, 2000), (r.improve ?? "").trim().slice(0, 2000), (r.privateNote ?? "").trim().slice(0, 2000)],
    );
  }
}

export interface PeerResult {
  /** Average score from teammates (1 to 10), self-ratings left out. */
  received: number | null;
  raters: number;
  selfAvg: number | null;
  submitted: boolean;
  /** Score before any override: received x 10, minus the penalty for not submitting. */
  computed: number | null;
  override: { score: number; note: string } | null;
  /** What counts: the override if there is one, else computed. */
  score: number | null;
}

/** Peer results for every student in one window. */
export function windowResults(w: PeerWindowSettings, reviews: ReviewRow[], members: { user_id: string; firm_id: string }[], windowId: string, status: PeerStatus) {
  const out: Record<string, PeerResult> = {};
  const rv = reviews.filter((r) => r.window_id === windowId);
  for (const m of members) {
    const given = rv.filter((r) => r.rater_id === m.user_id);
    const got = rv.filter((r) => r.ratee_id === m.user_id && r.rater_id !== m.user_id && r.firm_id === m.firm_id);
    const avgs = got.map((r) => avgOf(r.scores)).filter((x): x is number => x !== null);
    const received = avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : null;
    const self = given.find((r) => r.ratee_id === m.user_id);
    const submitted = given.length > 0;
    const missed = !submitted && status === "closed";
    const computed = received === null ? null : Math.max(0, round1(received * 10 - (missed ? PEER.missPenalty : 0)));
    const override = w.overrides?.[m.user_id] ?? null;
    out[m.user_id] = { received: received === null ? null : round1(received), raters: avgs.length, selfAvg: self ? round1(avgOf(self.scores) ?? 0) : null, submitted, computed, override, score: override ? override.score : computed };
  }
  return out;
}

/** Combined peer score (0 to 100) across the graded windows, weighted by PEER.windows[].weight. */
export function combinedScore(perWindow: Partial<Record<PeerWindowId, PeerResult | undefined>>) {
  let sum = 0;
  let wsum = 0;
  for (const w of PEER.windows) {
    const s = perWindow[w.id]?.score;
    if (w.weight > 0 && s !== null && s !== undefined) {
      sum += s * w.weight;
      wsum += w.weight;
    }
  }
  return wsum ? round1(sum / wsum) : null;
}

export interface PeerFlag { windowId: string; firmId: string; userId: string; kind: "low" | "self" | "same" | "missing"; text: string }

/** Things worth a closer look. Not proof of anything. */
export function windowFlags(windowId: string, status: PeerStatus, results: Record<string, PeerResult>, reviews: ReviewRow[], members: { user_id: string; firm_id: string; name: string }[]): PeerFlag[] {
  const flags: PeerFlag[] = [];
  if (status === "not_set" || status === "scheduled") return flags;
  const rv = reviews.filter((r) => r.window_id === windowId);
  for (const m of members) {
    const r = results[m.user_id];
    if (!r) continue;
    const base = { windowId, firmId: m.firm_id, userId: m.user_id };
    if (!r.submitted) flags.push({ ...base, kind: "missing", text: `${m.name} hasn't submitted${status === "closed" ? ` (−${PEER.missPenalty} points)` : " yet"}.` });
    if (r.received !== null && r.received < PEER.flags.low) flags.push({ ...base, kind: "low", text: `${m.name} averaged ${r.received.toFixed(1)} from teammates (under ${PEER.flags.low}).` });
    if (r.received !== null && r.selfAvg !== null && r.selfAvg - r.received >= PEER.flags.selfGap)
      flags.push({ ...base, kind: "self", text: `${m.name} rated themselves ${r.selfAvg.toFixed(1)}, but teammates gave ${r.received.toFixed(1)}.` });
    const given = rv.filter((x) => x.rater_id === m.user_id && x.ratee_id !== m.user_id).flatMap((x) => PEER.items.map((i) => x.scores[i.id]));
    if (given.length >= PEER.items.length && new Set(given).size === 1) flags.push({ ...base, kind: "same", text: `${m.name} gave every teammate ${given[0]} on every item.` });
  }
  return flags;
}

/** For the nav and Home: is an evaluation waiting for this student? */
export async function peerNotice(game: GameRow, userId: string) {
  const ps = peerSettings(game);
  const open = PEER.windows.find((w) => statusOf(ps[w.id]) === "open");
  if (!open) return null;
  const done = await q("select 1 from peer_reviews where game_id = $1 and window_id = $2 and rater_id = $3 limit 1", [game.id, open.id, userId]);
  return { windowId: open.id, name: open.name, closesAt: ps[open.id].closesAt ?? null, submitted: done.length > 0 };
}
