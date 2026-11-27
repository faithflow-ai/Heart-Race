import { PRODUCT_RULES, REGIONS, ROUNDS, UNLOCKS } from "@/sim/config";
import { MAP_REQUIRED_ROUNDS } from "@/sim/perception";
import type { TeamData } from "./TeamContext";

/** The six decision steps, in order. `unlock` is the first round the step opens. */
export const STEPS = [
  { id: "strategy", label: "Strategy and goals", unlock: UNLOCKS.strategy },
  { id: "products", label: "Products", unlock: UNLOCKS.products },
  { id: "markets", label: "Markets and channels", unlock: UNLOCKS.markets },
  { id: "pricing", label: "Price and promotion", unlock: UNLOCKS.pricing },
  { id: "production", label: "Forecast and production", unlock: UNLOCKS.production },
  { id: "review", label: "Review and ready", unlock: 0 },
] as const;
export type StepId = (typeof STEPS)[number]["id"];

export function sellable(t: TeamData) {
  const round = t.game.round;
  const committed = new Map(t.committed.map((c) => [c.id, c]));
  return t.decision.products.filter((p) => {
    const c = committed.get(p.id);
    return c && !c.retired && !p.retire && c.launchRound <= round;
  });
}
export function activeRegions(t: TeamData) {
  return REGIONS.filter((r) => t.regionsEntered[r.id] || t.decision.regions[r.id].enter);
}

/** What's still missing this round, each tied to the decision step that fixes it. */
export function checklistItems(t: TeamData): { text: string; tab: StepId }[] {
  const d = t.decision;
  const round = t.game.round;
  const committed = new Map(t.committed.map((c) => [c.id, c]));
  const items: { text: string; tab: StepId }[] = [];
  const add = (text: string, tab: StepId) => items.push({ text, tab });
  if (!d.strategy.companyName.trim()) add("Company not named", "strategy");
  if (!d.strategy.mission.trim()) add("Mission is blank", "strategy");
  if (!d.strategy.norms.trim()) add("Team charter is blank", "strategy");
  if (!d.strategy.targetSegments.length) add("No target segments chosen", "strategy");
  if (!d.strategy.targetRegions.length) add("No target regions chosen", "strategy");
  const pm = d.strategy.positionMap;
  if (MAP_REQUIRED_ROUNDS.includes(round)) {
    if (!pm?.x || !pm?.y) add("Positioning map not drawn yet (required this round)", "strategy");
    else if (pm.confirmedRound !== round) add("Positioning map not confirmed for this round", "strategy");
  }
  const drafts = d.products.filter((p) => !committed.has(p.id) && !p.retire);
  if (!d.products.length && round < PRODUCT_RULES.thirdProductBriefRound + 1) add("No product briefs yet: products briefed this round are ready to sell next round", "products");
  for (const p of drafts) {
    if (!p.briefSent && !p.commission) add(`${p.name} is still a draft (not sent to engineering, so it won't be ready next round)`, "products");
    else if (!p.commission) add(`${p.name} has a quote from engineering that hasn't been accepted (it won't be ready next round)`, "products");
  }
  if (round >= UNLOCKS.markets) {
    const regions = activeRegions(t);
    if (!regions.length) add("No region entered: you can't sell anywhere yet", "markets");
    for (const r of regions) if (!d.regions[r.id].channels.length) add(`No channels chosen in ${r.name}`, "markets");
    const prods = sellable(t);
    for (const p of prods)
      for (const r of regions) {
        const pl = d.plan[p.id]?.[r.id];
        if (!pl?.price) add(`No price for ${p.name} in ${r.name}`, "pricing");
        if (!pl?.forecast) add(`No sales forecast for ${p.name} in ${r.name}`, "production");
        if (!pl?.production && !(t.inventory[p.id]?.[r.id] ?? 0)) add(`No production planned for ${p.name} in ${r.name}`, "production");
      }
    if (prods.length && regions.length && !t.budget.promotion) add("No promotion planned", "pricing");
    for (const p of prods) {
      if (!p.campaign?.segment || !p.campaign?.tone) add(`Campaign for ${p.name} has no target segment or tone`, "pricing");
      else if (!p.campaign.message.trim()) add(`Campaign for ${p.name} has no main message`, "pricing");
    }
    if (t.budget.remaining < 0) add("Marketing spending is over budget (it will be scaled down at the deadline)", "pricing");
  }
  if (round >= UNLOCKS.goals && ([d.goals.revenue, d.goals.margin, d.goals.awareness, d.goals.satisfaction].some((v) => v === null) || d.strategy.targetSegments.some((s) => d.goals.segmentShare?.[s] == null)))
    add("Some numeric goals are blank", "strategy");
  if (!d.reflection.trim()) add("Round reflection is empty", "review");
  return items;
}

/** Status of each step: done, needs attention (with a count) or locked until a round. */
export function stepStatus(t: TeamData) {
  const round = t.game.round;
  // After the game ends there's nothing left to fix.
  const items = round > ROUNDS.final ? [] : checklistItems(t);
  return STEPS.map((s) => {
    const n = items.filter((x) => x.tab === s.id).length;
    const locked = round < s.unlock;
    return { ...s, locked, opens: ROUNDS.names[s.unlock], issues: n, state: locked ? "locked" : n ? "attention" : "done" } as const;
  });
}
