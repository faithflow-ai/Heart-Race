/**
 * Market event check: does responding well beat responding partly, and partly beat ignoring?
 * Runs a class of 7 AI rivals plus one test team that plays like a good AI team, then changes only
 * its event-round decisions (none / partial / strong, plus a price war against the rival).
 * Each event is tested on its own (the other two turned off), over several seeds and team styles.
 * Run: npm run event-check
 */
import { aiDecide } from "../src/sim/ai";
import { makeAiFirms, runRound } from "../src/sim/run";
import { DEFAULT_SETTINGS, type RegionId } from "../src/sim/config";
import { EVENT_RULES, eventUnitCost, eventsForRound, isValueSegment, type EventId } from "../src/sim/events";
import { SEGMENT_PROFILES } from "../src/sim/market";
import { supportedClaims, unitCostAt } from "../src/sim/product";
import type { FirmDecision, FirmMeta, GameState, RoundResult } from "../src/sim/types";

type Mode = "none" | "partial" | "strong" | "pricewar" | "pricecut";
const SEEDS = [1, 2, 3, 4];
const STYLES: { style: FirmMeta["aiStyle"]; slot: number }[] = [
  { style: "premium", slot: 0 },
  { style: "follower", slot: 1 },
  { style: "lowcost", slot: 2 },
];

function respond(ev: EventId, mode: Mode, d: FirmDecision, state: GameState | null, round: number, active: ReturnType<typeof eventsForRound>, base: FirmDecision | null) {
  const fs = state?.firms.T;
  if (!fs) return;
  if (mode === "none" && ev !== "rival") return;
  const spec = (pid: string) => fs.products[pid]?.spec;
  const cells = Object.entries(d.plan).flatMap(([pid, regs]) => Object.entries(regs).map(([r, c]) => ({ pid, r: r as RegionId, c })));
  const chipStart = 4;
  if (ev === "chip" && mode === "strong" && round === chipStart - 1) {
    // Warned a round early: build some extra stock of advanced-chip products before the shortage.
    for (const x of cells) if (spec(x.pid)?.chip === "advanced") x.c.production = Math.round(x.c.production * Number(process.env.STOCKUP ?? 1.35));
  }
  if (ev === "chip" && active.chip) {
    const adv = cells.filter((x) => spec(x.pid)?.chip === "advanced");
    const other = cells.filter((x) => spec(x.pid)?.chip !== "advanced");
    // Prices are set against the price before the shortage (no compounding).
    const basePrice = (x: { pid: string; r: RegionId; c: { price: number } }) => base?.plan[x.pid]?.[x.r]?.price || x.c.price;
    if (mode === "partial") for (const x of adv) x.c.price = Math.round(basePrice(x) * 1.08);
    if (mode === "strong") {
      const alloc = active.chipAlloc.T ?? 0;
      const total = adv.reduce((a, x) => a + x.c.production, 0);
      const k = total > alloc ? alloc / total : 1;
      for (const x of adv) {
        const sens = SEGMENT_PROFILES[spec(x.pid)!.targetSegment].priceSensitivity;
        // Price for the units you can actually build: raise price until demand roughly matches supply.
        const m = Math.min(1.2, Math.pow(1 / Math.max(0.3, k), 1 / (1.5 * sens)));
        x.c.price = Math.round(basePrice(x) * Math.max(1.03, m));
        x.c.production = Math.floor(x.c.production * k);
        x.c.forecast = Math.round(Math.min(x.c.forecast, x.c.production + inv(fs, x.pid, x.r)));
      }
      // Don't advertise what you can't build: move some promotion to products on other chips.
      let freed = 0;
      for (const x of adv) for (const m of ["digital", "search", "traditional"] as const) {
        const cut = Math.round(x.c.media[m] * Number(process.env.SHIFT ?? 0.3) * (1 - k));
        x.c.media[m] -= cut;
        freed += cut;
      }
      for (const x of other) x.c.media.digital += Math.round(freed / Math.max(1, other.length));
      for (const x of cells) x.c.promotion = x.c.media.digital + x.c.media.search + x.c.media.traditional + x.c.media.trade;
    }
  }
  if (ev === "rival" && active.rival) {
    const v = active.rival;
    const mine = cells.filter((x) => spec(x.pid)?.targetSegment === v.segment);
    // Baseline: a team that doesn't talk about the rival's weak spot.
    if (mode !== "strong") for (const p of d.products) if (spec(p.id)?.targetSegment === v.segment) p.claims = p.claims.filter((c) => c !== v.weakness);
    // Price moves happen once, when the rival arrives (prices carry forward after that).
    if (round === 5 && mode === "pricewar") for (const x of mine) x.c.price = Math.round(x.c.price * 0.8);
    if (round === 5 && mode === "pricecut") for (const x of mine) x.c.price = Math.round(x.c.price * Number(process.env.CUT ?? 0.92));
    if (round === 5 && mode === "strong" && isValueSegment(v.segment)) for (const x of mine) x.c.price = Math.round(x.c.price * Number(process.env.CUT ?? 0.92));
    if (mode === "partial") for (const x of mine) for (const m of ["digital", "search", "traditional"] as const) x.c.media[m] = Math.round(x.c.media[m] * 1.3);
    if (mode === "strong") {
      for (const p of d.products) {
        const s = spec(p.id);
        if (!s || s.targetSegment !== v.segment) continue;
        if (supportedClaims(s).has(v.weakness) && !p.claims.includes(v.weakness)) p.claims = [v.weakness, ...p.claims].slice(0, 3);
        p.campaign = { ...p.campaign, segment: v.segment };
      }
      for (const x of mine) {
        if (x.r === v.region) x.c.media.trade = Math.max(60_000, Math.round(x.c.media.trade * 2));
        x.c.forecast = Math.round(x.c.forecast * 0.9);
        x.c.production = Math.round(x.c.production * 0.92);
      }
    }
    for (const x of mine) x.c.promotion = x.c.media.digital + x.c.media.search + x.c.media.traditional + x.c.media.trade;
  }
  if (ev === "tariff" && active.tariff && round === 6) {
    if (mode === "partial") for (const x of cells) x.c.price = Math.round(x.c.price * 1.05);
    if (mode === "strong") {
      const hi = Number(process.env.TLOW ?? 1.0), lo = Number(process.env.THIGH ?? 0.6), shift = Number(process.env.TSHIFT ?? 0);
      for (const x of cells) {
        const sens = SEGMENT_PROFILES[spec(x.pid)?.targetSegment ?? "wellness"].priceSensitivity;
        const low = sens <= 1.4;
        // Pass on the extra cost in dollars: all of it where buyers care less about price, part of it elsewhere.
        const ps = fs.products[x.pid];
        const before = unitCostAt(ps.quotedUnitCost, ps.cumUnits, round, ps.briefedRound);
        const extra = eventUnitCost(before, ps.quotedUnitCost, ps.spec, active) - before;
        const old = x.c.price;
        x.c.price = Math.round(old + extra * (low ? hi : lo));
        // Fewer buyers at the higher price: plan fewer units.
        const k = Math.exp(-sens * 1.5 * ((x.c.price - old) / old) * 0.6);
        x.c.forecast = Math.round(x.c.forecast * k);
        x.c.production = Math.round(x.c.production * ((process.env.TPROD ?? "0") === "0" ? 1 : k));
        const f = low ? 1 + shift : 1 - shift;
        for (const m of ["digital", "search", "traditional", "trade"] as const) x.c.media[m] = Math.round(x.c.media[m] * f);
        x.c.promotion = x.c.media.digital + x.c.media.search + x.c.media.traditional + x.c.media.trade;
      }
    }
  }
}

/** The AI raises prices the round a cost event starts; undo that so the test team's modes are clean. */
function undoAiEventMoves(ev: EventId, d: FirmDecision, prev: RoundResult | null, r: number, settings: { events: Record<string, number | null> }) {
  const last = prev?.state.firms.T?.lastDecision;
  if (!last || (ev !== "chip" && ev !== "tariff") || settings.events[ev] !== r) return;
  for (const [pid, regs] of Object.entries(d.plan))
    for (const [rg, c] of Object.entries(regs)) {
      const old = last.plan[pid]?.[rg as RegionId]?.price;
      if (old && c) c.price = old;
    }
}

function inv(fs: GameState["firms"][string], pid: string, r: RegionId) {
  return (fs.inventory[pid]?.[r] ?? []).reduce((a, l) => a + l.units, 0);
}

function play(ev: EventId, mode: Mode, seed: number, style: FirmMeta["aiStyle"], slot: number) {
  const settings = { ...DEFAULT_SETTINGS, events: { chip: null, rival: null, tariff: null, [ev]: EVENT_RULES[ev] ? { chip: 4, rival: 5, tariff: 6 }[ev] : null } };
  const ai = makeAiFirms(7, 1);
  const T: FirmMeta = { id: "T", name: "Test team", isAi: false, aiLevel: Number(process.env.TLEVEL ?? 5), aiStyle: style, slot };
  const firms = [T, ...ai];
  let prev: RoundResult | null = null;
  let base3: FirmDecision | null = null;
  const out: Record<number, { total: number; profit: number }> = {};
  for (let r = 0; r <= 7; r++) {
    for (const f of ai) f.aiLevel = [4, 4, 4, 5, 5.5, 6.5, 7, 7.5][r];
    const d = aiDecide({ ...T, isAi: true }, { round: r, seed, state: prev?.state ?? null, prevResult: prev, firms, settings });
    // The test team only does what each mode says: undo the AI's own event price moves.
    undoAiEventMoves(ev, d, prev, r, settings);
    const active = eventsForRound(r, seed, firms, prev, prev?.state ?? null, settings);
    if (r === 3) base3 = structuredClone(d);
    respond(ev, mode, d, prev?.state ?? null, r, active, base3);
    prev = runRound({ round: r, seed, firms, prevResult: prev, studentDecisions: { T: d }, settings });
    if (r >= 1) out[r] = { total: prev.scores.T.total, profit: prev.reports.T.pnl.operatingProfit };
    if (process.env.DIAG && WINDOW[ev].includes(r)) {
      const rep = prev.reports.T;
      console.log(`   [${mode} R${r}] score ${prev.scores.T.total.toFixed(1)} ${Object.entries(prev.scores.T.points).map(([k, v]) => k + " " + v.toFixed(0)).join(" ")} profit ${(rep.pnl.operatingProfit / 1e6).toFixed(2)}M rev ${(rep.pnl.revenue / 1e6).toFixed(2)}M alloc ${prev.state.events?.chipAlloc?.T ?? "-"}`);
      for (const y of rep.supply) if (y.produced || y.sold) console.log(`      ${prev.state.firms.T.products[y.productId].spec.chip} ${y.region} price ${d.plan[y.productId]?.[y.region]?.price} prod ${y.produced} demand ${y.demand} sold ${y.sold} lost ${y.lost} end ${y.endInventory}`);
    }
  }
  return { out, rival: prev!.state.events?.rival };
}

const WINDOW: Record<EventId, number[]> = { chip: [4, 5], rival: [5, 6, 7], tariff: [6, 7] };
for (const ev of (process.env.EV ? [process.env.EV] : ["chip", "rival", "tariff"]) as EventId[]) {
  const modes: Mode[] = ev === "rival" ? ["none", "partial", "pricecut", "pricewar", "strong"] : ["none", "partial", "strong"];
  console.log(`\n=== ${EVENT_RULES[ev].name} (rounds ${WINDOW[ev].join(", ")}) ===`);
  const rowsOut: Record<Mode, { score: number[]; profit: number[] }> = {} as never;
  const perStyle: string[] = [];
  for (const m of modes) rowsOut[m] = { score: [], profit: [] };
  // For the rival: split results by whether it went after a value (price-driven) segment.
  const split: Record<"value" | "other", Record<string, number[]>> = { value: {}, other: {} };
  for (const st of STYLES.filter((x) => !process.env.ONLY || process.env.ONLY.split(":")[0] === x.style))
    for (const seed of SEEDS.filter((x) => !process.env.ONLY || Number(process.env.ONLY.split(":")[1]) === x)) {
      const line: string[] = [];
      for (const m of modes) {
        const { out, rival } = play(ev, m, seed, st.style, st.slot);
        const sc = WINDOW[ev].reduce((a, r) => a + out[r].total, 0) / WINDOW[ev].length;
        const pr = WINDOW[ev].reduce((a, r) => a + out[r].profit, 0);
        rowsOut[m].score.push(sc);
        rowsOut[m].profit.push(pr);
        line.push(`${m} ${sc.toFixed(1)}`);
        if (ev === "rival" && rival) ((split[isValueSegment(rival.segment) ? "value" : "other"][m] ??= []).push(sc));
        if (m === "strong" && ev === "rival" && rival) line.push(`[${rival.segment}/${rival.region}/${rival.weakness}]`);
      }
      perStyle.push(`  ${st.style.padEnd(8)} seed ${seed}: ${line.join("  ")}`);
    }
  console.log(perStyle.join("\n"));
  const avg = (xs: number[]) => xs.reduce((a, x) => a + x, 0) / xs.length;
  if (ev === "rival")
    for (const k of ["value", "other"] as const) {
      const n = split[k].none?.length ?? 0;
      if (!n) continue;
      console.log(`  ${k === "value" ? "VALUE SEGMENTS" : "OTHER SEGMENTS"} (${n} runs): ` + modes.map((m) => `${m} ${avg(split[k][m]).toFixed(1)}`).join("  "));
    }
  for (const m of modes) console.log(`  AVERAGE ${m.padEnd(9)} score ${avg(rowsOut[m].score).toFixed(1)}  profit over window $${(avg(rowsOut[m].profit) / 1e6).toFixed(2)}M  (vs none ${(avg(rowsOut[m].score) - avg(rowsOut.none.score)).toFixed(1)} pts)`);
}
