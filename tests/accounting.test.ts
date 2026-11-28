import { describe, expect, it } from "vitest";
import { aiDecide } from "../src/sim/ai";
import { makeAiFirms, runRound } from "../src/sim/run";
import { capitalCheck } from "../src/sim/proforma";
import { newProduct, normalizeDecision } from "../src/sim/product";
import { FINANCE } from "../src/sim/config";
import type { FirmDecision, RoundResult } from "../src/sim/types";

function play(upTo: number, tweak: (d: FirmDecision, round: number) => void, seed = 3) {
  const firms = makeAiFirms(8, 0);
  const me = firms[0];
  me.isAi = false;
  let prev: RoundResult | null = null;
  const out: RoundResult[] = [];
  for (let r = 0; r <= upTo; r++) {
    const d = aiDecide({ ...me, isAi: true, aiLevel: 6 }, { round: r, seed, state: prev?.state ?? null, prevResult: prev, firms });
    tweak(d, r);
    prev = runRound({ round: r, seed, firms, prevResult: prev, studentDecisions: { [me.id]: d } });
    out.push(prev);
  }
  return { out, id: me.id };
}

describe("cost of goods sold", () => {
  it("counts only units sold in profit; unsold units stay as inventory at cost", () => {
    const { out, id } = play(1, (d, r) => {
      if (r === 1) for (const pid of Object.keys(d.plan)) for (const pl of Object.values(d.plan[pid])) if (pl) pl.production = Math.round(pl.production * 3);
    });
    const rep = out[1].reports[id];
    expect(rep.pnl.production ?? 0).toBeGreaterThan(rep.pnl.cogs);
    expect(rep.capital.inventory ?? 0).toBeGreaterThan(0);
    // Production cost = cost of what sold + what's still in stock (nothing cleared in the first selling round).
    expect(Math.abs((rep.pnl.production ?? 0) - rep.pnl.cogs - (rep.capital.inventory ?? 0))).toBeLessThan(rep.pnl.production! * 0.001 + 5);
  });

  it("doesn't turn clearing leftover stock into a big profit", () => {
    const base = play(2, () => {});
    const dump = play(2, (d, r) => {
      for (const pid of Object.keys(d.plan))
        for (const pl of Object.values(d.plan[pid])) if (pl) pl.production = r === 1 ? Math.round(pl.production * 4) : r === 2 ? 0 : pl.production;
    });
    // Round 2: the overproducer can't beat the sensible plan on Financial points by selling off stock.
    expect(dump.out[2].scores[dump.id].points.financial).toBeLessThanOrEqual(base.out[2].scores[base.id].points.financial + 5);
  });

  it("lets a loss score below 0 on the Financial measure, down to the floor", () => {
    const { out, id } = play(1, (d, r) => {
      if (r === 1) for (const pid of Object.keys(d.plan)) for (const pl of Object.values(d.plan[pid])) if (pl) pl.price = Math.round(pl.price * 0.4);
    });
    const s = out[1].scores[id];
    expect(out[1].reports[id].pnl.scoredProfit!).toBeLessThan(0);
    expect(s.points.financial).toBeLessThan(0);
    expect(s.points.financial).toBeGreaterThanOrEqual(0.7 * FINANCE.lossPointsFloor);
  });
});

describe("capital warnings", () => {
  it("warns when an accepted quote can't be paid and production outruns capital", () => {
    const p = { ...newProduct("p2", 2), commission: true, briefSent: true, name: "New One" };
    const d = normalizeDecision({
      products: [{ ...newProduct("p1", 1), commission: false }, p],
      regions: { na: { enter: false, entryMode: "distributor", channels: ["online"] } },
      plan: { p1: { na: { price: 100, production: 50_000, forecast: 20_000, media: { digital: 0, search: 0, traditional: 0, trade: 0 } } } },
      research: [],
    } as never);
    const c = capitalCheck({ round: 2, decision: d, unitCost: { p1: 40 }, sellable: ["p1"], regionsEntered: { na: "distributor" }, channelsOpen: { na: ["online"] }, committed: ["p1"], capital: 100_000, marketingAvailable: 0, capacity: 70_000, loan: 0 });
    expect(c.unfunded).toEqual(["New One"]);
    expect(c.productionShort).toBeGreaterThan(0);
    expect(c.warnings.map((w) => w.step)).toEqual(["products", "production"]);
    const ok = capitalCheck({ round: 2, decision: d, unitCost: { p1: 40 }, sellable: ["p1"], regionsEntered: { na: "distributor" }, channelsOpen: { na: ["online"] }, committed: ["p1"], capital: 5_000_000, marketingAvailable: 0, capacity: 70_000, loan: 0 });
    expect(ok.warnings).toEqual([]);
  });

  it("warns when capital has run out and HQ is owed money", () => {
    const d = normalizeDecision({ products: [], regions: {}, plan: {}, research: [] } as never);
    const c = capitalCheck({ round: 2, decision: d, unitCost: {}, sellable: [], regionsEntered: {}, channelsOpen: {}, committed: [], capital: 0, marketingAvailable: 0, capacity: 70_000, loan: 1_000_000 });
    expect(c.warnings[0].text).toMatch(/run out/);
    const owed = capitalCheck({ round: 2, decision: d, unitCost: {}, sellable: [], regionsEntered: {}, channelsOpen: {}, committed: [], capital: 500_000, marketingAvailable: 0, capacity: 70_000, loan: 400_000 });
    expect(owed.warnings[0].text).toMatch(/still owe HQ/);
  });
});

describe("buyers from rivals' stockouts", () => {
  it("count in demand, so sold never exceeds demand", () => {
    const { out } = play(3, (d, r) => {
      // Starve this firm's stock so rivals pick up its buyers, and vice versa in later rounds.
      if (r >= 1) for (const pid of Object.keys(d.plan)) for (const pl of Object.values(d.plan[pid])) if (pl) pl.production = Math.round(pl.production * (r === 2 ? 0.2 : 1.5));
    });
    let spilled = 0;
    for (const res of out) for (const rep of Object.values(res.reports)) for (const s of rep.supply) {
      expect(s.sold).toBeLessThanOrEqual(s.demand);
      spilled += s.fromRivals ?? 0;
    }
    expect(spilled).toBeGreaterThan(0);
  });
});
