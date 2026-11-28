import { HttpError, requireInstructor } from "@/lib/auth";
import { instructorGame } from "@/lib/access";
import { q } from "@/lib/db";
import { getFirms } from "@/lib/game";
import { handle } from "@/lib/http";
import { combinedScore, peerSettings, reviewsFor, savePeerSettings, statusOf, windowFlags, windowResults, type PeerResult } from "@/lib/peer";
import { zonedToUtc } from "@/lib/time";
import { PEER, type PeerWindowId } from "@/sim/config";

/** "2027-03-11T09:00" in the class time zone, for a datetime-local input. */
function toLocalInput(iso: string | null | undefined, tz: string) {
  if (!iso) return "";
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
function fromLocalInput(s: string | null | undefined, tz: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(s ?? "");
  if (!m) return null;
  return zonedToUtc(tz, +m[1], +m[2], +m[3], +m[4], +m[5]).toISOString();
}

/** Instructor peer evaluation screen: window settings, every rating, flags and scores. */
export const GET = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await requireInstructor();
  const g = await instructorGame(u, (await ctx.params).id);
  const ps = peerSettings(g);
  const firms = (await getFirms(g.id)).filter((f) => !f.is_ai);
  const members = await q<{ user_id: string; firm_id: string; name: string; email: string }>("select m.user_id, m.firm_id, u.name, u.email from members m join users u on u.id = m.user_id where m.game_id = $1 order by u.name", [g.id]);
  const edits = await q<{ user_id: string; n: string }>("select c.user_id, count(*) as n from change_log c join firms f on f.id = c.firm_id where f.game_id = $1 group by c.user_id", [g.id]);
  const reviews = await reviewsFor(g.id);
  const windows = PEER.windows.map((w) => {
    const st = statusOf(ps[w.id]);
    const results = windowResults(ps[w.id], reviews, members, w.id, st);
    return {
      id: w.id, name: w.name, weight: w.weight, when: w.when, status: st,
      opensAt: ps[w.id].opensAt ?? null, closesAt: ps[w.id].closesAt ?? null,
      opensLocal: toLocalInput(ps[w.id].opensAt, g.timezone), closesLocal: toLocalInput(ps[w.id].closesAt, g.timezone),
      released: !!ps[w.id].released, hidden: ps[w.id].hidden ?? [],
      results,
      flags: windowFlags(w.id, st, results, reviews, members),
      reviews: reviews.filter((r) => r.window_id === w.id),
    };
  });
  const combined = Object.fromEntries(members.map((m) => [m.user_id, combinedScore(Object.fromEntries(windows.map((w) => [w.id, w.results[m.user_id] as PeerResult | undefined])))]));
  return {
    game: { id: g.id, name: g.name, timezone: g.timezone },
    teams: firms.map((f) => ({ id: f.id, name: f.name, members: members.filter((m) => m.firm_id === f.id).map((m) => ({ id: m.user_id, name: m.name, email: m.email, edits: Number(edits.find((e) => e.user_id === m.user_id)?.n ?? 0), combined: combined[m.user_id] })) })),
    windows,
  };
});

export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await requireInstructor();
  const g = await instructorGame(u, (await ctx.params).id);
  const b = (await req.json()) as { windowId: PeerWindowId; action: "dates" | "openNow" | "closeNow" | "release" | "hide" | "override"; opens?: string; closes?: string; released?: boolean; key?: string; hidden?: boolean; userId?: string; score?: number | null; note?: string };
  const w = PEER.windows.find((x) => x.id === b.windowId);
  if (!w) throw new HttpError(400, "Unknown evaluation.");
  const cur = peerSettings(g)[w.id];
  if (b.action === "dates") {
    const opensAt = fromLocalInput(b.opens, g.timezone);
    const closesAt = fromLocalInput(b.closes, g.timezone);
    if (!opensAt || !closesAt) throw new HttpError(400, "Pick both an opening and a closing date and time.");
    if (closesAt <= opensAt) throw new HttpError(400, "The closing time must be after the opening time.");
    await savePeerSettings(g, w.id, { opensAt, closesAt });
  } else if (b.action === "openNow") {
    const now = new Date();
    const closes = cur.closesAt && new Date(cur.closesAt) > now ? cur.closesAt : new Date(now.getTime() + 5 * 864e5).toISOString();
    await savePeerSettings(g, w.id, { opensAt: now.toISOString(), closesAt: closes });
  } else if (b.action === "closeNow") {
    if (statusOf(cur) !== "open") throw new HttpError(400, "This evaluation isn't open.");
    await savePeerSettings(g, w.id, { closesAt: new Date().toISOString() });
  } else if (b.action === "release") {
    await savePeerSettings(g, w.id, { released: !!b.released });
  } else if (b.action === "hide") {
    const set = new Set(cur.hidden ?? []);
    if (b.hidden) set.add(String(b.key));
    else set.delete(String(b.key));
    await savePeerSettings(g, w.id, { hidden: [...set] });
  } else if (b.action === "override") {
    const ov = { ...(cur.overrides ?? {}) };
    if (!b.userId) throw new HttpError(400, "Pick a student.");
    if (b.score === null || b.score === undefined || (b.score as unknown) === "") delete ov[b.userId];
    else {
      const s = Number(b.score);
      if (!(s >= 0 && s <= 100)) throw new HttpError(400, "An override is a score from 0 to 100.");
      ov[b.userId] = { score: Math.round(s * 10) / 10, note: (b.note ?? "").slice(0, 500) };
    }
    await savePeerSettings(g, w.id, { overrides: ov });
  }
  return { ok: true };
});
