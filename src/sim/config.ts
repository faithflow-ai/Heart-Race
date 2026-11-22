/**
 * HEART RACE — TUNABLE CONFIG
 *
 * Every number that shapes the market lives in this one file. All values are
 * placeholders until December calibration. Change a number here, run
 * `npm run balance` to see how a simulated class plays out, and repeat.
 *
 * Money is in US dollars. "Round 0" is the practice round; rounds 1-6 are the
 * regular rounds; round 7 is the final round.
 */

export const SEGMENTS = [
  { id: "budget", name: "Budget & First-Time Buyers" },
  { id: "wellness", name: "Everyday Wellness" },
  { id: "older", name: "Older Adults & Caregivers" },
  { id: "fitness", name: "Fitness Enthusiasts & Athletes" },
  { id: "business", name: "Businesses & Insurers" },
] as const;
export type SegmentId = (typeof SEGMENTS)[number]["id"];

export const REGIONS = [
  { id: "na", name: "North America" },
  { id: "eu", name: "Europe" },
  { id: "apac", name: "Asia-Pacific" },
  { id: "latam", name: "Latin America" },
] as const;
export type RegionId = (typeof REGIONS)[number]["id"];

export const CHANNELS = [
  { id: "online", name: "Own website (online direct)" },
  { id: "marketplace", name: "Online marketplaces" },
  { id: "mass", name: "Mass retail" },
  { id: "electronics", name: "Electronics retail" },
  { id: "pharmacy", name: "Pharmacies & health retail" },
  { id: "specialty", name: "Specialty fitness stores" },
  { id: "carrier", name: "Phone carriers" },
  { id: "bizdist", name: "Business distributors" },
] as const;
export type ChannelId = (typeof CHANNELS)[number]["id"];

export const MEDIA = [
  { id: "digital", name: "Digital & social" },
  { id: "search", name: "Search" },
  { id: "traditional", name: "Traditional media" },
  { id: "trade", name: "Trade promotion" },
] as const;
export type MediaId = (typeof MEDIA)[number]["id"];

// ---------------------------------------------------------------------------
// Product components (students see these and their costs)
// ---------------------------------------------------------------------------

export const COMPONENTS = {
  chip: {
    label: "Processor (chip)",
    options: {
      basic: { name: "Basic", cost: 4, advanced: false },
      mid: { name: "Mid", cost: 9, advanced: false },
      advanced: { name: "Advanced", cost: 18, advanced: true },
    },
  },
  form: {
    label: "Form factor",
    options: {
      band: { name: "Band", cost: 8, advanced: false },
      ring: { name: "Ring", cost: 25, advanced: false },
      watch: { name: "Watch", cost: 30, advanced: false },
    },
  },
  battery: {
    label: "Battery life",
    options: {
      d2: { name: "2 days", cost: 4, advanced: false },
      d7: { name: "7 days", cost: 9, advanced: false },
      d14: { name: "14 days", cost: 15, advanced: true },
    },
  },
  display: {
    label: "Display",
    options: {
      none: { name: "None", cost: 0, advanced: false },
      basic: { name: "Basic", cost: 6, advanced: false },
      color: { name: "Full color", cost: 18, advanced: true },
    },
  },
  material: {
    label: "Materials",
    options: {
      plastic: { name: "Plastic", cost: 2, advanced: false },
      aluminum: { name: "Aluminum", cost: 6, advanced: false },
      titanium: { name: "Titanium", cost: 20, advanced: true },
    },
  },
  water: {
    label: "Water resistance",
    options: {
      splash: { name: "Splash", cost: 1, advanced: false },
      swim: { name: "Swim-proof", cost: 4, advanced: false },
    },
  },
  privacy: {
    label: "Data and privacy",
    options: {
      standard: { name: "Standard", cost: 0, advanced: false },
      medical: { name: "Medical-grade privacy", cost: 3, advanced: false },
    },
  },
} as const;
export type ComponentKey = keyof typeof COMPONENTS;

export const SENSORS = {
  hr: { name: "Heart rate", cost: 3, minChip: "basic", advanced: false },
  spo2: { name: "Blood oxygen", cost: 4, minChip: "basic", advanced: false },
  temp: { name: "Skin temperature", cost: 3, minChip: "basic", advanced: false },
  stress: { name: "Stress and sleep (software)", cost: 2, minChip: "basic", advanced: false },
  fall: { name: "Fall detection", cost: 5, minChip: "mid", advanced: false },
  gps: { name: "GPS", cost: 8, minChip: "mid", advanced: true },
  ecg: { name: "ECG", cost: 12, minChip: "advanced", advanced: true },
} as const;
export type SensorId = keyof typeof SENSORS;

export const CHIP_RANK = { basic: 0, mid: 1, advanced: 2 } as const;

/** Rules for what a chip can drive. */
export const CHIP_RULES = {
  /** A full color display needs the advanced chip. A basic display needs at least mid. */
  displayMinChip: { none: "basic", basic: "mid", color: "advanced" },
  /** The advanced chip uses more power: effective battery drops one step. */
  advancedChipBatteryPenalty: true,
} as const;

export const PRODUCT_COSTS = {
  baseUnitCost: 10, // assembly, packaging, companion app
  devFeeBase: 200_000,
  devFeePerAdvanced: 50_000,
  /** Fees are higher in the round 4 window (third product). */
  lateWindowFrom: 4,
  lateWindowMultiplier: 1.5,
  leadTimeRounds: 1,
  /** Each doubling of cumulative units cuts unit cost by this much... */
  learningRate: 0.1,
  /** ...down to this share of the starting cost. */
  learningFloor: 0.6,
  /** Industry component prices fall this much per round. */
  industryCostDeclinePerRound: 0.03,
  /** Subscription: platform cost per subscriber per round (a round = a quarter). */
  subscriptionPlatformCost: 3,
};

export const PRODUCT_RULES = {
  maxProductsAtLaunch: 2,
  maxProductsTotal: 3,
  /** The third product can be briefed from this round on (it launches a round later). */
  thirdProductBriefRound: 3,
};

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
}

export const CLAIMS = {
  price: { name: "Great value / low price" },
  battery: { name: "Long battery life" },
  sleep: { name: "Sleep and stress insights" },
  heart: { name: "Heart health monitoring" },
  safety: { name: "Fall detection and safety alerts" },
  gps: { name: "GPS and training accuracy" },
  design: { name: "Premium design and comfort" },
  privacy: { name: "Medical-grade data privacy" },
  water: { name: "Swim-proof durability" },
  platform: { name: "Health data dashboard / app" },
} as const;
export type ClaimId = keyof typeof CLAIMS;

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

/** Entering a region costs a one-time fee from company capital, by entry mode. */
export const ENTRY_MODES = {
  distributor: { name: "Distributor", fee: 50_000, coverageBoost: 0.9, extraMargin: 0.05 },
  partner: { name: "Local partner", fee: 150_000, coverageBoost: 1.0, extraMargin: 0.02 },
  subsidiary: { name: "Own subsidiary", fee: 400_000, coverageBoost: 1.1, extraMargin: 0 },
} as const;
export type EntryModeId = keyof typeof ENTRY_MODES;

// ---------------------------------------------------------------------------
// Channels: margins, leverage, coverage
// ---------------------------------------------------------------------------

export const CHANNEL_TERMS: Record<
  ChannelId,
  { margin: number; coverage: number; fulfillmentCost?: number; setupFee: number }
> = {
  online: { margin: 0, coverage: 0.6, fulfillmentCost: 0.08, setupFee: 20_000 },
  marketplace: { margin: 0.15, coverage: 0.85, setupFee: 10_000 },
  mass: { margin: 0.35, coverage: 0.8, setupFee: 40_000 },
  electronics: { margin: 0.35, coverage: 0.8, setupFee: 40_000 },
  pharmacy: { margin: 0.4, coverage: 0.75, setupFee: 40_000 },
  specialty: { margin: 0.4, coverage: 0.75, setupFee: 30_000 },
  carrier: { margin: 0.3, coverage: 0.8, setupFee: 50_000 },
  bizdist: { margin: 0.2, coverage: 0.8, setupFee: 30_000 },
};

export const LEVERAGE = {
  /** Cumulative units in one channel+region that earn each tier. */
  tiers: [20_000, 50_000, 100_000],
  /** Margin points cut per tier. */
  cutPerTier: 0.02,
  /** Most a partner's margin can be cut. */
  maxCut: 0.06,
};

/** Trade promotion spending raises a partner's push: coverage x (1 + boost). */
export const TRADE_PROMO = { maxBoost: 0.25, halfSaturationSpend: 150_000 };

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

// ---------------------------------------------------------------------------
// Production, capacity and costs
// ---------------------------------------------------------------------------

export const PRODUCTION = {
  /** Starting units per round a team can produce (all products and regions). */
  startCapacity: 70_000,
  overtimeMax: 0.2,
  overtimeCostPremium: 0.25,
  /** Cost to add one unit of per-round capacity (from company capital). */
  expansionCostPerUnit: 12,
  /** Fixed cost per unit of capacity per round, used or not. */
  fixedCostPerCapacityUnit: 1.5,
  holdingCostRate: 0.05,
  /** Units held this many rounds are cleared at a discount. */
  clearanceAfterRounds: 2,
  clearanceRecovery: 0.5,
  /** Warn when production and forecast differ by more than this. */
  forecastGapWarning: 0.2,
};

export const FINANCE = {
  startingCapital: 3_000_000,
  overheadPerRound: 150_000,
  overheadPerRegion: 40_000,
};

// ---------------------------------------------------------------------------
// Marketing budget (promotion + research)
// ---------------------------------------------------------------------------

export const MARKETING_BUDGET = {
  /** Money head office releases, by round. Teams pace the round-3 release through the final round. */
  releases: { 1: 500_000, 2: 500_000, 3: 1_000_000 } as Record<number, number>,
  /** Earned top-up each round from round 2: base + revenueShare x last round's revenue. */
  earnedBase: 50_000,
  earnedRevenueShare: 0.1,
  earnedFloor: 50_000,
  /** Earned top-up can grow by at most this much over the previous round's top-up. */
  earnedCapGrowth: 0.5,
  earnedCapAbsolute: 1_500_000,
  carryOver: true,
};

// ---------------------------------------------------------------------------
// Research studies (paid from the marketing budget, delivered right away)
// ---------------------------------------------------------------------------

export const STUDIES = {
  survey: { name: "Market survey (free in practice round)", cost: 0, practiceOnly: true },
  needs: { name: "Customer needs", cost: 40_000 },
  potential: { name: "Market potential", cost: 25_000 },
  price: { name: "Price willing to pay", cost: 30_000 },
  media: { name: "Media and channel preferences", cost: 30_000 },
  awareness: { name: "Awareness tracking", cost: 20_000 },
  satisfaction: { name: "Satisfaction survey", cost: 20_000 },
  competitors: { name: "Competitor benchmark", cost: 35_000 },
  partners: { name: "Channel partner survey", cost: 20_000 },
} as const;
export type StudyId = keyof typeof STUDIES;

// ---------------------------------------------------------------------------
// Rounds and unlocks
// ---------------------------------------------------------------------------

export const ROUNDS = {
  practice: 0,
  final: 7,
  names: ["Practice", "Round 1", "Round 2", "Round 3", "Round 4", "Round 5", "Round 6", "Final"],
  /** Grade weight of each round (sums to 1). */
  gradeWeights: [0, 0.1, 0.1, 0.15, 0.15, 0.15, 0.15, 0.2],
};

/**
 * When each decision screen unlocks. Products can be briefed in the practice
 * round so they are ready to sell in round 1 (1-round lead time).
 */
export const UNLOCKS: Record<string, number> = {
  strategy: 0,
  research: 0,
  products: 0,
  markets: 1,
  pricing: 1,
  production: 1,
  goals: 1,
  retention: 4,
};

// ---------------------------------------------------------------------------
// Scorecard
// ---------------------------------------------------------------------------

export const SCORECARD_WEIGHTS = {
  market: 0.3,
  customer: 0.2,
  financial: 0.2,
  channel: 0.2,
  goals: 0.1,
};
export type ScoreKey = keyof typeof SCORECARD_WEIGHTS;

// ---------------------------------------------------------------------------
// AI rivals
// ---------------------------------------------------------------------------

export const AI = {
  firmsPerMarket: 8,
  /** Default difficulty (0-10) by round; the console can override per firm. */
  defaultLevelByRound: [4, 4, 4, 5, 5.5, 6.5, 7, 7.5],
  styles: {
    premium: { name: "Premium differentiator" },
    lowcost: { name: "Low-cost leader" },
    follower: { name: "Fast follower" },
  },
  names: ["Voltway", "Pulsewise", "Kinetix", "Aurora Health", "Nimbus Labs", "Vitalis", "Corebeat"],
};
export type AiStyle = keyof typeof AI.styles;

export const TEAM_NAMES = ["Team 1", "Team 2", "Team 3", "Team 4", "Team 5", "Team 6", "Team 7"];

/** Bundle everything into one object the engine reads (lets the console override parts later). */
export const DEFAULT_SETTINGS = {
  scorecardWeights: SCORECARD_WEIGHTS,
  marketingBudget: MARKETING_BUDGET,
  startingCapital: FINANCE.startingCapital,
};
export type GameSettings = typeof DEFAULT_SETTINGS;
