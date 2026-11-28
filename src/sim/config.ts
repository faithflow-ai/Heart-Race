/**
 * HEART RACE — TUNABLE CONFIG (part 1 of 2: what students can see)
 *
 * Every number that shapes the game lives in this file and in market.ts
 * (part 2: the hidden buyer preferences students discover through research). All values are
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
/** Media that build consumer awareness (pull). Trade promotion pushes through partners instead. */
export const AD_MEDIA = ["digital", "search", "traditional"] as const;
export type AdMediaId = (typeof AD_MEDIA)[number];

/** Tones a campaign can take. Each segment responds to some tones better than others (hidden; the Customer needs study reveals it). */
export const TONES = {
  caring: { name: "Warm and reassuring" },
  energetic: { name: "Energetic and motivating" },
  premium: { name: "Premium and aspirational" },
  practical: { name: "Practical and no-nonsense" },
  playful: { name: "Friendly and playful" },
  expert: { name: "Expert and trustworthy" },
} as const;
export type ToneId = keyof typeof TONES;

/**
 * Creative work teams submit as links, graded by the instructor with a rubric.
 * The grade lifts the team's campaign effectiveness in the rounds after the milestone.
 */
export const CREATIVE = {
  milestones: [
    {
      id: "launch",
      round: 1,
      title: "Round 1 launch campaign",
      items: [
        { id: "brief", label: "1-page creative brief", required: true },
        { id: "social1", label: "Social media post 1", required: true },
        { id: "social2", label: "Social media post 2", required: true },
        { id: "social3", label: "Social media post 3", required: true },
        { id: "search", label: "Search ad", required: true },
      ],
    },
    {
      id: "video",
      round: 4,
      title: "Round 4 video campaign",
      items: [
        { id: "vertical1", label: "Vertical video ad (9:16)", required: true },
        { id: "vertical2", label: "Second vertical video ad (optional)", required: false },
        { id: "horizontal", label: "Horizontal video, about 30 seconds (16:9)", required: true },
        { id: "brief", label: "New 1-page creative brief (only if your message changed or you launched a new product)", required: false },
      ],
    },
    {
      id: "landing",
      round: 7,
      title: "Final round launch landing page",
      items: [{ id: "landing", label: "Product launch landing page (brings together your earlier work)", required: true }],
    },
  ],
  rubric: [
    { id: "fit", name: "Segment fit", help: "Clearly speaks to the team's declared target segment and its needs." },
    { id: "clarity", name: "Message clarity", help: "One main message, quickly understood, with a clear call to action." },
    { id: "creativity", name: "Creativity", help: "Built on an insight; distinctive rather than generic." },
    { id: "consistency", name: "Brand consistency", help: "Matches the brief, positioning and earlier work in tone, look and promise." },
    { id: "craft", name: "Craft", help: "Fits the format (length, aspect ratio, character limits, page structure); polished." },
  ],
  /** Average rubric score (1-5) of 3 = no effect; each point above or below moves ad effectiveness in the campaign's segment by this much. */
  boostPerPoint: 0.05,
} as const;
export type MilestoneId = (typeof CREATIVE.milestones)[number]["id"];

/** Benefits a product's ads can feature. */
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
  /** Volume milestones (published to students): when a product's total units made reach each number, its unit cost drops... */
  volumeMilestones: [50_000, 150_000, 300_000],
  /** ...by this share of the starting cost (5 points each, so the lowest is 85%). */
  milestoneCut: 0.05,
  /** Industry component prices fall this much per round (published to students). */
  industryCostDeclinePerRound: 0.02,
  /** Subscription: platform cost per subscriber per round (a round = a quarter). */
  subscriptionPlatformCost: 3,
};

export const PRODUCT_RULES = {
  maxProductsAtLaunch: 2,
  maxProductsTotal: 3,
  /** The third product can be briefed from this round on (it launches a round later). */
  thirdProductBriefRound: 3,
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
  /** If capital ends a round below zero, HQ lends the difference at this interest per round (charged to profit). */
  loanInterestPerRound: 0.03,
  /** Loans are repaid automatically from capital above this cushion. */
  loanRepayCushion: 500_000,
  /** Exiting a region costs this share of its entry fee, once. */
  exitFeeShare: 0.5,
  /** Capacity expansion is spread over this many rounds when scoring profit (amortization). */
  expansionAmortRounds: 4,
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
  /** Per-round spending limit on promotion + research: the greater of this floor... */
  roundCapFloor: 500_000,
  /** ...or this share of last round's revenue. */
  roundCapRevenueShare: 0.2,
};

// ---------------------------------------------------------------------------
// Research studies (paid from the marketing budget, delivered right away)
// ---------------------------------------------------------------------------

export const STUDIES = {
  survey: { name: "Market survey (free in practice round)", cost: 0, practiceOnly: true },
  needs: { name: "Customer needs", cost: 40_000 },
  potential: { name: "Market potential", cost: 25_000 },
  price: { name: "Price willing to pay", cost: 30_000 },
  media: { name: "Media preferences", cost: 20_000 },
  awareness: { name: "Awareness tracking", cost: 20_000 },
  satisfaction: { name: "Satisfaction survey", cost: 20_000 },
  competitors: { name: "Competitor benchmark", cost: 35_000 },
  partners: { name: "Channel partner survey", cost: 30_000 },
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
  /** Market events: the round each starts (null = off). Missing = the default schedule in events.ts. */
  events: {} as Partial<Record<"chip" | "rival" | "tariff", number | null>>,
};
export type GameSettings = typeof DEFAULT_SETTINGS;

// ---------------------------------------------------------------------------
// Grade bands (for the CSV export). Score is shown as a percent of the best
// student team's weighted score, so bands work like a curve. AI firms are
// ranked but never take a band.
// ---------------------------------------------------------------------------
export const GRADE_BANDS = [
  { min: 90, band: "A" },
  { min: 80, band: "B" },
  { min: 70, band: "C" },
  { min: 60, band: "D" },
  { min: 0, band: "F" },
];
