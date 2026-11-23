/**
 * AI rivals. They play by the same rules and engine as student teams; only
 * their decision logic differs. Level runs 0-10: higher levels design better
 * products, price closer to what buyers will pay, read results and adapt.
 * Style gives each rival a recognisable personality.
 */
import {
  CHANNELS,
  CHANNEL_TERMS,
  COMPONENTS,
  MARKETING_BUDGET,
  PRODUCTION,
  ROUNDS,
  SEGMENTS,
  SENSORS,
  type AiStyle,
  type ChannelId,
  type RegionId,
  type SegmentId,
  type SensorId,
  type ToneId,
} from "./config";
import { CHANNEL_PUSH, REGION_PROFILES, SEGMENT_PROFILES } from "./market";
import { baseDemand, refPrice } from "./engine";
import { emptyDecision, newProduct, normalizeDecision, quote, regionIds, supportedClaims } from "./product";
import { hashString, mulberry32 } from "./rng";
import { fit } from "./fit";
import type { FirmDecision, FirmMeta, GameState, ProductSpec, RoundResult, Tier } from "./types";

const segIds = SEGMENTS.map((s) => s.id) as SegmentId[];

const STYLE_TARGETS: Record<AiStyle, SegmentId[][]> = {
  premium: [["fitness", "older"], ["wellness", "fitness"], ["older", "wellness"]],
  lowcost: [["budget", "business"], ["budget", "wellness"], ["business", "budget"]],
  follower: [["wellness", "budget"], ["budget", "older"]],
};
const STYLE_PRICE: Record<AiStyle, number> = { premium: 1.1, lowcost: 0.85, follower: 0.97 };

export interface AiContext {
  round: number;
  seed: number;
  state: GameState | null; // state after last round
  prevResult: RoundResult | null;
  firms: FirmMeta[];
}

export function aiDecide(firm: FirmMeta, ctx: AiContext): FirmDecision {
  const rng = mulberry32(hashString(firm.id) ^ (ctx.seed * 31 + ctx.round * 977));
  const skill = Math.max(0, Math.min(1, firm.aiLevel / 10));
  const noise = (scale: number) => (rng() * 2 - 1) * scale * (1 - skill);
  const fs = ctx.state?.firms[firm.id];
  const last = fs?.lastDecision ? normalizeDecision(structuredClone(fs.lastDecision)) : null;
  const d: FirmDecision = last ?? emptyDecision();
  d.research = [];
  d.capacityExpansion = 0;
  d.products.forEach((p) => (p.commission = false));

  // --- Strategy and targets ------------------------------------------------
  if (!last) {
    const targets = firm.targets?.length ? firm.targets : STYLE_TARGETS[firm.aiStyle][firm.slot % STYLE_TARGETS[firm.aiStyle].length];
    d.strategy.companyName = firm.name;
    d.strategy.posture = firm.aiStyle === "premium" ? "differentiate" : firm.aiStyle === "lowcost" ? "cost" : "follow";
    d.strategy.mission = `${firm.name} makes wearables for ${targets.map((t) => SEGMENTS.find((s) => s.id === t)!.name).join(" and ")}.`;
    d.strategy.targetSegments = [...targets];
  }
  if (firm.aiStyle === "follower" && ctx.prevResult && ctx.round >= 2 && rng() < 0.3 + skill * 0.5) {
    // Copy the leading firm's targets.
    const leader = Object.entries(ctx.prevResult.scores).sort((a, b) => a[1].rank - b[1].rank).find(([id]) => id !== firm.id);
    const lt = leader ? ctx.prevResult.decisions[leader[0]]?.strategy.targetSegments : null;
    if (lt?.length) d.strategy.targetSegments = lt.slice(0, 2);
  }
  const targets = d.strategy.targetSegments.length ? d.strategy.targetSegments : (["wellness", "budget"] as SegmentId[]);

  // --- Products: brief two in the practice round, a third in round 3 -------
  if (ctx.round === 0 && d.products.length === 0) {
    targets.slice(0, 2).forEach((s, i) => d.products.push(designFor(s, `p${i + 1}`, `${firm.name} ${["One", "Pro"][i]}`, skill, noise, firm.aiStyle)));
    d.products.forEach((p) => ((p.briefSent = true), (p.commission = true)));
  }
  if (ctx.round === 3 && d.products.length < 3 && skill >= 0.3 && ctx.prevResult) {
    const served: Record<string, number> = {};
    for (const units of Object.values(ctx.prevResult.market.unitsByFirmSegment))
      for (const [s, u] of Object.entries(units)) served[s] = (served[s] ?? 0) + (u ?? 0);
    const gap = segIds
      .filter((s) => !d.products.some((p) => p.targetSegment === s))
      .map((s) => ({ s, room: regionIds.reduce((a, r) => a + baseDemand(s, r, 4), 0) - (served[s] ?? 0) }))
      .sort((a, b) => b.room - a.room)[0];
    if (gap) {
      const p = designFor(gap.s, "p3", `${firm.name} Go`, skill, noise, firm.aiStyle);
      p.briefSent = true;
      p.commission = true;
      d.products.push(p);
    }
  }
  if (ctx.round === 0) {
    if (skill >= 0.5) d.research = ["survey"];
    return d;
  }

  // --- Regions and channels -----------------------------------------------
  const nRegions = Math.max(1, Math.min(4, 1 + Math.round(skill * 1.5) + Math.floor((ctx.round - 1) / 2)));
  const regionOrder = [...regionIds].sort((a, b) => targetDemand(targets, b, ctx.round) - targetDemand(targets, a, ctx.round));
  const chosen = regionOrder.slice(0, nRegions);
  for (const r of regionIds) {
    const rd = d.regions[r];
    if (chosen.includes(r) || fs?.regions[r]) {
      rd.enter = true;
      if (!fs?.regions[r]) rd.entryMode = skill >= 0.6 ? "partner" : "distributor";
      const k = 2 + Math.round(skill * 2);
      const ranked = (REGION_PROFILES[r].channels as ChannelId[])
        .map((ch) => ({ ch, w: targets.reduce((a, s) => a + (SEGMENT_PROFILES[s].channelMix[ch] ?? 0), 0) }))
        .filter((x) => x.w >= 0.1)
        .sort((a, b) => b.w - a.w)
        .slice(0, k)
        .map((x) => x.ch);
      rd.channels = ranked;
    }
  }

  // --- Media plan: split each cell's promotion between ads (by reach) and trade (by partner share) ---
  const mediaSplit = (seg: SegmentId, r: RegionId) => {
    const reach = SEGMENT_PROFILES[seg].mediaReach;
    const w = { digital: Math.pow(reach.digital, 1 + skill * 3), search: Math.pow(reach.search, 1 + skill * 3), traditional: Math.pow(reach.traditional, 1 + skill * 3) };
    const wt = w.digital + w.search + w.traditional;
    const chans = d.regions[r].channels;
    const partnerShare = chans.reduce((a, ch) => a + (CHANNEL_TERMS[ch].margin > 0 ? (SEGMENT_PROFILES[seg].channelMix[ch] ?? 0) * CHANNEL_PUSH[ch] : 0), 0);
    const trade = Math.min(0.5, 0.1 + partnerShare * (0.2 + 0.25 * skill));
    return { digital: ((1 - trade) * w.digital) / wt, search: ((1 - trade) * w.search) / wt, traditional: ((1 - trade) * w.traditional) / wt, trade };
  };
  for (const p of d.products) {
    if (!p.campaign?.tone || rng() < 0.15 * skill) {
      const tf = SEGMENT_PROFILES[p.targetSegment].toneFit;
      const tones = (Object.keys(tf) as ToneId[]).sort((a, b) => tf[b] - tf[a] + noise(0.6));
      p.campaign = { message: `${p.name}: made for ${SEGMENTS.find((x) => x.id === p.targetSegment)!.name}.`, tone: tones[0], segment: p.targetSegment };
    }
  }

  // --- Marketing budget pacing --------------------------------------------
  const pot =
    (fs?.marketingPot ?? 0) +
    (MARKETING_BUDGET.releases[ctx.round] ?? 0) +
    (ctx.round >= 2 ? Math.max(MARKETING_BUDGET.earnedFloor, MARKETING_BUDGET.earnedBase + MARKETING_BUDGET.earnedRevenueShare * (fs?.lastRevenue ?? 0)) * 0.9 : 0);
  const roundsLeft = ROUNDS.final - ctx.round + 1;
  const spendShare = ctx.round <= 2 ? 0.8 : Math.min(0.9, 1.15 / roundsLeft);
  let promoBudget = pot * spendShare * (0.85 + 0.15 * skill);
  if (skill >= 0.4 && ctx.round % 2 === 1) {
    d.research = ["competitors"];
    promoBudget -= 35_000;
  }
  promoBudget = Math.max(0, promoBudget);

  // --- Price, promotion, production ----------------------------------------
  const active = d.products.filter((p) => {
    const ps = fs?.products[p.id];
    return ps && !ps.retired && ps.launchRound <= ctx.round;
  });
  const cells: { p: ProductSpec; r: RegionId; w: number }[] = [];
  for (const p of active) for (const r of regionIds) if (d.regions[r].enter) cells.push({ p, r, w: baseDemand(p.targetSegment, r, ctx.round) });
  const wTot = cells.reduce((a, c) => a + c.w, 0) || 1;

  const prevSupply = ctx.prevResult?.reports[firm.id]?.supply ?? [];
  let totalProd = 0;
  for (const c of cells) {
    const { p, r } = c;
    const plan = (d.plan[p.id] ??= {} as FirmDecision["plan"][string]);
    const old = plan[r];
    const ref = refPrice(p.targetSegment, r);
    let price = old?.price && old.price > 0 ? old.price : ref * STYLE_PRICE[firm.aiStyle] * (1 + noise(0.3));
    const sup = prevSupply.find((y) => y.productId === p.id && y.region === r);
    const adapts = rng() < skill;
    if (sup && adapts) {
      if (sup.demand > 0 && sup.lost / sup.demand > 0.15) price *= 1.04;
      else if (sup.endInventory > Math.max(500, sup.sold * 0.35)) price *= 0.94;
    }
    price = Math.max(29, Math.round(price) - 0.01);
    let forecast: number;
    if (sup && sup.demand > 0) forecast = sup.demand * (1.03 + noise(0.2));
    else {
      const ps = fs?.products[p.id];
      const f = ps ? fit(ps.spec, p.targetSegment) : 0.6;
      forecast = baseDemand(p.targetSegment, r, ctx.round) * 0.2 * f * (1 + noise(0.5));
    }
    forecast = Math.max(0, Math.round(forecast));
    const inv = (fs?.inventory[p.id]?.[r] ?? []).reduce((a, l) => a + l.units, 0);
    const production = Math.max(0, Math.round(forecast * (1.05 + noise(0.25)) - inv));
    totalProd += production;
    const promo = Math.round((promoBudget * c.w) / wTot);
    const split = mediaSplit(p.targetSegment, r);
    const media = { digital: Math.round(promo * split.digital), search: Math.round(promo * split.search), traditional: Math.round(promo * split.traditional), trade: Math.round(promo * split.trade) };
    plan[r] = { price, forecast, production, media, promotion: media.digital + media.search + media.traditional + media.trade };
  }
  // Keep within capacity (+ a little overtime).
  const cap = (fs?.capacity ?? PRODUCTION.startCapacity) * 1.1;
  if (totalProd > cap) {
    const k = cap / totalProd;
    for (const c of cells) d.plan[c.p.id][c.r].production = Math.floor(d.plan[c.p.id][c.r].production * k);
    if (skill >= 0.4) d.capacityExpansion = Math.round((totalProd - cap) * 0.6);
  }

  // Claims refresh (better rivals match claims to what the target values).
  for (const p of d.products) {
    const ps = fs?.products[p.id];
    const spec = ps?.spec ?? p;
    const sup = [...supportedClaims(spec)];
    const cares = SEGMENT_PROFILES[p.targetSegment].caresAbout;
    p.claims = (skill >= 0.4 ? sup.filter((c) => cares.includes(c)) : sup).slice(0, 3);
  }

  // Goals: rough but numeric.
  d.goals = { share: 10, revenue: Math.round(cells.reduce((a, c) => a + d.plan[c.p.id][c.r].forecast * d.plan[c.p.id][c.r].price * 0.75, 0)), margin: 5, awareness: 30, satisfaction: 65 };
  void CHANNELS;
  return d;
}

function targetDemand(targets: SegmentId[], r: RegionId, round: number) {
  return targets.reduce((a, s) => a + baseDemand(s, r, Math.max(1, round)), 0);
}

/** Choose components for a segment: value of each option against its cost. */
export function designFor(seg: SegmentId, id: string, name: string, skill: number, noise: (s: number) => number, style: AiStyle): ProductSpec {
  const prof = SEGMENT_PROFILES[seg];
  const p = newProduct(id, 1);
  p.name = name;
  p.targetSegment = seg;
  const costWeight = (prof.priceSensitivity * 0.012) * (style === "lowcost" ? 1.4 : style === "premium" ? 0.7 : 1);
  const pick = <K extends string>(area: keyof typeof COMPONENTS, wants: Record<K, number>): K => {
    const opts = COMPONENTS[area].options as Record<string, { cost: number }>;
    let best = Object.keys(wants)[0] as K;
    let bestV = -Infinity;
    for (const k of Object.keys(wants) as K[]) {
      const v = wants[k] - costWeight * opts[k].cost + noise(0.4);
      if (v > bestV) {
        bestV = v;
        best = k;
      }
    }
    return best;
  };
  p.form = pick("form", prof.wants.form);
  p.battery = pick("battery", prof.wants.battery);
  p.display = p.form === "ring" ? "none" : pick("display", prof.wants.display);
  p.material = pick("material", prof.wants.material);
  p.water = pick("water", prof.wants.water);
  p.privacy = pick("privacy", prof.wants.privacy);
  p.sensors = (Object.keys(SENSORS) as SensorId[]).filter((s) => prof.wants.sensors[s] + noise(0.4) - costWeight * SENSORS[s].cost >= 0.45);
  if (!p.sensors.length) p.sensors = ["hr"];
  // Chip: the cheapest one that drives everything chosen.
  const need = Math.max(
    ...p.sensors.map((s) => ({ basic: 0, mid: 1, advanced: 2 })[SENSORS[s].minChip]),
    { none: 0, basic: 1, color: 2 }[p.display],
  );
  p.chip = (["basic", "mid", "advanced"] as const)[need];
  p.subscriptionPrice = prof.wants.subscription >= 0.4 && skill >= 0.4 ? 5 : 0;
  const ref = prof.refPrice;
  p.tier = (ref < 120 ? "good" : ref < 250 ? "better" : "best") as Tier;
  if (quote(p, 0).problems.length) p.display = "none";
  return p;
}
