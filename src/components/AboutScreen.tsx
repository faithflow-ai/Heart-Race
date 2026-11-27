"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { CHANNELS, MEDIA, REGIONS, ROUNDS, SEGMENTS, STUDIES, type StudyId } from "@/sim/config";
import type { FirmDecision } from "@/sim/types";
import { money, num } from "./client";
import type { TeamData } from "./TeamContext";

/**
 * A short note for instructors and showcase guests in "View as student": what students decide on
 * this screen, and a summary of what this team chose. Built from the team's saved decisions.
 */
const seg = (id: string) => SEGMENTS.find((s) => s.id === id)?.name ?? id;
const reg = (id: string) => REGIONS.find((r) => r.id === id)?.name ?? id;
const chn = (id: string) => CHANNELS.find((c) => c.id === id)?.name ?? id;
const list = (xs: string[]) => (xs.length ? xs.join(", ") : "none chosen");
const POSTURE: Record<string, string> = { differentiate: "differentiate on features and design", cost: "lead on cost and price", niche: "focus on a niche", follow: "fast follower" };
const TIER: Record<string, string> = { good: "Good", better: "Better", best: "Best" };

const WHAT: Record<string, string> = {
  home: "The team's home screen: the round, the deadline, the budget and what's due. Students start each week here.",
  strategy: "Students write a mission and positioning statement, choose a competitive posture, agree a team charter, pick target segments and regions, and from Round 1 set numeric goals (a share goal for each target segment, plus revenue, margin, awareness and satisfaction).",
  products: "Students design each product from components and sensors, send the brief to engineering, then accept or revise the quote. An accepted product goes on sale the next round.",
  markets: "For each region, students decide whether to enter, how (distributor, local partner or own subsidiary) and which sales channels to use. Each channel shows the partner's margin and a setup fee.",
  pricing: "For each product in each region, students set the list price and split promotion dollars across 3 consumer ad media (pull) and trade promotion to retail partners (push). Each product also gets one campaign: target segment, tone, message and ad claims.",
  production: "For each product in each region, students enter a sales forecast and a production quantity (set separately, with a warning if they're far apart), and can buy extra factory capacity.",
  review: "Students check their budget, can run an optional projected profit and loss, write the round reflection and mark the team ready. The round runs automatically at the deadline.",
  research: "Students choose which market studies to buy with their marketing budget, and read the reports they bought.",
  creative: "Students submit links to their creative work at 3 milestones: the Round 1 launch campaign, the Round 4 videos and the Final round landing page. The instructor grades it here.",
  results: "After each round, students get this report: scorecard, profit and loss, promotion results by segment, goals vs. actual and warnings.",
  history: "A readable record of everything the team decided, round by round. The quickest way to see how a team's plan changed.",
  learn: "One short lesson per round on the principles behind that round's decisions. Instructor notes show only to instructors and guests.",
  log: "Who on the team changed what, and when. Useful for peer evaluation.",
  help: "The scenario briefing students read first: the company, the market and how scoring works.",
};

function summary(key: string, t: TeamData): string | null {
  const d: FirmDecision = t.decision;
  const s = d.strategy;
  const live = d.products.filter((p) => !p.retire);
  const regions = REGIONS.filter((r) => d.regions[r.id]?.enter || t.regionsEntered[r.id]);
  if (key === "strategy") {
    const goals = s.targetSegments.map((id) => d.goals.segmentShare?.[id]).some((v) => v != null)
      ? s.targetSegments.map((id) => `${seg(id)} ${d.goals.segmentShare?.[id] ?? "-"}%`).join(", ")
      : d.goals.share != null ? `${d.goals.share}% of target segments` : "not set";
    return `Targets ${list(s.targetSegments.map(seg))} in ${list(s.targetRegions.map(reg))}. Posture: ${POSTURE[s.posture] ?? "not chosen"}. Share goals: ${goals}. Revenue goal: ${d.goals.revenue != null ? money(d.goals.revenue) : "not set"}.`;
  }
  if (key === "products") {
    if (!live.length) return "No products briefed yet.";
    return live.map((p) => `${p.name} (${TIER[p.tier] ?? p.tier} tier, for ${seg(p.targetSegment)})`).join("; ") + ".";
  }
  if (key === "markets") {
    if (!regions.length) return "No regions entered yet.";
    return regions.map((r) => `${r.name}: ${list(d.regions[r.id].channels.map(chn))}`).join(". ") + ".";
  }
  if (key === "pricing") {
    const parts = live.flatMap((p) => {
      const cells = Object.values(d.plan[p.id] ?? {}).filter((c) => c && c.price > 0);
      if (!cells.length) return [];
      const prices = cells.map((c) => c.price);
      const promo = cells.reduce((a, c) => a + MEDIA.reduce((b, m) => b + (Number(c.media?.[m.id]) || 0), 0), 0);
      const trade = cells.reduce((a, c) => a + (Number(c.media?.trade) || 0), 0);
      const lo = Math.min(...prices), hi = Math.max(...prices);
      return [`${p.name}: price ${lo === hi ? money(lo) : `${money(lo)} to ${money(hi)}`}, promotion ${money(promo)} (${promo > 0 ? Math.round((trade / promo) * 100) : 0}% trade)`];
    });
    return parts.length ? parts.join("; ") + "." : "No prices or promotion set yet.";
  }
  if (key === "production") {
    const parts = live.flatMap((p) => {
      const cells = Object.values(d.plan[p.id] ?? {});
      const f = cells.reduce((a, c) => a + (c?.forecast ?? 0), 0);
      const pr = cells.reduce((a, c) => a + (c?.production ?? 0), 0);
      return f || pr ? [`${p.name}: forecast ${num(f)} units, production ${num(pr)}`] : [];
    });
    return parts.length ? parts.join("; ") + "." : "No forecast or production set yet.";
  }
  if (key === "review") return d.reflection.trim() ? `Reflection: "${d.reflection.trim().slice(0, 220)}${d.reflection.trim().length > 220 ? "…" : ""}"` : "No reflection written yet.";
  if (key === "research") {
    if (!t.research.length) return "No studies bought yet.";
    return `${t.research.length} studies bought, for example ${[...new Set(t.research.map((r) => STUDIES[r.study as StudyId]?.name ?? r.study))].slice(0, 3).join(", ")}.`;
  }
  return null;
}

export function AboutScreen({ team }: { team: TeamData }) {
  const path = usePathname();
  const sp = useSearchParams();
  const page = path === "/play" ? "home" : path.split("/")[2] ?? "home";
  const key = page === "decide" ? (sp.get("tab") ?? "strategy") : page;
  const what = WHAT[key];
  if (!what) return null;
  const sum = summary(key, team);
  const round = ROUNDS.names[Math.min(team.game.round, ROUNDS.final)];
  return (
    <details className="about-screen" open>
      <summary>About this screen</summary>
      <p><b>What students decide here:</b> {what}</p>
      {sum && <p><b>{team.tryIt ? `Entered so far (${round}):` : `What ${team.firm.name} chose (${round}):`}</b> {sum}</p>}
    </details>
  );
}
