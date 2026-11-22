/** Prints how a class of 8 AI firms plays out, for tuning src/sim/config.ts. Run: npm run balance */
import { makeAiFirms, runRound } from "../src/sim/run";
import type { RoundResult } from "../src/sim/types";

const seed = Number(process.argv[2] ?? 1);
const firms = makeAiFirms(8, 0);
firms.forEach((f, i) => (f.aiLevel = [2, 3, 4, 5, 6, 7, 8, 9][i]));
let prev: RoundResult | null = null;
const fmt = (n: number) => (Math.abs(n) >= 1e6 ? (n / 1e6).toFixed(2) + "M" : Math.round(n / 1e3) + "K");
for (let r = 0; r <= 7; r++) {
  prev = runRound({ round: r, seed, firms, prevResult: prev, studentDecisions: {} });
  if (r === 0) continue;
  console.log(`\n=== Round ${r} ===`);
  console.log("firm        lvl  score rank  units    revenue   profit   promo   capital  pot     sat");
  for (const f of firms) {
    const rep = prev.reports[f.id];
    const s = prev.scores[f.id];
    const units = Object.values(rep.byProduct).reduce((a, p) => a + p.units, 0);
    const sat = Object.values(rep.byProduct).reduce((a, p) => a + p.satisfaction, 0) / Math.max(1, Object.keys(rep.byProduct).length);
    console.log(
      `${f.name.padEnd(12)} ${String(f.aiLevel).padStart(2)}  ${s.total.toFixed(1).padStart(5)} ${String(s.rank).padStart(4)} ${String(units).padStart(7)} ${fmt(rep.pnl.revenue).padStart(9)} ${fmt(rep.pnl.operatingProfit).padStart(8)} ${fmt(rep.pnl.promotion).padStart(7)} ${fmt(prev.state.firms[f.id].capital).padStart(8)} ${fmt(prev.state.firms[f.id].marketingPot).padStart(6)} ${sat.toFixed(2)}`,
    );
  }
}
