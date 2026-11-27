/**
 * Instructor activity tools: the class heatmap and unusual activity flags.
 *
 * Flags point at patterns that are common when software (an AI agent or a script) fills in a
 * team's decisions instead of the students. A flag is a reason to look closer and talk with the
 * team, never proof: students also plan on paper and type everything in at once, or let the
 * fastest typist do the data entry. Every flag says exactly what was seen.
 *
 * Pure functions over change-log rows, so they can be tested without a database.
 */

export interface EditRow { firm_id: string; round: number; user_id: string; at: string | Date; path: string }
export interface SignalRow { firm_id: string; round: number; user_id: string; at: string | Date; kind: string; detail: { chars?: number; field?: string } | null }
export interface MemberRow { user_id: string; firm_id: string; name: string }
export interface TeamRow { id: string; name: string }

export type FlagKind = "quick" | "steady" | "solo" | "paste" | "hours" | "reflection";
export interface Flag {
  firmId: string;
  round: number;
  kind: FlagKind;
  /** "look" = worth a closer look; "note" = weaker on its own, useful alongside other flags. */
  level: "look" | "note";
  title: string;
  why: string;
}

export const FLAG_RULES = {
  /** Whole round entered in one quick sitting. */
  quickMinEdits: 25,
  quickMaxMinutes: 10,
  /** Steady machine-like pace between saves. */
  steadyMinGaps: 15,
  steadyMaxMedianSec: 6,
  steadyMaxSpread: 0.35,
  /** Saves under this many seconds apart count as one save (the app saves several fields at once). */
  sameSaveSec: 1,
  /** Gaps longer than this end a work session (not counted in the pace check). */
  sessionGapSec: 120,
  /** One teammate does everything. */
  soloMinEdits: 10,
  /** Large paste into a text box. */
  pasteMinChars: 300,
  /** Late-night edits (local class time). */
  hoursFrom: 1,
  hoursTo: 5,
  hoursMinEdits: 10,
  hoursMinShare: 0.75,
};

const ms = (d: string | Date) => new Date(d).getTime();
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0;
};
const fmtDur = (min: number) => (min < 1 ? "under a minute" : min < 90 ? `${Math.round(min)} minute${Math.round(min) === 1 ? "" : "s"}` : `${(min / 60).toFixed(1)} hours`);
const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
const roundName = (r: number) => (r === 0 ? "the Practice round" : r === 7 ? "the Final round" : `Round ${r}`);

function localHour(d: string | Date, tz: string) {
  const h = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hourCycle: "h23" }).format(new Date(d));
  return Number(h) % 24;
}
function localTime(d: string | Date, tz: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", hour: "numeric", minute: "2-digit" }).format(new Date(d));
}

/** Collapse rows saved within a second of each other into one save time. */
export function saveTimes(rows: { at: string | Date }[], sameSaveSec = FLAG_RULES.sameSaveSec) {
  const t = rows.map((r) => ms(r.at)).sort((a, b) => a - b);
  const out: number[] = [];
  for (const x of t) if (!out.length || x - out[out.length - 1] >= sameSaveSec * 1000) out.push(x);
  return out;
}

/** Pace between saves inside work sessions: median gap (seconds) and spread (standard deviation / mean). */
export function pace(times: number[]) {
  const gaps: number[] = [];
  for (let i = 1; i < times.length; i++) {
    const g = (times[i] - times[i - 1]) / 1000;
    if (g < FLAG_RULES.sessionGapSec) gaps.push(g);
  }
  if (!gaps.length) return { gaps: 0, median: 0, spread: 0 };
  const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const sd = Math.sqrt(gaps.reduce((a, b) => a + (b - mean) ** 2, 0) / gaps.length);
  return { gaps: gaps.length, median: median(gaps), spread: mean > 0 ? sd / mean : 0 };
}

export interface ActivityInput {
  teams: TeamRow[];
  members: MemberRow[];
  edits: EditRow[];
  signals: SignalRow[];
  /** Reflections for rounds that have been scored: firm id -> round -> text. */
  reflections: Record<string, Record<number, string>>;
  /** Rounds that have closed (scored). The open round is checked too, but never for a missing reflection. */
  closedRounds: number[];
  timezone: string;
}

export function computeFlags(inp: ActivityInput): Flag[] {
  const R = FLAG_RULES;
  const flags: Flag[] = [];
  const nameOf = (uid: string) => inp.members.find((m) => m.user_id === uid)?.name ?? "A former teammate";
  const rounds = [...new Set(inp.edits.map((e) => e.round))];

  // Class median time span per round, for comparison in the "quick" flag.
  const spanBy = new Map<string, number>();
  for (const t of inp.teams)
    for (const r of rounds) {
      const rows = inp.edits.filter((e) => e.firm_id === t.id && e.round === r);
      if (rows.length < 2) continue;
      const ts = rows.map((e) => ms(e.at));
      spanBy.set(`${t.id}:${r}`, (Math.max(...ts) - Math.min(...ts)) / 60000);
    }

  for (const t of inp.teams) {
    const teamMembers = inp.members.filter((m) => m.firm_id === t.id);
    for (const r of rounds) {
      const rows = inp.edits.filter((e) => e.firm_id === t.id && e.round === r);
      if (!rows.length) continue;
      const span = spanBy.get(`${t.id}:${r}`) ?? 0;

      // 1. Whole round entered in one quick sitting.
      if (rows.length >= R.quickMinEdits && span <= R.quickMaxMinutes) {
        const others = inp.teams.filter((o) => o.id !== t.id).map((o) => spanBy.get(`${o.id}:${r}`)).filter((x): x is number => x !== undefined);
        const cls = others.length ? ` For comparison, the other teams' median for this round is ${fmtDur(median(others))}.` : "";
        flags.push({ firmId: t.id, round: r, kind: "quick", level: "look", title: "Whole round entered in one quick sitting", why: `All ${rows.length} field edits for ${roundName(r)} were made within ${fmtDur(span)} (${localTime(rows[0].at, inp.timezone)}).${cls}` });
      }

      // 2. Steady, machine-like pace (per person).
      for (const uid of [...new Set(rows.map((e) => e.user_id))]) {
        const p = pace(saveTimes(rows.filter((e) => e.user_id === uid)));
        if (p.gaps >= R.steadyMinGaps && p.median <= R.steadyMaxMedianSec && p.spread <= R.steadyMaxSpread)
          flags.push({ firmId: t.id, round: r, kind: "steady", level: "look", title: "Steady, machine-like pace", why: `${nameOf(uid)} saved ${p.gaps + 1} edits in a row about ${p.median.toFixed(1)} seconds apart, with very little variation. People usually pause to read, think and check numbers, so their gaps vary a lot.` });
      }

      // 3. Only one teammate active.
      const editors = [...new Set(rows.map((e) => e.user_id))];
      if (teamMembers.length >= 2 && editors.length === 1 && rows.length >= R.soloMinEdits) {
        const idle = teamMembers.filter((m) => m.user_id !== editors[0]).map((m) => m.name);
        const earlier = rounds.filter((x) => x < r).filter((x) => {
          const er = inp.edits.filter((e) => e.firm_id === t.id && e.round === x);
          return er.length > 0 && new Set(er.map((e) => e.user_id)).size === 1 && er[0].user_id === editors[0];
        }).length;
        const streak = earlier ? ` The same person made every edit in ${earlier} earlier round${earlier === 1 ? "" : "s"} too.` : "";
        flags.push({ firmId: t.id, round: r, kind: "solo", level: "note", title: "Only one teammate active", why: `Every edit in ${roundName(r)} (${rows.length}) was made by ${nameOf(editors[0])}. ${list(idle)} made none.${streak} This can be a team's choice of a data-entry person; it also matters for peer evaluation.` });
      }

      // 4. Edits mostly late at night.
      const saves = saveTimes(rows);
      if (saves.length >= R.hoursMinEdits) {
        const late = saves.filter((x) => { const h = localHour(new Date(x), inp.timezone); return h >= R.hoursFrom && h < R.hoursTo; }).length;
        if (late / saves.length >= R.hoursMinShare)
          flags.push({ firmId: t.id, round: r, kind: "hours", level: "note", title: "Edits mostly between 1 and 5 AM", why: `${late} of ${saves.length} saves in ${roundName(r)} happened between 1 and 5 AM class time. Students do work late; this matters only alongside other flags.` });
      }
    }
  }

  // 5. Large text pasted into a text box.
  for (const s of inp.signals) {
    if (s.kind !== "paste" || (s.detail?.chars ?? 0) < R.pasteMinChars) continue;
    if (!inp.teams.some((t) => t.id === s.firm_id)) continue;
    const field = s.detail?.field ? ` into "${s.detail.field}"` : "";
    flags.push({ firmId: s.firm_id, round: s.round, kind: "paste", level: "look", title: "Large block of text pasted", why: `${nameOf(s.user_id)} pasted ${(s.detail?.chars ?? 0).toLocaleString()} characters${field} (${localTime(s.at, inp.timezone)}). The text may have been drafted elsewhere, by the team or by a tool.` });
  }

  // 6. No round reflection (closed rounds only).
  for (const t of inp.teams)
    for (const r of inp.closedRounds) {
      if (r < 1) continue;
      if (!(inp.reflections[t.id]?.[r] ?? "").trim())
        flags.push({ firmId: t.id, round: r, kind: "reflection", level: "note", title: "No round reflection", why: `The team didn't write a reflection for ${roundName(r)} before it closed.` });
    }

  return flags.sort((a, b) => b.round - a.round || (a.level === b.level ? 0 : a.level === "look" ? -1 : 1));
}

/** Heatmap: edits per student per round, and how many teammates edited each round. */
export function heatmap(inp: Pick<ActivityInput, "teams" | "members" | "edits">, rounds: number[]) {
  return inp.teams.map((t) => {
    const rows = inp.edits.filter((e) => e.firm_id === t.id);
    const members = inp.members.filter((m) => m.firm_id === t.id).map((m) => ({
      userId: m.user_id,
      name: m.name,
      edits: rounds.map((r) => rows.filter((e) => e.round === r && e.user_id === m.user_id).length),
    }));
    return {
      firmId: t.id,
      name: t.name,
      members,
      teamEdits: rounds.map((r) => rows.filter((e) => e.round === r).length),
      activeMembers: rounds.map((r) => new Set(rows.filter((e) => e.round === r).map((e) => e.user_id)).size),
    };
  });
}
