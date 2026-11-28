import { AI, DEFAULT_SETTINGS, MARKETING_BUDGET, ROUNDS, STUDIES, studyFromRound, TEAM_NAMES, UNLOCKS, type AiStyle, type GameSettings, type StudyId } from "@/sim/config";
import { processRound, spendingLimit } from "@/sim/engine";
import { cellPromo, emptyDecision, normalizeDecision, syncPromotion } from "@/sim/product";
import { proForma } from "@/sim/proforma";
import { generateStudy } from "@/sim/research";
import { defaultAiLevel, runRound } from "@/sim/run";
import type { FirmDecision, FirmMeta, FirmState, RoundResult } from "@/sim/types";
import { aiDecide } from "@/sim/ai";
import { creativeBoosts } from "./creative";
import { HttpError, type User } from "./auth";
import { newId, one, q } from "./db";
import { nextDeadline } from "./time";
import { checkOp } from "./validate";

export interface GameRow {
  id: string;
  name: string;
  code: string;
  instructor_id: string;
  status: "setup" | "active" | "done";
  current_round: number;
  deadline: string | null;
  deadline_weekday: number;
  deadline_time: string;
  timezone: string;
  seed: number;
  settings: Partial<GameSettings>;
  processing_at: string | null;
  start_at: string | null;
}
export interface FirmRow {
  id: string;
  game_id: string;
  name: string;
  slot: number;
  is_ai: boolean;
  ai_level: number | null;
  ai_style: AiStyle;
}

const parse = <T>(v: unknown): T => (typeof v === "string" ? JSON.parse(v) : v) as T;

export function settingsOf(g: GameRow): GameSettings {
  const s = parse<Partial<GameSettings>>(g.settings) ?? {};
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    scorecardWeights: { ...DEFAULT_SETTINGS.scorecardWeights, ...(s.scorecardWeights ?? {}) },
    marketingBudget: { ...DEFAULT_SETTINGS.marketingBudget, ...(s.marketingBudget ?? {}) },
  };
}

function classCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function createGame(instructor: User, name: string, teams: number): Promise<GameRow> {
  const n = Math.max(1, Math.min(7, Math.round(teams)));
  const id = newId("g_");
  let code = classCode();
  while (await one("select 1 from games where code = $1", [code])) code = classCode();
  await q("insert into games (id, name, code, instructor_id, seed) values ($1,$2,$3,$4,$5)", [id, name.trim() || "MKT 475", code, instructor.id, Math.floor(Math.random() * 1e6)]);
  await setTeamCount(id, n);
  return (await getGame(id))!;
}

/** Make the market exactly 8 firms: n student teams plus AI rivals. */
export async function setTeamCount(gameId: string, n: number) {
  const firms = await q<FirmRow>("select * from firms where game_id = $1 order by slot", [gameId]);
  const students = firms.filter((f) => !f.is_ai);
  const ai = firms.filter((f) => f.is_ai);
  // Add student teams.
  for (let i = students.length; i < n; i++) {
    const id = newId("f_");
    await q("insert into firms (id, game_id, name, slot, is_ai) values ($1,$2,$3,$4,false)", [id, gameId, TEAM_NAMES[i] ?? `Team ${i + 1}`, i]);
    await q("insert into decisions (firm_id, round, data) values ($1, 0, $2)", [id, JSON.stringify(emptyDecision())]);
  }
  // Remove empty student teams beyond n.
  for (const f of students.slice(n)) {
    const m = await one("select 1 from members where firm_id = $1", [f.id]);
    if (m) throw new HttpError(400, `${f.name} already has students. Move them first.`);
    await q("delete from firms where id = $1", [f.id]);
  }
  // AI rivals fill to 8.
  const wantAi = AI.firmsPerMarket - n;
  const styles: AiStyle[] = ["premium", "lowcost", "follower"];
  for (let i = ai.length; i < wantAi; i++) {
    await q("insert into firms (id, game_id, name, slot, is_ai, ai_style) values ($1,$2,$3,$4,true,$5)", [newId("f_"), gameId, AI.names[i % AI.names.length], 10 + i, styles[i % 3]]);
  }
  for (const f of ai.slice(wantAi)) await q("delete from firms where id = $1", [f.id]);
}

export async function getGame(id: string) {
  return one<GameRow>("select * from games where id = $1", [id]);
}

export async function getFirms(gameId: string) {
  return q<FirmRow>("select * from firms where game_id = $1 order by is_ai, slot", [gameId]);
}

export function firmMeta(f: FirmRow, round: number): FirmMeta {
  return { id: f.id, name: f.name, isAi: f.is_ai, aiLevel: f.ai_level ?? defaultAiLevel(round), aiStyle: f.ai_style, slot: f.slot };
}

export async function getResult(gameId: string, round: number): Promise<RoundResult | null> {
  const r = await one<{ data: unknown }>("select data from results where game_id = $1 and round = $2", [gameId, round]);
  return r ? parse<RoundResult>(r.data) : null;
}

export async function latestResult(g: GameRow) {
  return g.current_round > 0 ? getResult(g.id, g.current_round - 1) : null;
}

export async function processedRounds(gameId: string) {
  return (await q<{ round: number; processed_at: string; run_count: number }>("select round, processed_at, run_count from results where game_id = $1 order by round", [gameId])).map((r) => ({ ...r, round: Number(r.round) }));
}

// ---------------------------------------------------------------------------
// Decisions and autosave
// ---------------------------------------------------------------------------

export async function getDecision(firmId: string, round: number): Promise<{ data: FirmDecision; updated_at: string | null }> {
  const row = await one<{ data: unknown; updated_at: string }>("select data, updated_at from decisions where firm_id = $1 and round = $2", [firmId, round]);
  if (row) return { data: normalizeDecision(parse(row.data)), updated_at: row.updated_at };
  // Not created yet: carry forward from the previous round.
  const prev = round > 0 ? await one<{ data: unknown }>("select data from decisions where firm_id = $1 and round = $2", [firmId, round - 1]) : null;
  const data = prev ? carryForward(normalizeDecision(parse(prev.data))) : emptyDecision();
  await q("insert into decisions (firm_id, round, data) values ($1,$2,$3) on conflict do nothing", [firmId, round, JSON.stringify(data)]);
  return { data, updated_at: null };
}

export function carryForward(d: FirmDecision): FirmDecision {
  const n = structuredClone(d);
  n.research = [];
  n.capacityExpansion = 0;
  n.reflection = "";
  n.ready = false;
  for (const p of n.products) p.commission = false;
  // An exit happens once: next round starts with the region closed.
  for (const rd of Object.values(n.regions ?? {})) if (rd.exit) Object.assign(rd, { exit: false, enter: false, channels: [] });
  return n;
}

export interface Op {
  path: string; // dot path; "#id" selects an array element by id, e.g. products.#p1.name
  op?: "set" | "push" | "remove";
  value?: unknown;
}

const DESIGN_FIELDS = new Set(["tier", "targetSegment", "chip", "form", "battery", "display", "material", "water", "privacy", "sensors"]);
const LOCKED_FIELDS = new Set([...DESIGN_FIELDS, "commission", "briefSent"]);

function walk(doc: unknown, segs: string[]): { parent: Record<string, unknown> | unknown[]; key: string | number } {
  let cur: unknown = doc;
  for (let i = 0; i < segs.length - 1; i++) {
    cur = step(cur, segs[i], true);
  }
  const last = segs[segs.length - 1];
  if (Array.isArray(cur) && last.startsWith("#")) {
    const idx = cur.findIndex((x) => (x as { id?: string })?.id === last.slice(1));
    if (idx < 0) throw new HttpError(400, "That item no longer exists.");
    return { parent: cur, key: idx };
  }
  return { parent: cur as Record<string, unknown>, key: last };
}
function step(cur: unknown, seg: string, create: boolean): unknown {
  if (Array.isArray(cur)) {
    const found = seg.startsWith("#") ? cur.find((x) => (x as { id?: string })?.id === seg.slice(1)) : cur[Number(seg)];
    if (!found) throw new HttpError(400, "That item no longer exists.");
    return found;
  }
  const o = cur as Record<string, unknown>;
  if (o[seg] === undefined || o[seg] === null) {
    if (!create) throw new HttpError(400, "Bad path");
    o[seg] = {};
  }
  return o[seg];
}

export async function applyOps(g: GameRow, firmId: string, round: number, user: User, ops: Op[]) {
  if (user.role === "instructor") throw new HttpError(403, "View as student is read-only.");
  if (round !== g.current_round || g.status === "done") throw new HttpError(409, "This round is closed. Reload to see the new round.");
  if (g.deadline && new Date(g.deadline).getTime() <= Date.now() && g.status === "active") throw new HttpError(409, "The deadline has passed. Results are being processed.");
  const { data } = await getDecision(firmId, round);
  const latest = await latestResult(g);
  const committed = new Set(Object.keys(latest?.state.firms[firmId]?.products ?? {}));
  const log: { path: string; old: unknown; new: unknown }[] = [];
  // Each edit is checked and applied on its own: a refused edit doesn't drop the others.
  const refused: { path: string; message: string }[] = [];
  for (const op of ops) {
    try {
      applyOne(data, op, round, committed, log);
    } catch (e) {
      if (!(e instanceof HttpError)) throw e;
      refused.push({ path: op.path, message: e.message });
    }
  }
  if (!log.length) {
    if (refused.length === ops.length && refused.length) throw new HttpError(400, refused[0].message);
    return { data, changed: 0, refused };
  }
  syncPromotion(data);
  await q("update decisions set data = $1, updated_at = now(), updated_by = $2 where firm_id = $3 and round = $4", [JSON.stringify(data), user.id, firmId, round]);
  for (const l of log) {
    // Merge rapid edits of the same field by the same person into one log line.
    const recent = await one<{ id: number }>(
      "select id from change_log where firm_id = $1 and round = $2 and user_id = $3 and path = $4 and at > now() - interval '3 minutes' order by at desc limit 1",
      [firmId, round, user.id, l.path],
    );
    if (recent) await q("update change_log set new_value = $1, at = now() where id = $2", [JSON.stringify(l.new), recent.id]);
    else await q("insert into change_log (firm_id, round, user_id, path, old_value, new_value) values ($1,$2,$3,$4,$5,$6)", [firmId, round, user.id, l.path, JSON.stringify(l.old), JSON.stringify(l.new)]);
  }
  return { data, changed: log.length, refused };
}

/** Check one edit against the screens' rules, then apply it to the draft and note it for the change log. */
function applyOne(data: FirmDecision, op: Op, round: number, committed: Set<string>, log: { path: string; old: unknown; new: unknown }[]) {
  const segs = op.path.split(".");
  if (segs[0] === "research") throw new HttpError(400, "Buy research on the Research screen.");
  if (segs[0] === "products" && segs[1]?.startsWith("#") && committed.has(segs[1].slice(1)) && LOCKED_FIELDS.has(segs[2] ?? "")) {
    throw new HttpError(400, "Engineering has accepted this product, so its components are locked.");
  }
  if (segs[0] === "products" && segs[1]?.startsWith("#") && !committed.has(segs[1].slice(1))) {
    const prod = data.products.find((x) => x.id === segs[1].slice(1));
    const field = segs[2] ?? "";
    if (prod && field === "commission" && op.value === true && !prod.briefSent) throw new HttpError(400, "Send the brief to engineering and get a quote before accepting it.");
    if (prod && (prod.briefSent || prod.commission) && DESIGN_FIELDS.has(field)) throw new HttpError(400, "This brief is with engineering. Click \"Revise brief\" to change it.");
  }
  checkOp(op, { round, data, committed });
  // "Looks right, keep it": recorded in the change log only.
  if (segs[0] === "reviewed") {
    log.push({ path: op.path, old: null, new: true });
    return;
  }
  const { parent, key } = walk(data, segs);
  const p = parent as Record<string | number, unknown>;
  const kind = op.op ?? "set";
  if (kind === "set") {
    const old = p[key];
    if (JSON.stringify(old) === JSON.stringify(op.value)) return;
    p[key] = op.value;
    log.push({ path: op.path, old: old ?? null, new: op.value ?? null });
  } else if (kind === "push") {
    const arr = p[key] as unknown[];
    if (!Array.isArray(arr)) throw new HttpError(400, "Bad path");
    arr.push(op.value);
    log.push({ path: op.path, old: null, new: op.value ?? null });
  } else if (kind === "remove") {
    const arr = p[key] as { id: string }[];
    const id = String(op.value);
    if (op.path === "products" && committed.has(id)) throw new HttpError(400, "Retire an accepted product instead of deleting it.");
    const i = arr.findIndex((x) => x.id === id);
    if (i >= 0) {
      log.push({ path: `${op.path}.#${id}`, old: arr[i], new: null });
      arr.splice(i, 1);
      if (op.path === "products") delete (data.plan as Record<string, unknown>)[id];
    }
  }
}

// ---------------------------------------------------------------------------
// Marketing budget check and research purchases
// ---------------------------------------------------------------------------

export function budgetEstimate(g: GameRow, latest: RoundResult | null, firmId: string, d: FirmDecision) {
  const s = settingsOf(g);
  const fs = latest?.state.firms[firmId];
  const round = g.current_round;
  const carried = fs?.marketingPot ?? 0;
  const release = round >= 1 ? s.marketingBudget.releases[round] ?? 0 : 0;
  let earned = 0;
  if (round >= 2 && fs) {
    const mb = s.marketingBudget;
    earned = Math.max(mb.earnedFloor, mb.earnedBase + mb.earnedRevenueShare * fs.lastRevenue);
    if (fs.lastTopUp > 0) earned = Math.min(earned, fs.lastTopUp * (1 + mb.earnedCapGrowth));
    earned = Math.min(earned, mb.earnedCapAbsolute);
  }
  const research = d.research.reduce((a, st) => a + (round === 0 || !("practiceOnly" in STUDIES[st]) ? STUDIES[st].cost : 0), 0);
  let promotion = 0;
  for (const pid of Object.keys(d.plan)) for (const r of Object.values(d.plan[pid] ?? {})) promotion += cellPromo(r);
  if (round === 0) promotion = 0;
  const available = carried + release + earned;
  const futureReleases = Object.entries(MARKETING_BUDGET.releases).filter(([r]) => Number(r) > round).reduce((a, [, v]) => a + v, 0);
  const limit = round >= 1 ? spendingLimit({ lastRevenue: fs?.lastRevenue ?? 0 }, s) : 0;
  return { carried, release, earned, available, research, promotion, remaining: available - research - promotion, futureReleases, limit, loan: fs?.loan ?? 0, capital: fs?.capital ?? s.startingCapital, capacity: (fs?.capacity ?? 0) + (fs?.pendingCapacity ?? 0) || 70_000 };
}

export async function buyStudy(g: GameRow, firmId: string, user: User, study: StudyId) {
  if (user.role === "instructor") throw new HttpError(403, "View as student is read-only.");
  const st = STUDIES[study];
  if (!st) throw new HttpError(400, "Unknown study.");
  const round = g.current_round;
  if (round < UNLOCKS.research) throw new HttpError(400, "Research isn't open yet.");
  if ("practiceOnly" in st && st.practiceOnly && round !== 0) throw new HttpError(400, "The free market survey is only offered in the practice round.");
  if (st.cost > 0 && round < studyFromRound(study)) throw new HttpError(400, `${st.name} isn't available until ${ROUNDS.names[studyFromRound(study)]}: it reports on products already on the market.`);
  const { data } = await getDecision(firmId, round);
  if (data.research.includes(study)) throw new HttpError(400, "You already bought this study this round.");
  const latest = await latestResult(g);
  const b = budgetEstimate(g, latest, firmId, data);
  if (st.cost > b.remaining) throw new HttpError(400, "Not enough marketing budget left for this study. Lower planned promotion on Price and promotion first.");
  if (round >= 1 && st.cost > b.limit - b.promotion - b.research) throw new HttpError(400, "This study would go over this round's spending limit (promotion plus research). Lower planned promotion on Price and promotion first.");
  data.research.push(study);
  await q("update decisions set data = $1, updated_at = now(), updated_by = $2 where firm_id = $3 and round = $4", [JSON.stringify(data), user.id, firmId, round]);
  await q("insert into change_log (firm_id, round, user_id, path, old_value, new_value) values ($1,$2,$3,'research',null,$4)", [firmId, round, user.id, JSON.stringify(study)]);
  const firms = (await getFirms(g.id)).map((f) => firmMeta(f, round));
  const report = generateStudy(study, { round, firmId, firms, latest });
  await q("insert into research_reports (firm_id, round, study, data, bought_by) values ($1,$2,$3,$4,$5) on conflict do nothing", [firmId, round, study, JSON.stringify(report), user.id]);
  return report;
}

// ---------------------------------------------------------------------------
// Round processing
// ---------------------------------------------------------------------------

async function claim(g: GameRow): Promise<boolean> {
  const rows = await q("update games set processing_at = now() where id = $1 and current_round = $2 and (processing_at is null or processing_at < now() - interval '5 minutes') returning id", [g.id, g.current_round]);
  return rows.length > 0;
}

async function runAndStore(g: GameRow, round: number, isRerun: boolean) {
  const firms = await getFirms(g.id);
  const metas = firms.map((f) => firmMeta(f, round));
  const prevResult = round > 0 ? await getResult(g.id, round - 1) : null;
  const studentDecisions: Record<string, FirmDecision | null> = {};
  const carried = new Set<string>();
  for (const f of firms.filter((x) => !x.is_ai)) {
    studentDecisions[f.id] = (await getDecision(f.id, round)).data;
    const edits = await one("select 1 from change_log where firm_id = $1 and round = $2 limit 1", [f.id, round]);
    if (!edits) carried.add(f.id);
  }
  // Teams appear under the company name they chose on the Strategy screen.
  for (const f of firms.filter((x) => !x.is_ai)) {
    const name = studentDecisions[f.id]?.strategy.companyName?.trim();
    if (name && name !== f.name) {
      await q("update firms set name = $1 where id = $2", [name.slice(0, 40), f.id]);
      f.name = name.slice(0, 40);
      metas.find((m) => m.id === f.id)!.name = f.name;
    }
  }
  const result = runRound({ round, seed: g.seed, firms: metas, prevResult, studentDecisions, carriedForward: carried, settings: settingsOf(g), creativeBoost: await creativeBoosts(g.id, round) });
  const json = JSON.stringify(result);
  if (isRerun) await q("update results set data = $1, processed_at = now(), run_count = run_count + 1 where game_id = $2 and round = $3", [json, g.id, round]);
  else await q("insert into results (game_id, round, data) values ($1,$2,$3) on conflict (game_id, round) do update set data = excluded.data, processed_at = now()", [g.id, round, json]);
  return result;
}

/** Process the open round now (at the deadline, or when the instructor clicks Run). */
export async function processCurrentRound(g: GameRow) {
  if (g.current_round > ROUNDS.final) throw new HttpError(400, "The game is over.");
  if (!(await claim(g))) throw new HttpError(409, "This round is already being processed.");
  try {
    const round = g.current_round;
    const result = await runAndStore(g, round, false);
    // Open the next round, with every team's decisions carried forward.
    const next = round + 1;
    for (const [fid, d] of Object.entries(result.decisions)) {
      const firm = await one<FirmRow>("select * from firms where id = $1", [fid]);
      if (firm && !firm.is_ai && next <= ROUNDS.final) {
        await q("insert into decisions (firm_id, round, data) values ($1,$2,$3) on conflict (firm_id, round) do update set data = excluded.data", [fid, next, JSON.stringify(carryForward(normalizeDecision(d)))]);
      }
    }
    const done = next > ROUNDS.final;
    // Keep the weekly rhythm: the next deadline is the first one after the old deadline (or now, if later).
    const base = new Date(Math.max(Date.now(), g.deadline ? new Date(g.deadline).getTime() : 0));
    const deadline = done ? null : nextDeadline(base, g.deadline_weekday, g.deadline_time, g.timezone).toISOString();
    await q("update games set current_round = $1, status = $2, deadline = $3, processing_at = null where id = $4", [next, done ? "done" : g.status === "setup" ? "active" : g.status, deadline, g.id]);
    return result;
  } catch (e) {
    await q("update games set processing_at = null where id = $1", [g.id]);
    throw e;
  }
}

/** Re-run the most recent processed round with the same decisions (after a fix). */
export async function rerunLastRound(g: GameRow) {
  const round = g.current_round - 1;
  if (round < 0) throw new HttpError(400, "No round has been processed yet.");
  if (!(await claim(g))) throw new HttpError(409, "A round is being processed right now.");
  try {
    return await runAndStore(g, round, true);
  } finally {
    await q("update games set processing_at = null where id = $1", [g.id]);
  }
}

/** Process any game whose deadline has passed. Called by the scheduled job and on page loads. */
export async function processDue(gameId?: string) {
  // Games with a start date that has arrived: turn on the deadline clock.
  const starting = await q<GameRow>(`select * from games where status = 'setup' and start_at is not null and start_at <= now() ${gameId ? "and id = $1" : ""}`, gameId ? [gameId] : []);
  for (const g of starting) {
    const d = nextDeadline(new Date(g.start_at!), g.deadline_weekday, g.deadline_time, g.timezone);
    await q("update games set status = 'active', start_at = null, deadline = coalesce(deadline, $1) where id = $2 and status = 'setup'", [d.toISOString(), g.id]);
  }
  const due = await q<GameRow>(
    `select * from games where status = 'active' and deadline is not null and deadline <= now() and processing_at is null ${gameId ? "and id = $1" : ""}`,
    gameId ? [gameId] : [],
  );
  const done: string[] = [];
  for (const g of due) {
    try {
      await processCurrentRound(g);
      done.push(g.id);
    } catch (e) {
      console.error("processDue", g.id, e);
    }
  }
  return done;
}

/** Projected results for a team's draft, assuming every rival repeats last round. */
export async function projection(g: GameRow, firms: FirmRow[], latest: RoundResult | null, firmId: string, draft: FirmDecision) {
  const round = g.current_round;
  if (round < 1) return null;
  const creativeBoost = await creativeBoosts(g.id, round);
  const metas = firms.map((f) => firmMeta(f, round));
  const decisions: Record<string, FirmDecision | null> = {};
  for (const f of metas) decisions[f.id] = f.id === firmId ? draft : (latest?.state.firms[f.id]?.lastDecision ?? null);
  // Round 1: nobody has sold yet, so "repeat last round" would mean an empty market. Fill in each rival with a
  // typical launch plan from the AI rivals' logic (a different seed, so it isn't the AI's actual move).
  if (round === 1 && latest)
    for (const f of metas)
      if (f.id !== firmId) decisions[f.id] = aiDecide({ ...f, isAi: true }, { round, seed: g.seed + 999, state: latest.state, prevResult: latest, firms: metas });
  const res = processRound({ round, seed: g.seed + 999, firms: metas, prevState: latest?.state ?? null, prevResult: latest, decisions, settings: settingsOf(g), creativeBoost });
  const rep = res.reports[firmId];
  return { pnl: rep.pnl, supply: rep.supply, byProduct: rep.byProduct, notes: rep.notes, capacity: rep.capacity, budget: rep.budget };
}

export const emptyFor = emptyDecision;

/** Pro forma P&L for a decision, from the firm's state before that round. */
export function proFormaFor(round: number, d: FirmDecision, fs: FirmState | null | undefined, settings: GameSettings, marketingAvailable: number) {
  const committed = Object.values(fs?.products ?? {});
  const inventory: Record<string, Partial<Record<string, number>>> = {};
  for (const [pid, regs] of Object.entries(fs?.inventory ?? {})) inventory[pid] = Object.fromEntries(Object.entries(regs).map(([r, lots]) => [r, (lots ?? []).reduce((a, l) => a + l.units, 0)]));
  return proForma({
    round,
    decision: d,
    unitCost: Object.fromEntries(committed.map((p) => [p.spec.id, p.quotedUnitCost])),
    sellable: committed.filter((p) => !p.retired && p.launchRound <= round).map((p) => p.spec.id),
    regionsEntered: fs?.regions ?? {},
    channelsOpen: fs?.channelsOpen ?? {},
    committed: committed.map((p) => p.spec.id),
    capital: fs?.capital ?? settings.startingCapital,
    marketingAvailable,
    capacity: (fs?.capacity ?? 70_000) + (fs?.pendingCapacity ?? 0),
    loan: fs?.loan ?? 0,
    inventory,
  });
}
