/**
 * Server-side checks for decision edits: the same rules the Decisions screens enforce,
 * so an edit sent outside the screens (for example from browser developer tools) is refused.
 * Each check runs before the edit is applied. A refused edit throws an HttpError with a
 * plain-language reason; the caller saves the team's other edits.
 */
import { CHANNELS, CLAIMS, COMPONENTS, ENTRY_MODES, MEDIA, PRODUCT_RULES, REGIONS, ROUNDS, SEGMENTS, SENSORS, TONES, UNLOCKS } from "../sim/config";
import { specProblems } from "../sim/product";
import type { FirmDecision, ProductSpec } from "../sim/types";
import { HttpError } from "./auth";
import { stepOfPath } from "./steps";
import type { Op } from "./game";

const STEP_NAMES: Record<string, string> = { strategy: "Strategy and goals", products: "Products", markets: "Markets and channels", pricing: "Price and promotion", production: "Forecast and production" };
const REVIEW_STEPS = new Set(Object.keys(STEP_NAMES));
const TIERS = new Set(["good", "better", "best"]);
const SEGMENT_IDS = new Set<string>(SEGMENTS.map((s) => s.id));
const REGION_IDS = new Set<string>(REGIONS.map((r) => r.id));
const CHANNEL_IDS = new Set<string>(CHANNELS.map((c) => c.id));
const MEDIA_IDS = new Set<string>(MEDIA.map((m) => m.id));
const NUMBER_FIELDS = new Set(["price", "forecast", "production", "promotion"]);

const refuse = (msg: string): never => {
  throw new HttpError(400, msg);
};
const isNum = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0;
const isList = (v: unknown, ok: Set<string>) => Array.isArray(v) && v.every((x) => ok.has(String(x))) && new Set(v).size === v.length;

/** Valid value for a product design field (the options the Products screen offers). */
function validDesign(field: string, v: unknown): boolean {
  if (field === "tier") return TIERS.has(String(v));
  if (field === "targetSegment") return SEGMENT_IDS.has(String(v));
  if (field === "sensors") return isList(v, new Set(Object.keys(SENSORS)));
  const comp = (COMPONENTS as Record<string, { options: Record<string, unknown> }>)[field];
  if (comp) return typeof v === "string" && v in comp.options;
  return true;
}

export interface OpContext {
  round: number;
  data: FirmDecision;
  /** Ids of products engineering has accepted (designs locked). */
  committed: Set<string>;
}

export function checkOp(op: Op, ctx: OpContext) {
  const { round, data } = ctx;
  const segs = op.path.split(".");
  const [head, a, b] = segs;
  const kind = op.op ?? "set";

  // "Looks right, keep it" only confirms a step; it changes no decision.
  if (head === "reviewed") {
    if (!REVIEW_STEPS.has(a ?? "")) refuse("Unknown step.");
    return;
  }

  // Steps that haven't opened yet.
  const step = stepOfPath(op.path);
  if (head === "goals" && round < UNLOCKS.goals) refuse(`Numeric goals open in ${ROUNDS.names[UNLOCKS.goals]}.`);
  if (step && UNLOCKS[step] !== undefined && round < UNLOCKS[step]) refuse(`${STEP_NAMES[step] ?? "This step"} opens in ${ROUNDS.names[UNLOCKS[step]]}.`);

  if (head === "products") {
    if (!a) {
      if (kind === "push") {
        const p = op.value as Partial<ProductSpec> | null;
        if (!p || typeof p !== "object" || typeof p.id !== "string" || !p.id) refuse("That product couldn't be added.");
        const np = p as ProductSpec;
        if (data.products.some((x) => x.id === np.id)) refuse("That product already exists.");
        if (np.briefSent || np.commission) refuse("A new product starts as a draft.");
        const live = data.products.filter((x) => !x.retire).length;
        const allowed = round < PRODUCT_RULES.thirdProductBriefRound ? PRODUCT_RULES.maxProductsAtLaunch : PRODUCT_RULES.maxProductsTotal;
        if (live >= allowed) refuse(`You can have at most ${allowed} products now.`);
        for (const f of ["tier", "targetSegment", "chip", "form", "battery", "display", "material", "water", "privacy", "sensors"]) {
          if ((np as unknown as Record<string, unknown>)[f] !== undefined && !validDesign(f, (np as unknown as Record<string, unknown>)[f])) refuse("That product has a component the Products screen doesn't offer.");
        }
      }
      return;
    }
    const id = a.startsWith("#") ? a.slice(1) : "";
    const prod = data.products.find((x) => x.id === id);
    if (!prod || !b) return;
    if (kind === "set" && !validDesign(b, op.value)) refuse("That isn't one of the options on the Products screen.");
    if (b === "claims" && kind === "set") {
      if (!isList(op.value, new Set(Object.keys(CLAIMS)))) refuse("Unknown ad claim.");
      if ((op.value as unknown[]).length > 3) refuse("Pick at most 3 ad claims.");
    }
    if ((b === "briefSent" || b === "commission") && op.value === true) {
      const probs = specProblems(prod);
      if (probs.length) refuse(`Fix the design first: ${probs[0]}`);
    }
    if (b === "campaign" && segs[3] === "segment" && op.value && !SEGMENT_IDS.has(String(op.value))) refuse("Unknown segment.");
    if (b === "campaign" && segs[3] === "tone" && op.value && !(String(op.value) in TONES)) refuse("Unknown tone.");
    if (b === "subscriptionPrice" && op.value != null && !isNum(op.value)) refuse("The app plan price must be a number of $0 or more.");
    return;
  }

  if (head === "strategy") {
    if (a === "targetSegments" && kind === "set" && !isList(op.value, SEGMENT_IDS)) refuse("Unknown segment.");
    if (a === "targetRegions" && kind === "set" && !isList(op.value, REGION_IDS)) refuse("Unknown region.");
    return;
  }

  if (head === "goals") {
    if (op.value != null && (typeof op.value !== "number" || !Number.isFinite(op.value))) refuse("Goals must be numbers.");
    return;
  }

  if (head === "regions") {
    if (!REGION_IDS.has(a ?? "")) refuse("Unknown region.");
    if (b === "channels" && !isList(op.value, CHANNEL_IDS)) refuse("Unknown channel.");
    if (b === "entryMode" && op.value && !(String(op.value) in ENTRY_MODES)) refuse("Unknown entry mode.");
    return;
  }

  if (head === "plan") {
    const field = segs[3];
    if (b && !REGION_IDS.has(b)) refuse("Unknown region.");
    if (!data.products.some((x) => x.id === a)) refuse("That product no longer exists.");
    if (field && NUMBER_FIELDS.has(field) && op.value != null && !isNum(op.value)) refuse("Numbers here must be $0 or more.");
    if (field === "media" && segs[4] && !MEDIA_IDS.has(segs[4])) refuse("Unknown medium.");
    if (field === "media" && segs[4] && op.value != null && !isNum(op.value)) refuse("Numbers here must be $0 or more.");
    return;
  }

  if (head === "capacityExpansion" && !isNum(op.value)) refuse("Capacity to add must be 0 or more.");
  if (head === "mediaMix" && (!MEDIA_IDS.has(a ?? "") || !isNum(op.value))) refuse("Unknown medium.");
}
