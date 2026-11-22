/**
 * Research studies. Each returns plain tables built from the hidden market
 * settings and the latest results. Answers are rounded or described in words
 * so students learn the market's shape without seeing the raw formulas.
 */
import {
  CHANNELS,
  CHANNEL_TERMS,
  CLAIMS,
  COMPONENTS,
  LEVERAGE,
  REGIONS,
  SEGMENTS,
  SENSORS,
  STUDIES,
  type SegmentId,
  type StudyId,
} from "./config";
import { SEGMENT_PROFILES } from "./market";
import { baseDemand, channelMargin, marginCut, maxPrice, refPrice } from "./engine";
import { regionIds } from "./product";
import type { FirmMeta, RoundResult } from "./types";

export interface ReportTable {
  title: string;
  columns: string[];
  rows: (string | number)[][];
}
export interface StudyReport {
  study: StudyId;
  title: string;
  intro: string;
  tables: ReportTable[];
}

const segName = (s: SegmentId) => SEGMENTS.find((x) => x.id === s)!.name;
const word = (v: number) => (v >= 0.9 ? "Must have" : v >= 0.7 ? "Important" : v >= 0.45 ? "Nice to have" : v >= 0.2 ? "Minor" : "Doesn't care");
const roundTo = (n: number, step: number) => Math.round(n / step) * step;
const pct = (n: number) => `${Math.round(n * 100)}%`;

export function generateStudy(study: StudyId, ctx: { round: number; firmId: string; firms: FirmMeta[]; latest: RoundResult | null }): StudyReport {
  const title = STUDIES[study].name;
  const nextRound = Math.max(1, ctx.round);
  switch (study) {
    case "survey":
      return {
        study,
        title,
        intro: "A first look at the wearables market: how big each buyer group is and what it roughly wants. Buy the detailed studies later for more.",
        tables: [
          {
            title: "Buyers per round (approximate units, all regions)",
            columns: ["Segment", "Size", "Typical price paid", "Top wants"],
            rows: SEGMENTS.map((s) => {
              const p = SEGMENT_PROFILES[s.id];
              const size = regionIds.reduce((a, r) => a + baseDemand(s.id, r, 1), 0);
              const top = Object.entries(p.wants.sensors).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => SENSORS[k as keyof typeof SENSORS].name);
              return [s.name, roundTo(size, 5000).toLocaleString(), `$${roundTo(p.refPrice, 10)}`, top.join(", ")];
            }),
          },
        ],
      };
    case "needs":
      return {
        study,
        title,
        intro: "How much each segment cares about each feature, from focus groups. Use it to write product briefs that fit.",
        tables: [
          {
            title: "Sensors",
            columns: ["Sensor", ...SEGMENTS.map((s) => s.name)],
            rows: Object.entries(SENSORS).map(([k, v]) => [v.name, ...SEGMENTS.map((s) => word(SEGMENT_PROFILES[s.id].wants.sensors[k as keyof typeof SENSORS]))]),
          },
          ...(["form", "battery", "display", "material", "water", "privacy", "chip"] as const).map((area) => ({
            title: COMPONENTS[area].label,
            columns: ["Option", ...SEGMENTS.map((s) => s.name)],
            rows: Object.entries(COMPONENTS[area].options).map(([k, v]) => [
              v.name,
              ...SEGMENTS.map((s) => word((SEGMENT_PROFILES[s.id].wants[area] as Record<string, number>)[k])),
            ]),
          })),
          {
            title: "Premium app plan and ad messages",
            columns: ["Segment", "Premium app plan", "Messages that resonate"],
            rows: SEGMENTS.map((s) => {
              const p = SEGMENT_PROFILES[s.id];
              return [s.name, p.wants.subscription >= 0.6 ? "Valued" : p.wants.subscription >= 0.2 ? "Some interest" : "Resisted", p.caresAbout.map((c) => CLAIMS[c].name).join(", ")];
            }),
          },
        ],
      };
    case "potential":
      return {
        study,
        title,
        intro: `Expected buyers next round (${nextRound === 7 ? "Final" : "Round " + nextRound}) by segment and region, within about 5%.`,
        tables: [
          {
            title: "Units",
            columns: ["Segment", ...REGIONS.map((r) => r.name), "Growth per round"],
            rows: SEGMENTS.map((s) => [s.name, ...regionIds.map((r) => roundTo(baseDemand(s.id, r, nextRound), 1000).toLocaleString()), pct(SEGMENT_PROFILES[s.id].growthPerRound)]),
          },
        ],
      };
    case "price":
      return {
        study,
        title,
        intro: "What typical buyers expect to pay, and the most almost anyone will pay, by region.",
        tables: [
          {
            title: "Typical price / ceiling",
            columns: ["Segment", ...REGIONS.map((r) => r.name), "Price sensitivity"],
            rows: SEGMENTS.map((s) => [
              s.name,
              ...regionIds.map((r) => `$${roundTo(refPrice(s.id, r), 5)} / $${roundTo(maxPrice(s.id, r), 10)}`),
              SEGMENT_PROFILES[s.id].priceSensitivity >= 2 ? "Very high" : SEGMENT_PROFILES[s.id].priceSensitivity >= 1.3 ? "Medium" : "Low",
            ]),
          },
        ],
      };
    case "media":
      return {
        study,
        title,
        intro: "Where each segment shops, and which media reach it best (1.0 = average).",
        tables: [
          {
            title: "Where buyers shop (share of segment)",
            columns: ["Channel", ...SEGMENTS.map((s) => s.name)],
            rows: CHANNELS.map((c) => [c.name, ...SEGMENTS.map((s) => pct(roundTo(SEGMENT_PROFILES[s.id].channelMix[c.id] ?? 0, 0.05)))]),
          },
          {
            title: "Media reach",
            columns: ["Medium", ...SEGMENTS.map((s) => s.name)],
            rows: (["digital", "search", "traditional"] as const).map((m) => [m === "digital" ? "Digital & social" : m === "search" ? "Search" : "Traditional", ...SEGMENTS.map((s) => SEGMENT_PROFILES[s.id].mediaReach[m].toFixed(1))]),
          },
        ],
      };
    case "awareness": {
      const fs = ctx.latest?.state.firms[ctx.firmId];
      const rows: (string | number)[][] = [];
      if (fs)
        for (const ps of Object.values(fs.products))
          for (const r of regionIds) {
            const aw = fs.awareness[ps.spec.id]?.[r];
            if (!aw) continue;
            rows.push([ps.spec.name, REGIONS.find((x) => x.id === r)!.name, ...SEGMENTS.map((s) => pct(aw[s.id] ?? 0))]);
          }
      return { study, title, intro: "Share of buyers who know each of your products, after last round.", tables: [{ title: "Awareness", columns: ["Product", "Region", ...SEGMENTS.map((s) => s.name)], rows: rows.length ? rows : [["No products on the market yet", "", "", "", "", "", ""]] }] };
    }
    case "satisfaction": {
      const latest = ctx.latest;
      const rows: (string | number)[][] = [];
      if (latest) {
        const fs = latest.state.firms[ctx.firmId];
        for (const ps of Object.values(fs?.products ?? {})) if (fs.satisfaction[ps.spec.id] !== undefined) rows.push([ps.spec.name, pct(fs.satisfaction[ps.spec.id])]);
        const all = Object.values(latest.state.firms).flatMap((f) => Object.values(f.satisfaction));
        if (all.length) rows.push(["Industry average", pct(all.reduce((a, b) => a + b, 0) / all.length)]);
      }
      return { study, title, intro: "Buyer satisfaction after purchase. It drives repeat buying and word of mouth. Fit, fair prices, honest ads and staying in stock all help.", tables: [{ title: "Satisfaction", columns: ["Product", "Satisfaction"], rows: rows.length ? rows : [["No sales yet", ""]] }] };
    }
    case "competitors": {
      const latest = ctx.latest;
      const tables: ReportTable[] = [];
      if (latest && latest.round >= 1) {
        tables.push({
          title: `Products and prices (${latest.round === 7 ? "Final" : "Round " + latest.round})`,
          columns: ["Firm", "Product", "Tier", "Form", "Chip", "Region", "Price"],
          rows: ctx.firms.flatMap((f) => {
            const fs = latest.state.firms[f.id];
            return (latest.market.pricesByFirm[f.id] ?? []).map((p) => {
              const spec = fs.products[p.productId]?.spec;
              return [f.name, p.name, p.tier, spec ? COMPONENTS.form.options[spec.form].name : "", spec ? COMPONENTS.chip.options[spec.chip].name : "", REGIONS.find((r) => r.id === p.region)!.name, `$${p.price.toFixed(2)}`];
            });
          }),
        });
        const totals: Record<string, number> = {};
        for (const u of Object.values(latest.market.unitsByFirmSegment)) for (const [s, n] of Object.entries(u)) totals[s] = (totals[s] ?? 0) + (n ?? 0);
        tables.push({
          title: "Share of units sold by segment",
          columns: ["Firm", ...SEGMENTS.map((s) => s.name)],
          rows: ctx.firms.map((f) => [f.name, ...SEGMENTS.map((s) => pct(totals[s.id] ? (latest.market.unitsByFirmSegment[f.id]?.[s.id] ?? 0) / totals[s.id] : 0))]),
        });
        tables.push({
          title: "Estimated promotion spending",
          columns: ["Firm", "Promotion"],
          rows: ctx.firms.map((f) => [f.name, `$${roundTo(latest.reports[f.id]?.pnl.promotion ?? 0, 25_000).toLocaleString()}`]),
        });
      } else tables.push({ title: "No market data yet", columns: ["Note"], rows: [["Competitors have not launched yet. Buy this study after round 1 for prices and shares."]] });
      return { study, title, intro: "What your rivals sell, at what price, and how much of each segment they won last round.", tables };
    }
    case "partners": {
      const fs = ctx.latest?.state.firms[ctx.firmId];
      return {
        study,
        title,
        intro: `Partners keep a margin from the retail price. As your volume in a channel and region passes ${LEVERAGE.tiers.map((t) => t.toLocaleString()).join(", ")} units, you can negotiate ${Math.round(LEVERAGE.cutPerTier * 100)} points off per tier (up to ${Math.round(LEVERAGE.maxCut * 100)}).`,
        tables: [
          {
            title: "Starting terms",
            columns: ["Channel", "Partner margin", "Reach", "One-time setup fee"],
            rows: CHANNELS.map((c) => [c.name, c.id === "online" ? `0% (you pay ${pct(CHANNEL_TERMS.online.fulfillmentCost ?? 0)} fulfillment)` : pct(CHANNEL_TERMS[c.id].margin), pct(CHANNEL_TERMS[c.id].coverage), `$${CHANNEL_TERMS[c.id].setupFee.toLocaleString()}`]),
          },
          {
            title: "Your volume and current margin",
            columns: ["Region", "Channel", "Units to date", "Margin cut", "Margin now"],
            rows: fs
              ? regionIds.flatMap((r) =>
                  (fs.channelsOpen[r] ?? []).map((ch) => [REGIONS.find((x) => x.id === r)!.name, CHANNELS.find((c) => c.id === ch)!.name, Math.round(fs.channelUnits[r]?.[ch] ?? 0).toLocaleString(), pct(marginCut(fs.channelUnits[r]?.[ch] ?? 0)), pct(channelMargin(fs, r, ch))]),
                )
              : [],
          },
        ],
      };
    }
  }
  void segName;
  return { study, title, intro: "", tables: [] };
}
