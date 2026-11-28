import { requireInstructor } from "@/lib/auth";
import { q } from "@/lib/db";
import { getFirms, getResult, processedRounds } from "@/lib/game";
import { instructorGame } from "@/lib/access";
import { csv, handle } from "@/lib/http";
import { productNames, readable, type RawLog } from "@/lib/logtext";
import { GRADE_BANDS, PEER, ROUNDS } from "@/sim/config";
import { avgOf, combinedScore, peerSettings, reviewsFor, statusOf, windowResults } from "@/lib/peer";

/** CSV exports for the gradebook: scores, final, roster, reflections, log. */
export const GET = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await requireInstructor();
  const g = await instructorGame(u, (await ctx.params).id);
  const type = new URL(req.url).searchParams.get("type") ?? "scores";
  const firms = await getFirms(g.id);
  const rounds = await processedRounds(g.id);
  const results = await Promise.all(rounds.map((r) => getResult(g.id, r.round)));
  const slug = g.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();

  if (type === "scores") {
    const rows: (string | number | null)[][] = [["team", "is_ai", "round", "total_score", "rank", "market", "customer", "financial", "channel", "goals", "operating_profit", "revenue", "carried_forward"]];
    for (const res of results) {
      if (!res || res.round < 1) continue;
      for (const f of firms) {
        const s = res.scores[f.id];
        const rep = res.reports[f.id];
        if (!s) continue;
        rows.push([f.name, f.is_ai ? "yes" : "no", ROUNDS.names[res.round], s.total, s.rank, s.points.market, s.points.customer, s.points.financial, s.points.channel, s.points.goals, rep.pnl.operatingProfit, rep.pnl.revenue, rep.carriedForward ? "yes" : "no"]);
      }
    }
    return csv(`${slug}-scores-by-round.csv`, rows);
  }

  if (type === "final") {
    const weighted: Record<string, number> = {};
    for (const res of results) {
      if (!res) continue;
      for (const f of firms) weighted[f.id] = (weighted[f.id] ?? 0) + (res.scores[f.id]?.total ?? 0) * (ROUNDS.gradeWeights[res.round] ?? 0);
    }
    const counted = results.filter(Boolean).reduce((a, r) => a + (ROUNDS.gradeWeights[r!.round] ?? 0), 0) || 1;
    const sorted = [...firms].sort((a, b) => (weighted[b.id] ?? 0) - (weighted[a.id] ?? 0));
    const bestStudent = Math.max(0.0001, ...firms.filter((f) => !f.is_ai).map((f) => weighted[f.id] ?? 0));
    const members = await q<{ user_id: string; firm_id: string; name: string; email: string }>("select m.user_id, m.firm_id, u.name, u.email from members m join users u on u.id = m.user_id where m.game_id = $1", [g.id]);
    // Peer evaluation: each graded window's score and the combined peer score (0 to 100).
    const ps = peerSettings(g);
    const reviews = await reviewsFor(g.id);
    const graded = PEER.windows.filter((w) => w.weight > 0);
    const perWindow = Object.fromEntries(graded.map((w) => [w.id, windowResults(ps[w.id], reviews, members, w.id, statusOf(ps[w.id]))]));
    const peerShare = PEER.shareOfSimGrade;
    const rows: (string | number | null)[][] = [["team", "is_ai", "weighted_score", "rank", "pct_of_best_team", "grade_band", "student", "email", ...graded.map((w) => `peer_${w.id}`), "peer_score", "student_sim_score", "student_grade_band"]];
    sorted.forEach((f, i) => {
      const score = Math.round(((weighted[f.id] ?? 0) / counted) * 10) / 10;
      const pctBest = f.is_ai ? null : Math.round(((weighted[f.id] ?? 0) / bestStudent) * 1000) / 10;
      const band = pctBest === null ? "" : GRADE_BANDS.find((b) => pctBest >= b.min)!.band;
      const ms = members.filter((m) => m.firm_id === f.id);
      if (f.is_ai || !ms.length) rows.push([f.name, f.is_ai ? "yes" : "no", score, i + 1, pctBest, band, "", "", ...graded.map(() => ""), "", "", ""]);
      // Student sim score = team part (percent of best team, capped at 100) x 80% + peer score x 20%.
      // With no peer score yet, the team part alone counts.
      for (const m of ms) {
        const wins = graded.map((w) => perWindow[w.id][m.user_id]?.score ?? null);
        const peer = combinedScore(Object.fromEntries(graded.map((w) => [w.id, perWindow[w.id][m.user_id]])));
        const team = Math.min(100, pctBest ?? 0);
        const student = Math.round((peer === null ? team : team * (1 - peerShare) + peer * peerShare) * 10) / 10;
        rows.push([f.name, "no", score, i + 1, pctBest, band, m.name, m.email, ...wins, peer, student, GRADE_BANDS.find((b) => student >= b.min)!.band]);
      }
    });
    return csv(`${slug}-final-scores.csv`, rows);
  }

  if (type === "roster") {
    const members = await q<{ name: string; email: string; team: string }>("select u.name, u.email, f.name as team from members m join users u on u.id = m.user_id join firms f on f.id = m.firm_id where m.game_id = $1 order by f.name, u.name", [g.id]);
    return csv(`${slug}-roster.csv`, [["student", "email", "team"], ...members.map((m) => [m.name, m.email, m.team])]);
  }

  if (type === "reflections") {
    const rows: (string | number)[][] = [["team", "round", "reflection"]];
    for (const res of results) {
      if (!res) continue;
      for (const f of firms.filter((x) => !x.is_ai)) {
        const text = res.decisions[f.id]?.reflection;
        if (text) rows.push([f.name, ROUNDS.names[res.round], text]);
      }
    }
    return csv(`${slug}-reflections.csv`, rows);
  }

  if (type === "peer") {
    const members = await q<{ user_id: string; name: string; email: string }>("select m.user_id, u.name, u.email from members m join users u on u.id = m.user_id where m.game_id = $1", [g.id]);
    const who = (id: string) => members.find((m) => m.user_id === id);
    const reviews = await reviewsFor(g.id);
    const rows: (string | number | null)[][] = [["evaluation", "team", "rater", "rater_email", "rated", "rated_email", "self_rating", ...PEER.items.map((i) => i.id), "average", "did_well", "could_improve", "private_note_to_instructor", "submitted"]];
    for (const w of PEER.windows) {
      for (const r of reviews.filter((x) => x.window_id === w.id)) {
        const a = avgOf(r.scores);
        rows.push([w.name, firms.find((f) => f.id === r.firm_id)?.name ?? "", who(r.rater_id)?.name ?? "", who(r.rater_id)?.email ?? "", who(r.ratee_id)?.name ?? "", who(r.ratee_id)?.email ?? "", r.rater_id === r.ratee_id ? "yes" : "no", ...PEER.items.map((i) => r.scores[i.id] ?? null), a === null ? null : Math.round(a * 10) / 10, r.well, r.improve, r.private_note, new Date(r.submitted_at).toLocaleString("en-US", { timeZone: g.timezone })]);
      }
    }
    return csv(`${slug}-peer-evaluations.csv`, rows);
  }

  // Change log, in plain language (no-op edits left out).
  const log = await q<RawLog & { team: string; round: number; at: string; name: string; email: string }>(
    "select c.firm_id, f.name as team, c.round, c.at, u.name, u.email, c.path, c.old_value, c.new_value from change_log c join firms f on f.id = c.firm_id join users u on u.id = c.user_id where f.game_id = $1 order by c.at",
    [g.id],
  );
  const rowsOut = readable(log, await productNames({ gameId: g.id }));
  return csv(`${slug}-change-log.csv`, [
    ["team", "round", "time", "student", "email", "change"],
    ...rowsOut.map((l) => [l.team, ROUNDS.names[Number(l.round)], new Date(l.at).toLocaleString("en-US", { timeZone: g.timezone }), l.name, l.email, `${l.name} ${l.text}`]),
  ]);
});
