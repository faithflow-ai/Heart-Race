import { describe, expect, it } from "vitest";
import { runRound, makeAiFirms } from "../src/sim/run";
import { quote, newProduct } from "../src/sim/product";
import { fit } from "../src/sim/fit";
import type { RoundResult } from "../src/sim/types";

function playSeason(seed: number, levels?: number[]) {
  const firms = makeAiFirms(8, 0);
  if (levels) firms.forEach((f, i) => (f.aiLevel = levels[i]));
  const results: RoundResult[] = [];
  let prev: RoundResult | null = null;
  for (let r = 0; r <= 7; r++) {
    prev = runRound({ round: r, seed, firms, prevResult: prev, studentDecisions: {} });
    results.push(prev);
  }
  return results;
}

describe("engine", () => {
  it("quotes the design doc's sanity-check products", () => {
    const band = { ...newProduct("a", 1), sensors: ["hr", "stress"] as const };
    expect(quote({ ...band, sensors: [...band.sensors] }, 1).unitCost).toBeGreaterThan(25);
    expect(quote({ ...band, sensors: [...band.sensors] }, 1).unitCost).toBeLessThan(45);
    const watch = { ...newProduct("b", 2), chip: "advanced" as const, form: "watch" as const, material: "titanium" as const, display: "color" as const, battery: "d7" as const, water: "swim" as const, sensors: ["hr", "ecg", "gps", "spo2"] as ("hr" | "ecg" | "gps" | "spo2")[] };
    const q = quote(watch, 1);
    expect(q.unitCost).toBeGreaterThan(110);
    expect(q.unitCost).toBeLessThan(160);
    expect(q.problems).toEqual([]);
    expect(q.devFee).toBe(200_000 + 50_000 * 5);
  });

  it("flags impossible briefs", () => {
    const p = { ...newProduct("a", 1), sensors: ["ecg"] as ("ecg")[] };
    expect(quote(p, 1).problems.length).toBeGreaterThan(0);
  });

  it("fit stays in 0..1", () => {
    const p = newProduct("a", 1);
    for (const s of ["budget", "wellness", "older", "fitness", "business"] as const) {
      const f = fit(p, s);
      expect(f).toBeGreaterThan(0);
      expect(f).toBeLessThanOrEqual(1);
    }
  });

  it("plays a full season with sane numbers", () => {
    const results = playSeason(42);
    for (const res of results.slice(1)) {
      const scores = Object.values(res.scores);
      expect(scores).toHaveLength(8);
      for (const s of scores) {
        expect(Number.isFinite(s.total)).toBe(true);
        expect(s.total).toBeGreaterThanOrEqual(0);
        expect(s.total).toBeLessThanOrEqual(100);
      }
      for (const rep of Object.values(res.reports)) {
        for (const v of Object.values(rep.pnl)) expect(Number.isFinite(v)).toBe(true);
        for (const row of rep.rows) expect(row.share).toBeLessThanOrEqual(1.0001);
      }
    }
    // Firms sell something by round 1.
    const r1 = results[1];
    const units = Object.values(r1.reports).reduce((a, r) => a + Object.values(r.byProduct).reduce((b, p) => b + p.units, 0), 0);
    expect(units).toBeGreaterThan(10_000);
  });

  it("is deterministic", () => {
    const a = playSeason(7);
    const b = playSeason(7);
    expect(JSON.stringify(a[7].scores)).toBe(JSON.stringify(b[7].scores));
  });

  it("stronger AI tends to score higher", () => {
    let strong = 0;
    let weak = 0;
    for (const seed of [1, 2, 3]) {
      const res = playSeason(seed, [9, 9, 9, 9, 1, 1, 1, 1]);
      for (const r of res.slice(1)) {
        for (const [id, s] of Object.entries(r.scores)) {
          if (Number(id.split("-")[1]) < 4) strong += s.total;
          else weak += s.total;
        }
      }
    }
    expect(strong).toBeGreaterThan(weak);
  });
});
