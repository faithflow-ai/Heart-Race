/**
 * Turns a change-log entry (a field path plus old and new values) into a plain
 * sentence, e.g. "changed target segments from none to Everyday Wellness".
 * Used by the team's Change log screen and the instructor's CSV export.
 */
import { CHANNELS, CLAIMS, COMPONENTS, ENTRY_MODES, MEDIA, REGIONS, SEGMENTS, SENSORS, STUDIES } from "./config";

type Names = Record<string, string>;

const SEG = Object.fromEntries(SEGMENTS.map((s) => [s.id, s.name])) as Record<string, string>;
const REG = Object.fromEntries(REGIONS.map((r) => [r.id, r.name])) as Record<string, string>;
const CH = Object.fromEntries(CHANNELS.map((c) => [c.id, c.name])) as Record<string, string>;
const MED = Object.fromEntries(MEDIA.map((m) => [m.id, m.name])) as Record<string, string>;
const TIER: Record<string, string> = { good: "Good", better: "Better", best: "Best" };

const STRATEGY_LABELS: Record<string, string> = {
  companyName: "company name",
  mission: "mission",
  positioning: "positioning statement",
  norms: "team charter",
  posture: "competitive posture",
  targetSegments: "target segments",
  targetRegions: "target regions",
};
const POSTURE: Record<string, string> = { differentiate: "Differentiate", cost: "Lead on cost", niche: "Niche focus", follow: "Fast follower", "": "none" };
const GOAL_LABELS: Record<string, string> = { share: "share goal", revenue: "revenue goal", margin: "operating margin goal", awareness: "awareness goal", satisfaction: "satisfaction goal" };
const PLAN_LABELS: Record<string, string> = { price: "price", production: "production", forecast: "sales forecast", promotion: "promotion" };
const PRODUCT_LABELS: Record<string, string> = {
  name: "name",
  tier: "tier",
  targetSegment: "main target segment",
  chip: "chip",
  form: "form factor",
  battery: "battery",
  display: "display",
  material: "materials",
  water: "water resistance",
  privacy: "data privacy",
  sensors: "sensors",
  subscriptionPrice: "app plan price",
  claims: "ad claims",
};

export function isNoOp(oldV: unknown, newV: unknown) {
  const norm = (v: unknown) => (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0) ? null : JSON.stringify(v));
  return norm(oldV) === norm(newV);
}

function list(v: unknown, dict?: Record<string, string>): string {
  if (!Array.isArray(v) || !v.length) return "none";
  return v.map((x) => (dict ? dict[String(x)] ?? String(x) : String(x))).join(", ");
}
function text(v: unknown, max = 70): string {
  if (v === null || v === undefined || v === "") return "blank";
  const s = String(v).replace(/\s+/g, " ").trim();
  return `"${s.length > max ? s.slice(0, max) + "…" : s}"`;
}
function numText(v: unknown, kind: "money" | "units" | "pct" | "plain" = "plain"): string {
  if (v === null || v === undefined || v === "") return "blank";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  if (kind === "money") return `$${Math.round(n).toLocaleString("en-US")}`;
  if (kind === "units") return `${Math.round(n).toLocaleString("en-US")} units`;
  if (kind === "pct") return `${n}%`;
  return n.toLocaleString("en-US");
}
function componentName(field: string, v: unknown): string {
  if (field === "tier") return TIER[String(v)] ?? String(v);
  if (field === "targetSegment") return SEG[String(v)] ?? String(v);
  if (field === "sensors") return list(v, Object.fromEntries(Object.entries(SENSORS).map(([k, x]) => [k, x.name])));
  if (field === "claims") return list(v, Object.fromEntries(Object.entries(CLAIMS).map(([k, x]) => [k, x.name])));
  if (field === "subscriptionPrice") return Number(v) ? `$${v}/month` : "none";
  if (field === "name") return text(v);
  const comp = (COMPONENTS as Record<string, { options: Record<string, { name: string }> }>)[field];
  if (comp) return comp.options[String(v)]?.name ?? String(v);
  return String(v);
}
const fromTo = (what: string, a: string, b: string) => `changed ${what} from ${a} to ${b}`;

/** One readable sentence (without the person's name), e.g. "changed price of Product 1 in Europe from $99 to $89". */
export function describeChange(path: string, oldV: unknown, newV: unknown, names: Names = {}): string {
  const segs = path.split(".");
  const pname = (id: string) => names[id] ?? "a product";
  const [head, a, b, c] = segs;

  if (head === "strategy" && a) {
    const label = STRATEGY_LABELS[a] ?? a;
    if (a === "targetSegments") return fromTo(label, list(oldV, SEG), list(newV, SEG));
    if (a === "targetRegions") return fromTo(label, list(oldV, REG), list(newV, REG));
    if (a === "posture") return fromTo(label, POSTURE[String(oldV ?? "")] ?? String(oldV), POSTURE[String(newV ?? "")] ?? String(newV));
    if (a === "companyName") return oldV ? fromTo(label, text(oldV), text(newV)) : `named the company ${text(newV)}`;
    if (!oldV) return `wrote the ${label}: ${text(newV)}`;
    return `edited the ${label}: ${text(newV)}`;
  }
  if (head === "goals" && a) {
    const kind = a === "revenue" ? "money" : "pct";
    return fromTo(GOAL_LABELS[a] ?? a, numText(oldV, kind), numText(newV, kind));
  }
  if (head === "research") return `bought the study "${STUDIES[String(newV) as keyof typeof STUDIES]?.name ?? newV}"`;
  if (head === "reflection") return oldV ? `edited the round reflection: ${text(newV)}` : `wrote the round reflection: ${text(newV)}`;
  if (head === "capacityExpansion") return fromTo("capacity to add", numText(oldV, "units"), numText(newV, "units"));
  if (head === "mediaMix" && a) return fromTo(`the ${MED[a] ?? a} share of promotion`, numText(oldV, "pct"), numText(newV, "pct"));

  if (head === "products") {
    if (!a) {
      const p = newV as { name?: string; tier?: string; targetSegment?: string } | null;
      if (p) return `created a draft product: ${p.name ?? "a product"} (${TIER[p.tier ?? ""] ?? p.tier} tier, ${SEG[p.targetSegment ?? ""] ?? p.targetSegment})`;
    }
    const id = a?.startsWith("#") ? a.slice(1) : "";
    if (id && !b) {
      const p = oldV as { name?: string } | null;
      return `deleted the draft product ${p?.name ?? pname(id)}`;
    }
    if (id && b) {
      const n = pname(id);
      if (b === "briefSent") return newV ? `sent the brief for ${n} to engineering` : `reopened the brief for ${n} to revise it`;
      if (b === "commission") return newV ? `accepted engineering's quote for ${n}` : `withdrew acceptance of the quote for ${n}`;
      if (b === "retire") return newV ? `marked ${n} to retire at the deadline` : `kept ${n} on the market`;
      if (b === "name") return `renamed ${text(oldV)} to ${text(newV)}`;
      return fromTo(`the ${PRODUCT_LABELS[b] ?? b} of ${n}`, componentName(b, oldV), componentName(b, newV));
    }
  }
  if (head === "regions" && a) {
    const r = REG[a] ?? a;
    if (b === "enter") return newV ? `chose to enter ${r}` : `dropped the plan to enter ${r}`;
    if (b === "entryMode") return fromTo(`the entry mode for ${r}`, ENTRY_MODES[String(oldV) as keyof typeof ENTRY_MODES]?.name ?? "none", ENTRY_MODES[String(newV) as keyof typeof ENTRY_MODES]?.name ?? String(newV));
    if (b === "channels") return fromTo(`channels in ${r}`, list(oldV, CH), list(newV, CH));
  }
  if (head === "plan" && a && b && c) {
    const kind = c === "price" || c === "promotion" ? "money" : "units";
    return fromTo(`${PLAN_LABELS[c] ?? c} of ${pname(a)} in ${REG[b] ?? b}`, numText(oldV, kind), numText(newV, kind));
  }
  // Fallback: still readable, never raw JSON.
  return `changed ${segs.filter((x) => !x.startsWith("#")).join(" ")}`;
}
