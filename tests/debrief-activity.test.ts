import { describe, expect, it } from "vitest";
import { runRound, makeAiFirms } from "../src/sim/run";
import type { RoundResult } from "../src/sim/types";
import { debriefRound, debriefSeason, goalOnTarget } from "../src/lib/debrief";
import { computeFlags, heatmap, pace, saveTimes, type EditRow } from "../src/lib/activity";

function season() {
  const firms = makeAiFirms(8, 0);
  const results: RoundResult[] = [];
  let prev: RoundResult | null = null;
  for (let r = 0; r <= 3; r++) {
    prev = runRound({ round: r, seed: 7, firms, prevResult: prev, studentDecisions: {} });
    results.push(prev);
  }
  return { firms: firms.map((f) => ({ id: f.id, name: f.name, is_ai: f.isAi, slot: f.slot })), results };
}

describe("debrief", () => {
  const { firms, results } = season();
  it("builds every slide's numbers for a scored round", () => {
    const d = debriefRound(results[3], results[2], firms);
    expect(d.leaderboard).toHaveLength(8);
    expect(d.leaderboard.map((x) => x.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(d.leaderboard.every((x) => x.prevRank !== null)).toBe(true);
    expect(d.segments).toHaveLength(5);
    expect(d.market.unitsSold).toBeGreaterThan(0);
    expect(d.market.unitsSold).toBeLessThanOrEqual(d.market.buyers);
    for (const s of d.segments) for (const l of s.leaders) expect(l.share).toBeLessThanOrEqual(1);
    for (const p of d.pushPull) if (p.tradeShare !== null) expect(p.tradeShare).toBeGreaterThanOrEqual(0);
    expect(d.moments.length).toBeGreaterThan(0);
    // Moments are observations, never advice.
    for (const m of d.moments) expect(m).not.toMatch(/\b(should|must|try|need to)\b/i);
  });
  it("has no previous ranks after Round 1 (Practice isn't scored)", () => {
    const d = debriefRound(results[1], results[0], firms);
    expect(d.leaderboard.every((x) => x.prevRank === null)).toBe(true);
  });
  it("Round 1 adds the launch comparison: the top AI rival first, then each student team", () => {
    // Treat the last two firms as student teams for this check.
    const mixed = firms.map((f, i) => (i >= 6 ? { ...f, is_ai: false } : f));
    const d = debriefRound(results[1], results[0], mixed);
    expect(d.launch).toBeDefined();
    const rows = d.launch!;
    expect(rows).toHaveLength(3);
    expect(rows[0].isAi).toBe(true);
    const bestAi = Math.max(...mixed.filter((f) => f.is_ai).map((f) => results[1].scores[f.id].total));
    expect(rows[0].total).toBe(bestAi);
    expect(rows[0].regions.length).toBeGreaterThan(0);
    expect(rows[0].fit).not.toBeNull();
    expect(debriefRound(results[2], results[1], mixed).launch).toBeUndefined();
  });
  it("season covers scored rounds only", () => {
    const s = debriefSeason(results, firms);
    expect(s.rounds).toEqual([1, 2, 3]);
    expect(s.firms[0].totals).toHaveLength(3);
  });
  it("goal on target rule", () => {
    expect(goalOnTarget("revenue", 1_000_000, 1_080_000)).toBe(true);
    expect(goalOnTarget("revenue", 1_000_000, 1_200_000)).toBe(false);
    expect(goalOnTarget("margin", 20, 21.5)).toBe(true);
    expect(goalOnTarget("margin", null, 20)).toBe(false);
  });
});

describe("activity flags", () => {
  const teams = [{ id: "A", name: "Alpha" }, { id: "B", name: "Beta" }];
  const members = [
    { user_id: "a1", firm_id: "A", name: "Ana" }, { user_id: "a2", firm_id: "A", name: "Ben" },
    { user_id: "b1", firm_id: "B", name: "Cy" }, { user_id: "b2", firm_id: "B", name: "Di" },
  ];
  const t0 = Date.parse("2027-01-20T20:00:00Z"); // noon Pacific
  const at = (sec: number) => new Date(t0 + sec * 1000).toISOString();
  // Team A: one person, 30 fields, ~4 seconds apart.
  const agent: EditRow[] = Array.from({ length: 30 }, (_, i) => ({ firm_id: "A", round: 2, user_id: "a1", at: at(i * 4 + (i % 2) * 0.3), path: `f${i}` }));
  // Team B: two people, irregular gaps, spread over two evenings.
  const gaps = [5, 40, 12, 90, 7, 3, 60, 25, 8, 110, 15, 4, 70, 30, 9, 45, 20, 6, 80, 11];
  let s = 0;
  const human: EditRow[] = gaps.map((g, i) => ({ firm_id: "B", round: 2, user_id: i % 3 ? "b1" : "b2", at: at((s += g) + (i > 10 ? 86400 : 0)), path: `f${i}` }));
  const base = { teams, members, edits: [...agent, ...human], reflections: { A: { 1: "ok" }, B: { 1: "" } }, closedRounds: [0, 1], timezone: "America/Los_Angeles" };

  it("flags agent-like entry and explains why", () => {
    const flags = computeFlags({ ...base, signals: [{ firm_id: "A", round: 2, user_id: "a1", at: at(200), kind: "paste", detail: { chars: 900, field: "Round reflection" } }] });
    const a = flags.filter((f) => f.firmId === "A").map((f) => f.kind).sort();
    expect(a).toEqual(["paste", "quick", "solo", "steady"]);
    for (const f of flags) expect(f.why.length).toBeGreaterThan(20);
    expect(flags.find((f) => f.kind === "solo")!.why).toContain("Ana");
  });
  it("leaves an ordinary team alone, apart from a missing reflection", () => {
    const flags = computeFlags({ ...base, signals: [] }).filter((f) => f.firmId === "B");
    expect(flags.map((f) => f.kind)).toEqual(["reflection"]);
  });
  it("ignores small pastes", () => {
    const flags = computeFlags({ ...base, signals: [{ firm_id: "B", round: 2, user_id: "b1", at: at(5), kind: "paste", detail: { chars: 120 } }] });
    expect(flags.some((f) => f.kind === "paste")).toBe(false);
  });
  it("treats fields saved together as one save", () => {
    expect(saveTimes([{ at: at(0) }, { at: at(0.2) }, { at: at(5) }])).toHaveLength(2);
    expect(pace([0, 4000, 8000, 12000]).median).toBe(4);
  });
  it("heatmap counts edits per student per round", () => {
    const h = heatmap({ teams, members, edits: [...agent, ...human] }, [0, 1, 2]);
    expect(h[0].members.find((m) => m.userId === "a1")!.edits).toEqual([0, 0, 30]);
    expect(h[0].activeMembers[2]).toBe(1);
    expect(h[1].activeMembers[2]).toBe(2);
  });
});
