import { describe, expect, it } from "vitest";
import { aiDecide } from "../src/sim/ai";
import { makeAiFirms, runRound } from "../src/sim/run";
import { normalMargin, spendingLimit, stockingFactor } from "../src/sim/engine";
import { milestonesPassed, nextMilestone, unitCostAt } from "../src/sim/product";
import type { FirmDecision, RoundResult } from "../src/sim/types";

/** Plays rounds 0..upTo with firm 0 as a "student" whose decision can be tweaked each round. */
function play(upTo: number, tweak: (d: FirmDecision, round: number, prev: RoundResult | null) => void, seed = 3) {
  const firms = makeAiFirms(8, 0);
  const me = firms[0];
  me.isAi = false;
  let prev: RoundResult | null = null;
  const out: RoundResult[] = [];
  for (let r = 0; r <= upTo; r++) {
    const d = aiDecide({ ...me, isAi: true, aiLevel: 6 }, { round: r, seed, state: prev?.state ?? null, prevResult: prev, firms });
    tweak(d, r, prev);
    prev = runRound({ round: r, seed, firms, prevResult: prev, studentDecisions: { [me.id]: d } });
    out.push(prev);
  }
  return { out, id: me.id };
}

describe("cost rules", () => {
  it("cuts 5% at each volume milestone, down to 85%", () => {
    expect(milestonesPassed(49_999)).toBe(0);
    expect(milestonesPassed(50_000)).toBe(1);
    expect(milestonesPassed(1_000_000)).toBe(3);
    expect(nextMilestone(60_000)).toBe(150_000);
    expect(nextMilestone(400_000)).toBeNull();
    expect(unitCostAt(100, 0, 1, 0)).toBeCloseTo(100);
    expect(unitCostAt(100, 160_000, 1, 0)).toBeCloseTo(90);
    expect(unitCostAt(100, 5_000_000, 1, 0)).toBeCloseTo(85);
  });

  it("industry prices fall 2% a round after the product is designed", () => {
    expect(unitCostAt(100, 0, 3, 1)).toBeCloseTo(100 * 0.98 * 0.98);
  });
});

describe("money rules", () => {
  it("limits promotion + research to the greater of $500K or 20% of last revenue", () => {
    expect(spendingLimit({ lastRevenue: 0 })).toBe(500_000);
    expect(spendingLimit({ lastRevenue: 10_000_000 })).toBe(2_000_000);
  });

  it("cuts promotion to the round's spending limit", () => {
    const { out, id } = play(3, (d, r) => {
      if (r === 3) for (const pid of Object.keys(d.plan)) for (const c of Object.values(d.plan[pid])) c.media.digital += 400_000;
    });
    const rep = out[3].reports[id];
    expect(rep.pnl.promotion + rep.pnl.research).toBeLessThanOrEqual((rep.spendLimit ?? 0) + 1);
    expect(rep.notes.some((n) => n.includes("spending limit"))).toBe(true);
  });

  it("lends emergency money with interest when capital runs out, instead of going negative", () => {
    const { out, id } = play(3, (d, r) => {
      if (r >= 1) for (const pid of Object.keys(d.plan)) for (const c of Object.values(d.plan[pid])) c.production *= 6;
      if (r >= 1) d.capacityExpansion = 150_000;
    });
    const states = out.map((x) => x.state.firms[id]);
    for (const s of states) expect(s.capital).toBeGreaterThanOrEqual(0);
    expect(states.some((s) => (s.loan ?? 0) > 0)).toBe(true);
    const later = out.find((x, i) => i > 1 && (out[i - 1].state.firms[id].loan ?? 0) > 0);
    expect(later?.reports[id].pnl.interest ?? 0).toBeGreaterThan(0);
  });
});

describe("markets", () => {
  it("exits a region for half its entry fee and ends its overhead", () => {
    let region = "" as keyof FirmDecision["regions"];
    const { out, id } = play(3, (d, r, prev) => {
      if (r === 3 && prev) {
        region = (Object.keys(prev.state.firms[Object.keys(prev.state.firms)[0]].regions)[0] ?? "na") as typeof region;
        d.regions[region].exit = true;
      }
    });
    const before = out[2].state.firms[id];
    const after = out[3].state.firms[id];
    expect(before.regions[region]).toBeTruthy();
    expect(after.regions[region]).toBeUndefined();
    expect(out[3].reports[id].pnl.exitFees ?? 0).toBeGreaterThan(0);
    expect(Object.keys(after.channelUnits[region] ?? {})).toHaveLength(0);
  });

  it("resets a channel's volume discount when the team leaves it", () => {
    let region = "" as keyof FirmDecision["regions"];
    let dropped = "";
    const { out, id } = play(3, (d, r, prev) => {
      if (r === 3 && prev) {
        const fs = prev.state.firms[Object.keys(prev.state.firms)[0]];
        region = Object.keys(fs.channelUnits).find((k) => Object.values(fs.channelUnits[k as typeof region] ?? {}).some((v) => (v ?? 0) > 0)) as typeof region;
        dropped = Object.entries(fs.channelUnits[region] ?? {}).find(([, v]) => (v ?? 0) > 0)![0];
        d.regions[region].channels = d.regions[region].channels.filter((c) => c !== dropped);
      }
    });
    expect(out[2].state.firms[id].channelUnits[region]?.[dropped as "mass"] ?? 0).toBeGreaterThan(0);
    expect(out[3].state.firms[id].channelUnits[region]?.[dropped as "mass"] ?? 0).toBe(0);
  });

  it("partners stock less without trade support; the own website doesn't care", () => {
    expect(stockingFactor("online", 0)).toBe(1);
    expect(stockingFactor("mass", 0)).toBeCloseTo(0.5);
    expect(stockingFactor("mass", 100_000)).toBeCloseTo(0.75);
    expect(stockingFactor("marketplace", 0)).toBeGreaterThan(stockingFactor("mass", 0));
  });
});

describe("scoring", () => {
  it("judges channel margins against what's normal for the target segments", () => {
    expect(normalMargin(["older"])).toBeGreaterThan(normalMargin(["budget"]));
  });

  it("scores profit before one-time costs", () => {
    const { out, id } = play(1, () => {});
    const p = out[1].reports[id].pnl;
    expect(p.scoredProfit).toBeCloseTo(p.operatingProfit + p.devFees + p.entryFees + p.channelSetup + (p.exitFees ?? 0) + p.expansion - (p.expansionAmortized ?? 0), 0);
  });

  it("a blank goal scores zero", () => {
    const full = play(1, () => {});
    const blank = play(1, (d) => {
      d.goals.revenue = null;
      d.goals.awareness = null;
    });
    expect(blank.out[1].scores[blank.id].raw.goals).toBeLessThan(full.out[1].scores[full.id].raw.goals);
  });
});
