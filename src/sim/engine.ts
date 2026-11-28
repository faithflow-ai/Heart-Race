/**
 * The round engine. Given last round's state and every firm's decisions, it
 * returns the new state, each firm's reports and the scorecard. It is
 * deterministic: the same inputs and seed always give the same results.
 */
import {
  CHANNEL_TERMS,
  CLAIMS,
  DEFAULT_SETTINGS,
  ENTRY_MODES,
  FINANCE,
  LEVERAGE,
  PRODUCTION,
  PRODUCT_RULES,
  REGIONS,
  ROUNDS,
  SEGMENTS,
  STUDIES,
  type ChannelId,
  type GameSettings,
  type RegionId,
  type ScoreKey,
  type SegmentId,
} from "./config";
import { AWARENESS, CAMPAIGN, CHANNEL_PUSH, DEMAND_MODEL, REGION_PROFILES, SATISFACTION, SEGMENT_PROFILES, TRADE_PROMO } from "./market";
import { cellPromo, claimIsTrue, emptyMedia, normalizeDecision, quote, regionIds, specProblems, unitCostAt } from "./product";
import { mulberry32, hashString } from "./rng";
import { fit } from "./fit";
import { EVENT_RULES, eventSchedule, eventUnitCost, eventsForRound, isValueSegment, rivalFloor, type ActiveEvents } from "./events";

/** Row owner for the event rival (not a firm in the class). */
export const RIVAL_ID = "__event_rival";
import type {
  FirmDecision,
  FirmMeta,
  FirmReport,
  FirmState,
  GameState,
  InventoryLot,
  PnL,
  ProductSpec,
  PromoResult,
  RoundResult,
  ScoreBreakdown,
  ShareRow,
} from "./types";

const segIds = SEGMENTS.map((s) => s.id) as SegmentId[];

export function initialFirmState(settings: GameSettings = DEFAULT_SETTINGS): FirmState {
  return {
    capital: settings.startingCapital,
    marketingPot: 0,
    lastTopUp: 0,
    lastRevenue: 0,
    capacity: PRODUCTION.startCapacity,
    pendingCapacity: 0,
    products: {},
    regions: {},
    channelsOpen: {},
    awareness: {},
    satisfaction: {},
    inventory: {},
    channelUnits: {},
    lastDecision: null,
  };
}

export function initialState(firms: FirmMeta[], settings: GameSettings = DEFAULT_SETTINGS): GameState {
  const s: GameState = { round: -1, firms: {} };
  for (const f of firms) s.firms[f.id] = initialFirmState(settings);
  return s;
}

/** Segment demand (units) in a region for a round, before any random factor. */
export function baseDemand(seg: SegmentId, region: RegionId, round: number): number {
  const p = SEGMENT_PROFILES[seg];
  const season = REGION_PROFILES[region].season[round] ?? 1;
  return p.baseDemand[region] * Math.pow(1 + p.growthPerRound, Math.max(0, round - 1)) * season;
}

export function refPrice(seg: SegmentId, region: RegionId) {
  return SEGMENT_PROFILES[seg].refPrice * REGION_PROFILES[region].priceLevel;
}
export function maxPrice(seg: SegmentId, region: RegionId) {
  return SEGMENT_PROFILES[seg].maxPrice * REGION_PROFILES[region].priceLevel;
}

export function priceFactor(seg: SegmentId, region: RegionId, price: number): number {
  const ref = refPrice(seg, region);
  const max = maxPrice(seg, region);
  if (price <= 0) return 0;
  if (price >= max) return 0.01;
  const rel = (price - ref) / ref;
  const sens = SEGMENT_PROFILES[seg].priceSensitivity;
  // Above the reference price demand falls off; below it there's a modest lift.
  const f = rel >= 0 ? Math.exp(-sens * rel * 1.5) : 1 + Math.min(0.6, -rel * sens * 0.5);
  // Taper to zero as price approaches the max the segment will pay.
  const taper = Math.min(1, (max - price) / (max - ref));
  return Math.max(0.01, f * (rel >= 0 ? taper : 1));
}

const regionName = (r: RegionId) => REGIONS.find((x) => x.id === r)?.name ?? r;

/** Most a firm may spend on promotion + research this round: the greater of a floor or a share of last round's revenue. */
export function spendingLimit(fs: Pick<FirmState, "lastRevenue">, settings: GameSettings = DEFAULT_SETTINGS): number {
  const mb = settings.marketingBudget;
  return Math.max(mb.roundCapFloor, mb.roundCapRevenueShare * (fs.lastRevenue ?? 0));
}

/**
 * Partner stocking with trade support. Partners carry less of a brand that gives them nothing:
 * without trade promotion a partner stocks (1 - dependence) of its usual reach; trade money wins back the rest.
 * Dependence scales with how strongly that partner type responds to trade (the own website doesn't depend on it).
 */
export function stockingFactor(ch: ChannelId, tradeSpend: number): number {
  if (CHANNEL_TERMS[ch].margin <= 0) return 1;
  const dep = TRADE_PROMO.stockDependence * Math.min(1, CHANNEL_PUSH[ch] ?? 0);
  const t = tradeSpend > 0 ? tradeSpend / (tradeSpend + TRADE_PROMO.stockHalfSpend) : 0;
  return 1 - dep + dep * t;
}

export function marginCut(units: number): number {
  let tiers = 0;
  for (const t of LEVERAGE.tiers) if (units >= t) tiers++;
  return Math.min(LEVERAGE.maxCut, tiers * LEVERAGE.cutPerTier);
}

/** Partner margin a firm pays in one channel and region this round. */
export function channelMargin(state: FirmState, region: RegionId, ch: ChannelId): number {
  const base = CHANNEL_TERMS[ch].margin;
  if (base === 0) return 0;
  const mode = state.regions[region];
  const extra = mode ? ENTRY_MODES[mode].extraMargin : 0;
  const cut = marginCut(state.channelUnits[region]?.[ch] ?? 0);
  return Math.max(0, base + extra - cut);
}

/** In-store push a partner channel gives a product, from the trade promotion spent on it in that region. */
export function channelPush(ch: ChannelId, tradeSpend: number): number {
  if (tradeSpend <= 0 || CHANNEL_TERMS[ch].margin <= 0) return 0;
  const p = TRADE_PROMO.maxPush * (CHANNEL_PUSH[ch] ?? 0) * (tradeSpend / (tradeSpend + TRADE_PROMO.halfSaturationSpend));
  return Math.min(TRADE_PROMO.maxPushCap, p);
}

/**
 * Share of a segment's buyers in a region who can find the product, and through which channels.
 * Trade promotion widens stocking in partner channels; push[ch] is the in-store push in each.
 */
export function availability(
  state: FirmState,
  region: RegionId,
  seg: SegmentId,
  tradeSpend: number,
): { total: number; byChannel: Partial<Record<ChannelId, number>>; push: Partial<Record<ChannelId, number>> } {
  const mode = state.regions[region];
  if (!mode) return { total: 0, byChannel: {}, push: {} };
  const chans = state.channelsOpen[region] ?? [];
  const mix = SEGMENT_PROFILES[seg].channelMix;
  const byChannel: Partial<Record<ChannelId, number>> = {};
  const push: Partial<Record<ChannelId, number>> = {};
  let total = 0;
  for (const ch of chans) {
    if (!REGION_PROFILES[region].channels.includes(ch)) continue;
    const share = mix[ch] ?? 0;
    const p = channelPush(ch, tradeSpend);
    push[ch] = p;
    const a = share * Math.min(1, CHANNEL_TERMS[ch].coverage * ENTRY_MODES[mode].coverageBoost * stockingFactor(ch, tradeSpend));
    byChannel[ch] = a;
    total += a;
  }
  return { total: Math.min(1, total), byChannel, push };
}

/** How much a product's campaign multiplies its ads' effect in one segment. */
export function campaignMultiplier(campaign: ProductSpec["campaign"] | undefined, seg: SegmentId, creativeBoost = 0): number {
  if (!campaign || !campaign.tone) return CAMPAIGN.noCampaign;
  const tf = SEGMENT_PROFILES[seg].toneFit[campaign.tone] ?? 0.5;
  if (campaign.segment === seg) return CAMPAIGN.target + CAMPAIGN.toneWeight * tf + creativeBoost;
  return CAMPAIGN.other + CAMPAIGN.otherToneWeight * tf;
}

function emptyPnl(): PnL {
  return {
    grossSales: 0,
    partnerMargin: 0,
    fulfillment: 0,
    revenue: 0,
    subscriptionRevenue: 0,
    clearanceRevenue: 0,
    cogs: 0,
    overtimePremium: 0,
    holding: 0,
    capacityFixed: 0,
    promotion: 0,
    research: 0,
    devFees: 0,
    entryFees: 0,
    channelSetup: 0,
    expansion: 0,
    exitFees: 0,
    interest: 0,
    overhead: 0,
    operatingProfit: 0,
    scoredProfit: 0,
    expansionAmortized: 0,
  };
}

export interface ProcessInput {
  round: number;
  seed: number;
  firms: FirmMeta[];
  prevState: GameState | null;
  /** Decisions for this round; a missing firm carries forward its last decision. */
  decisions: Record<string, FirmDecision | null | undefined>;
  /** Firms whose decision was carried forward without edits this round. */
  carriedForward?: Set<string>;
  prevResult?: RoundResult | null;
  settings?: GameSettings;
  /** Creative quality boost per firm (from the instructor's rubric grades), added to campaign effect in the campaign's segment. */
  creativeBoost?: Record<string, number>;
}

const clone = <T>(x: T): T => structuredClone(x);

export function processRound(input: ProcessInput): RoundResult {
  const { round, firms } = input;
  const settings = input.settings ?? DEFAULT_SETTINGS;
  const state: GameState = input.prevState ? clone(input.prevState) : initialState(firms, settings);
  state.round = round;
  const rng = mulberry32(input.seed * 7919 + round * 104729);
  // Market events in force this round (the rival's details are fixed the first round it appears).
  const ev: ActiveEvents = eventsForRound(round, input.seed, firms, input.prevResult ?? null, input.prevState, settings);
  if (ev.chip) state.events = { ...(state.events ?? {}), chipStart: eventSchedule(settings).chip ?? undefined, chipAlloc: ev.chipAlloc };
  if (ev.rival) state.events = { ...(state.events ?? {}), rival: { segment: ev.rival.segment, region: ev.rival.region, weakness: ev.rival.weakness, startRound: ev.rival.startRound } };

  const decisions: Record<string, FirmDecision> = {};
  const reports: Record<string, FirmReport> = {};
  const pnls: Record<string, PnL> = {};

  // ---- 1. Per-firm spending and setup ------------------------------------
  for (const f of firms) {
    if (!state.firms[f.id]) state.firms[f.id] = initialFirmState(settings);
    const fs = state.firms[f.id];
    const d = normalizeDecision(input.decisions[f.id] ?? fs.lastDecision);
    decisions[f.id] = d;
    const pnl = emptyPnl();
    pnls[f.id] = pnl;
    const notes: string[] = [];
    const capitalStart = fs.capital;

    // Capacity ordered last round comes online.
    fs.capacity += fs.pendingCapacity;
    fs.pendingCapacity = 0;

    // Interest on HQ's emergency loan (charged to profit, paid from capital).
    if (round >= 1 && (fs.loan ?? 0) > 0) {
      pnl.interest = (fs.loan ?? 0) * FINANCE.loanInterestPerRound;
      fs.capital -= pnl.interest;
    }

    // Marketing budget.
    const potStart = fs.marketingPot;
    const release = round >= 1 ? settings.marketingBudget.releases[round] ?? 0 : 0;
    let earned = 0;
    if (round >= 2) {
      const mb = settings.marketingBudget;
      earned = Math.max(mb.earnedFloor, mb.earnedBase + mb.earnedRevenueShare * fs.lastRevenue);
      if (fs.lastTopUp > 0) earned = Math.min(earned, fs.lastTopUp * (1 + mb.earnedCapGrowth));
      earned = Math.min(earned, mb.earnedCapAbsolute);
      fs.lastTopUp = earned;
    }
    fs.marketingPot += release + earned;

    // Research (charged to the marketing pot).
    let research = 0;
    for (const s of new Set(d.research)) {
      const st = STUDIES[s];
      if (!st) continue;
      if ("practiceOnly" in st && st.practiceOnly && round !== 0) continue;
      research += st.cost;
    }
    // Per-round spending limit on promotion + research (the greater of a floor or a share of last round's revenue).
    const spendLimit = round >= 1 ? spendingLimit(fs, settings) : Infinity;
    research = Math.min(research, fs.marketingPot, spendLimit);
    fs.marketingPot -= research;
    pnl.research = research;

    // Promotion (charged to the marketing pot; scaled down if over budget).
    let promoAsked = 0;
    for (const pid of Object.keys(d.plan)) for (const r of regionIds) promoAsked += cellPromo(d.plan[pid]?.[r]);
    const promoRoom = Math.max(0, Math.min(fs.marketingPot, spendLimit - research));
    const promoScale = promoAsked > promoRoom ? promoRoom / promoAsked : 1;
    if (promoScale < 1 && promoAsked > 0)
      notes.push(
        promoRoom < fs.marketingPot
          ? `Promotion was cut to ${Math.round(promoScale * 100)}% because promotion and research together can't go over this round's spending limit of $${Math.round(spendLimit).toLocaleString()}.`
          : `Promotion was cut to ${Math.round(promoScale * 100)}% because it exceeded the marketing budget.`,
      );
    (d as FirmDecision & { _promoScale?: number })._promoScale = round >= 1 ? promoScale : 0;
    if (round >= 1) {
      pnl.promotion = promoAsked * promoScale;
      fs.marketingPot -= pnl.promotion;
    }

    // Region entry and channel setup (company capital). Entry starts selling this round.
    if (round >= 1) {
      for (const r of regionIds) {
        const rd = d.regions[r];
        // Exit: one-time fee, ends overhead, clears stock there at a discount, resets partner volume discounts.
        if (rd.exit && fs.regions[r]) {
          const mode = fs.regions[r]!;
          const fee = ENTRY_MODES[mode].fee * FINANCE.exitFeeShare;
          pnl.exitFees = (pnl.exitFees ?? 0) + fee;
          fs.capital -= fee;
          for (const ps of Object.values(fs.products)) {
            const lots = fs.inventory[ps.spec.id]?.[r];
            const left = (lots ?? []).reduce((a, l) => a + l.units, 0);
            if (left > 0) {
              const uc = unitCostAt(ps.quotedUnitCost, ps.cumUnits, round, ps.briefedRound);
              pnl.clearanceRevenue += left * uc * PRODUCTION.clearanceRecovery;
              pnl.cogs += (lots ?? []).reduce((a, l) => a + l.units * (l.cost ?? uc), 0);
              notes.push(`${Math.round(left).toLocaleString()} units of ${ps.spec.name} left in ${regionName(r)} were cleared at a discount when you exited.`);
            }
            if (fs.inventory[ps.spec.id]) fs.inventory[ps.spec.id][r] = [];
          }
          const { [r]: _gone, ...keep } = fs.regions;
          fs.regions = keep;
          fs.channelsOpen[r] = [];
          fs.channelUnits[r] = {};
          notes.push(`You exited ${regionName(r)} (one-time fee $${Math.round(fee).toLocaleString()}). Its overhead stops from this round.`);
          rd.exit = false;
          rd.enter = false;
          rd.channels = [];
          continue;
        }
        if (rd.exit) rd.exit = false;
        if (rd.enter && !fs.regions[r]) {
          const fee = ENTRY_MODES[rd.entryMode].fee;
          fs.regions[r] = rd.entryMode;
          pnl.entryFees += fee;
          fs.capital -= fee;
        }
        if (fs.regions[r]) {
          const open = new Set(fs.channelsOpen[r] ?? []);
          for (const ch of rd.channels) {
            if (!REGION_PROFILES[r].channels.includes(ch)) continue;
            if (!open.has(ch)) {
              pnl.channelSetup += CHANNEL_TERMS[ch].setupFee;
              fs.capital -= CHANNEL_TERMS[ch].setupFee;
            }
          }
          const next = rd.channels.filter((c) => REGION_PROFILES[r].channels.includes(c));
          // Leaving a channel is free, but coming back later starts over at the partner's normal margin.
          for (const ch of open) if (!next.includes(ch) && fs.channelUnits[r]?.[ch]) fs.channelUnits[r]![ch] = 0;
          fs.channelsOpen[r] = next;
        }
      }
    }

    // Product briefs: commission (dev fee from capital, ready after lead time) and retire.
    const live = Object.values(fs.products).filter((p) => !p.retired);
    for (const spec of d.products) {
      const existing = fs.products[spec.id];
      if (existing) {
        existing.spec = { ...existing.spec, name: spec.name, claims: spec.claims.slice(0, 3), subscriptionPrice: spec.subscriptionPrice, retire: spec.retire, campaign: spec.campaign };
        if (spec.retire && !existing.retired) existing.retired = true;
        continue;
      }
      if (!spec.commission) continue;
      const allowed = round < PRODUCT_RULES.thirdProductBriefRound ? PRODUCT_RULES.maxProductsAtLaunch : PRODUCT_RULES.maxProductsTotal;
      if (live.length >= allowed) {
        notes.push(`"${spec.name}" was not sent to engineering: you can have ${allowed} products at this stage.`);
        continue;
      }
      if (specProblems(spec).length) {
        notes.push(`Engineering rejected "${spec.name}": ${specProblems(spec).join(" ")}`);
        continue;
      }
      const q = quote(spec, round);
      if (fs.capital < q.devFee) {
        notes.push(`"${spec.name}" was not developed: company capital is below the $${q.devFee.toLocaleString()} development fee.`);
        continue;
      }
      fs.capital -= q.devFee;
      pnl.devFees += q.devFee;
      const ps = {
        spec: { ...spec, commission: true },
        briefedRound: round,
        launchRound: round + q.leadTime,
        retired: false,
        devFee: q.devFee,
        quotedUnitCost: q.unitCost,
        cumUnits: 0,
        subscribers: 0,
      };
      fs.products[spec.id] = ps;
      live.push(ps);
      notes.push(`Engineering accepted "${spec.name}". It will be ready to sell in ${ROUNDS.names[ps.launchRound] ?? "a later round"}.`);
    }

    // Capacity expansion (capital; online next round).
    if (round >= 1 && d.capacityExpansion > 0) {
      const cost = d.capacityExpansion * PRODUCTION.expansionCostPerUnit;
      if (fs.capital >= cost) {
        fs.capital -= cost;
        pnl.expansion = cost;
        fs.pendingCapacity += d.capacityExpansion;
        (fs.expansionAmort ??= []).push({ amount: cost, roundsLeft: FINANCE.expansionAmortRounds });
      } else notes.push("Capacity expansion was skipped: not enough company capital.");
    }

    reports[f.id] = {
      firmId: f.id,
      carriedForward: input.carriedForward?.has(f.id) ?? false,
      pnl,
      byProduct: {},
      byRegion: {},
      byChannel: {},
      rows: [],
      supply: [],
      goals: [],
      forecastAccuracy: 0,
      budget: { start: potStart, release, earned, spent: research + pnl.promotion, end: fs.marketingPot },
      spendLimit: Number.isFinite(spendLimit) ? Math.round(spendLimit) : undefined,
      capital: { start: capitalStart, end: 0 },
      capacity: { capacity: fs.capacity, used: 0, overtime: 0, nextRound: fs.capacity + fs.pendingCapacity },
      concerns: [],
      drivers: [],
      notes,
    };
  }

  // ---- 2. Market ----------------------------------------------------------
  const demand = {} as Record<SegmentId, Record<RegionId, number>>;
  for (const s of segIds) {
    demand[s] = {} as Record<RegionId, number>;
    for (const r of regionIds) {
      const noise = 1 + (rng() * 2 - 1) * DEMAND_MODEL.demandNoise;
      demand[s][r] = round >= 1 ? Math.round(baseDemand(s, r, round) * noise) : 0;
    }
  }

  const rows: ShareRow[] = [];
  const rowFirm = new Map<ShareRow, string>();
  const rowChannels = new Map<ShareRow, Partial<Record<ChannelId, number>>>();
  const falseClaims: Record<string, Record<string, number>> = {};

  if (round >= 1) {
    for (const f of firms) {
      const fs = state.firms[f.id];
      const d = decisions[f.id];
      const scale = (d as FirmDecision & { _promoScale?: number })._promoScale ?? 1;
      const boost = input.creativeBoost?.[f.id] ?? 0;
      const promo: PromoResult[] = [];
      fs.shelfAwareness = {};
      falseClaims[f.id] = {};
      for (const ps of Object.values(fs.products)) {
        if (ps.retired || ps.launchRound > round) continue;
        const pid = ps.spec.id;
        fs.awareness[pid] ??= {};
        for (const r of regionIds) {
          const plan = d.plan[pid]?.[r];
          const media = { ...emptyMedia(), ...(plan?.media ?? {}) };
          const spend = emptyMedia();
          for (const m of Object.keys(spend) as (keyof typeof spend)[]) spend[m] = Math.max(0, Number(media[m]) || 0) * scale;
          const trade = spend.trade;
          fs.awareness[pid][r] ??= {};
          const pr: PromoResult = { productId: pid, region: r, spend, segments: {}, channels: {}, campaignSegment: ps.spec.campaign?.segment ?? "" };
          for (const s of segIds) {
            const reach = SEGMENT_PROFILES[s].mediaReach;
            const cm = campaignMultiplier(ps.spec.campaign, s, boost);
            const parts = { digital: spend.digital * reach.digital * cm, search: spend.search * reach.search * cm, traditional: spend.traditional * reach.traditional * cm };
            const weighted = parts.digital + parts.search + parts.traditional;
            const old = fs.awareness[pid][r]![s] ?? 0;
            const gain = AWARENESS.maxGainPerRound * (weighted / (weighted + AWARENESS.halfSaturationSpend));
            const after = Math.min(0.98, old * AWARENESS.retention + (1 - old * AWARENESS.retention) * gain);
            fs.awareness[pid][r]![s] = after;
            const added = Math.max(0, after - old * AWARENESS.retention);
            const share = (k: keyof typeof parts) => (weighted > 0 ? (added * parts[k]) / weighted : 0);
            if (fs.regions[r] || weighted > 0) pr.segments[s] = { before: old, after, gain: added, byMedium: { digital: share("digital"), search: share("search"), traditional: share("traditional") }, campaign: cm };
          }
          if (fs.regions[r]) {
            for (const ch of fs.channelsOpen[r] ?? []) {
              if (CHANNEL_TERMS[ch].margin <= 0 || !REGION_PROFILES[r].channels.includes(ch)) continue;
              const mode = fs.regions[r]!;
              const full = CHANNEL_TERMS[ch].coverage * ENTRY_MODES[mode].coverageBoost;
              const p = channelPush(ch, trade);
              pr.channels[ch] = { push: p, reachBase: Math.min(1, full * stockingFactor(ch, 0)), reachNow: Math.min(1, full * stockingFactor(ch, trade)) };
            }
            promo.push(pr);
          }
          if (!fs.regions[r] || !plan || !(plan.price > 0)) continue;
          for (const s of segIds) {
            const av = availability(fs, r, s, trade);
            if (av.total <= 0) continue;
            const ft = fit(ps.spec, s);
            const pf = priceFactor(s, r, plan.price);
            // Buyers who shop in a partner channel meet the brand at the shelf when trade promotion pays for push.
            const adAw = fs.awareness[pid][r]![s] ?? 0;
            const totA = Object.values(av.byChannel).reduce((a, b) => a + (b ?? 0), 0);
            const aw = totA > 0
              ? (Object.entries(av.byChannel) as [ChannelId, number][]).reduce((a, [ch, w]) => a + w * (adAw + (1 - adAw) * (av.push[ch] ?? 0)), 0) / totA
              : adAw;
            ((fs.shelfAwareness![pid] ??= {})[r] ??= {})[s] = aw;
            let claimF = 1;
            let lies = 0;
            for (const c of ps.spec.claims.slice(0, 3)) {
              const isTrue = claimIsTrue(ps.spec, c, plan.price, refPrice(s, r));
              if (!isTrue) lies++;
              if (SEGMENT_PROFILES[s].caresAbout.includes(c)) {
                // While the event rival is in this segment, a true claim about its weak spot counts extra.
                const vsRival = ev.rival && ev.rival.segment === s && ev.rival.weakness === c;
                claimF += isTrue ? (vsRival ? EVENT_RULES.rival.weaknessClaimBonus : DEMAND_MODEL.claimBonus) : DEMAND_MODEL.falseClaimSalesBonus;
              }
            }
            falseClaims[f.id][pid] = Math.max(falseClaims[f.id][pid] ?? 0, lies);
            const sat = fs.satisfaction[pid] ?? SATISFACTION.start;
            const satF = 1 + DEMAND_MODEL.satisfactionEffect * (sat - SATISFACTION.start);
            const attr = Math.pow(ft, DEMAND_MODEL.fitPower) * pf * Math.pow(DEMAND_MODEL.awarenessFloor + aw, DEMAND_MODEL.awarenessPower) * claimF * satF;
            // The event rival takes partner shelf space in its main region unless trade promotion holds it.
            let avTotal = av.total;
            if (ev.rival && ev.rival.segment === s && ev.rival.region === r && totA > 0) {
              const partnerShare = (Object.entries(av.byChannel) as [ChannelId, number][]).reduce((a, [ch, w]) => a + (CHANNEL_TERMS[ch].margin > 0 ? w : 0), 0) / totA;
              const hold = trade > 0 ? trade / (trade + EVENT_RULES.rival.shelfHalfSpend) : 0;
              avTotal *= 1 - EVENT_RULES.rival.shelfSqueeze * partnerShare * (1 - hold);
            }
            const row: ShareRow = {
              productId: pid,
              segment: s,
              region: r,
              fit: ft,
              priceFactor: pf,
              awareness: aw,
              availability: avTotal,
              claimFactor: claimF,
              satisfactionFactor: satF,
              attractiveness: attr,
              demandUnits: 0,
              units: 0,
              share: 0,
              price: plan.price,
            };
            rows.push(row);
            rowFirm.set(row, f.id);
            rowChannels.set(row, av.byChannel);
          }
        }
      }
      reports[f.id].promo = promo;
    }

    // Market event: the new rival's product (not a firm in the class; it never runs out of stock).
    if (ev.rival) {
      const R = EVENT_RULES.rival;
      const v = ev.rival;
      for (const r of regionIds) {
        const main = r === v.region;
        const ref = refPrice(v.segment, r);
        const cell = rows.filter((x) => x.segment === v.segment && x.region === r);
        const lowest = cell.length ? Math.min(...cell.map((x) => x.price)) : Infinity;
        const price = Math.max(ref * rivalFloor(v.segment), Math.min(ref * R.priceVsRef, lowest));
        const aw = Math.min(0.9, (R.awareness + R.awarenessGrowth * v.roundsIn) * (main ? 1 : R.otherRegions));
        const pf = priceFactor(v.segment, r, price);
        const attr = Math.pow(R.fit, DEMAND_MODEL.fitPower) * pf * Math.pow(DEMAND_MODEL.awarenessFloor + aw, DEMAND_MODEL.awarenessPower) * R.claimFactor;
        const row: ShareRow = { productId: RIVAL_ID, segment: v.segment, region: r, fit: R.fit, priceFactor: pf, awareness: aw, availability: R.availability * (main ? 1 : R.otherRegions), claimFactor: R.claimFactor, satisfactionFactor: 1, attractiveness: attr, demandUnits: 0, units: 0, share: 0, price };
        rows.push(row);
        rowFirm.set(row, RIVAL_ID);
        // In a value segment, buyers compare price against the rival directly: undercutting it wins buyers,
        // being dearer loses them. (Elsewhere they compare features and brand, and the rival matches cuts.)
        if (isValueSegment(v.segment)) {
          const k = SEGMENT_PROFILES[v.segment].priceSensitivity * R.valuePriceWeight * (main ? 1 : R.otherRegions);
          for (const x of cell) x.attractiveness *= Math.max(0.5, Math.min(1.8, Math.pow(price / x.price, k)));
        }
      }
    }

    // Split each segment-region's demand among reachable products.
    for (const s of segIds)
      for (const r of regionIds) {
        const cell = rows.filter((x) => x.segment === s && x.region === r);
        const sumE = cell.reduce((a, x) => a + x.attractiveness * x.availability, 0);
        const denom = sumE + DEMAND_MODEL.outsideOption;
        for (const x of cell) x.demandUnits = (demand[s][r] * x.attractiveness * x.availability) / denom;
      }
  }

  // ---- 3. Production, supply and sales ----------------------------------
  /** Take units from the oldest lots first; returns what those units cost to make. */
  const takeFromLots = (lots: InventoryLot[], n: number, fallbackCost: number) => {
    let left = n;
    let cost = 0;
    for (const l of lots) {
      const t = Math.min(l.units, left);
      l.units -= t;
      left -= t;
      cost += t * (l.cost ?? fallbackCost);
      if (left <= 0) break;
    }
    return cost;
  };
  const unitsByFirmSegment: Record<string, Partial<Record<SegmentId, number>>> = {};
  for (const f of firms) {
    const fs = state.firms[f.id];
    const d = decisions[f.id];
    const rep = reports[f.id];
    const pnl = pnls[f.id];
    unitsByFirmSegment[f.id] = {};
    if (round < 1) continue;

    // Production requests, capped at capacity + overtime.
    const requests: { pid: string; r: RegionId; q: number }[] = [];
    for (const ps of Object.values(fs.products)) {
      if (ps.retired || ps.launchRound > round) continue;
      for (const r of regionIds) {
        const q = Math.max(0, Math.round(d.plan[ps.spec.id]?.[r]?.production ?? 0));
        if (q > 0 && fs.regions[r]) requests.push({ pid: ps.spec.id, r, q });
      }
    }
    const asked = requests.reduce((a, x) => a + x.q, 0);
    const maxOut = Math.floor(fs.capacity * (1 + PRODUCTION.overtimeMax));
    const pScale = asked > maxOut ? maxOut / asked : 1;
    if (pScale < 1) rep.notes.push(`Production was cut to ${Math.round(pScale * 100)}% of the plan: the factory can make at most ${maxOut.toLocaleString()} units (including overtime).`);
    let produced = 0;
    const producedMap: Record<string, number> = {};
    for (const x of requests) {
      const q = Math.floor(x.q * pScale);
      producedMap[`${x.pid}|${x.r}`] = q;
      produced += q;
    }
    // Chip shortage: only so many advanced chips per firm. Planned units beyond the allocation can't be built.
    if (ev.chip) {
      const advKeys = Object.keys(producedMap).filter((k) => fs.products[k.split("|")[0]]?.spec.chip === "advanced");
      const advUnits = advKeys.reduce((a, k) => a + producedMap[k], 0);
      const alloc = ev.chipAlloc[f.id] ?? EVENT_RULES.chip.allocationMin;
      if (advUnits > alloc) {
        const k2 = alloc / advUnits;
        for (const k of advKeys) {
          const q2 = Math.floor(producedMap[k] * k2);
          produced -= producedMap[k] - q2;
          producedMap[k] = q2;
        }
        rep.notes.push(`Chip shortage: you planned ${advUnits.toLocaleString()} units that need advanced chips, but your allocation was ${alloc.toLocaleString()}. Only ${Math.round(k2 * 100)}% of those units could be built.`);
      }
    }
    const overtime = Math.max(0, produced - fs.capacity);
    rep.capacity.used = produced;
    rep.capacity.overtime = overtime;

    for (const ps of Object.values(fs.products)) {
      if (ps.launchRound > round && !ps.retired) continue;
      const pid = ps.spec.id;
      const uc = eventUnitCost(unitCostAt(ps.quotedUnitCost, ps.cumUnits, round, ps.briefedRound), ps.quotedUnitCost, ps.spec, ev);
      let pUnits = 0;
      let pRev = 0;
      let pProduced = 0;
      fs.inventory[pid] ??= {};
      for (const r of regionIds) {
        const q = producedMap[`${pid}|${r}`] ?? 0;
        pProduced += q;
        const lots = (fs.inventory[pid][r] ??= []);
        if (q > 0) lots.push({ units: q, age: 0, cost: uc });
        const stock = lots.reduce((a, l) => a + l.units, 0);
        const myRows = rows.filter((x) => x.productId === pid && x.region === r && rowFirm.get(x) === f.id);
        const want = myRows.reduce((a, x) => a + x.demandUnits, 0);
        const sold = Math.min(stock, Math.floor(want));
        const ratio = want > 0 ? sold / want : 0;
        for (const x of myRows) x.units = x.demandUnits * ratio;
        // Take from the oldest lots first; the cost of what sold is this round's cost of goods.
        pnl.cogs += takeFromLots(lots, sold, uc);
        const plan = d.plan[pid]?.[r];
        const lost = Math.max(0, Math.floor(want) - sold);
        if (fs.regions[r] || q > 0 || stock > 0 || want > 0) rep.supply.push({ productId: pid, region: r, forecast: Math.round(plan?.forecast ?? 0), produced: q, demand: Math.round(want), sold, lost, endInventory: 0 });
        pUnits += sold;
      }
      ps.cumUnits += pProduced;
      pnl.production = (pnl.production ?? 0) + pProduced * uc;
      rep.byProduct[pid] = { name: ps.spec.name, units: pUnits, revenue: pRev, unitCost: uc, satisfaction: 0 };
    }
    // Overtime premium, on the average unit cost of what was produced.
    if (overtime > 0 && produced > 0) pnl.overtimePremium = ((pnl.production ?? 0) / produced) * overtime * PRODUCTION.overtimeCostPremium;
  }

  // The event rival always has stock.
  for (const x of rows) if (rowFirm.get(x) === RIVAL_ID) x.units = x.demandUnits;

  // Stockout spill: part of the unmet demand goes to rivals with stock left in that cell.
  if (round >= 1 && DEMAND_MODEL.stockoutSpillToRivals > 0) {
    for (const s of segIds)
      for (const r of regionIds) {
        const cell = rows.filter((x) => x.segment === s && x.region === r);
        const unmet = cell.reduce((a, x) => a + Math.max(0, x.demandUnits - x.units), 0) * DEMAND_MODEL.stockoutSpillToRivals;
        if (unmet < 1) continue;
        const takers = cell.filter((x) => x.units >= x.demandUnits - 0.5 && rowFirm.get(x) !== RIVAL_ID);
        const wE = takers.reduce((a, x) => a + x.attractiveness * x.availability, 0);
        if (wE <= 0) continue;
        for (const x of takers) {
          const fid = rowFirm.get(x)!;
          const lots = state.firms[fid].inventory[x.productId]?.[r] ?? [];
          const stock = lots.reduce((a, l) => a + l.units, 0);
          const extra = Math.min(stock, Math.floor((unmet * x.attractiveness * x.availability) / wE));
          if (extra <= 0) continue;
          x.units += extra;
          const sp = state.firms[fid].products[x.productId];
          pnls[fid].cogs += takeFromLots(lots, extra, sp ? unitCostAt(sp.quotedUnitCost, sp.cumUnits, round, sp.briefedRound) : 0);
          const sup = reports[fid].supply.find((y) => y.productId === x.productId && y.region === r);
          // Buyers who switched from a rival that ran out count in this firm's demand too.
          x.demandUnits += extra;
          if (sup) {
            sup.sold += extra;
            sup.demand += extra;
            sup.fromRivals = (sup.fromRivals ?? 0) + extra;
          }
          reports[fid].byProduct[x.productId].units += extra;
        }
      }
  }

  // Shares within each segment-region.
  for (const s of segIds)
    for (const r of regionIds) {
      const cell = rows.filter((x) => x.segment === s && x.region === r);
      const tot = cell.reduce((a, x) => a + x.units, 0);
      for (const x of cell) x.share = tot > 0 ? x.units / tot : 0;
    }

  // ---- 4. Money, satisfaction, inventory --------------------------------
  for (const f of firms) {
    const fs = state.firms[f.id];
    const d = decisions[f.id];
    const rep = reports[f.id];
    const pnl = pnls[f.id];
    const myRows = rows.filter((x) => rowFirm.get(x) === f.id);
    rep.rows = myRows;

    for (const x of myRows) {
      const byCh = rowChannels.get(x) ?? {};
      const tot = Object.values(byCh).reduce((a, b) => a + (b ?? 0), 0);
      for (const [ch, a] of Object.entries(byCh) as [ChannelId, number][]) {
        if (!a || tot <= 0) continue;
        const u = (x.units * a) / tot;
        const gross = u * x.price;
        const m = channelMargin(fs, x.region, ch);
        const fee = gross * m;
        const ful = gross * (CHANNEL_TERMS[ch].fulfillmentCost ?? 0);
        pnl.grossSales += gross;
        pnl.partnerMargin += fee;
        pnl.fulfillment += ful;
        const net = gross - fee - ful;
        const bc = (rep.byChannel[ch] ??= { units: 0, revenue: 0, margin: 0 });
        bc.units += u;
        bc.revenue += net;
        bc.margin += fee;
        const br = (rep.byRegion[x.region] ??= { units: 0, revenue: 0 });
        br.units += u;
        br.revenue += net;
        rep.byProduct[x.productId].revenue += net;
        const cu = ((fs.channelUnits[x.region] ??= {})[ch] ??= 0);
        fs.channelUnits[x.region]![ch] = cu + u;
      }
      unitsByFirmSegment[f.id][x.segment] = (unitsByFirmSegment[f.id][x.segment] ?? 0) + x.units;
    }

    let subsCost = 0;
    // Subscriptions: a share of buyers sign up; the base keeps 80% each round. 3 months per round.
    for (const ps of Object.values(fs.products)) {
      const pid = ps.spec.id;
      if (ps.spec.subscriptionPrice > 0) {
        let newSubs = 0;
        for (const x of myRows.filter((y) => y.productId === pid)) {
          const want = SEGMENT_PROFILES[x.segment].wants.subscription;
          const uptake = Math.max(0, Math.min(0.8, 0.3 + 0.4 * want - ps.spec.subscriptionPrice / 30));
          newSubs += x.units * uptake;
        }
        ps.subscribers = ps.subscribers * 0.8 + newSubs;
        const subRev = ps.subscribers * ps.spec.subscriptionPrice * 3;
        pnl.subscriptionRevenue += subRev;
        pnl.cogs += ps.subscribers * 3;
        subsCost += ps.subscribers * 3;
        if (rep.byProduct[pid]) rep.byProduct[pid].revenue += subRev;
      } else ps.subscribers *= 0.8;
    }

    // Inventory aging, holding cost and clearance.
    let inventoryValue = 0;
    for (const ps of Object.values(fs.products)) {
      const pid = ps.spec.id;
      const uc = unitCostAt(ps.quotedUnitCost, ps.cumUnits, round, ps.briefedRound);
      for (const r of regionIds) {
        const lots = fs.inventory[pid]?.[r];
        if (!lots) continue;
        for (const l of lots) l.age += 1;
        const clear = lots.filter((l) => l.age >= PRODUCTION.clearanceAfterRounds && l.units > 0);
        for (const l of clear) {
          pnl.clearanceRevenue += l.units * uc * PRODUCTION.clearanceRecovery;
          pnl.cogs += l.units * (l.cost ?? uc);
          rep.notes.push(`${Math.round(l.units).toLocaleString()} unsold units of ${ps.spec.name} in ${r.toUpperCase()} were cleared at a discount.`);
          l.units = 0;
        }
        fs.inventory[pid][r] = lots.filter((l) => l.units > 0);
        const left = fs.inventory[pid][r]!.reduce((a, l) => a + l.units, 0);
        pnl.holding += left * uc * PRODUCTION.holdingCostRate;
        inventoryValue += fs.inventory[pid][r]!.reduce((a, l) => a + l.units * (l.cost ?? uc), 0);
        const sup = rep.supply.find((y) => y.productId === pid && y.region === r);
        if (sup) sup.endInventory = Math.round(left);
      }
    }

    // Satisfaction per product.
    for (const ps of Object.values(fs.products)) {
      const pid = ps.spec.id;
      const pr = myRows.filter((x) => x.productId === pid && x.units > 0);
      const u = pr.reduce((a, x) => a + x.units, 0);
      if (u <= 0) continue;
      const wFit = pr.reduce((a, x) => a + x.fit * x.units, 0) / u;
      const wPrice = pr.reduce((a, x) => a + Math.min(1, refPrice(x.segment, x.region) / x.price) * x.units, 0) / u;
      const honesty = Math.max(0, 1 - SATISFACTION.falseClaimPenalty * (falseClaims[f.id]?.[pid] ?? 0));
      const sup = rep.supply.filter((y) => y.productId === pid);
      const want = sup.reduce((a, y) => a + y.demand, 0);
      const lost = sup.reduce((a, y) => a + y.lost, 0);
      const avail = want > 0 ? 1 - lost / want : 1;
      const w = SATISFACTION.weights;
      const now = w.fit * wFit + w.price * wPrice + w.honesty * honesty + w.availability * avail;
      const old = fs.satisfaction[pid] ?? SATISFACTION.start;
      fs.satisfaction[pid] = SATISFACTION.carry * old + (1 - SATISFACTION.carry) * now;
      if (rep.byProduct[pid]) rep.byProduct[pid].satisfaction = fs.satisfaction[pid];
    }

    // Fixed costs.
    const nRegions = Object.keys(fs.regions).length;
    pnl.overhead = round >= 1 ? FINANCE.overheadPerRound + FINANCE.overheadPerRegion * nRegions : 0;
    pnl.capacityFixed = round >= 1 ? fs.capacity * PRODUCTION.fixedCostPerCapacityUnit : 0;

    pnl.revenue = pnl.grossSales - pnl.partnerMargin - pnl.fulfillment + pnl.subscriptionRevenue + pnl.clearanceRevenue;
    const opsCosts = pnl.cogs + pnl.overtimePremium + pnl.holding + pnl.capacityFixed + pnl.overhead;
    const oneTime = pnl.devFees + pnl.entryFees + pnl.channelSetup + (pnl.exitFees ?? 0) + pnl.expansion;
    pnl.operatingProfit = pnl.revenue - opsCosts - pnl.promotion - pnl.research - (pnl.interest ?? 0) - oneTime;
    // Expansion is spread over several rounds for scoring (amortization), starting the round it's paid for.
    let amort = 0;
    if (round >= 1 && fs.expansionAmort?.length) {
      for (const e of fs.expansionAmort) {
        amort += e.amount / FINANCE.expansionAmortRounds;
        e.roundsLeft -= 1;
      }
      fs.expansionAmort = fs.expansionAmort.filter((e) => e.roundsLeft > 0);
    }
    pnl.expansionAmortized = amort;
    // The Financial score uses profit before one-time costs, with expansion amortized.
    pnl.scoredProfit = pnl.operatingProfit + oneTime - amort;
    // Capital already paid fees, expansion and interest above; now revenue in, operating costs out.
    // Cash pays for every unit made this round; profit counts only the cost of units sold (unsold units stay as inventory).
    fs.capital += pnl.revenue - (opsCosts - pnl.cogs) - (pnl.production ?? 0) - subsCost;
    rep.capital.inventory = Math.round(inventoryValue);
    fs.lastRevenue = pnl.revenue;
    // HQ emergency loan: cover any shortfall; repay automatically from capital above the cushion.
    let borrowed = 0;
    let repaid = 0;
    if (fs.capital < 0) {
      borrowed = -fs.capital;
      fs.loan = (fs.loan ?? 0) + borrowed;
      fs.capital = 0;
      rep.notes.push(`Company capital ran out, so Vibe Electronics HQ lent you $${Math.round(borrowed).toLocaleString()}. You pay ${Math.round(FINANCE.loanInterestPerRound * 100)}% interest on the loan each round until it's repaid.`);
    } else if ((fs.loan ?? 0) > 0 && fs.capital > FINANCE.loanRepayCushion) {
      repaid = Math.min(fs.loan ?? 0, fs.capital - FINANCE.loanRepayCushion);
      fs.loan = (fs.loan ?? 0) - repaid;
      fs.capital -= repaid;
      rep.notes.push(`You repaid $${Math.round(repaid).toLocaleString()} of HQ's loan${(fs.loan ?? 0) > 0 ? `; $${Math.round(fs.loan ?? 0).toLocaleString()} is still owed` : "; it's fully repaid"}.`);
    }
    rep.capital.end = fs.capital;
    rep.capital.borrowed = Math.round(borrowed);
    rep.capital.repaid = Math.round(repaid);
    rep.capital.loan = Math.round(fs.loan ?? 0);
    for (const k of Object.keys(pnl) as (keyof PnL)[]) pnl[k] = Math.round(pnl[k] ?? 0);
    for (const k of Object.keys(rep.byProduct)) {
      rep.byProduct[k].units = Math.round(rep.byProduct[k].units);
      rep.byProduct[k].revenue = Math.round(rep.byProduct[k].revenue);
    }

    // Forecast accuracy (units-weighted).
    const fcRows = rep.supply.filter((y) => y.forecast > 0 || y.sold > 0);
    const fw = fcRows.reduce((a, y) => a + Math.max(y.forecast, y.sold), 0);
    rep.forecastAccuracy =
      fw > 0 ? fcRows.reduce((a, y) => a + (1 - Math.abs(y.forecast - y.sold) / Math.max(y.forecast, y.sold, 1)) * Math.max(y.forecast, y.sold), 0) / fw : 0;

    fs.lastDecision = d;
    delete (d as FirmDecision & { _promoScale?: number })._promoScale;
  }

  // ---- 5. Scorecard ---------------------------------------------------------
  const scores = round >= 1 ? scoreRound(firms, state, decisions, reports, demand, rows, rowFirm, settings, input.prevResult ?? null) : {};

  // ---- 6. Goals, drivers and Top Concerns ----------------------------------
  for (const f of firms) {
    const rep = reports[f.id];
    const d = decisions[f.id];
    const fs = state.firms[f.id];
    const sc = scores[f.id];
    if (round >= 1 && sc) {
      const pnl = rep.pnl;
      rep.goals = [
        ...(segmentShareGoals(d).length || d.goals.share === null
          ? targetsOf(d).map((s) => ({ key: `share:${s}`, label: `Share of ${SEGMENTS.find((x) => x.id === s)?.name ?? s} (%)`, goal: d.goals.segmentShare[s] ?? null, actual: round1((sc.segShare?.[s] ?? 0) * 100) }))
          : [{ key: "share", label: "Share of target segments (%)", goal: d.goals.share, actual: round1(sc.raw.market * 100) }]),
        { key: "revenue", label: "Revenue ($)", goal: d.goals.revenue, actual: pnl.revenue },
        { key: "margin", label: "Operating margin (%)", goal: d.goals.margin, actual: pnl.revenue > 0 ? round1((pnl.operatingProfit / pnl.revenue) * 100) : 0 },
        { key: "awareness", label: "Awareness in target segments (%)", goal: d.goals.awareness, actual: round1(targetAwareness(fs, d, round) * 100) },
        { key: "satisfaction", label: "Satisfaction (%)", goal: d.goals.satisfaction, actual: round1(firmSatisfaction(fs, round) * 100) },
      ];
    }
    rep.drivers = buildDrivers(rep.rows, input.prevResult?.reports[f.id]?.rows ?? [], d);
    rep.concerns = buildConcerns(f, fs, d, rep, round);
  }

  const pricesByFirm: RoundResult["market"]["pricesByFirm"] = {};
  for (const f of firms) {
    const fs = state.firms[f.id];
    pricesByFirm[f.id] = [];
    for (const ps of Object.values(fs.products)) {
      if (ps.retired || ps.launchRound > round) continue;
      for (const r of regionIds) {
        const p = decisions[f.id].plan[ps.spec.id]?.[r]?.price;
        if (fs.regions[r] && p) pricesByFirm[f.id].push({ productId: ps.spec.id, name: ps.spec.name, tier: ps.spec.tier, region: r, price: p });
      }
    }
  }

  const rivalRows = rows.filter((x) => rowFirm.get(x) === RIVAL_ID);
  const rival = ev.rival && rivalRows.length
    ? { name: EVENT_RULES.rival.brand, segment: ev.rival.segment, units: Math.round(rivalRows.reduce((a, x) => a + x.units, 0)), demand: Math.round(rivalRows.reduce((a, x) => a + x.demandUnits, 0)) }
    : undefined;
  return { round, state, reports, scores, market: { demand, unitsByFirmSegment, pricesByFirm, ...(rival ? { rival } : {}) }, decisions };
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

/** Share goals the team set for its target segments (blank or zero goals don't count). */
function segmentShareGoals(d: FirmDecision): [SegmentId, number][] {
  return targetsOf(d).flatMap((s) => {
    const v = d.goals.segmentShare?.[s];
    return v === null || v === undefined || v === 0 ? [] : [[s, v] as [SegmentId, number]];
  });
}

function targetsOf(d: FirmDecision): SegmentId[] {
  return d.strategy.targetSegments.length ? d.strategy.targetSegments : segIds;
}

export function targetAwareness(fs: FirmState, d: FirmDecision, round: number): number {
  const targets = targetsOf(d);
  const regions = regionIds.filter((r) => fs.regions[r]);
  if (!regions.length) return 0;
  let sum = 0;
  let n = 0;
  for (const s of targets)
    for (const r of regions) {
      let best = 0;
      for (const ps of Object.values(fs.products)) {
        if (ps.retired || ps.launchRound > round) continue;
        best = Math.max(best, fs.awareness[ps.spec.id]?.[r]?.[s] ?? 0, fs.shelfAwareness?.[ps.spec.id]?.[r]?.[s] ?? 0);
      }
      sum += best;
      n++;
    }
  return n ? sum / n : 0;
}

export function firmSatisfaction(fs: FirmState, round: number): number {
  const live = Object.values(fs.products).filter((p) => !p.retired && p.launchRound <= round);
  if (!live.length) return 0;
  return live.reduce((a, p) => a + (fs.satisfaction[p.spec.id] ?? SATISFACTION.start), 0) / live.length;
}

/** Return on promotion is capped at this multiple, and needs at least this much promotion over 2 rounds to count. */
const ROP_CAP = 8;
const ROP_MIN_PROMO = 50_000;

/** The partner margin that's normal for where these segments shop (base margins weighted by each segment's channel mix and size). */
export function normalMargin(segs: SegmentId[]): number {
  let m = 0;
  let w = 0;
  for (const s of segs) {
    const size = regionIds.reduce((a, r) => a + SEGMENT_PROFILES[s].baseDemand[r], 0);
    const mix = SEGMENT_PROFILES[s].channelMix;
    let seg = 0;
    for (const [ch, share] of Object.entries(mix) as [ChannelId, number][]) seg += share * CHANNEL_TERMS[ch].margin;
    m += size * seg;
    w += size;
  }
  return w ? m / w : 0.15;
}

function scoreRound(
  firms: FirmMeta[],
  state: GameState,
  decisions: Record<string, FirmDecision>,
  reports: Record<string, FirmReport>,
  demand: Record<SegmentId, Record<RegionId, number>>,
  rows: ShareRow[],
  rowFirm: Map<ShareRow, string>,
  settings: GameSettings,
  prevResult: RoundResult | null = null,
): Record<string, ScoreBreakdown> {
  const segShares: Record<string, Partial<Record<SegmentId, number>>> = {};
  const segTotalSold: Record<string, number> = {};
  for (const x of rows) segTotalSold[x.segment] = (segTotalSold[x.segment] ?? 0) + x.units;
  const segSize: Record<string, number> = {};
  for (const s of segIds) segSize[s] = regionIds.reduce((a, r) => a + demand[s][r], 0);

  const raw: Record<string, Record<ScoreKey, number>> = {};
  for (const f of firms) {
    const fs = state.firms[f.id];
    const d = decisions[f.id];
    const rep = reports[f.id];
    const targets = targetsOf(d);
    const myRows = rows.filter((x) => rowFirm.get(x) === f.id);

    // Market: size-weighted share of units sold in target segments.
    let wsum = 0;
    let wshare = 0;
    const segShare: Partial<Record<SegmentId, number>> = {};
    for (const s of targets) {
      const mine = myRows.filter((x) => x.segment === s).reduce((a, x) => a + x.units, 0);
      const share = segTotalSold[s] > 0 ? mine / segTotalSold[s] : 0;
      segShare[s] = share;
      wshare += segSize[s] * share;
      wsum += segSize[s];
    }
    const market = wsum ? wshare / wsum : 0;

    // Customer: best fit to each target segment, awareness and satisfaction.
    const live = Object.values(fs.products).filter((p) => !p.retired && p.launchRound <= state.round);
    const fitAvg = live.length ? targets.reduce((a, s) => a + Math.max(...live.map((p) => fit(p.spec, s))), 0) / targets.length : 0;
    const customer = 0.4 * fitAvg + 0.3 * targetAwareness(fs, d, state.round) + 0.3 * firmSatisfaction(fs, state.round);

    // Channel: coverage of target buyers in target regions (with the trade support actually given),
    // reduced only when partner margins run above what's normal for the target segments' channels.
    const tRegions = d.strategy.targetRegions.length ? d.strategy.targetRegions : regionIds.filter((r) => fs.regions[r]);
    const liveIds = Object.values(fs.products).filter((p) => !p.retired && p.launchRound <= state.round).map((p) => p.spec.id);
    let cov = 0;
    let covW = 0;
    for (const s of targets)
      for (const r of tRegions) {
        const w = demand[s][r];
        const best = liveIds.length
          ? Math.max(...liveIds.map((pid) => availability(fs, r, s, Math.max(0, Number(d.plan[pid]?.[r]?.media?.trade) || 0)).total))
          : availability(fs, r, s, 0).total;
        cov += w * best;
        covW += w;
      }
    const coverage = covW ? cov / covW : 0;
    const gross = rep.pnl.grossSales;
    const avgMargin = gross > 0 ? rep.pnl.partnerMargin / gross : 0;
    const channel = coverage * (1 - Math.max(0, avgMargin - normalMargin(targets)));

    // Goals: forecast accuracy and closeness to the team's own numeric targets.
    const g = d.goals;
    const pnl = rep.pnl;
    // Share: one goal per target segment, each weighted equally, averaged into a single share goal.
    // Older decisions with one overall share goal still score against the combined share.
    const close = (goal: number, act: number) => Math.max(0, 1 - Math.abs(act - goal) / Math.abs(goal));
    const blank = (v: number | null | undefined) => v === null || v === undefined || v === 0 || !Number.isFinite(v);
    // A blank goal scores zero. Share: one goal per target segment, each weighted equally, averaged into one share goal.
    // Older decisions with one overall share goal (and no per-segment goals) still score against the combined share.
    const legacyShare = !blank(g.share) && segmentShareGoals(d).length === 0;
    const shareCloseness = legacyShare
      ? close(g.share as number, market * 100)
      : targets.reduce((a, s) => {
          const v = d.goals.segmentShare?.[s];
          return a + (blank(v) ? 0 : close(v as number, (segShare[s] ?? 0) * 100));
        }, 0) / Math.max(1, targets.length);
    const others: [number | null, number][] = [
      [g.revenue, pnl.revenue],
      [g.margin, pnl.revenue > 0 ? (pnl.operatingProfit / pnl.revenue) * 100 : 0],
      [g.awareness, targetAwareness(fs, d, state.round) * 100],
      [g.satisfaction, firmSatisfaction(fs, state.round) * 100],
    ];
    const closenesses = [shareCloseness, ...others.map(([goal, act]) => (blank(goal) ? 0 : close(goal as number, act)))];
    const goalAcc = closenesses.reduce((a, b) => a + b, 0) / closenesses.length;
    const goals = 0.5 * rep.forecastAccuracy + 0.5 * goalAcc;

    raw[f.id] = { market, customer, financial: pnl.scoredProfit ?? pnl.operatingProfit, channel, goals };
    segShares[f.id] = segShare;
  }

  // Return on promotion feeds the financial measure: gross margin per promotion dollar over this round and last,
  // capped so that cutting promotion to almost nothing can't max it out.
  const rop: Record<string, number> = {};
  for (const f of firms) {
    const p = reports[f.id].pnl;
    const q = prevResult?.reports[f.id]?.pnl;
    const promo = p.promotion + (q?.promotion ?? 0);
    const margin = p.revenue - p.cogs + (q ? q.revenue - q.cogs : 0);
    rop[f.id] = promo >= ROP_MIN_PROMO ? Math.max(0, Math.min(ROP_CAP, margin / promo)) : 0;
  }

  const ids = firms.map((f) => f.id);
  const points: Record<string, Record<ScoreKey, number>> = {};
  const best = (k: ScoreKey) => Math.max(...ids.map((i) => raw[i][k]));
  const minmax = (vals: Record<string, number>, id: string) => {
    const v = ids.map((i) => vals[i]);
    const lo = Math.min(...v);
    const hi = Math.max(...v);
    return hi === lo ? 50 : ((vals[id] - lo) / (hi - lo)) * 100;
  };
  // Compared with the best firm, like the other parts. If no firm made a profit, fall back to worst-to-best.
  // floor = the lowest points allowed: profit can go below 0 (a loss as big as the best firm's profit = -100); return on promotion can't.
  const vsBest = (vals: Record<string, number>, id: string, floor = 0) => {
    const hi = Math.max(...ids.map((i) => vals[i]));
    return hi > 0 ? Math.max(floor, (vals[id] / hi) * 100) : minmax(vals, id);
  };
  const profit = Object.fromEntries(ids.map((i) => [i, raw[i].financial]));
  for (const id of ids) {
    const pts = {} as Record<ScoreKey, number>;
    for (const k of ["market", "customer", "channel", "goals"] as ScoreKey[]) {
      const b = best(k);
      pts[k] = b > 0 ? (raw[id][k] / b) * 100 : 0;
    }
    pts.financial = 0.7 * vsBest(profit, id, FINANCE.lossPointsFloor) + 0.3 * vsBest(rop, id);
    points[id] = pts;
  }

  const w = settings.scorecardWeights;
  const out: Record<string, ScoreBreakdown> = {};
  for (const id of ids) {
    const total = (Object.keys(w) as ScoreKey[]).reduce((a, k) => a + w[k] * points[id][k], 0);
    out[id] = {
      raw: raw[id],
      segShare: segShares[id],
      points: Object.fromEntries(Object.entries(points[id]).map(([k, v]) => [k, round1(v)])) as Record<ScoreKey, number>,
      total: round1(total),
      rank: 0,
    };
  }
  const sorted = [...ids].sort((a, b) => out[b].total - out[a].total);
  sorted.forEach((id, i) => (out[id].rank = i + 1));
  return out;
}

/** Why share moved: compare each factor of attractiveness with last round. */
function buildDrivers(now: ShareRow[], prev: ShareRow[], d: FirmDecision): FirmReport["drivers"] {
  const out: FirmReport["drivers"] = [];
  const targets = targetsOf(d);
  const pids = [...new Set(now.map((x) => x.productId))];
  for (const pid of pids)
    for (const s of targets) {
      const agg = (rs: ShareRow[]) => {
        const sel = rs.filter((x) => x.productId === pid && x.segment === s);
        const u = sel.reduce((a, x) => a + Math.max(1, x.units), 0);
        if (!sel.length) return null;
        const w = (k: keyof ShareRow) => sel.reduce((a, x) => a + (x[k] as number) * Math.max(1, x.units), 0) / u;
        return { share: w("share"), fit: w("fit"), price: w("priceFactor"), awareness: w("awareness") + 0.1, availability: w("availability"), claims: w("claimFactor") };
      };
      const a = agg(now);
      if (!a) continue;
      const b = agg(prev);
      const factors = b
        ? [
            { name: "Price appeal", change: a.price / b.price - 1 },
            { name: "Awareness", change: a.awareness / b.awareness - 1 },
            { name: "Channel coverage", change: b.availability > 0 ? a.availability / b.availability - 1 : 0 },
            { name: "Ad message", change: a.claims / b.claims - 1 },
          ]
        : [];
      out.push({ productId: pid, segment: s, shareNow: a.share, sharePrev: b?.share ?? 0, factors: factors.filter((x) => Math.abs(x.change) > 0.01).sort((x, y) => Math.abs(y.change) - Math.abs(x.change)) });
    }
  return out;
}

function buildConcerns(f: FirmMeta, fs: FirmState, d: FirmDecision, rep: FirmReport, round: number): FirmReport["concerns"] {
  const c: FirmReport["concerns"] = [];
  const live = Object.values(fs.products).filter((p) => !p.retired && p.launchRound <= round);
  if (round >= 1) {
    for (const s of targetsOf(d)) {
      const bestFit = live.length ? Math.max(...live.map((p) => fit(p.spec, s))) : 0;
      if (live.length && bestFit < 0.55) {
        const name = SEGMENTS.find((x) => x.id === s)!.name;
        c.push({ title: `Weak fit with ${name}`, detail: `Rating services say none of your products meets the basic needs of ${name} buyers.`, fix: "Buy the Customer needs study and brief a product that matches what this segment values." });
      }
    }
    for (const ps of live) {
      const lies = ps.spec.claims.filter((cl) => {
        const anyRow = rep.rows.find((x) => x.productId === ps.spec.id);
        return anyRow ? !claimIsTrue(ps.spec, cl, anyRow.price, refPrice(anyRow.segment, anyRow.region)) : false;
      });
      if (lies.length) c.push({ title: `Ad claims for ${ps.spec.name} overstate the product`, detail: `Reviewers flagged: ${lies.map((cl) => `"${CLAIMS[cl]?.name ?? cl}"`).join(", ")}. Overpromising lifts sales a little now but lowers satisfaction.`, fix: "Feature only benefits the product actually delivers." });
    }
    const lost = rep.supply.reduce((a, y) => a + y.lost, 0);
    const want = rep.supply.reduce((a, y) => a + y.demand, 0);
    if (want > 0 && lost / want > 0.1) c.push({ title: "Stockouts", detail: `You ran out of stock for ${Math.round((lost / want) * 100)}% of demand. Some buyers went to rivals and satisfaction dipped.`, fix: "Raise production where you sold out, or expand capacity a round ahead." });
    const inv = rep.supply.reduce((a, y) => a + y.endInventory, 0);
    const sold = rep.supply.reduce((a, y) => a + y.sold, 0);
    if (inv > Math.max(2000, sold * 0.3)) c.push({ title: "Excess inventory", detail: `${inv.toLocaleString()} units are left in warehouses, costing ${Math.round(PRODUCTION.holdingCostRate * 100)}% of unit cost per round. Units unsold for 2 rounds get cleared at a loss.`, fix: "Lower production or improve the forecast." });
    for (const r of regionIds) {
      if (fs.regions[r] && !(fs.channelsOpen[r] ?? []).length) c.push({ title: `No channels in ${r.toUpperCase()}`, detail: "You entered this region but sell through no channel, so nobody can buy.", fix: "Choose channels on the Markets & Channels screen." });
    }
    if (!live.length) c.push({ title: "Nothing to sell", detail: "You have no products on the market this round.", fix: "Send a product brief to engineering. It takes 1 round to be ready." });
  }
  // Burn rate: will the marketing budget last?
  const roundsLeft = ROUNDS.final - round;
  if (round >= 3 && roundsLeft > 0 && rep.budget.spent > 0 && fs.marketingPot < rep.budget.spent * roundsLeft * 0.6)
    c.push({ title: "Marketing budget burn rate", detail: `At this round's pace you will run out of marketing money before the final round (${Math.round(fs.marketingPot).toLocaleString()} left, ${roundsLeft} rounds to go).`, fix: "Pace promotion and research spending." });
  if ((fs.loan ?? 0) > 0)
    c.push({ title: "You owe HQ an emergency loan", detail: `Capital ran out, so HQ lent the company money. $${Math.round(fs.loan ?? 0).toLocaleString()} is still owed, at ${Math.round(FINANCE.loanInterestPerRound * 100)}% interest a round charged to profit. It's repaid automatically from capital above $${FINANCE.loanRepayCushion.toLocaleString()}.`, fix: "Cut overproduction and one-time spending until the loan is repaid." });
  else if (fs.capital < 300_000) c.push({ title: "Company capital is low", detail: `Only $${Math.round(fs.capital).toLocaleString()} is left for engineering, production and capacity.`, fix: "Cut overproduction, raise prices where you can, or hold off on expansion." });
  void f;
  return c;
}
