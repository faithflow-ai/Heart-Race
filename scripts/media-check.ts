/**
 * Media balance check: one test firm plays a full game (Practice to Final) against 7 AI rivals,
 * targeting one segment, and only its media plan changes between runs. Shows which media plans
 * win in which segments. Run: npx tsx scripts/media-check.ts
 */
import { SEGMENTS, type SegmentId } from "../src/sim/config";
import { aiDecide, designFor } from "../src/sim/ai";
import { processRound } from "../src/sim/engine";
import { SEGMENT_PROFILES } from "../src/sim/market";
import { makeAiFirms } from "../src/sim/run";
import type { FirmDecision, RoundResult } from "../src/sim/types";

type Plan = (seg: SegmentId) => { digital: number; search: number; traditional: number; trade: number };
const byReach = (seg: SegmentId) => {
  const r = SEGMENT_PROFILES[seg].mediaReach;
  const w = { digital: r.digital ** 3, search: r.search ** 3, traditional: r.traditional ** 3 };
  const t = w.digital + w.search + w.traditional;
  return { digital: w.digital / t, search: w.search / t, traditional: w.traditional / t };
};
const PLANS: Record<string, Plan> = {
  "all digital": () => ({ digital: 1, search: 0, traditional: 0, trade: 0 }),
  "all traditional": () => ({ digital: 0, search: 0, traditional: 1, trade: 0 }),
  "all trade": () => ({ digital: 0, search: 0, traditional: 0, trade: 1 }),
  "ads by reach": (s) => ({ ...byReach(s), trade: 0 }),
  "70 ads / 30 trade": (s) => { const b = byReach(s); return { digital: 0.7 * b.digital, search: 0.7 * b.search, traditional: 0.7 * b.traditional, trade: 0.3 }; },
  "50 ads / 50 trade": (s) => { const b = byReach(s); return { digital: 0.5 * b.digital, search: 0.5 * b.search, traditional: 0.5 * b.traditional, trade: 0.5 }; },
};

function play(seg: SegmentId, plan: Plan, seed: number) {
  const firms = makeAiFirms(8, 0);
  firms.forEach((f, i) => (f.aiLevel = 5 + (i % 3)));
  const test = firms[0];
  test.name = "Test";
  let prev: RoundResult | null = null;
  let units = 0, score = 0, profit = 0;
  for (let round = 0; round <= 7; round++) {
    const decisions: Record<string, FirmDecision> = {};
    for (const f of firms) decisions[f.id] = aiDecide(f, { round, seed, state: prev?.state ?? null, prevResult: prev, firms });
    const d = decisions[test.id];
    if (round === 0) {
      d.strategy.targetSegments = [seg];
      d.products = [designFor(seg, "p1", "Test One", 0.8, () => 0, "follower"), designFor(seg, "p2", "Test Two", 0.8, () => 0, "premium")];
      const tf = SEGMENT_PROFILES[seg].toneFit;
      const tone = (Object.keys(tf) as (keyof typeof tf)[]).sort((a, b) => tf[b] - tf[a])[0];
      d.products.forEach((p) => ((p.briefSent = true), (p.commission = true), (p.campaign = { message: "", tone, segment: seg })));
    }
    for (const regs of Object.values(d.plan))
      for (const pl of Object.values(regs)) {
        if (!pl) continue;
        const k = plan(seg);
        const tot = pl.promotion;
        pl.media = { digital: tot * k.digital, search: tot * k.search, traditional: tot * k.traditional, trade: tot * k.trade };
      }
    prev = processRound({ round, seed, firms, prevState: prev?.state ?? null, prevResult: prev, decisions });
    if (round >= 1) {
      units += prev.market.unitsByFirmSegment[test.id]?.[seg] ?? 0;
      score += prev.scores[test.id].total;
      profit += prev.reports[test.id].pnl.operatingProfit;
    }
  }
  return { units, score: score / 7, profit };
}

const seeds = [1, 2, 3, 4];
for (const s of SEGMENTS) {
  console.log(`\n=== ${s.name} ===`);
  console.log("plan                 units in segment   avg score   profit");
  const rows = Object.entries(PLANS).map(([name, plan]) => {
    const r = seeds.map((seed) => play(s.id, plan, seed));
    return { name, units: r.reduce((a, x) => a + x.units, 0) / seeds.length, score: r.reduce((a, x) => a + x.score, 0) / seeds.length, profit: r.reduce((a, x) => a + x.profit, 0) / seeds.length };
  });
  const best = Math.max(...rows.map((r) => r.units));
  for (const r of rows) console.log(`${r.name.padEnd(20)} ${Math.round(r.units).toLocaleString().padStart(10)} ${r.units === best ? "*" : " "}   ${r.score.toFixed(1).padStart(8)}   ${(r.profit / 1e6).toFixed(2)}M`);
}
