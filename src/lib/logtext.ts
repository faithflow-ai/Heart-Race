import { describeChange, isNoOp } from "@/sim/describe";
import { q } from "./db";

/** Product id -> latest name, from every round of a firm's decisions. */
export async function productNames(by: { firmId: string } | { gameId: string }): Promise<Record<string, Record<string, string>>> {
  const rows =
    "firmId" in by
      ? await q<{ firm_id: string; data: unknown }>("select firm_id, data from decisions where firm_id = $1 order by round", [by.firmId])
      : await q<{ firm_id: string; data: unknown }>("select firm_id, data from decisions where firm_id in (select id from firms where game_id = $1) order by round", [by.gameId]);
  const out: Record<string, Record<string, string>> = {};
  for (const r of rows) {
    const d = (typeof r.data === "string" ? JSON.parse(r.data) : r.data) as { products?: { id: string; name: string }[] };
    for (const p of d.products ?? []) (out[r.firm_id] ??= {})[p.id] = p.name;
  }
  return out;
}

export interface RawLog { firm_id: string; path: string; old_value: unknown; new_value: unknown }

/** Drop no-op edits and add a readable sentence to each entry. */
export function readable<T extends RawLog>(rows: T[], names: Record<string, Record<string, string>>): (T & { text: string })[] {
  const parse = (v: unknown) => (typeof v === "string" ? (() => { try { return JSON.parse(v); } catch { return v; } })() : v);
  return rows
    .map((r) => ({ ...r, old_value: parse(r.old_value), new_value: parse(r.new_value) }))
    .filter((r) => r.path === "research" || !isNoOp(r.old_value, r.new_value))
    .map((r) => ({ ...r, text: describeChange(r.path, r.old_value, r.new_value, names[r.firm_id] ?? {}) }));
}
