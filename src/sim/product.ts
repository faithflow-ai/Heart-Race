import {
  CHANNELS,
  CHIP_RANK,
  CHIP_RULES,
  COMPONENTS,
  MEDIA,
  PRODUCT_COSTS,
  REGIONS,
  SENSORS,
  type ClaimId,
  type RegionId,
  type SegmentId,
} from "./config";
import type { FirmDecision, ProductSpec } from "./types";

export function newProduct(id: string, n: number): ProductSpec {
  return {
    id,
    name: `Product ${n}`,
    tier: "good",
    targetSegment: "budget",
    chip: "basic",
    form: "band",
    battery: "d7",
    display: "none",
    material: "plastic",
    water: "splash",
    privacy: "standard",
    sensors: ["hr", "stress"],
    subscriptionPrice: 0,
    claims: [],
    briefSent: false,
    commission: false,
    retire: false,
  };
}

export function emptyDecision(): FirmDecision {
  const regions = {} as FirmDecision["regions"];
  for (const r of REGIONS) regions[r.id] = { enter: false, entryMode: "distributor", channels: [] };
  const mediaMix = {} as FirmDecision["mediaMix"];
  for (const m of MEDIA) mediaMix[m.id] = 25;
  return {
    strategy: { companyName: "", mission: "", positioning: "", norms: "", posture: "", targetSegments: [], targetRegions: [] },
    goals: { share: null, revenue: null, margin: null, awareness: null, satisfaction: null },
    research: [],
    products: [],
    regions,
    plan: {},
    mediaMix,
    capacityExpansion: 0,
    reflection: "",
    ready: false,
  };
}

/** Fill any missing fields so older or partial decisions are always safe to read. */
export function normalizeDecision(d: Partial<FirmDecision> | null | undefined): FirmDecision {
  const base = emptyDecision();
  if (!d) return base;
  const out: FirmDecision = {
    ...base,
    ...d,
    strategy: { ...base.strategy, ...(d.strategy ?? {}) },
    goals: { ...base.goals, ...(d.goals ?? {}) },
    regions: { ...base.regions },
    mediaMix: { ...base.mediaMix, ...(d.mediaMix ?? {}) },
    plan: { ...(d.plan ?? {}) },
    products: (d.products ?? []).map((p, i) => ({ ...newProduct(p.id ?? `p${i + 1}`, i + 1), ...p })),
    research: [...(d.research ?? [])],
  };
  for (const r of REGIONS) out.regions[r.id] = { ...base.regions[r.id], ...(d.regions?.[r.id] ?? {}) };
  return out;
}

export function effectiveBattery(p: ProductSpec): ProductSpec["battery"] {
  if (p.chip === "advanced" && CHIP_RULES.advancedChipBatteryPenalty) {
    return p.battery === "d14" ? "d7" : "d2";
  }
  return p.battery;
}

/** Problems with a brief that engineering would reject. */
export function specProblems(p: ProductSpec): string[] {
  const out: string[] = [];
  const chip = CHIP_RANK[p.chip];
  for (const s of p.sensors) {
    const need = SENSORS[s]?.minChip;
    if (need && CHIP_RANK[need] > chip) out.push(`${SENSORS[s].name} needs at least the ${COMPONENTS.chip.options[need].name} chip.`);
  }
  const dNeed = CHIP_RULES.displayMinChip[p.display];
  if (CHIP_RANK[dNeed] > chip) out.push(`A ${COMPONENTS.display.options[p.display].name.toLowerCase()} display needs at least the ${COMPONENTS.chip.options[dNeed].name} chip.`);
  if (p.form === "ring" && p.display !== "none") out.push("A ring can't have a display.");
  if (p.claims.length > 3) out.push("Pick at most 3 ad claims.");
  return out;
}

export function countAdvanced(p: ProductSpec): number {
  let n = 0;
  if (COMPONENTS.chip.options[p.chip].advanced) n++;
  if (COMPONENTS.battery.options[p.battery].advanced) n++;
  if (COMPONENTS.display.options[p.display].advanced) n++;
  if (COMPONENTS.material.options[p.material].advanced) n++;
  for (const s of p.sensors) if (SENSORS[s].advanced) n++;
  return n;
}

export interface Quote {
  unitCost: number;
  devFee: number;
  leadTime: number;
  lines: { label: string; cost: number }[];
  problems: string[];
}

/** Engineering's quote for a brief, at the given round's industry prices. */
export function quote(p: ProductSpec, round: number): Quote {
  const lines: { label: string; cost: number }[] = [{ label: "Assembly, packaging, app", cost: PRODUCT_COSTS.baseUnitCost }];
  lines.push({ label: `Chip: ${COMPONENTS.chip.options[p.chip].name}`, cost: COMPONENTS.chip.options[p.chip].cost });
  lines.push({ label: `Form: ${COMPONENTS.form.options[p.form].name}`, cost: COMPONENTS.form.options[p.form].cost });
  for (const s of p.sensors) lines.push({ label: `Sensor: ${SENSORS[s].name}`, cost: SENSORS[s].cost });
  lines.push({ label: `Battery: ${COMPONENTS.battery.options[p.battery].name}`, cost: COMPONENTS.battery.options[p.battery].cost });
  lines.push({ label: `Display: ${COMPONENTS.display.options[p.display].name}`, cost: COMPONENTS.display.options[p.display].cost });
  lines.push({ label: `Materials: ${COMPONENTS.material.options[p.material].name}`, cost: COMPONENTS.material.options[p.material].cost });
  lines.push({ label: `Water: ${COMPONENTS.water.options[p.water].name}`, cost: COMPONENTS.water.options[p.water].cost });
  lines.push({ label: `Privacy: ${COMPONENTS.privacy.options[p.privacy].name}`, cost: COMPONENTS.privacy.options[p.privacy].cost });
  const decline = Math.pow(1 - PRODUCT_COSTS.industryCostDeclinePerRound, Math.max(0, round - 1));
  const unitCost = round2(lines.reduce((a, l) => a + l.cost, 0) * decline);
  let devFee = PRODUCT_COSTS.devFeeBase + PRODUCT_COSTS.devFeePerAdvanced * countAdvanced(p);
  if (round >= PRODUCT_COSTS.lateWindowFrom) devFee *= PRODUCT_COSTS.lateWindowMultiplier;
  return { unitCost, devFee, leadTime: PRODUCT_COSTS.leadTimeRounds, lines, problems: specProblems(p) };
}

/** Unit cost after the learning curve. */
export function unitCostAt(quoted: number, cumUnits: number, round: number, briefedRound: number): number {
  const doublings = cumUnits > 10_000 ? Math.log2(cumUnits / 10_000) : 0;
  const learn = Math.max(PRODUCT_COSTS.learningFloor, Math.pow(1 - PRODUCT_COSTS.learningRate, doublings));
  const decline = Math.pow(1 - PRODUCT_COSTS.industryCostDeclinePerRound, Math.max(0, round - Math.max(1, briefedRound)));
  return quoted * learn * decline;
}

/** Which claims a product can truthfully make. */
export function supportedClaims(p: ProductSpec): Set<ClaimId> {
  const s = new Set<ClaimId>();
  const bat = effectiveBattery(p);
  if (bat === "d7" || bat === "d14") s.add("battery");
  if (p.sensors.includes("stress")) s.add("sleep");
  if (p.sensors.includes("hr") || p.sensors.includes("ecg")) s.add("heart");
  if (p.sensors.includes("fall")) s.add("safety");
  if (p.sensors.includes("gps")) s.add("gps");
  if (p.material !== "plastic" || p.form === "ring") s.add("design");
  if (p.privacy === "medical") s.add("privacy");
  if (p.water === "swim") s.add("water");
  if (p.subscriptionPrice > 0) s.add("platform");
  return s;
}

/** "Great value" is truthful when the price is at or below the segment's typical price. */
export function claimIsTrue(p: ProductSpec, claim: ClaimId, price: number, refPrice: number): boolean {
  if (claim === "price") return price <= refPrice * 1.05;
  return supportedClaims(p).has(claim);
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export const regionIds = REGIONS.map((r) => r.id) as RegionId[];
export const channelIds = CHANNELS.map((c) => c.id);
