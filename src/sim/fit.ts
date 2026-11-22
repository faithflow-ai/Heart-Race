import { FIT_WEIGHTS, SEGMENT_PROFILES } from "./market";
import type { SegmentId } from "./config";
import { effectiveBattery } from "./product";
import type { ProductSpec } from "./types";

/** How well a product matches what a segment wants, 0..1. Hidden from students. */
export function fit(p: ProductSpec, seg: SegmentId): number {
  const w = SEGMENT_PROFILES[seg].wants;
  const W = FIT_WEIGHTS;
  let score = 0;
  score += W.chip * w.chip[p.chip];
  score += W.form * w.form[p.form];
  score += W.battery * w.battery[effectiveBattery(p)];
  score += W.display * w.display[p.display];
  score += W.material * w.material[p.material];
  score += W.water * w.water[p.water];
  score += W.privacy * w.privacy[p.privacy];
  // Sensors: covered share of what the segment wants, minus a small clutter penalty for unwanted ones.
  const totalWant = Object.values(w.sensors).reduce((a, b) => a + b, 0);
  let got = 0;
  let clutter = 0;
  for (const s of p.sensors) {
    got += w.sensors[s];
    if (w.sensors[s] < 0.25) clutter += 0.05;
  }
  score += W.sensors * Math.max(0, Math.min(1, got / (totalWant * 0.7)) - clutter);
  // Subscription: neutral without one; segments that value a plan reward it.
  const subVal = p.subscriptionPrice > 0 ? 0.5 + w.subscription * 0.5 : 0.5;
  score += W.subscription * Math.max(0, Math.min(1, subVal));
  return Math.max(0.05, Math.min(1, score));
}

