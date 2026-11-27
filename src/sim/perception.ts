/**
 * Positioning map: where buyers see a product on one buying criterion, 0 (low) to 1 (high).
 * Built only from what a product visibly is (its components and price), so it's safe to show.
 */
import { CLAIMS, type ClaimId } from "./config";
import { effectiveBattery } from "./product";
import type { ProductSpec } from "./types";

export const MAP_AXES = Object.keys(CLAIMS) as ClaimId[];

/** Axis labels for the map, written the way a buyer would say it. */
export const AXIS_LABELS: Record<ClaimId, { name: string; low: string; high: string }> = {
  price: { name: "Price", low: "Low price", high: "High price" },
  battery: { name: "Battery life", low: "Charge daily", high: "Two weeks" },
  sleep: { name: "Sleep and stress insights", low: "Basic", high: "Detailed" },
  heart: { name: "Heart health monitoring", low: "None", high: "Medical-grade" },
  safety: { name: "Safety alerts", low: "None", high: "Fall detection" },
  gps: { name: "Training accuracy", low: "Casual", high: "Pro-grade" },
  design: { name: "Design and comfort", low: "Plain", high: "Premium" },
  privacy: { name: "Data privacy", low: "Standard", high: "Medical-grade" },
  water: { name: "Durability", low: "Splash-proof", high: "Swim-proof" },
  platform: { name: "Health app", low: "Basic app", high: "Full dashboard" },
};

const clamp = (n: number) => Math.max(0.03, Math.min(0.97, n));
const CHIP = { basic: 0, mid: 0.5, advanced: 1 } as const;

/** Price on a log scale from about $50 (0) to $500 (1). */
export function priceScore(price: number) {
  if (!(price > 0)) return 0.5;
  return clamp(Math.log(price / 50) / Math.log(10));
}

export function perceived(p: ProductSpec, axis: ClaimId, price: number): number {
  const has = (s: string) => p.sensors.includes(s as ProductSpec["sensors"][number]);
  switch (axis) {
    case "price":
      return priceScore(price);
    case "battery":
      return clamp({ d2: 0.15, d7: 0.55, d14: 0.92 }[effectiveBattery(p)]);
    case "sleep":
      return clamp((has("stress") ? 0.55 : 0.1) + (has("temp") ? 0.15 : 0) + CHIP[p.chip] * 0.2);
    case "heart":
      return clamp((has("ecg") ? 0.75 : has("hr") ? 0.4 : 0.05) + (has("spo2") ? 0.15 : 0));
    case "safety":
      return clamp((has("fall") ? 0.7 : 0.08) + (p.display !== "none" ? 0.1 : 0) + CHIP[p.chip] * 0.1);
    case "gps":
      return clamp((has("gps") ? 0.6 : 0.1) + CHIP[p.chip] * 0.3);
    case "design":
      return clamp({ plastic: 0.2, aluminum: 0.55, titanium: 0.85 }[p.material] + (p.form === "ring" ? 0.1 : 0) + (p.display === "color" ? 0.05 : 0));
    case "privacy":
      return clamp(p.privacy === "medical" ? 0.85 : 0.25);
    case "water":
      return clamp(p.water === "swim" ? 0.85 : 0.25);
    case "platform":
      return clamp((p.subscriptionPrice > 0 ? 0.6 : 0.15) + (p.display === "color" ? 0.15 : 0) + CHIP[p.chip] * 0.15);
  }
}

export interface PositionDot {
  id: string;
  /** product = one of ours, segment = a target segment, rival = a rival firm. */
  kind: "product" | "segment" | "rival";
  /** Product id, segment id or rival firm id. */
  ref: string;
  x: number;
  y: number;
}

export interface PositionMap {
  x: ClaimId | "";
  y: ClaimId | "";
  why: string;
  dots: PositionDot[];
  /** Round in which the team last confirmed the map. */
  confirmedRound: number | null;
}

export const emptyMap = (): PositionMap => ({ x: "", y: "", why: "", dots: [], confirmedRound: null });

/** Rounds where the map must be (re)confirmed: Practice, Round 3 (before redesigns), Round 4 and the Final (board meetings). */
export const MAP_REQUIRED_ROUNDS = [0, 3, 4, 7];
