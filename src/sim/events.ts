/**
 * MARKET EVENTS (instructor only: the numbers here are never shown to students).
 *
 * Three events, each in its own round by default:
 *  - Chip shortage (Round 4 and 5, announced when Round 3 opens): advanced chips cost much more,
 *    mid chips a little more, and each firm gets a limited number of advanced chips per round.
 *  - New rival launch (Round 5 on): a new entrant launches a strong product for one segment,
 *    mainly in one region. It has one real weakness, hinted in the news.
 *  - Tariff (Round 6 on): a duty on imported parts raises the cost to build every unit.
 *
 * Events change results only through the engine. There is no separate "event score": teams that
 * respond with the right mix of decisions simply do better. The instructor can move or turn off
 * each event before its round opens (class settings).
 */
import { CLAIMS, COMPONENTS, PRODUCT_COSTS, REGIONS, ROUNDS, SEGMENTS, type ClaimId, type RegionId, type SegmentId } from "./config";
import { SEGMENT_PROFILES } from "./market";
import { hashString } from "./rng";
import { supportedClaims } from "./product";
import type { FirmDecision, FirmMeta, GameState, ProductSpec, RoundResult } from "./types";

import { EVENT_META, eventSchedule, type EventId, type EventSchedule } from "./eventSchedule";
export { EVENT_IDS, eventSchedule, type EventId, type EventSchedule } from "./eventSchedule";

export const EVENT_RULES = {
  chip: {
    name: EVENT_META.chip.name,
    /** Rounds it lasts. */
    rounds: 2,
    /** Unit cost added per chip, as a share of the chip's listed cost. */
    costUp: { basic: 0, mid: 0.3, advanced: 1.5 },
    /** Each firm's advanced-chip allocation per round: this share of the advanced-chip units it sold the round before the shortage... */
    allocationShare: 0.35,
    /** ...but never fewer than this. */
    allocationMin: 4_000,
  },
  rival: {
    name: EVENT_META.rival.name,
    brand: "Orvane",
    /** How well the rival's product fits its segment (0..1). */
    fit: 0.95,
    /** Its price versus what the segment expects. It matches price cuts down to a floor... */
    priceVsRef: 0.95,
    /** ...which is low in segments that buy on brand and features (a price cut there just gets matched)... */
    priceFloor: 0.78,
    /** ...but high in value segments (price sensitivity at or above valueSensitivity): its costs don't let it follow a measured cut. */
    valuePriceFloor: 0.92,
    valueSensitivity: 1.8,
    /** In a value segment, attractiveness is multiplied by (rival price / your price) ^ (sensitivity x this). */
    valuePriceWeight: 1.5,
    /** Awareness in the main region the first round, rising each round after. */
    awareness: 0.9,
    awarenessGrowth: 0.08,
    /** Reach and awareness in the segment's other regions, as a share of the main region's. */
    otherRegions: 0.7,
    availability: 0.95,
    claimFactor: 1.12,
    /** A true claim about the rival's weakness counts this much (instead of the usual claim bonus) in the rival's segment. */
    weaknessClaimBonus: 1.0,
    /** Shelf squeeze: partners give the rival shelf space unless your trade promotion holds it. Share of reach lost with no trade. */
    shelfSqueeze: 0.8,
    /** Trade promotion (per product, per region) that wins back half of the squeeze. */
    shelfHalfSpend: 120_000,
  },
  tariff: {
    name: EVENT_META.tariff.name,
    /** Duty on the imported parts (everything except assembly, packaging and the app). */
    rate: 0.7,
  },
} as const;

export interface RivalVariant {
  segment: SegmentId;
  region: RegionId;
  weakness: ClaimId;
  startRound: number;
}

/** A firm's advanced-chip allocation for the shortage: based on what it sold the round before it started. */
export function chipAllocation(prev: RoundResult | null, firmId: string): number {
  const fs = prev?.state.firms[firmId];
  const rep = prev?.reports[firmId];
  let sold = 0;
  for (const p of Object.values(fs?.products ?? {})) if (p.spec.chip === "advanced") sold += rep?.byProduct[p.spec.id]?.units ?? 0;
  return Math.max(EVENT_RULES.chip.allocationMin, Math.round((sold * EVENT_RULES.chip.allocationShare) / 500) * 500);
}

/** True when the rival's segment buys mainly on price: there a measured price cut is a strong answer. */
export function isValueSegment(seg: SegmentId): boolean {
  return SEGMENT_PROFILES[seg].priceSensitivity >= EVENT_RULES.rival.valueSensitivity;
}

/** The lowest price (as a share of the segment's expected price) the rival will match down to. */
export function rivalFloor(seg: SegmentId): number {
  return isValueSegment(seg) ? EVENT_RULES.rival.valuePriceFloor : EVENT_RULES.rival.priceFloor;
}

export interface ActiveEvents {
  chip: boolean;
  /** Advanced-chip allocation per firm while the shortage lasts. */
  chipAlloc: Record<string, number>;
  rival: (RivalVariant & { roundsIn: number }) | null;
  tariff: boolean;
}

const chipActive = (sched: EventSchedule, round: number) => sched.chip !== null && round >= sched.chip && round < sched.chip + EVENT_RULES.chip.rounds;
const tariffActive = (sched: EventSchedule, round: number) => sched.tariff !== null && round >= sched.tariff;

/**
 * The rival goes after the segment student teams target most (so the event matters to them),
 * in the region where students sell the most in that segment. Its weakness is something that
 * segment cares about and that the students' products there can truthfully claim.
 */
export function chooseRival(seed: number, firms: FirmMeta[], prev: RoundResult | null, startRound: number): RivalVariant {
  const students = firms.filter((f) => !f.isAi);
  const pool = students.length ? students : firms;
  // Where student teams actually sell: units by segment (target lists can differ from what they sell).
  const segCount: Partial<Record<SegmentId, number>> = {};
  for (const f of pool) for (const x of prev?.reports[f.id]?.rows ?? []) segCount[x.segment] = (segCount[x.segment] ?? 0) + x.units;
  if (!Object.keys(segCount).length) for (const f of pool) for (const s of prev?.decisions[f.id]?.strategy.targetSegments ?? []) segCount[s] = (segCount[s] ?? 0) + 1;
  const segs = SEGMENTS.map((s) => s.id) as SegmentId[];
  const h = hashString(`rival:${seed}`);
  let segment = segs[h % segs.length];
  // Pick among the segments where students sell the most (the top two, by seed), so the event matters to them.
  const ranked = segs.filter((s) => (segCount[s] ?? 0) > 0).sort((a, b) => (segCount[b] ?? 0) - (segCount[a] ?? 0));
  if (ranked.length) segment = ranked[h % Math.min(2, ranked.length)];
  const regionUnits: Partial<Record<RegionId, number>> = {};
  for (const f of pool) for (const x of prev?.reports[f.id]?.rows ?? []) if (x.segment === segment) regionUnits[x.region] = (regionUnits[x.region] ?? 0) + x.units;
  const regs = REGIONS.map((r) => r.id) as RegionId[];
  let region = regs.slice().sort((a, b) => SEGMENT_PROFILES[segment].baseDemand[b] - SEGMENT_PROFILES[segment].baseDemand[a])[0];
  const topR = Object.entries(regionUnits).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0];
  if (topR && (topR[1] ?? 0) > 0) region = topR[0] as RegionId;
  // The weakness is something this segment cares about that the students' own products there can truthfully claim
  // (so there's a real way to answer the rival). Falls back to any benefit the segment cares about.
  const cares = SEGMENT_PROFILES[segment].caresAbout.filter((c) => c !== "price");
  const claimable = cares.filter((c) =>
    pool.some((f) => Object.values(prev?.state.firms[f.id]?.products ?? {}).some((p) => !p.retired && p.spec.targetSegment === segment && supportedClaims(p.spec).has(c))),
  );
  const list = claimable.length ? claimable : cares;
  const weakness = list[(h >> 3) % list.length] ?? "battery";
  return { segment, region, weakness, startRound };
}

/** Which events are in force in a round. Stores the rival's details in the state the first round it appears. */
export function eventsForRound(
  round: number,
  seed: number,
  firms: FirmMeta[],
  prevResult: RoundResult | null,
  prevState: GameState | null,
  settings?: { events?: Partial<EventSchedule> } | null,
): ActiveEvents {
  const sched = eventSchedule(settings);
  let rival: ActiveEvents["rival"] = null;
  if (sched.rival !== null && round >= sched.rival) {
    const stored = prevState?.events?.rival;
    const v = stored && stored.startRound === sched.rival ? stored : chooseRival(seed, firms, prevResult, sched.rival);
    rival = { ...v, roundsIn: round - v.startRound };
  }
  const chip = chipActive(sched, round);
  let chipAlloc: Record<string, number> = {};
  if (chip) {
    const stored = prevState?.events?.chipAlloc;
    chipAlloc = stored && prevState?.events?.chipStart === sched.chip ? stored : Object.fromEntries(firms.map((f) => [f.id, chipAllocation(prevResult, f.id)]));
  }
  return { chip, chipAlloc, rival, tariff: tariffActive(sched, round) };
}

/** Extra cost per unit from active events (chip shortage and tariff), given the unit cost before events. */
export function eventUnitCost(baseCost: number, quoted: number, spec: Pick<ProductSpec, "chip">, ev: ActiveEvents | null): number {
  if (!ev) return baseCost;
  let c = baseCost;
  if (ev.chip) c += chipListCost(spec.chip) * EVENT_RULES.chip.costUp[spec.chip];
  if (ev.tariff) {
    const partsShare = quoted > 0 ? Math.max(0, 1 - PRODUCT_COSTS.baseUnitCost / quoted) : 0.8;
    c *= 1 + EVENT_RULES.tariff.rate * partsShare;
  }
  return c;
}

function chipListCost(chip: ProductSpec["chip"]) {
  return COMPONENTS.chip.options[chip].cost;
}

// ---------------------------------------------------------------------------
// What students see: a news item when the round opens (plus an early warning
// for the chip shortage). No numbers, only what a manager would read.
// ---------------------------------------------------------------------------

export interface NewsItem {
  id: EventId;
  title: string;
  body: string;
  /** "now" = affects this round; "next" = expected next round. */
  when: "now" | "next";
}

const segName = (s: SegmentId) => SEGMENTS.find((x) => x.id === s)?.name ?? s;
const regionName = (r: RegionId) => REGIONS.find((x) => x.id === r)?.name ?? r;

export function newsFor(round: number, seed: number, firms: FirmMeta[], latest: RoundResult | null, settings?: { events?: Partial<EventSchedule> } | null): NewsItem[] {
  if (round < 1 || round > ROUNDS.final) return [];
  const sched = eventSchedule(settings);
  const ev = eventsForRound(round, seed, firms, latest, latest?.state ?? null, settings);
  const out: NewsItem[] = [];
  if (sched.chip !== null && round === sched.chip - 1)
    out.push({
      id: "chip",
      when: "next",
      title: "Chip makers warn of a shortage",
      body: "Industry suppliers say demand for processor chips is outrunning supply. They expect advanced chips to be scarce and much more expensive next round, with mid chips somewhat more expensive too. Each manufacturer's allocation of advanced chips will be based on how many it sold this round, and will be well below that. Products briefed now launch next round.",
    });
  if (ev.chip)
    out.push({
      id: "chip",
      when: "now",
      title: round === sched.chip ? "The chip shortage has arrived" : "The chip shortage continues",
      body: "Advanced chips cost much more this round and each manufacturer gets a limited allocation of them, based on what it sold the round before the shortage. Mid chips also cost more. Units planned beyond your allocation of advanced chips can't be built. Unit costs on your Products step include the higher prices." +
        (round > (sched.chip ?? 0) ? " Suppliers expect supply to recover after this round." : " Suppliers expect it to last two rounds."),
    });
  if (ev.rival) {
    const v = ev.rival;
    out.push({
      id: "rival",
      when: "now",
      title: ev.rival.roundsIn === 0 ? `${EVENT_RULES.rival.brand} launches a wearable for ${segName(v.segment)}` : `${EVENT_RULES.rival.brand} keeps pushing in ${segName(v.segment)}`,
      body:
        `${EVENT_RULES.rival.brand}, a well-funded newcomer, ${ev.rival.roundsIn === 0 ? "has launched" : "is selling"} a product aimed squarely at ${segName(v.segment)}, ` +
        `led by a big push in ${regionName(v.region)} and sold online elsewhere. Early reviews praise the design and the price, which sits a little under what these buyers usually pay. ` +
        `${isValueSegment(v.segment) ? `Analysts say ${EVENT_RULES.rival.brand}'s price is already close to its cost, so it has little room to cut further.` : `${EVENT_RULES.rival.brand} says it will match competitors' price cuts.`} Reviewers' one complaint: ${weaknessLine(v.weakness)} ` +
        `Retail partners are making shelf space for the newcomer.`,
    });
  }
  if (ev.tariff)
    out.push({
      id: "tariff",
      when: "now",
      title: round === sched.tariff ? "New tariff on imported electronic parts" : "The parts tariff stays in place",
      body: "Your division builds its products in North America from parts made overseas. A new tariff on those parts is paid by the importer, which is you, so it raises the cost of every unit you build, wherever it's sold. Assembly, packaging and the app aren't affected. Unit costs on your Products step include the tariff. What buyers expect to pay hasn't changed.",
    });
  return out;
}

function weaknessLine(c: ClaimId): string {
  const lines: Partial<Record<ClaimId, string>> = {
    battery: "the battery doesn't last long.",
    sleep: "its sleep and stress tracking is thin.",
    heart: "its heart monitoring isn't as good as rivals'.",
    safety: "it has no fall detection or safety alerts.",
    gps: "its GPS and training data aren't accurate.",
    design: "it feels cheap on the wrist.",
    privacy: "it's vague about how it protects health data.",
    water: "it isn't swim-proof.",
    platform: "its app and health dashboard are basic.",
  };
  return lines[c] ?? `it's weak on ${CLAIMS[c].name.toLowerCase()}.`;
}

// ---------------------------------------------------------------------------
// Instructor: Event response card. What each team changed in an event round,
// against the response rubric, plus how the round went. For debriefs and board
// meetings; students don't see it.
// ---------------------------------------------------------------------------

export interface ResponseLever {
  label: string;
  strength: "strong" | "medium" | "weak" | "small";
  used: boolean;
  detail: string;
}
export interface EventResponse {
  id: EventId;
  name: string;
  round: number;
  levers: ResponseLever[];
  outcome: string;
}

const pct = (x: number) => `${x >= 0 ? "+" : ""}${Math.round(x * 100)}%`;

function cells(d: FirmDecision | undefined) {
  const out: { pid: string; r: RegionId; price: number; production: number; forecast: number; trade: number; ads: number }[] = [];
  if (!d) return out;
  for (const [pid, regs] of Object.entries(d.plan ?? {}))
    for (const [r, c] of Object.entries(regs ?? {})) {
      if (!c) continue;
      const m = c.media ?? { digital: 0, search: 0, traditional: 0, trade: 0 };
      out.push({ pid, r: r as RegionId, price: c.price || 0, production: c.production || 0, forecast: c.forecast || 0, trade: m.trade || 0, ads: (m.digital || 0) + (m.search || 0) + (m.traditional || 0) });
    }
  return out;
}

/** Compares an event round's decisions with the round before. results: processed rounds by round number. */
export function eventResponses(firmId: string, results: Record<number, RoundResult>, settings?: { events?: Partial<EventSchedule> } | null): EventResponse[] {
  const sched = eventSchedule(settings);
  const out: EventResponse[] = [];
  const pair = (r: number) => ({ now: results[r], before: results[r - 1] });

  if (sched.chip !== null) {
    const { now, before } = pair(sched.chip);
    if (now) {
      const fs = now.state.firms[firmId];
      const d = now.decisions[firmId];
      const b = before?.decisions[firmId];
      const products = Object.values(fs?.products ?? {}).filter((p) => !p.retired && p.launchRound <= sched.chip!);
      const adv = new Set(products.filter((p) => p.spec.chip === "advanced").map((p) => p.spec.id));
      const priceChange = avgChange(cells(b).filter((c) => adv.has(c.pid)), cells(d).filter((c) => adv.has(c.pid)), "price");
      const advProd = cells(d).filter((c) => adv.has(c.pid)).reduce((a, c) => a + c.production, 0);
      const newMid = products.some((p) => p.briefedRound === sched.chip! - 1 && p.spec.chip !== "advanced");
      const fcChange = avgChange(cells(b), cells(d), "forecast");
      const rep = now.reports[firmId];
      const lost = (rep?.supply ?? []).reduce((a, y) => a + y.lost, 0);
      const alloc = now.state.events?.chipAlloc?.[firmId] ?? 0;
      out.push({
        id: "chip",
        name: EVENT_RULES.chip.name,
        round: sched.chip,
        levers: adv.size
          ? [
              { label: "Raised prices on advanced-chip products", strength: "strong", used: (priceChange ?? 0) > 0.02, detail: priceChange === null ? "No earlier price to compare" : `Average price ${pct(priceChange)}` },
              { label: "Planned production within the chip allocation", strength: "strong", used: advProd <= alloc * 1.02, detail: `${Math.round(advProd).toLocaleString()} advanced-chip units planned (allocation ${alloc.toLocaleString()})` },
              { label: "New product on a mid or basic chip", strength: "medium", used: newMid, detail: newMid ? "Yes" : "No" },
              { label: "Adjusted the forecast", strength: "small", used: Math.abs(fcChange ?? 0) > 0.03, detail: fcChange === null ? "No earlier forecast" : `Forecast ${pct(fcChange)}` },
            ]
          : [{ label: "No advanced-chip products", strength: "small", used: true, detail: "Only the smaller mid-chip cost increase applied" }],
        outcome: outcomeLine(now, before, firmId) + (lost > 0 ? ` Lost sales from stockouts: ${Math.round(lost).toLocaleString()} units.` : ""),
      });
    }
  }

  if (sched.rival !== null) {
    const { now, before } = pair(sched.rival);
    const v = now?.state.events?.rival;
    if (now && v) {
      const d = now.decisions[firmId];
      const b = before?.decisions[firmId];
      const inSeg = new Set((d?.products ?? []).filter((p) => p.targetSegment === v.segment).map((p) => p.id));
      const touches = inSeg.size > 0 || (d?.strategy.targetSegments ?? []).includes(v.segment);
      const claimed = (d?.products ?? []).some((p) => inSeg.has(p.id) && p.claims.includes(v.weakness));
      const campaign = (d?.products ?? []).some((p) => inSeg.has(p.id) && p.campaign?.segment === v.segment);
      const nowC = cells(d).filter((c) => inSeg.has(c.pid));
      const befC = cells(b).filter((c) => inSeg.has(c.pid));
      const sum = (xs: typeof nowC, k: "trade" | "ads") => xs.reduce((a, c) => a + c[k], 0);
      const tradeR = (xs: typeof nowC) => xs.filter((c) => c.r === v.region).reduce((a, c) => a + c.trade, 0);
      const priceChange = avgChange(befC, nowC, "price");
      const fcChange = avgChange(befC, nowC, "forecast");
      const targetsNow = d?.strategy.targetSegments ?? [];
      const targetsBefore = b?.strategy.targetSegments ?? [];
      const dropped = targetsBefore.includes(v.segment) && !targetsNow.includes(v.segment);
      // In a value segment, with a value product (Good tier, or built for this segment), a measured price cut is a strong answer.
      const valueFight = isValueSegment(v.segment) && (d?.products ?? []).some((p) => inSeg.has(p.id) && (p.tier === "good" || p.targetSegment === v.segment));
      out.push({
        id: "rival",
        name: `${EVENT_RULES.rival.name}: ${segName(v.segment)}, mainly ${regionName(v.region)}`,
        round: sched.rival,
        levers: touches
          ? [
              { label: `Promoted the rival's weak spot (${CLAIMS[v.weakness].name})`, strength: "strong", used: claimed, detail: claimed ? `Claim used${campaign ? ", with a campaign for this segment" : ""}` : "Not claimed" },
              { label: `More trade support in ${regionName(v.region)}`, strength: "strong", used: tradeR(nowC) > tradeR(befC) * 1.1 + 1, detail: `$${Math.round(tradeR(befC)).toLocaleString()} to $${Math.round(tradeR(nowC)).toLocaleString()}` },
              { label: "More awareness ads in the segment", strength: "medium", used: sum(nowC, "ads") > sum(befC, "ads") * 1.1 + 1, detail: `$${Math.round(sum(befC, "ads")).toLocaleString()} to $${Math.round(sum(nowC, "ads")).toLocaleString()}` },
              { label: "Moved effort to another segment", strength: "medium", used: dropped, detail: dropped ? "Dropped the segment from its targets" : "No" },
              valueFight
                ? { label: "Measured price cut (value segment, value product)", strength: "medium", used: (priceChange ?? 0) < -0.03 && (priceChange ?? 0) > -0.2, detail: priceChange === null ? "No earlier price" : `Average price ${pct(priceChange)}${(priceChange ?? 0) <= -0.2 ? " (deep cut: margin given away)" : ""}` }
                : { label: "Cut price", strength: "weak", used: (priceChange ?? 0) < -0.03, detail: priceChange === null ? "No earlier price" : `Average price ${pct(priceChange)} (the rival matches cuts in this segment)` },
              { label: "Adjusted the forecast", strength: "small", used: (fcChange ?? 0) < -0.03, detail: fcChange === null ? "No earlier forecast" : `Forecast ${pct(fcChange)}` },
            ]
          : [{ label: `Not in ${segName(v.segment)}`, strength: "small", used: true, detail: "This team wasn't exposed to the rival" }],
        outcome: outcomeLine(now, before, firmId, v.segment),
      });
    }
  }

  if (sched.tariff !== null) {
    const { now, before } = pair(sched.tariff);
    if (now) {
      const d = now.decisions[firmId];
      const b = before?.decisions[firmId];
      const nowC = cells(d);
      const befC = cells(b);
      const specs = Object.fromEntries((d?.products ?? []).map((p) => [p.id, p.targetSegment]));
      const sens = (pid: string) => SEGMENT_PROFILES[(specs[pid] ?? "wellness") as SegmentId].priceSensitivity;
      const low = (c: { pid: string }) => sens(c.pid) <= 1.4;
      const pLow = avgChange(befC.filter(low), nowC.filter(low), "price");
      const pHigh = avgChange(befC.filter((c) => !low(c)), nowC.filter((c) => !low(c)), "price");
      const pAll = avgChange(befC, nowC, "price");
      const selective = pLow !== null && pLow > 0.02 && (pHigh === null || pLow > pHigh + 0.01);
      const prodChange = avgChange(befC, nowC, "production");
      const adsShare = (xs: typeof nowC) => {
        const t = xs.reduce((a, c) => a + c.ads + c.trade, 0);
        return t > 0 ? xs.filter(low).reduce((a, c) => a + c.ads + c.trade, 0) / t : 0;
      };
      const shift = adsShare(nowC) - adsShare(befC);
      const sup = now.reports[firmId]?.supply ?? [];
      const demandT = sup.reduce((a, y) => a + y.demand, 0);
      const soldT = sup.reduce((a, y) => a + y.sold, 0);
      const lostT = sup.reduce((a, y) => a + y.lost, 0);
      const leftT = sup.reduce((a, y) => a + y.endInventory, 0);
      const matched = demandT > 0 && lostT / demandT < 0.05 && leftT <= 0.25 * Math.max(1, soldT);
      out.push({
        id: "tariff",
        name: EVENT_RULES.tariff.name,
        round: sched.tariff,
        levers: [
          { label: "Passed on more of the cost where buyers care less about price", strength: "strong", used: selective, detail: `Less price-sensitive products ${pLow === null ? "n/a" : pct(pLow)}, others ${pHigh === null ? "n/a" : pct(pHigh)}` },
          { label: "Raised prices at all", strength: "medium", used: (pAll ?? 0) > 0.02, detail: pAll === null ? "No earlier price" : `Average price ${pct(pAll)}` },
          { label: "Shifted promotion toward segments with margin room", strength: "medium", used: shift > 0.03, detail: `Share of promotion on less price-sensitive products ${pct(shift)} (points)` },
          { label: "Matched production to demand at the new prices", strength: "small", used: matched, detail: `Production ${prodChange === null ? "n/a" : pct(prodChange)}; lost sales ${Math.round(lostT).toLocaleString()} units, left over ${Math.round(leftT).toLocaleString()}` },
        ],
        outcome: outcomeLine(now, before, firmId),
      });
    }
  }
  return out;
}

function avgChange<T extends { pid: string; r: RegionId }>(before: (T & Record<string, unknown>)[], now: (T & Record<string, unknown>)[], key: "price" | "forecast" | "production"): number | null {
  const changes: number[] = [];
  for (const c of now) {
    const b = before.find((x) => x.pid === c.pid && x.r === c.r);
    const bv = b ? Number(b[key]) : 0;
    const nv = Number(c[key]);
    if (bv > 0 && nv >= 0) changes.push(nv / bv - 1);
  }
  return changes.length ? changes.reduce((a, x) => a + x, 0) / changes.length : null;
}

function outcomeLine(now: RoundResult, before: RoundResult | undefined, firmId: string, seg?: SegmentId): string {
  const s = now.scores[firmId];
  const sb = before?.scores[firmId];
  const p = now.reports[firmId]?.pnl;
  const pb = before?.reports[firmId]?.pnl;
  const parts: string[] = [];
  if (s) parts.push(`Round score ${s.total.toFixed(1)}${sb ? ` (was ${sb.total.toFixed(1)})` : ""}, rank ${s.rank}.`);
  if (p) parts.push(`Operating profit $${Math.round(p.operatingProfit).toLocaleString()}${pb ? ` (was $${Math.round(pb.operatingProfit).toLocaleString()})` : ""}.`);
  if (seg) {
    const sh = s?.segShare?.[seg];
    const shb = sb?.segShare?.[seg];
    if (sh !== undefined) parts.push(`Share of ${segName(seg)} ${Math.round(sh * 100)}%${shb !== undefined ? ` (was ${Math.round(shb * 100)}%)` : ""}.`);
  }
  return parts.join(" ");
}
