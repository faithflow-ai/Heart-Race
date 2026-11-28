import { PRODUCT_RULES, REGIONS, ROUNDS, UNLOCKS } from "@/sim/config";
import { MAP_REQUIRED_ROUNDS } from "@/sim/perception";
import type { TeamData } from "./TeamContext";
import { capitalCheck, type ProFormaInput } from "@/sim/proforma";

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

/** Leftover stock check: stock already on hand plus new production well above the forecast. */
export const EXCESS_STOCK_RATIO = 1.5;
export function excessStock(stock: number, production: number, forecast: number): string | null {
  if (stock <= 0 || production <= 0 || forecast <= 0 || stock + production < forecast * EXCESS_STOCK_RATIO) return null;
  const n = (v: number) => Math.round(v).toLocaleString("en-US");
  return `you have ${n(stock)} units in stock now and plan to make ${n(production)} more, against a forecast of ${n(forecast)}. Stock you already have sells first.`;
}

/** The team's draft as input for the pro forma and the capital check. */
export function proFormaInputOf(t: TeamData): ProFormaInput {
  const b = t.budget;
  return {
    round: t.game.round,
    decision: t.decision,
    unitCost: Object.fromEntries(t.committed.map((c) => [c.id, c.unitCost])),
    sellable: sellable(t).map((p) => p.id),
    regionsEntered: t.regionsEntered as ProFormaInput["regionsEntered"],
    channelsOpen: t.channelsOpen as ProFormaInput["channelsOpen"],
    committed: t.committed.map((c) => c.id),
    capital: b.capital,
    marketingAvailable: b.available,
    capacity: b.capacity,
    loan: b.loan,
    inventory: t.inventory as ProFormaInput["inventory"],
  };
}

/** Company capital warnings for this round's plan (none after the game ends). */
export function capitalWarnings(t: TeamData) {
  if (t.game.round > ROUNDS.final) return [];
  return capitalCheck(proFormaInputOf(t)).warnings;
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
        const stock = t.inventory[p.id]?.[r.id] ?? 0;
        if (!pl?.production && !stock) add(`No production planned for ${p.name} in ${r.name}`, "production");
        const ex = excessStock(stock, pl?.production ?? 0, pl?.forecast ?? 0);
        if (ex) add(`${p.name} in ${r.name}: ${ex}`, "production");
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
  for (const w of capitalWarnings(t)) add(w.text, w.step);
  if (!d.reflection.trim()) add("Round reflection is empty", "review");
  return items;
}

/** Steps that depend on an earlier step: shown as "waiting" instead of done when it's missing. */
function waitingOn(t: TeamData, id: StepId): string | null {
  const round = t.game.round;
  if (round < UNLOCKS.markets || (id !== "pricing" && id !== "production")) return null;
  if (!sellable(t).length) return "Products";
  if (!activeRegions(t).length) return "Markets and channels";
  return null;
}

/** Steps a "Looks right, keep it" click or an edit can confirm (Review is always checked by its own items). */
export const REVIEWABLE: StepId[] = ["strategy", "products", "markets", "pricing", "production"];

/**
 * Status of each step: done, needs attention (with a count), waiting on an earlier step,
 * carried forward (nobody has looked at it this round) or locked until a round.
 */
export function stepStatus(t: TeamData) {
  const round = t.game.round;
  // After the game ends there's nothing left to fix.
  const over = round > ROUNDS.final;
  const items = over ? [] : checklistItems(t);
  return STEPS.map((s) => {
    const n = items.filter((x) => x.tab === s.id).length;
    const locked = round < s.unlock;
    const waiting = over || locked || n ? null : waitingOn(t, s.id);
    // From Round 2 on, a step nobody has edited or confirmed this round still holds last round's choices.
    const carried = !over && !locked && !n && !waiting && round >= 2 && REVIEWABLE.includes(s.id) && !t.lastEdits?.[s.id];
    const state = locked ? "locked" : n ? "attention" : waiting ? "waiting" : carried ? "carried" : "done";
    return { ...s, locked, opens: ROUNDS.names[s.unlock], issues: n, waiting, state } as const;
  });
}

/** Short status text for a step, used by the step list and Home. */
export function stepNote(x: ReturnType<typeof stepStatus>[number]) {
  if (x.locked) return `Opens in ${x.opens}`;
  if (x.state === "attention") return `${x.issues} to check`;
  if (x.state === "waiting") return `Waiting on ${x.waiting}`;
  if (x.state === "carried") return "Carried forward, review it";
  return "Done";
}

/** The mark inside a step's dot. */
export function stepMark(x: ReturnType<typeof stepStatus>[number]) {
  return x.state === "done" ? "✓" : x.state === "attention" ? "!" : x.state === "carried" ? "↻" : x.state === "waiting" ? "…" : "";
}
