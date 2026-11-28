/** Server-side numbers for the Results screen: segment panels, actual vs. potential share, the positioning reality check. */
import { CLAIMS, SEGMENTS, type ClaimId, type SegmentId } from "@/sim/config";
import { SEGMENT_PROFILES } from "@/sim/market";
import { perceived, priceScore, type PositionMap } from "@/sim/perception";
import type { FirmReport, RoundResult } from "@/sim/types";

type FirmLite = { id: string; name: string; is_ai: boolean };

export interface SegmentPanel {
  id: SegmentId;
  name: string;
  buyers: number;
  unitsSold: number;
  myUnits: number;
  myAvgPrice: number | null;
  firms: { id: string; name: string; isAi: boolean; mine: boolean; actual: number; potential: number }[];
  /** From the Customer needs study, if the team bought it: what these buyers care about, and the price they expect. */
  weighs: { caresAbout: string[]; typicalPrice: number } | null;
}

export function segmentPanels(res: RoundResult, firms: FirmLite[], me: string, needsBought = false): SegmentPanel[] {
  return SEGMENTS.map((s) => {
    const buyers = Object.values(res.market.demand[s.id] ?? {}).reduce((a, n) => a + (n ?? 0), 0);
    let sold = 0, wanted = 0;
    const per = firms.map((f) => {
      const rows = (res.reports[f.id]?.rows ?? []).filter((r) => r.segment === s.id);
      const units = rows.reduce((a, r) => a + r.units, 0);
      const demand = rows.reduce((a, r) => a + r.demandUnits, 0);
      sold += units;
      wanted += demand;
      return { f, units, demand, rows };
    });
    // The market event rival (not one of the class's firms) still takes buyers in its segment.
    const rv = res.market.rival && res.market.rival.segment === s.id ? res.market.rival : null;
    if (rv) {
      sold += rv.units;
      wanted += rv.demand;
      per.push({ f: { id: "__event_rival", name: `${rv.name} (new entrant)`, is_ai: true }, units: rv.units, demand: rv.demand, rows: [] });
    }
    const mine = per.find((x) => x.f.id === me);
    const myRev = mine ? mine.rows.reduce((a, r) => a + r.units * r.price, 0) : 0;
    return {
      id: s.id,
      name: s.name,
      buyers,
      unitsSold: sold,
      myUnits: mine?.units ?? 0,
      myAvgPrice: mine && mine.units > 0 ? myRev / mine.units : null,
      weighs: needsBought ? { caresAbout: SEGMENT_PROFILES[s.id].caresAbout.map((c) => CLAIMS[c].name), typicalPrice: Math.round(SEGMENT_PROFILES[s.id].refPrice / 10) * 10 } : null,
      firms: per
        .map((x) => ({ id: x.f.id, name: x.f.name, isAi: x.f.is_ai, mine: x.f.id === me, actual: sold > 0 ? x.units / sold : 0, potential: wanted > 0 ? x.demand / wanted : 0 }))
        .filter((x) => x.actual > 0.0005 || x.potential > 0.0005)
        .sort((a, b) => b.potential - a.potential),
    };
  });
}

/** Where buyers actually see products on the team's two axes, plus segment ideal areas if the team bought Customer needs. */
export function realityCheck(res: RoundResult, firms: FirmLite[], me: string, map: PositionMap | undefined, needsBought: boolean) {
  if (!map?.x || !map?.y) return null;
  const ax = map.x as ClaimId, ay = map.y as ClaimId;
  const products: { firm: string; firmName: string; mine: boolean; id: string; name: string; x: number; y: number }[] = [];
  for (const f of firms) {
    const fs = res.state.firms[f.id];
    if (!fs) continue;
    for (const p of Object.values(fs.products)) {
      if (p.retired || p.launchRound > res.round) continue;
      const prices = (res.market.pricesByFirm[f.id] ?? []).filter((x) => x.productId === p.spec.id).map((x) => x.price);
      if (!prices.length) continue;
      const price = prices.reduce((a, b) => a + b, 0) / prices.length;
      products.push({ firm: f.id, firmName: f.name, mine: f.id === me, id: p.spec.id, name: p.spec.name, x: perceived(p.spec, ax, price), y: perceived(p.spec, ay, price) });
    }
  }
  const segments = needsBought ? SEGMENTS.map((s) => ({ id: s.id, name: s.name, x: ideal(s.id, ax), y: ideal(s.id, ay) })) : [];
  return { x: ax, y: ay, products, segments };
}

/** A segment's ideal spot on one axis, from its hidden wants, rounded to a fuzzy area. */
function ideal(seg: SegmentId, axis: ClaimId): number {
  const sp = SEGMENT_PROFILES[seg];
  const w = sp.wants;
  const best = <K extends string>(r: Record<K, number>, score: Record<K, number>) => {
    const k = (Object.keys(r) as K[]).reduce((a, b) => (r[b] > r[a] ? b : a));
    return score[k];
  };
  let v = 0.5;
  switch (axis) {
    case "price": v = priceScore(sp.refPrice); break;
    case "battery": v = best(w.battery, { d2: 0.15, d7: 0.55, d14: 0.92 }); break;
    case "sleep": v = 0.1 + 0.8 * Math.max(w.sensors.stress, w.sensors.temp * 0.8); break;
    case "heart": v = 0.05 + 0.85 * Math.max(w.sensors.hr * 0.6, w.sensors.ecg); break;
    case "safety": v = 0.08 + 0.8 * w.sensors.fall; break;
    case "gps": v = 0.1 + 0.8 * Math.max(w.sensors.gps, w.chip.advanced * 0.6); break;
    case "design": v = best(w.material, { plastic: 0.2, aluminum: 0.55, titanium: 0.85 }); break;
    case "privacy": v = w.privacy.medical > w.privacy.standard ? 0.8 : 0.3; break;
    case "water": v = w.water.swim > w.water.splash ? 0.8 : 0.3; break;
    case "platform": v = 0.15 + 0.7 * Math.max(0, Math.min(1, 0.5 + w.subscription * 0.5)); break;
  }
  // Round to a tenth so the study shows an area, not an exact number.
  return Math.max(0.05, Math.min(0.95, Math.round(v * 10) / 10));
}

/**
 * A team's report as students may see it. The engine's internal multipliers (claim, satisfaction,
 * attractiveness, demand before stockouts) stay on the server, and fit and price appeal are sent as
 * the whole-number 0-100 ratings the report shows, so the hidden buyer model can't be read from the data.
 */
export function studentReport(rep: FirmReport | undefined): FirmReport | null {
  if (!rep) return null;
  const rows = rep.rows.map((x) => ({
    productId: x.productId,
    segment: x.segment,
    region: x.region,
    price: x.price,
    units: x.units,
    share: x.share,
    awareness: x.awareness,
    availability: x.availability,
    fit: Math.round(x.fit * 100) / 100,
    priceFactor: Math.round(Math.min(1, x.priceFactor) * 100) / 100,
  })) as unknown as FirmReport["rows"];
  return { ...rep, rows };
}
