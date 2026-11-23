/**
 * Demo class: one click builds a separate, clearly labeled sample class with
 * fake students on teams, sample decisions and three processed rounds
 * (Practice, Round 1, Round 2), plus sample creative work and grades, so the instructor can review every screen
 * that needs data. Deleting it removes the class and its fake accounts.
 * It never touches any other class.
 */
import bcrypt from "bcryptjs";
import { aiDecide } from "@/sim/ai";
import type { AiStyle, RegionId, StudyId } from "@/sim/config";
import { REGIONS } from "@/sim/config";
import { normalizeDecision } from "@/sim/product";
import type { FirmDecision, FirmMeta } from "@/sim/types";
import { DEMO_EMAIL_DOMAIN, HttpError, type User } from "./auth";
import { newId, one, q } from "./db";
import { buyStudy, createGame, firmMeta, getFirms, getGame, getResult, processCurrentRound, settingsOf, type GameRow } from "./game";

export { DEMO_EMAIL_DOMAIN } from "./auth";

export interface DemoInfo {
  password: string;
  userIds: string[];
  students: { name: string; email: string; team: string | null }[];
}

export const STUDENTS = [
  "Avery Nguyen", "Jordan Patel", "Sam Rivera",
  "Taylor Kim", "Morgan Lee", "Casey Brooks",
  "Riley Chen", "Jamie Ortiz", "Drew Hughes",
  "Quinn Foster", "Rowan Ellis", "Skyler Grant",
  "Parker Diaz",
];

const TEAMS: { company: string; style: AiStyle; level: number; mission: string; positioning: string; regions: RegionId[] }[] = [
  {
    company: "Pulse Peak",
    style: "premium",
    level: 7,
    mission: "We help serious athletes train smarter by offering accurate, durable trackers with coaching insights, unlike generic fitness bands.",
    positioning: "For fitness enthusiasts who train with data, Pulse Peak is the wearable that gives lab-grade accuracy because our sensors are tuned for athletes.",
    regions: ["na", "eu"],
  },
  {
    company: "ValueFit",
    style: "lowcost",
    level: 5,
    mission: "We help first-time buyers start tracking their health by offering simple, affordable bands, unlike pricey smartwatches.",
    positioning: "For budget-minded first-time buyers, ValueFit is the health band that covers the basics at the lowest price because we keep the design simple.",
    regions: ["na", "apac"],
  },
  {
    company: "Evergreen Health",
    style: "follower",
    level: 4,
    mission: "We help everyday people and their families stay healthy by offering comfortable wearables with useful insights.",
    positioning: "For everyday wellness buyers, Evergreen Health is the wearable that is easy to live with because it is light, simple and reliable.",
    regions: ["na"],
  },
  {
    company: "CareBand",
    style: "premium",
    level: 6,
    mission: "We help older adults live independently by offering safety-focused wearables their caregivers trust, unlike general fitness trackers.",
    positioning: "For older adults and their caregivers, CareBand is the safety wearable that brings peace of mind because it detects falls and alerts family.",
    regions: ["na", "eu"],
  },
];

export const CHARTER =
  "1) Roles: one person leads products, one leads pricing and promotion, one leads forecast and production.\n" +
  "2) We reply in the group chat within 24 hours.\n3) We meet Thursdays after class.\n" +
  "4) We decide by consensus; the product lead finalizes by Sunday 6 PM.\n5) We split the research reading evenly.\n" +
  "6) If someone misses work: direct reminder, then team discussion, then we tell the instructor.\n" +
  "7) Disagreements: each side makes its case, then we vote.\n8) All members agree: yes.";

const REFLECTIONS = [
  "We used the free survey to pick our segments and sent two product briefs to engineering. Next round we will set prices close to what our segments expect.",
  "Our first launch sold well in our main region but we ran short in one product. We will raise production and test a second region.",
  "Margins were thin because of partner fees. We will shift some volume online and watch the burn rate of the marketing budget.",
];

export function demoPassword() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  return "demo-" + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function demoInfo(g: GameRow): DemoInfo | null {
  const s = settingsOf(g) as unknown as { demo?: DemoInfo };
  return s.demo ?? null;
}

export async function createDemoGame(instructor: User): Promise<GameRow> {
  const existing = await q<{ n: number }>("select count(*)::int as n from games where instructor_id = $1 and settings ? 'demo'", [instructor.id]);
  if ((existing[0]?.n ?? 0) >= 3) throw new HttpError(400, "You already have 3 demo classes. Delete one first.");
  const g = await createGame(instructor, `DEMO: Sample class ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`, TEAMS.length);
  const tag = g.code.toLowerCase();
  const password = demoPassword();
  const hash = await bcrypt.hash(password, 10);
  const firms = (await getFirms(g.id)).filter((f) => !f.is_ai);

  // Fake students: three per team, plus one who hasn't joined a team yet.
  const info: DemoInfo = { password, userIds: [], students: [] };
  const byFirm: Record<string, User[]> = {};
  for (let i = 0; i < STUDENTS.length; i++) {
    const name = STUDENTS[i];
    const email = `${name.toLowerCase().replace(/[^a-z]+/g, ".")}.${tag}@${DEMO_EMAIL_DOMAIN}`;
    const id = newId("u_");
    await q("insert into users (id, email, name, password_hash, role) values ($1,$2,$3,$4,'student')", [id, email, name, hash]);
    info.userIds.push(id);
    const firm = firms[Math.floor(i / 3)];
    if (firm && i < firms.length * 3) {
      await q("insert into members (user_id, game_id, firm_id) values ($1,$2,$3)", [id, g.id, firm.id]);
      (byFirm[firm.id] ??= []).push({ id, email, name, role: "student" });
      info.students.push({ name, email, team: TEAMS[firms.indexOf(firm)].company });
    } else info.students.push({ name, email, team: null });
  }
  await q("update games set settings = $1 where id = $2", [JSON.stringify({ ...((g.settings as object) ?? {}), demo: info }), g.id]);

  // Play Practice, Round 1 and Round 2 with sample decisions.
  for (let round = 0; round <= 2; round++) {
    const game = (await getGame(g.id))!;
    const all = await getFirms(g.id);
    const metas = all.map((f) => firmMeta(f, round));
    const prev = round > 0 ? await getResult(g.id, round - 1) : null;
    for (let t = 0; t < firms.length; t++) {
      const f = firms[t];
      const team = TEAMS[t];
      const meta: FirmMeta = { id: f.id, name: team.company, isAi: true, aiLevel: team.level, aiStyle: team.style, slot: t };
      const d = normalizeDecision(aiDecide(meta, { round, seed: game.seed, state: prev?.state ?? null, prevResult: prev, firms: metas }));
      d.research = [];
      d.strategy.companyName = team.company;
      d.strategy.mission = team.mission;
      d.strategy.positioning = team.positioning;
      d.strategy.norms = CHARTER;
      d.strategy.targetRegions = team.regions.filter((r) => d.regions[r]?.enter || round === 0);
      if (!d.strategy.targetRegions.length) d.strategy.targetRegions = REGIONS.filter((r) => d.regions[r.id].enter).map((r) => r.id);
      d.reflection = REFLECTIONS[round];
      // One team skips its Round 2 reflection, so the checklist and exports show a gap.
      if (t === 2 && round === 2) d.reflection = "";
      await q(
        "insert into decisions (firm_id, round, data, updated_by) values ($1,$2,$3,$4) on conflict (firm_id, round) do update set data = excluded.data, updated_at = now(), updated_by = excluded.updated_by",
        [f.id, round, JSON.stringify(d), byFirm[f.id][0].id],
      );
      await sampleLog(f.id, round, byFirm[f.id], d);
      const studies: StudyId[] = round === 0 ? ["survey"] : round === 1 ? (t % 2 ? ["price"] : ["needs"]) : t === 0 ? ["competitors"] : [];
      for (const s of studies) {
        try {
          await buyStudy(game, f.id, byFirm[f.id][t % 3], s);
        } catch {
          // Not enough budget left for the study: skip it.
        }
      }
    }
    if (round === 1) await sampleCreative(firms.map((f) => f.id), byFirm, "before");
    await processCurrentRound((await getGame(g.id))!);
    if (round === 1) await sampleCreative(firms.map((f) => f.id), byFirm, "after");
  }
  // Two teams have marked themselves ready for the open round, so the class screen shows both states.
  for (const f of firms.slice(0, 2)) {
    const row = await one<{ data: unknown }>("select data from decisions where firm_id = $1 and round = 3", [f.id]);
    if (row) {
      const d = normalizeDecision(typeof row.data === "string" ? JSON.parse(row.data) : (row.data as FirmDecision));
      d.ready = true;
      await q("update decisions set data = $1 where firm_id = $2 and round = 3", [JSON.stringify(d), f.id]);
    }
  }
  // Leave the demo paused: nothing processes until the instructor clicks Run or Start.
  await q("update games set status = 'setup', deadline = null where id = $1", [g.id]);
  return (await getGame(g.id))!;
}

/**
 * Sample creative work for the Round 1 launch milestone: three teams submit links (placeholders on
 * example.com) before the Round 1 deadline, and two of them are graded afterwards, so the
 * Creative tab, the grading screen and the creative boost in Round 2 all have something to show.
 */
async function sampleCreative(firmIds: string[], byFirm: Record<string, User[]>, phase: "before" | "after") {
  const grades = [
    { scores: { fit: 5, clarity: 4, creativity: 4, consistency: 4, craft: 3 }, feedback: "Strong insight about training data and a clear single message. The search ad runs over the character limit; tighten it." },
    { scores: { fit: 3, clarity: 2, creativity: 3, consistency: 3, craft: 3 }, feedback: "The brief names two segments and the posts try to talk to both, so the message gets lost. Pick one buyer and one promise." },
  ];
  for (let t = 0; t < Math.min(3, firmIds.length); t++) {
    const fid = firmIds[t];
    if (phase === "before") {
      const base = `https://example.com/demo/team-${t + 1}`;
      const links = { brief: `${base}/brief`, social1: `${base}/post-1`, social2: `${base}/post-2`, social3: `${base}/post-3`, search: `${base}/search-ad` };
      await q(
        "insert into creative_submissions (firm_id, milestone, links, note, submitted_by, submitted_at) values ($1,'launch',$2,$3,$4, now() - interval '3 days') on conflict do nothing",
        [fid, JSON.stringify(t === 2 ? { brief: links.brief, social1: links.social1 } : links), t === 2 ? "We'll add the rest before the deadline." : "", byFirm[fid][t % 3].id],
      );
    } else if (t < 2) {
      await q("update creative_submissions set scores = $1, feedback = $2, graded_at = now() - interval '2 days' where firm_id = $3 and milestone = 'launch'", [JSON.stringify(grades[t].scores), grades[t].feedback, fid]);
    }
  }
}

/** A few change-log lines per round, by different teammates, so the log and its export have content. */
export async function sampleLog(firmId: string, round: number, members: User[], d: FirmDecision) {
  const lines: { path: string; old: unknown; new: unknown }[] = [];
  if (round === 0) {
    lines.push({ path: "strategy.companyName", old: "", new: d.strategy.companyName });
    lines.push({ path: "strategy.targetSegments", old: [], new: d.strategy.targetSegments });
    lines.push({ path: "strategy.mission", old: "", new: d.strategy.mission });
    for (const p of d.products) {
      lines.push({ path: "products", old: null, new: { ...p, briefSent: false, commission: false } });
      lines.push({ path: `products.#${p.id}.briefSent`, old: false, new: true });
      lines.push({ path: `products.#${p.id}.commission`, old: false, new: true });
    }
  } else {
    lines.push({ path: "strategy.targetRegions", old: [], new: d.strategy.targetRegions });
    for (const [pid, regs] of Object.entries(d.plan)) {
      for (const [r, pl] of Object.entries(regs ?? {})) {
        if (!pl) continue;
        lines.push({ path: `plan.${pid}.${r}.price`, old: null, new: pl.price });
        lines.push({ path: `plan.${pid}.${r}.production`, old: null, new: pl.production });
        break;
      }
    }
    lines.push({ path: "goals.revenue", old: null, new: d.goals.revenue });
  }
  if (d.reflection) lines.push({ path: "reflection", old: "", new: d.reflection });
  let minutes = 60 * 24 * (4 - round);
  for (let i = 0; i < lines.length; i++) {
    const who = members[i % members.length];
    minutes -= 37;
    await q("insert into change_log (firm_id, round, user_id, at, path, old_value, new_value) values ($1,$2,$3, now() - ($4 || ' minutes')::interval, $5, $6, $7)", [
      firmId, round, who.id, String(minutes), lines[i].path, JSON.stringify(lines[i].old), JSON.stringify(lines[i].new),
    ]);
  }
}

export async function deleteDemoGame(instructor: User, gameId: string) {
  const g = await one<GameRow>("select * from games where id = $1 and instructor_id = $2", [gameId, instructor.id]);
  if (!g) throw new HttpError(404, "Class not found.");
  const info = demoInfo(g);
  if (!info) throw new HttpError(400, "Only demo classes can be deleted here.");
  await q("delete from games where id = $1", [g.id]);
  // Remove only the fake accounts this demo created (and only if they're in no other class).
  for (const id of info.userIds) {
    await q(`delete from users where id = $1 and email like $2 and not exists (select 1 from members where user_id = $1)`, [id, `%@${DEMO_EMAIL_DOMAIN}`]);
  }
}
