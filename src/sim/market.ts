/**
 * HEART RACE — TUNABLE CONFIG (part 2 of 2: hidden market settings)
 *
 * What buyers want, how big each segment is, and how the demand model reacts.
 * Students never see these numbers directly; research studies reveal them in
 * rounded or descriptive form. This file is only loaded on the server.
 */
import type { ChannelId, ClaimId, MediaId, RegionId, SegmentId, SensorId, ToneId } from "./config";

// ---------------------------------------------------------------------------
// Segments (hidden preferences — students discover these through research)
// ---------------------------------------------------------------------------

export interface SegmentProfile {
  /** Units per round in each region at round 1, before growth and season. */
  baseDemand: Record<RegionId, number>;
  growthPerRound: number;
  /** Price the typical buyer expects to pay. */
  refPrice: number;
  /** Above this, almost nobody in the segment buys. */
  maxPrice: number;
  /** How hard price above refPrice hurts (higher = more price sensitive). */
  priceSensitivity: number;
  /** Utility weights for features (0 = doesn't care, 1 = very important). */
  wants: {
    chip: Record<"basic" | "mid" | "advanced", number>;
    form: Record<"band" | "ring" | "watch", number>;
    battery: Record<"d2" | "d7" | "d14", number>;
    display: Record<"none" | "basic" | "color", number>;
    material: Record<"plastic" | "aluminum" | "titanium", number>;
    water: Record<"splash" | "swim", number>;
    privacy: Record<"standard" | "medical", number>;
    sensors: Record<SensorId, number>;
    subscription: number; // value of a premium app plan (can be negative)
  };
  /** Share of this segment's buyers who shop in each channel (sums to 1). */
  channelMix: Partial<Record<ChannelId, number>>;
  /** How well each medium reaches this segment (1 = average). */
  mediaReach: Record<Exclude<MediaId, "trade">, number>;
  /** Benefits that resonate in ads (claim ids). */
  caresAbout: ClaimId[];
  /** How well each campaign tone lands with this segment (0 = falls flat, 1 = ideal). */
  toneFit: Record<ToneId, number>;
}



export const SEGMENT_PROFILES: Record<SegmentId, SegmentProfile> = {
  budget: {
    baseDemand: { na: 60_000, eu: 50_000, apac: 110_000, latam: 55_000 },
    growthPerRound: 0.03,
    refPrice: 79,
    maxPrice: 170,
    priceSensitivity: 2.4,
    wants: {
      chip: { basic: 0.8, mid: 0.6, advanced: 0.3 },
      form: { band: 1, ring: 0.4, watch: 0.6 },
      battery: { d2: 0.2, d7: 0.8, d14: 1 },
      display: { none: 0.6, basic: 0.8, color: 0.7 },
      material: { plastic: 1, aluminum: 0.8, titanium: 0.5 },
      water: { splash: 0.8, swim: 1 },
      privacy: { standard: 1, medical: 0.9 },
      sensors: { hr: 1, spo2: 0.3, temp: 0.2, stress: 0.7, fall: 0.1, gps: 0.1, ecg: 0 },
      subscription: -0.3,
    },
    channelMix: { marketplace: 0.45, mass: 0.3, carrier: 0.1, online: 0.1, electronics: 0.05 },
    mediaReach: { digital: 1.3, search: 1.0, traditional: 0.7 },
    caresAbout: ["price", "battery", "sleep"],
    toneFit: { practical: 1, playful: 0.8, energetic: 0.6, caring: 0.4, expert: 0.4, premium: 0.1 },
  },
  wellness: {
    baseDemand: { na: 55_000, eu: 50_000, apac: 60_000, latam: 25_000 },
    growthPerRound: 0.04,
    refPrice: 179,
    maxPrice: 380,
    priceSensitivity: 1.4,
    wants: {
      chip: { basic: 0.5, mid: 0.9, advanced: 0.8 },
      form: { band: 0.7, ring: 1, watch: 0.6 },
      battery: { d2: 0.3, d7: 0.9, d14: 1 },
      display: { none: 0.8, basic: 0.8, color: 0.7 },
      material: { plastic: 0.4, aluminum: 0.9, titanium: 1 },
      water: { splash: 0.7, swim: 1 },
      privacy: { standard: 0.8, medical: 1 },
      sensors: { hr: 0.8, spo2: 0.5, temp: 0.7, stress: 1, fall: 0.1, gps: 0.1, ecg: 0.2 },
      subscription: 0.4,
    },
    channelMix: { online: 0.3, electronics: 0.3, marketplace: 0.25, carrier: 0.1, mass: 0.05 },
    mediaReach: { digital: 1.3, search: 0.9, traditional: 0.8 },
    caresAbout: ["sleep", "design", "platform"],
    toneFit: { caring: 0.8, premium: 0.8, playful: 0.7, energetic: 0.6, expert: 0.5, practical: 0.4 },
  },
  older: {
    baseDemand: { na: 40_000, eu: 40_000, apac: 30_000, latam: 15_000 },
    growthPerRound: 0.05,
    refPrice: 199,
    maxPrice: 420,
    priceSensitivity: 1.3,
    wants: {
      chip: { basic: 0.4, mid: 0.9, advanced: 1 },
      form: { band: 0.8, ring: 0.3, watch: 1 },
      battery: { d2: 0.2, d7: 0.8, d14: 1 },
      display: { none: 0.1, basic: 1, color: 0.7 },
      material: { plastic: 0.8, aluminum: 0.9, titanium: 0.7 },
      water: { splash: 0.8, swim: 1 },
      privacy: { standard: 0.5, medical: 1 },
      sensors: { hr: 0.8, spo2: 0.6, temp: 0.3, stress: 0.2, fall: 1, gps: 0.2, ecg: 0.9 },
      subscription: 0.3,
    },
    channelMix: { pharmacy: 0.45, electronics: 0.25, online: 0.2, carrier: 0.1 },
    mediaReach: { digital: 0.7, search: 1.0, traditional: 1.5 },
    caresAbout: ["safety", "heart", "privacy"],
    toneFit: { caring: 1, expert: 0.8, practical: 0.6, premium: 0.3, playful: 0.3, energetic: 0.2 },
  },
  fitness: {
    baseDemand: { na: 35_000, eu: 40_000, apac: 35_000, latam: 15_000 },
    growthPerRound: 0.03,
    refPrice: 299,
    maxPrice: 600,
    priceSensitivity: 0.9,
    wants: {
      chip: { basic: 0.2, mid: 0.7, advanced: 1 },
      form: { band: 0.5, ring: 0.3, watch: 1 },
      battery: { d2: 0.3, d7: 0.9, d14: 1 },
      display: { none: 0.1, basic: 0.5, color: 1 },
      material: { plastic: 0.3, aluminum: 0.8, titanium: 1 },
      water: { splash: 0.3, swim: 1 },
      privacy: { standard: 1, medical: 1 },
      sensors: { hr: 1, spo2: 0.6, temp: 0.3, stress: 0.4, fall: 0.1, gps: 1, ecg: 0.5 },
      subscription: 0.3,
    },
    channelMix: { specialty: 0.4, online: 0.3, marketplace: 0.2, electronics: 0.1 },
    mediaReach: { digital: 1.2, search: 1.2, traditional: 0.6 },
    caresAbout: ["gps", "water", "battery"],
    toneFit: { energetic: 1, expert: 0.8, premium: 0.6, practical: 0.4, playful: 0.3, caring: 0.2 },
  },
  business: {
    baseDemand: { na: 30_000, eu: 25_000, apac: 20_000, latam: 8_000 },
    growthPerRound: 0.06,
    refPrice: 99,
    maxPrice: 220,
    priceSensitivity: 1.8,
    wants: {
      chip: { basic: 0.7, mid: 1, advanced: 0.6 },
      form: { band: 1, ring: 0.6, watch: 0.7 },
      battery: { d2: 0.2, d7: 0.8, d14: 1 },
      display: { none: 1, basic: 0.8, color: 0.4 },
      material: { plastic: 1, aluminum: 0.7, titanium: 0.3 },
      water: { splash: 0.9, swim: 1 },
      privacy: { standard: 0.2, medical: 1 },
      sensors: { hr: 1, spo2: 0.6, temp: 0.5, stress: 0.6, fall: 0.3, gps: 0.1, ecg: 0.3 },
      subscription: 1,
    },
    channelMix: { bizdist: 0.7, online: 0.3 },
    mediaReach: { digital: 0.8, search: 1.0, traditional: 1.0 },
    caresAbout: ["privacy", "platform", "price"],
    toneFit: { expert: 1, practical: 0.8, caring: 0.5, premium: 0.3, energetic: 0.3, playful: 0.2 },
  },
};

/** Weights for how each component area contributes to "fit" with a segment. */
export const FIT_WEIGHTS = {
  chip: 0.12,
  form: 0.14,
  battery: 0.12,
  display: 0.1,
  material: 0.08,
  water: 0.06,
  privacy: 0.08,
  sensors: 0.22,
  subscription: 0.08,
};

// ---------------------------------------------------------------------------
// Regions
// ---------------------------------------------------------------------------

export const REGION_PROFILES: Record<
  RegionId,
  {
    /** Multiplies the segment's refPrice and maxPrice in this region. */
    priceLevel: number;
    /** Seasonal index by round number (index 0 = practice). */
    season: number[];
    /** Channels that operate in this region. */
    channels: ChannelId[];
  }
> = {
  na: { priceLevel: 1.1, season: [1, 1, 1, 1.05, 1.25, 0.95, 1, 1.2], channels: ["online", "marketplace", "mass", "electronics", "pharmacy", "specialty", "carrier", "bizdist"] },
  eu: { priceLevel: 1.05, season: [1, 1, 1, 1.05, 1.2, 0.95, 1, 1.15], channels: ["online", "marketplace", "mass", "electronics", "pharmacy", "specialty", "carrier", "bizdist"] },
  apac: { priceLevel: 0.85, season: [1, 1, 1.05, 1.05, 1.15, 1, 1.05, 1.15], channels: ["online", "marketplace", "mass", "electronics", "pharmacy", "specialty", "carrier", "bizdist"] },
  latam: { priceLevel: 0.8, season: [1, 1, 1, 1, 1.2, 0.95, 1, 1.15], channels: ["online", "marketplace", "mass", "electronics", "pharmacy", "carrier", "bizdist"] },
};

/**
 * Trade promotion (push): money paid to partners for displays, co-op ads, staff incentives and
 * better stocking. In each partner channel it creates "in-store push" (buyers who shop there meet
 * the brand at the shelf, like awareness) and widens stocking. Push lasts only the round it's paid for.
 *   push = maxPush x channel response x spend / (spend + halfSaturationSpend)
 * Your own website has no partner, so trade promotion does nothing there.
 */
export const TRADE_PROMO = { maxPush: 0.65, halfSaturationSpend: 100_000, maxPushCap: 0.9, stockLift: 0.3 };

/** How strongly each type of partner responds to trade promotion (1 = average). The Channel partner survey reveals it in words. */
export const CHANNEL_PUSH: Record<ChannelId, number> = {
  online: 0,
  marketplace: 0.7,
  mass: 1.4,
  electronics: 1.1,
  pharmacy: 1.3,
  specialty: 1.0,
  carrier: 1.0,
  bizdist: 0.6,
};

/**
 * Campaign effect on ad effectiveness, by segment.
 * In the campaign's target segment: target + toneWeight x tone fit (+ the creative grade boost).
 * In other segments: other + otherToneWeight x tone fit. No campaign tone set: noCampaign everywhere.
 */
export const CAMPAIGN = { target: 0.85, toneWeight: 0.35, other: 0.8, otherToneWeight: 0.2, noCampaign: 0.9 };

// ---------------------------------------------------------------------------
// Demand model
// ---------------------------------------------------------------------------

export const DEMAND_MODEL = {
  /** Exponent on fit (how much a good match matters). */
  fitPower: 2.2,
  /** Awareness enters as (awarenessFloor + awareness). */
  awarenessFloor: 0.1,
  awarenessPower: 1.0,
  /** Ads that speak to what a segment cares about lift attractiveness by this much per matching claim. */
  claimBonus: 0.06,
  /** Unsupported claims still lift sales now (a bit) but hurt satisfaction. */
  falseClaimSalesBonus: 0.03,
  /** Pull of the "don't buy any of these" option (a decent product scores about 0.2). */
  outsideOption: 0.35,
  /** Satisfaction effect on attractiveness: (1 + k * (sat - 0.6)). */
  satisfactionEffect: 0.5,
  /** Size of the seeded random factor on each segment's demand (+/-). */
  demandNoise: 0.04,
  /** Share of unmet demand (stockouts) that goes to rivals instead of vanishing. */
  stockoutSpillToRivals: 0.5,
};

export const AWARENESS = {
  /** Share of awareness kept into the next round. */
  retention: 0.65,
  /** Spend (per product per region) that delivers half of the max gain. */
  halfSaturationSpend: 250_000,
  maxGainPerRound: 0.6,
};

export const SATISFACTION = {
  start: 0.6,
  weights: { fit: 0.4, price: 0.25, honesty: 0.2, availability: 0.15 },
  /** Penalty per unsupported claim. */
  falseClaimPenalty: 0.15,
  /** Satisfaction carries over: new = carry * old + (1 - carry) * this round. */
  carry: 0.5,
};
