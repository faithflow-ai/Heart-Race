import type {
  AiStyle,
  ChannelId,
  ClaimId,
  EntryModeId,
  MediaId,
  RegionId,
  ScoreKey,
  SegmentId,
  SensorId,
  StudyId,
  ToneId,
} from "./config";

export type Tier = "good" | "better" | "best";

/** A product brief. Components lock once engineering accepts it (commission). */
export interface ProductSpec {
  id: string;
  name: string;
  tier: Tier;
  targetSegment: SegmentId;
  chip: "basic" | "mid" | "advanced";
  form: "band" | "ring" | "watch";
  battery: "d2" | "d7" | "d14";
  display: "none" | "basic" | "color";
  material: "plastic" | "aluminum" | "titanium";
  water: "splash" | "swim";
  privacy: "standard" | "medical";
  sensors: SensorId[];
  /** Monthly premium app plan price; 0 = no subscription. */
  subscriptionPrice: number;
  /** Ad claims featured, in priority order (max 3). Can change every round. */
  claims: ClaimId[];
  /** true = the brief was sent to engineering and a quote came back (components frozen until "Revise brief"). */
  briefSent: boolean;
  /** true = the team accepted engineering's quote this round (fee charged and design locked at the deadline). */
  commission: boolean;
  /** true = stop selling this product. */
  retire: boolean;
  /** The product's ad campaign. Can change every round; carries forward if not edited. */
  campaign: Campaign;
}

export interface Campaign {
  /** The single main message (the instructor reads it; the sim doesn't score the wording). */
  message: string;
  tone: ToneId | "";
  /** The segment the campaign speaks to. */
  segment: SegmentId | "";
}

export interface RegionDecision {
  enter: boolean;
  entryMode: EntryModeId;
  channels: ChannelId[];
}

export interface ProductRegionPlan {
  price: number;
  /** Units to produce this round for this region. */
  production: number;
  /** Units the team expects to sell. */
  forecast: number;
  /** Promotion dollars by medium for this product in this region. */
  media: Record<MediaId, number>;
  /** Total promotion for this product in this region (the sum of media; kept in step automatically). */
  promotion: number;
}

export interface FirmDecision {
  strategy: {
    companyName: string;
    mission: string;
    positioning: string;
    norms: string;
    posture: "differentiate" | "cost" | "niche" | "follow" | "";
    targetSegments: SegmentId[];
    targetRegions: RegionId[];
  };
  goals: {
    /** Share of all target segments together, percent (older decisions only; now set per segment). */
    share: number | null;
    /** Share goal for each target segment, percent. Each segment goal counts equally in goal accuracy. */
    segmentShare: Partial<Record<SegmentId, number | null>>;
    revenue: number | null;
    /** Operating margin, percent. */
    margin: number | null;
    /** Average awareness in target segments, percent. */
    awareness: number | null;
    /** Satisfaction, percent. */
    satisfaction: number | null;
  };
  /** Studies bought this round. Purchases cannot be undone. */
  research: StudyId[];
  products: ProductSpec[];
  regions: Record<RegionId, RegionDecision>;
  plan: Record<string, Record<RegionId, ProductRegionPlan>>;
  /** Legacy (before Nov 2026): one percent split across media for the whole team. Old decisions are converted to dollars per medium. */
  mediaMix?: Record<MediaId, number>;
  /** Units of per-round capacity to add (online next round). */
  capacityExpansion: number;
  /** Round reflection (written, graded by the instructor). */
  reflection: string;
  /** The team says it's done for this round (doesn't lock anything; shown to the instructor). */
  ready: boolean;
}

export interface FirmMeta {
  id: string;
  name: string;
  isAi: boolean;
  aiLevel: number;
  aiStyle: AiStyle;
  slot: number;
  /** Optional fixed target segments (used by the showcase class so teams match their positioning). */
  targets?: SegmentId[];
}

export interface InventoryLot {
  units: number;
  age: number;
}

export interface ProductState {
  spec: ProductSpec;
  briefedRound: number;
  launchRound: number;
  retired: boolean;
  devFee: number;
  /** Starting unit cost from the quote. */
  quotedUnitCost: number;
  cumUnits: number;
  subscribers: number;
}

export interface FirmState {
  capital: number;
  marketingPot: number;
  lastTopUp: number;
  lastRevenue: number;
  capacity: number;
  pendingCapacity: number;
  products: Record<string, ProductState>;
  regions: Partial<Record<RegionId, EntryModeId>>;
  channelsOpen: Partial<Record<RegionId, ChannelId[]>>;
  /** awareness[productId][region][segment] 0..1 */
  awareness: Record<string, Partial<Record<RegionId, Partial<Record<SegmentId, number>>>>>;
  /** Awareness this round including in-store push from trade promotion: [productId][region][segment] 0..1. Reset each round. */
  shelfAwareness?: Record<string, Partial<Record<RegionId, Partial<Record<SegmentId, number>>>>>;
  satisfaction: Record<string, number>;
  inventory: Record<string, Partial<Record<RegionId, InventoryLot[]>>>;
  /** Cumulative units through each channel in each region (earns leverage). */
  channelUnits: Partial<Record<RegionId, Partial<Record<ChannelId, number>>>>;
  /** Last decision used (for carry-forward and AI adaptation). */
  lastDecision: FirmDecision | null;
}

export interface GameState {
  round: number;
  firms: Record<string, FirmState>;
}

/** One row of the share model: a product in a segment in a region. */
export interface ShareRow {
  productId: string;
  segment: SegmentId;
  region: RegionId;
  fit: number;
  priceFactor: number;
  awareness: number;
  availability: number;
  claimFactor: number;
  satisfactionFactor: number;
  attractiveness: number;
  demandUnits: number;
  units: number;
  /** Share of all units sold in this segment and region. */
  share: number;
  price: number;
}

export interface PnL {
  grossSales: number;
  partnerMargin: number;
  fulfillment: number;
  revenue: number; // net of partner margin and fulfillment, plus subscriptions and clearance
  subscriptionRevenue: number;
  clearanceRevenue: number;
  cogs: number;
  overtimePremium: number;
  holding: number;
  capacityFixed: number;
  promotion: number;
  research: number;
  devFees: number;
  entryFees: number;
  channelSetup: number;
  expansion: number;
  overhead: number;
  operatingProfit: number;
}

export interface ScoreBreakdown {
  raw: Record<ScoreKey, number>;
  /** Share of units sold in each target segment (0 to 1). */
  segShare?: Partial<Record<SegmentId, number>>;
  points: Record<ScoreKey, number>;
  total: number;
  rank: number;
}

export interface FirmReport {
  firmId: string;
  carriedForward: boolean;
  pnl: PnL;
  byProduct: Record<string, { name: string; units: number; revenue: number; unitCost: number; satisfaction: number }>;
  byRegion: Partial<Record<RegionId, { units: number; revenue: number }>>;
  byChannel: Partial<Record<ChannelId, { units: number; revenue: number; margin: number }>>;
  rows: ShareRow[];
  /** Units per product per region: forecast, produced, demand, sold, lost, left over. */
  supply: { productId: string; region: RegionId; forecast: number; produced: number; demand: number; sold: number; lost: number; endInventory: number }[];
  goals: { key: string; label: string; goal: number | null; actual: number }[];
  forecastAccuracy: number;
  budget: { start: number; release: number; earned: number; spent: number; end: number };
  capital: { start: number; end: number };
  capacity: { capacity: number; used: number; overtime: number; nextRound: number };
  concerns: { title: string; detail: string; fix: string }[];
  /** What promotion bought, by product and region. */
  promo?: PromoResult[];
  drivers: { productId: string; segment: SegmentId; shareNow: number; sharePrev: number; factors: { name: string; change: number }[] }[];
  notes: string[];
}

export interface RoundResult {
  round: number;
  state: GameState;
  reports: Record<string, FirmReport>;
  scores: Record<string, ScoreBreakdown>;
  market: {
    demand: Record<SegmentId, Record<RegionId, number>>;
    unitsByFirmSegment: Record<string, Partial<Record<SegmentId, number>>>;
    pricesByFirm: Record<string, { productId: string; name: string; tier: Tier; region: RegionId; price: number }[]>;
  };
  /** Decisions as used (after carry-forward), for audit and rerun. */
  decisions: Record<string, FirmDecision>;
}

/** Promotion results for one product in one region. */
export interface PromoResult {
  productId: string;
  region: RegionId;
  /** Dollars actually spent by medium (after any over-budget scaling). */
  spend: Record<MediaId, number>;
  /** Awareness by segment (0..1) before and after this round's ads, and each ad medium's share of the gain. */
  segments: Partial<Record<SegmentId, { before: number; after: number; gain: number; byMedium: Record<"digital" | "search" | "traditional", number>; campaign: number }>>;
  /** Trade promotion: in-store push (0..1) and stocking reach without and with trade promotion, by partner channel. */
  channels: Partial<Record<ChannelId, { push: number; reachBase: number; reachNow: number }>>;
  campaignSegment: SegmentId | "";
}
