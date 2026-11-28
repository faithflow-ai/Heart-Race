/**
 * Debrief: a round-by-round recap the instructor projects in class and at the board meetings.
 * Pure functions over stored round results, so they can be tested without a database.
 * Everything here describes what happened. It never tells students what to do.
 */
import { AD_MEDIA, CHANNELS, REGIONS, ROUNDS, SEGMENTS, type SegmentId } from "@/sim/config";
import type { RoundResult } from "@/sim/types";
import { segmentPanels } from "./insights";

export interface DebriefFirm { id: string; name: string; is_ai: boolean; slot: number }

export interface DebriefRound {
  round: number;
  name: string;
  market: { buyers: number; unitsSold: number; avgPrice: number | null; revenue: number };
  leaderboard: { id: string; rank: number; total: number; prevRank: number | null; prevTotal: number | null; points: Record<string, number>; revenue: number; profit: number; color?: string }[];
  segments: {
    id: SegmentId; name: string; buyers: number; unitsSold: number;
    leaders: { id: string; share: number }[];
    /** The firm with the biggest gap between the share it could have won and the share it did win. */
    biggestGap: { id: string; actual: number; potential: number } | null;
  }[];
  pushPull: { id: string; ads: number; trade: number; tradeShare: number | null; channel: number; customer: number; awareness: number | null }[];
  supply: { id: string; forecast: number; produced: number; sold: number; lost: number; leftover: number; accuracy: number | null }[];
  goals: { id: string; set: number; onTarget: number; rows: { label: string; goal: number | null; actual: number; key: string }[] }[];
  moments: string[];
  /** Round 1 only: how the top-scoring AI rival launched, next to each student team. */
  launch?: LaunchRow[];
}

/** One firm's launch choices, for the Round 1 "How a rival launched" slide. */
export interface LaunchRow {
  id: string;
  isAi: boolean;
  regions: string[];
  /** Channels used, as names, across the regions entered. */
  channels: string[];
  /** Average fit (0-100) of each product with its own target segment, over the regions where it sold. */
  fit: number | null;
  products: number;
  /** Did any product carry different prices in different regions? */
  pricesVary: boolean;
  priceRange: [number, number] | null;
  total: number;
}

export interface DebriefSeason {
  rounds: number[];
  firms: { id: string; totals: (number | null)[]; ranks: (number | null)[]; unitShare: (number | null)[]; revenue: number; profit: number }[];
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const nm = (firms: DebriefFirm[], id: string) => firms.find((f) => f.id === id)?.name ?? "A firm";
const pctTxt = (x: number) => `${Math.round(x * 100)}%`;

/** A goal counts as on target when the actual is within 10% of the goal (or 2 points for percent goals). */
export function goalOnTarget(key: string, goal: number | null, actual: number) {
  if (goal === null || goal === undefined) return false;
  if (key === "revenue") return goal > 0 ? Math.abs(actual - goal) / goal <= 0.1 : actual === 0;
  return Math.abs(actual - goal) <= 2;
}

export function debriefRound(res: RoundResult, prev: RoundResult | null, firms: DebriefFirm[]): DebriefRound {
  const live = firms.filter((f) => res.reports[f.id]);
  // Market totals.
  const buyers = sum(SEGMENTS.map((s) => sum(Object.values(res.market.demand[s.id] ?? {}).map((n) => n ?? 0))));
  const unitsByFirm = (r: RoundResult, id: string) => sum(Object.values(r.market.unitsByFirmSegment[id] ?? {}).map((n) => n ?? 0));
  const unitsSold = sum(live.map((f) => unitsByFirm(res, f.id)));
  let priceUnits = 0, priceSum = 0;
  for (const f of live) for (const row of res.reports[f.id].rows) { priceSum += row.units * row.price; priceUnits += row.units; }
  const revenue = sum(live.map((f) => res.reports[f.id].pnl.revenue));

  // Leaderboard.
  const leaderboard = live
    .map((f) => {
      const sc = res.scores[f.id];
      const p = prev?.scores[f.id];
      return {
        id: f.id,
        rank: sc?.rank ?? 99,
        total: sc?.total ?? 0,
        prevRank: p && prev!.round >= 1 ? p.rank : null,
        prevTotal: p && prev!.round >= 1 ? p.total : null,
        points: (sc?.points ?? {}) as Record<string, number>,
        revenue: res.reports[f.id].pnl.revenue,
        profit: res.reports[f.id].pnl.operatingProfit,
        color: res.decisions?.[f.id]?.strategy?.teamColor,
      };
    })
    .sort((a, b) => a.rank - b.rank);

  // Segments: who won, and who left the most on the table.
  const panels = segmentPanels(res, live.map((f) => ({ id: f.id, name: f.name, is_ai: f.is_ai })), "");
  const segments = panels.map((p) => {
    const leaders = [...p.firms].sort((a, b) => b.actual - a.actual).filter((x) => x.actual > 0).slice(0, 3).map((x) => ({ id: x.id, share: x.actual }));
    const gaps = p.firms.map((x) => ({ id: x.id, actual: x.actual, potential: x.potential, gap: x.potential - x.actual })).sort((a, b) => b.gap - a.gap);
    const g = gaps[0] && gaps[0].gap >= 0.03 ? gaps[0] : null;
    return { id: p.id, name: p.name, buyers: p.buyers, unitsSold: p.unitsSold, leaders, biggestGap: g ? { id: g.id, actual: g.actual, potential: g.potential } : null };
  });

  // Push (trade promotion to partners) vs. pull (ads to buyers).
  const pushPull = live.map((f) => {
    let ads = 0, trade = 0;
    for (const regs of Object.values(res.decisions?.[f.id]?.plan ?? {}))
      for (const pl of Object.values(regs ?? {})) {
        if (!pl) continue;
        ads += sum(AD_MEDIA.map((m) => pl.media?.[m] ?? 0));
        trade += pl.media?.trade ?? 0;
      }
    const sc = res.scores[f.id];
    const aw = res.reports[f.id].goals.find((g) => g.key === "awareness")?.actual;
    return { id: f.id, ads, trade, tradeShare: ads + trade > 0 ? trade / (ads + trade) : null, channel: sc?.points.channel ?? 0, customer: sc?.points.customer ?? 0, awareness: aw ?? null };
  });

  // Forecast vs. reality.
  const supply = live.map((f) => {
    const s = res.reports[f.id].supply;
    return {
      id: f.id,
      forecast: sum(s.map((x) => x.forecast)),
      produced: sum(s.map((x) => x.produced)),
      sold: sum(s.map((x) => x.sold)),
      lost: sum(s.map((x) => x.lost)),
      leftover: sum(s.map((x) => x.endInventory)),
      accuracy: s.length ? res.reports[f.id].forecastAccuracy : null,
    };
  });

  // Goals vs. actual (student teams only: rivals don't set goals).
  const goals = live.filter((f) => !f.is_ai).map((f) => {
    const rows = res.reports[f.id].goals;
    return { id: f.id, set: rows.filter((g) => g.goal !== null).length, onTarget: rows.filter((g) => goalOnTarget(g.key, g.goal, g.actual)).length, rows };
  });

  // Notable moments: plain observations, never advice.
  const moments: string[] = [];
  const share = (r: RoundResult, id: string) => {
    const tot = sum(firms.map((f) => unitsByFirm(r, f.id)));
    return tot > 0 ? unitsByFirm(r, id) / tot : 0;
  };
  if (prev && prev.round >= 1) {
    const moves = live.map((f) => ({ id: f.id, d: share(res, f.id) - share(prev, f.id) })).sort((a, b) => b.d - a.d);
    if (moves[0] && moves[0].d >= 0.01) moments.push(`${nm(firms, moves[0].id)} gained the most unit share: up ${(moves[0].d * 100).toFixed(1)} points to ${pctTxt(share(res, moves[0].id))}.`);
    const last = moves[moves.length - 1];
    if (last && last.d <= -0.01) moments.push(`${nm(firms, last.id)} lost the most unit share: down ${(-last.d * 100).toFixed(1)} points to ${pctTxt(share(res, last.id))}.`);
    const climbs = leaderboard.filter((x) => x.prevRank !== null).map((x) => ({ id: x.id, up: x.prevRank! - x.rank })).sort((a, b) => b.up - a.up);
    if (climbs[0] && climbs[0].up >= 2) moments.push(`${nm(firms, climbs[0].id)} climbed ${climbs[0].up} places on the leaderboard.`);
  }
  const stockout = [...supply].sort((a, b) => b.lost - a.lost)[0];
  if (stockout && stockout.lost >= 500) moments.push(`${nm(firms, stockout.id)} ran out of stock and missed about ${Math.round(stockout.lost).toLocaleString()} sales buyers wanted.`);
  const overstock = [...supply].sort((a, b) => b.leftover - a.leftover)[0];
  if (overstock && overstock.leftover >= 1000) moments.push(`${nm(firms, overstock.id)} ended the round with ${Math.round(overstock.leftover).toLocaleString()} unsold units in its warehouses.`);
  const acc = supply.filter((x) => x.accuracy !== null && x.forecast > 0).sort((a, b) => b.accuracy! - a.accuracy!)[0];
  if (acc) moments.push(`Closest sales forecast: ${nm(firms, acc.id)}, at ${pctTxt(acc.accuracy!)} accuracy.`);
  const margin = live.map((f) => ({ id: f.id, m: res.reports[f.id].pnl.revenue > 0 ? res.reports[f.id].pnl.operatingProfit / res.reports[f.id].pnl.revenue : -1 })).sort((a, b) => b.m - a.m)[0];
  if (margin && margin.m > 0) moments.push(`Highest operating margin: ${nm(firms, margin.id)}, at ${pctTxt(margin.m)}.`);
  const gap = segments.filter((s) => s.biggestGap).sort((a, b) => (b.biggestGap!.potential - b.biggestGap!.actual) - (a.biggestGap!.potential - a.biggestGap!.actual))[0];
  if (gap) moments.push(`In ${gap.name}, buyers wanted ${nm(firms, gap.biggestGap!.id)}'s products enough for ${pctTxt(gap.biggestGap!.potential)} of the segment, but it won ${pctTxt(gap.biggestGap!.actual)}.`);
  const pp = pushPull.filter((x) => x.ads + x.trade > 0);
  if (pp.length >= 2) {
    const most = [...pp].sort((a, b) => (b.tradeShare ?? 0) - (a.tradeShare ?? 0));
    moments.push(`Trade promotion ranged from ${pctTxt(most[most.length - 1].tradeShare ?? 0)} of promotion spending (${nm(firms, most[most.length - 1].id)}) to ${pctTxt(most[0].tradeShare ?? 0)} (${nm(firms, most[0].id)}).`);
  }

  return {
    launch: res.round === 1 ? launchRows(res, live) : undefined,
    round: res.round,
    name: ROUNDS.names[res.round] ?? `Round ${res.round}`,
    market: { buyers, unitsSold, avgPrice: priceUnits > 0 ? priceSum / priceUnits : null, revenue },
    leaderboard,
    segments,
    pushPull,
    supply,
    goals,
    moments,
  };
}

const REG_NAME = Object.fromEntries(REGIONS.map((r) => [r.id, r.name])) as Record<string, string>;
const CH_NAME = Object.fromEntries(CHANNELS.map((c) => [c.id, c.name])) as Record<string, string>;

/** Launch choices for the strongest AI rival (first) and every student team. */
export function launchRows(res: RoundResult, firms: DebriefFirm[]): LaunchRow[] {
  const ais = firms.filter((f) => f.is_ai && res.scores[f.id]).sort((a, b) => (res.scores[b.id]?.total ?? 0) - (res.scores[a.id]?.total ?? 0));
  const pick = [...ais.slice(0, 1), ...firms.filter((f) => !f.is_ai)];
  return pick.map((f) => {
    const st = res.state.firms[f.id];
    const d = res.decisions?.[f.id];
    const regions = Object.keys(st?.regions ?? {}).filter((r) => (st?.regions as Record<string, unknown>)[r]);
    const channels = [...new Set(regions.flatMap((r) => (st?.channelsOpen as Record<string, string[]> | undefined)?.[r] ?? []))];
    const rep = res.reports[f.id];
    const prods = d?.products ?? [];
    const fits: number[] = [];
    for (const p of prods) {
      const rows = rep?.rows.filter((x) => x.productId === p.id && x.segment === p.targetSegment) ?? [];
      if (rows.length) fits.push(rows.reduce((a, x) => a + x.fit, 0) / rows.length);
    }
    let vary = false;
    const all: number[] = [];
    for (const p of prods) {
      const prices = regions.map((r) => (d?.plan?.[p.id] as Record<string, { price?: number }> | undefined)?.[r]?.price ?? 0).filter((x) => x > 0);
      all.push(...prices);
      if (prices.length >= 2 && Math.max(...prices) / Math.min(...prices) > 1.03) vary = true;
    }
    return {
      id: f.id,
      isAi: f.is_ai,
      regions: regions.map((r) => REG_NAME[r] ?? r),
      channels: channels.map((c) => CH_NAME[c] ?? c),
      fit: fits.length ? Math.round((100 * fits.reduce((a, b) => a + b, 0)) / fits.length) : null,
      products: fits.length,
      pricesVary: vary,
      priceRange: all.length ? [Math.min(...all), Math.max(...all)] : null,
      total: res.scores[f.id]?.total ?? 0,
    };
  });
}

/** Season so far (for the board meetings): every scored round through `upTo`. */
export function debriefSeason(results: RoundResult[], firms: DebriefFirm[]): DebriefSeason {
  const scored = results.filter((r) => r.round >= 1).sort((a, b) => a.round - b.round);
  const units = (r: RoundResult, id: string) => sum(Object.values(r.market.unitsByFirmSegment[id] ?? {}).map((n) => n ?? 0));
  return {
    rounds: scored.map((r) => r.round),
    firms: firms.map((f) => ({
      id: f.id,
      totals: scored.map((r) => r.scores[f.id]?.total ?? null),
      ranks: scored.map((r) => r.scores[f.id]?.rank ?? null),
      unitShare: scored.map((r) => {
        const tot = sum(firms.map((x) => units(r, x.id)));
        return r.reports[f.id] && tot > 0 ? units(r, f.id) / tot : null;
      }),
      revenue: sum(scored.map((r) => r.reports[f.id]?.pnl.revenue ?? 0)),
      profit: sum(scored.map((r) => r.reports[f.id]?.pnl.operatingProfit ?? 0)),
    })),
  };
}
