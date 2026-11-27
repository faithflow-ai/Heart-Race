/**
 * Showcase class: a complete class (Practice through the Final round) for showing Heart Race to
 * colleagues. Four teams with clearly different strategies, every round's decisions, research,
 * results, creative work and reflections filled in, plus a read-only guest instructor login.
 * It is built one round per request (so each request stays short on the free hosting tier) and
 * is deleted like a demo class.
 */
import bcrypt from "bcryptjs";
import { aiDecide } from "@/sim/ai";
import { CREATIVE, ROUNDS, type AiStyle, type MilestoneId, type RegionId, type SegmentId, type StudyId } from "@/sim/config";
import { normalizeDecision } from "@/sim/product";
import type { FirmDecision, FirmMeta, RoundResult } from "@/sim/types";
import { DEMO_EMAIL_DOMAIN, HttpError, type User } from "./auth";
import { newId, q } from "./db";
import { CHARTER, STUDENTS, demoPassword, sampleLog, type DemoInfo } from "./demo";
import { buyStudy, carryForward, createGame, getFirms, getGame, getResult, processCurrentRound, settingsOf, type GameRow } from "./game";

export interface ShowcaseInfo {
  guestUserId: string;
  guestEmail: string;
  guestPassword: string;
  /** Rounds processed so far (0 to 8). */
  built: number;
  /** Rounds to play before stopping. Missing = the whole game (8). The "class in progress" stops after 2. */
  stopAfter?: number;
  /** The "class in progress" created alongside the finished class (deleted with it). */
  pairId?: string;
}

/** Weekly inputs a team re-enters each round; cleared in the class in progress so colleagues see them blank. */
function clearWeeklyInputs(d: FirmDecision): FirmDecision {
  const n = carryForward(d);
  for (const regs of Object.values(n.plan))
    for (const pl of Object.values(regs ?? {})) {
      if (!pl) continue;
      pl.price = 0;
      pl.forecast = 0;
      pl.production = 0;
      pl.promotion = 0;
      pl.media = { digital: 0, search: 0, traditional: 0, trade: 0 };
    }
  n.goals = { share: null, segmentShare: {}, revenue: null, margin: null, awareness: null, satisfaction: null };
  return n;
}

interface Team {
  company: string;
  style: AiStyle;
  level: number;
  targets: SegmentId[];
  mission: string;
  positioning: string;
  /** One line per round (Practice to Final): what the team decided and why. */
  plans: string[];
  research: StudyId[][];
  /** Main campaign message for each product, in order. */
  messages: string[];
  /** Keep to two products (the AI would otherwise brief a third in Round 3). */
  twoProducts?: boolean;
  /** Split promotion evenly across the four media in Round 1 (a team still guessing). */
  evenSplitRound1?: boolean;
  creative: Record<MilestoneId, { scores: Record<string, number>; feedback: string }>;
}

const TEAMS: Team[] = [
  {
    company: "Pulse Peak",
    style: "premium",
    level: 7,
    targets: ["fitness", "wellness"],
    mission: "We help serious athletes and active adults train smarter with accurate, durable wearables and coaching insights, unlike generic fitness bands.",
    positioning: "For fitness enthusiasts who train with data, Pulse Peak is the wearable that gives lab-grade accuracy because our sensors are tuned for athletes.",
    plans: [
      "We chose a premium differentiation strategy: Fitness Enthusiasts first, Everyday Wellness second. The survey shows Fitness pays the most and is the least price sensitive, so we briefed an advanced GPS watch and a lighter band for wellness buyers.",
      "We priced near the top of what each segment expects and put most of our consumer ads into the media that reach athletes best. We chose the channels where athletes shop rather than trying to be everywhere.",
      "We kept prices premium, because cutting price would blur our position. We kept a share of promotion as trade promotion so store staff recommend us to serious athletes.",
      "We bought the Competitor benchmark to see which rivals chase athletes and where the open space is. We are pacing our budget so we still have money for the second half.",
      "Before the seasonal peak we reviewed our regions and factory capacity. Our video campaign targets athletes training for a race.",
      "Rivals started discounting. We decided not to follow them on price and instead defended with satisfaction and awareness, which carry over from round to round.",
      "We compared profit by product and region and shifted promotion toward the places where our awareness is strongest.",
      "We are finishing with our strongest mix and spending the rest of the budget, because unspent money doesn't count as profit. Biggest lesson: staying consistent with our positioning paid off more than chasing volume.",
    ],
    messages: ["Train on numbers you can trust: race-grade GPS and heart data on your wrist.", "Know how you slept and how ready you are, in one glance.", "Accurate tracking for every workout, at a lighter price."],
    research: [["survey"], ["needs", "media"], ["partners", "awareness"], ["competitors"], ["potential", "satisfaction"], ["competitors"], ["awareness"], ["potential"]],
    creative: {
      launch: { scores: { fit: 5, clarity: 4, creativity: 4, consistency: 4, craft: 3 }, feedback: "A sharp insight about athletes who distrust wrist data, and one clear promise. The search ad runs over the character limit." },
      video: { scores: { fit: 5, clarity: 5, creativity: 4, consistency: 5, craft: 4 }, feedback: "The race-morning story works and the brand moment lands. The vertical cut needs captions for sound-off viewing." },
      landing: { scores: { fit: 5, clarity: 4, creativity: 4, consistency: 5, craft: 4 }, feedback: "Clear headline and proof. Move the comparison table above the fold." },
    },
  },
  {
    company: "ValueFit",
    style: "lowcost",
    level: 6,
    targets: ["budget", "business"],
    mission: "We help first-time buyers and workplace wellness programs start tracking health with simple, affordable bands, unlike pricey smartwatches.",
    positioning: "For budget-minded first-time buyers, ValueFit is the health band that covers the basics at the lowest price because we keep the design simple.",
    plans: [
      "We chose a low-cost strategy for the two largest volume segments: Budget & First-Time Buyers and Businesses & Insurers. We briefed simple bands with basic chips and long battery life to keep unit cost low.",
      "We priced below what budget buyers expect and sold through marketplaces, mass retail and business distributors. A large share of our promotion went to trade promotion, because budget buyers meet brands at the shelf.",
      "We kept prices low and concentrated volume in fewer channels to earn leverage and lower partner margins over time.",
      "We checked our budget pacing for the rest of the game and trimmed spending on media that barely moved our segments in the Promotion results report.",
      "We weighed Asia-Pacific, the region with the most budget buyers, and compared a low-cost distributor entry against the overhead every region adds.",
      "Rivals are pricing aggressively. We decided to compete on cost and availability rather than start a price war that would shrink everyone's profit.",
      "Unit costs have dropped as our production grew, so we kept the price and took the extra margin instead of cutting further.",
      "We finished by clearing older stock and keeping production close to our forecast. Biggest lesson: cheap only works if you also control costs and partner margins.",
    ],
    messages: ["Everything you need to start tracking, nothing you don't, for under $80.", "Healthier teams, simple devices, one easy dashboard for your wellness program.", "Seven days of battery for the price of a dinner out."],
    research: [["survey"], ["price", "partners"], ["awareness"], ["competitors", "potential"], ["partners"], ["competitors"], ["satisfaction"], ["potential"]],
    creative: {
      launch: { scores: { fit: 4, clarity: 3, creativity: 3, consistency: 3, craft: 3 }, feedback: "Good value message, but the brief names two segments and the posts try to talk to both. Pick one buyer per piece." },
      video: { scores: { fit: 4, clarity: 4, creativity: 3, consistency: 4, craft: 3 }, feedback: "Much clearer focus on first-time buyers. The horizontal video runs 45 seconds; trim it to 30." },
      landing: { scores: { fit: 4, clarity: 4, creativity: 3, consistency: 4, craft: 4 }, feedback: "Simple and honest. Add a reason to believe beyond price." },
    },
  },
  {
    company: "CareBand",
    style: "premium",
    level: 6,
    targets: ["older", "wellness"],
    mission: "We help older adults live independently with safety-focused wearables their caregivers trust, unlike general fitness trackers.",
    positioning: "For older adults and their caregivers, CareBand is the safety wearable that brings peace of mind because it detects falls and alerts family.",
    plans: [
      "We targeted Older Adults & Caregivers, a growing segment that buys at pharmacies, plus Everyday Wellness as a second segment. We briefed a watch with fall detection, heart monitoring and medical-grade privacy.",
      "We chose the channels where caregivers shop, pharmacies first, and paid for trade promotion so pharmacists recommend us. Our campaign uses a warm, reassuring tone.",
      "Pharmacies keep a high margin, but they reach our buyers best. We decided the reach is worth the margin and kept our partner mix.",
      "We bought Customer needs again before planning a third product, and decided against it: our two products already cover our segments, and a third would steal sales from them.",
      "We reviewed which region to add next, since the older segment is large outside North America too. Our video shows an adult daughter getting an alert at work.",
      "Satisfaction stayed high, so we held our premium prices instead of discounting.",
      "We compared the Media preferences study with our Promotion results and leaned toward the media that reach older buyers best.",
      "We finished with steady promotion and production close to the forecast. Biggest lesson: knowing exactly who buys, and where, mattered more than having the most features.",
    ],
    messages: ["Peace of mind on every wrist: CareBand calls family the moment a fall happens.", "Sleep, stress and heart insights you can share with your doctor."],
    twoProducts: true,
    research: [["survey"], ["needs", "partners"], ["satisfaction"], ["needs", "competitors"], ["media"], ["awareness"], ["satisfaction"], ["competitors"]],
    creative: {
      launch: { scores: { fit: 5, clarity: 5, creativity: 4, consistency: 4, craft: 4 }, feedback: "Excellent caregiver insight and a single, memorable promise. Strong brief." },
      video: { scores: { fit: 5, clarity: 4, creativity: 5, consistency: 5, craft: 4 }, feedback: "The alert-at-work story is moving and on brand. Show the product sooner in the vertical cut." },
      landing: { scores: { fit: 5, clarity: 5, creativity: 4, consistency: 5, craft: 5 }, feedback: "A polished page that answers caregivers' real questions. Very strong." },
    },
  },
  {
    company: "Evergreen Health",
    style: "follower",
    level: 4,
    targets: ["wellness", "budget"],
    mission: "We help everyday people and their families stay healthy with comfortable wearables and useful insights.",
    positioning: "For everyday wellness buyers, Evergreen Health is the wearable that is easy to live with because it is light, simple and reliable.",
    plans: [
      "We chose Everyday Wellness and Budget buyers because they are large segments. We read only the free survey to save money and briefed two mid-range bands from the free survey.",
      "We set prices in the middle of the range and split promotion evenly across all four media, since we weren't sure which would work best.",
      "Results were weak: buyers knew us, but few chose us. The Promotion results report showed traditional media did little for our segments, so we moved that money to digital and trade.",
      "We briefed a third product for a segment nobody serves well, hoping to find room. Looking back, we should have fixed our own product fit first.",
      "We finally bought Customer needs and learned our products were missing features our segments care about, which we can't fix without a redesign.",
      "We compared channels and regions and cut spending where it wasn't paying back.",
      "Our forecast had been too optimistic every round, so we based this one on Market potential and last round's share.",
      "We finished in a better position than mid-game. Biggest lesson: we should have paid for research before briefing products instead of guessing.",
    ],
    messages: ["Feel better every day with a band you'll forget you're wearing.", "Simple health tracking that's easy on your wallet.", "A fresh start for your health."],
    evenSplitRound1: true,
    research: [["survey"], [], ["awareness"], [], ["needs"], ["partners"], ["potential"], ["potential"]],
    creative: {
      launch: { scores: { fit: 2, clarity: 3, creativity: 3, consistency: 3, craft: 3 }, feedback: "The posts are attractive but don't say who they are for. The brief has no consumer insight." },
      video: { scores: { fit: 3, clarity: 3, creativity: 3, consistency: 3, craft: 3 }, feedback: "Better, with a clearer buyer. The message still lists features instead of making one promise." },
      landing: { scores: { fit: 4, clarity: 4, creativity: 3, consistency: 4, craft: 3 }, feedback: "Real improvement: one buyer, one promise. Tighten the copy and fix the mobile layout." },
    },
  },
];

const money = (n: number) => `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;
const ordinal = (n: number) => `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;

export function showcaseInfo(g: GameRow): ShowcaseInfo | null {
  return (settingsOf(g) as unknown as { showcase?: ShowcaseInfo }).showcase ?? null;
}

/**
 * Step 1: two classes with the same 4 teams and one read-only guest login. The finished class plays
 * every round; the class in progress stops after Round 1 so Round 2 is open. No rounds are played yet.
 */
export async function createShowcase(instructor: User): Promise<{ game: GameRow; pairId: string }> {
  const existing = await q<{ n: number }>("select count(*)::int as n from games where instructor_id = $1 and settings ? 'showcase' and settings->'showcase'->>'stopAfter' is null", [instructor.id]);
  if ((existing[0]?.n ?? 0) >= 2) throw new HttpError(400, "You already have 2 showcase classes. Delete one first.");
  const full = await makeShowcaseClass(instructor, "SHOWCASE: Heart Race full class (Practice to Final)", null);
  const sc = showcaseInfo(full)!;
  const mid = await makeShowcaseClass(instructor, "SHOWCASE: class in progress (Round 2 open, try it)", sc, 2);
  await q("update games set settings = $1 where id = $2", [JSON.stringify({ ...settingsOf(full), showcase: { ...sc, pairId: mid.id } }), full.id]);
  return { game: (await getGame(full.id))!, pairId: mid.id };
}

async function makeShowcaseClass(instructor: User, name: string, guest: ShowcaseInfo | null, stopAfter?: number): Promise<GameRow> {
  const g = await createGame(instructor, name, TEAMS.length);
  const tag = g.code.toLowerCase();
  const password = demoPassword();
  const hash = await bcrypt.hash(password, 10);
  const firms = (await getFirms(g.id)).filter((f) => !f.is_ai);
  const info: DemoInfo = { password, userIds: [], students: [] };
  for (let i = 0; i < TEAMS.length * 3; i++) {
    const name = STUDENTS[i];
    const email = `${name.toLowerCase().replace(/[^a-z]+/g, ".")}.${tag}@${DEMO_EMAIL_DOMAIN}`;
    const id = newId("u_");
    await q("insert into users (id, email, name, password_hash, role) values ($1,$2,$3,$4,'student')", [id, email, name, hash]);
    await q("insert into members (user_id, game_id, firm_id) values ($1,$2,$3)", [id, g.id, firms[Math.floor(i / 3)].id]);
    info.userIds.push(id);
    info.students.push({ name, email, team: TEAMS[Math.floor(i / 3)].company });
  }
  // The guest: a separate read-only instructor login that sees only the showcase classes.
  let showcase: ShowcaseInfo;
  if (guest) showcase = { guestUserId: guest.guestUserId, guestEmail: guest.guestEmail, guestPassword: guest.guestPassword, built: 0, stopAfter };
  else {
    const guestPassword = demoPassword().replace("demo-", "guest-");
    const guestEmail = `guest.${tag}@${DEMO_EMAIL_DOMAIN}`;
    const guestUserId = newId("u_");
    await q("insert into users (id, email, name, password_hash, role) values ($1,$2,$3,$4,'instructor')", [guestUserId, guestEmail, "Guest (read-only)", await bcrypt.hash(guestPassword, 10)]);
    info.userIds.push(guestUserId);
    showcase = { guestUserId, guestEmail, guestPassword, built: 0 };
  }
  await q("update games set settings = $1 where id = $2", [JSON.stringify({ ...settingsOf(g), demo: info, showcase }), g.id]);
  return (await getGame(g.id))!;
}

function reflection(t: Team, round: number, prev: RoundResult | null, firmId: string): string {
  const parts: string[] = [];
  if (prev && round >= 2) {
    const s = prev.scores[firmId];
    const rep = prev.reports[firmId];
    if (s && rep) parts.push(`Last round we finished ${ordinal(s.rank)} of 8 with ${s.total.toFixed(1)} points and an operating profit of ${money(rep.pnl.operatingProfit)}.`);
    const c = rep?.concerns?.[0];
    if (c) parts.push(`Our biggest concern was "${c.title}", and we took that into account this round.`);
  }
  parts.push(t.plans[round]);
  return parts.join(" ");
}

/**
 * Rebuild: wipe the rounds of both showcase classes (the finished class and its class in progress) and
 * start them over at the Practice round, keeping the classes, teams, fake students and the guest login.
 * The page then replays them with showcaseStep, so they follow the simulation's current rules.
 */
export async function resetShowcase(instructor: User, gameId: string): Promise<{ ids: string[] }> {
  const g = await getGame(gameId);
  if (!g || g.instructor_id !== instructor.id) throw new HttpError(404, "Class not found.");
  const sc = showcaseInfo(g);
  if (!sc) throw new HttpError(400, "This isn't a showcase class.");
  let full = g;
  if (sc.stopAfter) {
    const owner = await q<{ id: string }>("select id from games where instructor_id = $1 and settings->'showcase'->>'pairId' = $2", [instructor.id, g.id]);
    if (owner[0]) full = (await getGame(owner[0].id))!;
  }
  const pairId = showcaseInfo(full)?.pairId;
  const ids = [full.id, ...(pairId && pairId !== full.id ? [pairId] : [])];
  for (const id of ids) {
    const fids = (await getFirms(id)).map((f) => f.id);
    await q("delete from results where game_id = $1", [id]);
    for (const table of ["decisions", "change_log", "research_reports", "creative_submissions"])
      await q(`delete from ${table} where firm_id = any($1)`, [fids]);
    const gi = (await getGame(id))!;
    const si = showcaseInfo(gi)!;
    await q("update games set current_round = 0, status = 'setup', deadline = null, processing_at = null, settings = $1 where id = $2", [
      JSON.stringify({ ...settingsOf(gi), showcase: { ...si, built: 0 } }),
      id,
    ]);
  }
  return { ids };
}

/** Step 2 (repeat): play the open round for the showcase teams and process it. Returns progress. */
export async function showcaseStep(instructor: User, gameId: string): Promise<{ built: number; total: number; done: boolean }> {
  const g0 = await getGame(gameId);
  if (!g0 || g0.instructor_id !== instructor.id) throw new HttpError(404, "Class not found.");
  const sc = showcaseInfo(g0);
  if (!sc) throw new HttpError(400, "This isn't a showcase class.");
  const total = sc.stopAfter ?? ROUNDS.final + 1;
  const round = g0.current_round;
  if (round >= total) return { built: total, done: true, total };
  const firms = (await getFirms(g0.id)).filter((f) => !f.is_ai);
  const members = await q<{ firm_id: string; id: string; email: string; name: string }>("select m.firm_id, u.id, u.email, u.name from members m join users u on u.id = m.user_id where m.game_id = $1 order by u.name", [g0.id]);
  const allFirms = await getFirms(g0.id);
  const metas: FirmMeta[] = allFirms.map((f) => {
    const t = firms.findIndex((x) => x.id === f.id);
    return t >= 0 ? { id: f.id, name: TEAMS[t].company, isAi: true, aiLevel: TEAMS[t].level, aiStyle: TEAMS[t].style, slot: t, targets: TEAMS[t].targets } : { id: f.id, name: f.name, isAi: true, aiLevel: f.ai_level ?? 5, aiStyle: f.ai_style, slot: f.slot };
  });
  const prev = round > 0 ? await getResult(g0.id, round - 1) : null;
  for (let t = 0; t < firms.length; t++) {
    const f = firms[t];
    const team = TEAMS[t];
    const who = members.filter((m) => m.firm_id === f.id).map((m) => ({ id: m.id, email: m.email, name: m.name, role: "student" as const }));
    const d = normalizeDecision(aiDecide(metas.find((m) => m.id === f.id)!, { round, seed: g0.seed, state: prev?.state ?? null, prevResult: prev, firms: metas }));
    d.research = [];
    d.strategy.companyName = team.company;
    d.strategy.mission = team.mission;
    d.strategy.positioning = team.positioning;
    d.strategy.norms = CHARTER;
    d.strategy.targetRegions = (Object.keys(d.regions) as RegionId[]).filter((r) => d.regions[r]?.enter);
    if (!d.strategy.targetRegions.length) d.strategy.targetRegions = ["na"];
    d.strategy.targetSegments = [...team.targets];
    if (team.twoProducts) {
      d.products = d.products.filter((p) => p.id !== "p3");
      delete d.plan.p3;
    }
    d.products.forEach((p, i) => {
      if (p.campaign && team.messages[i]) p.campaign.message = team.messages[i];
    });
    if (team.evenSplitRound1 && round === 1)
      for (const regs of Object.values(d.plan))
        for (const pl of Object.values(regs ?? {})) {
          if (!pl?.media) continue;
          const total = Object.values(pl.media).reduce((a, v) => a + (Number(v) || 0), 0);
          pl.media = { digital: total / 4, search: total / 4, traditional: total / 4, trade: total / 4 };
          pl.promotion = total;
        }
    d.reflection = reflection(team, round, prev, f.id);
    await q(
      "insert into decisions (firm_id, round, data, updated_by) values ($1,$2,$3,$4) on conflict (firm_id, round) do update set data = excluded.data, updated_at = now(), updated_by = excluded.updated_by",
      [f.id, round, JSON.stringify(d), who[0].id],
    );
    await sampleLog(f.id, round, who, d);
    const game = (await getGame(g0.id))!;
    for (const s of team.research[round] ?? []) {
      try {
        await buyStudy(game, f.id, who[(round + t) % who.length], s);
      } catch {
        // Not enough budget for this study: skip it.
      }
    }
    // Creative work is submitted before its milestone's deadline.
    const m = CREATIVE.milestones.find((x) => x.round === round);
    if (m) {
      const slug = team.company.toLowerCase().replace(/[^a-z]+/g, "-");
      const links = Object.fromEntries(m.items.filter((it) => it.required || t % 2 === 0).map((it) => [it.id, `https://example.com/showcase/${slug}/${m.id}/${it.id}`]));
      await q(
        "insert into creative_submissions (firm_id, milestone, links, note, submitted_by, submitted_at) values ($1,$2,$3,$4,$5, now()) on conflict (firm_id, milestone) do update set links = excluded.links",
        [f.id, m.id, JSON.stringify(links), "Placeholder links for the showcase class.", who[t % who.length].id],
      );
    }
  }
  await processCurrentRound((await getGame(g0.id))!);
  // The instructor grades creative work right after its deadline.
  const m = CREATIVE.milestones.find((x) => x.round === round);
  if (m)
    for (let t = 0; t < firms.length; t++) {
      const gr = TEAMS[t].creative[m.id];
      await q("update creative_submissions set scores = $1, feedback = $2, graded_at = now() where firm_id = $3 and milestone = $4", [JSON.stringify(gr.scores), gr.feedback, firms[t].id, m.id]);
    }
  const built = round + 1;
  // Class in progress: open the next round with the weekly inputs blank.
  if (sc.stopAfter && built >= sc.stopAfter) {
    const last = await q<{ firm_id: string; data: unknown }>("select firm_id, data from decisions where round = $1 and firm_id = any($2)", [round, firms.map((f) => f.id)]);
    for (const r of last) {
      const d = clearWeeklyInputs(normalizeDecision(typeof r.data === "string" ? JSON.parse(r.data) : (r.data as FirmDecision)));
      await q(
        "insert into decisions (firm_id, round, data) values ($1,$2,$3) on conflict (firm_id, round) do update set data = excluded.data, updated_at = now()",
        [r.firm_id, built, JSON.stringify(d)],
      );
    }
  }
  const g1 = (await getGame(g0.id))!;
  await q("update games set status = 'setup', deadline = null, settings = $1 where id = $2", [JSON.stringify({ ...settingsOf(g1), showcase: { ...sc, built } }), g0.id]);
  return { built, total, done: built >= total };
}
