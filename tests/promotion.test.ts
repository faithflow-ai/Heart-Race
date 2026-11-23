import { describe, expect, it } from "vitest";
import { normalizeDecision, newProduct, cellPromo } from "../src/sim/product";
import { proForma } from "../src/sim/proforma";
import { describeChange } from "../src/sim/describe";
import { runRound, makeAiFirms } from "../src/sim/run";
import { CHANNEL_TERMS, ENTRY_MODES, FINANCE } from "../src/sim/config";
import type { RoundResult } from "../src/sim/types";

describe("promotion in dollars per medium", () => {
  it("converts an old promotion total using the old media mix", () => {
    const d = normalizeDecision({
      mediaMix: { digital: 50, search: 20, traditional: 10, trade: 20 },
      plan: { p1: { na: { price: 100, promotion: 100_000, production: 0, forecast: 0 } } },
    } as never);
    const pl = d.plan.p1!.na!;
    expect(pl.media).toEqual({ digital: 50_000, search: 20_000, traditional: 10_000, trade: 20_000 });
    expect(pl.promotion).toBe(100_000);
    expect(cellPromo(pl)).toBe(100_000);
    expect("mediaMix" in d).toBe(false);
  });

  it("splits an old total evenly when there was no mix", () => {
    const d = normalizeDecision({ plan: { p1: { eu: { price: 100, promotion: 40_000, production: 0, forecast: 0 } } } } as never);
    expect(d.plan.p1!.eu!.media).toEqual({ digital: 10_000, search: 10_000, traditional: 10_000, trade: 10_000 });
  });

  it("gives every product a campaign", () => {
    const d = normalizeDecision({ products: [{ ...newProduct("p1", 1), campaign: undefined }] } as never);
    expect(d.products[0].campaign).toEqual({ message: "", tone: "", segment: "" });
  });

  it("reports what promotion bought and keeps awareness in range", () => {
    const firms = makeAiFirms(8, 0);
    let prev: RoundResult | null = null;
    for (let r = 0; r <= 2; r++) prev = runRound({ round: r, seed: 7, firms, prevResult: prev, studentDecisions: {} });
    const promo = Object.values(prev!.reports).flatMap((rep) => rep.promo ?? []);
    expect(promo.length).toBeGreaterThan(0);
    for (const p of promo)
      for (const s of Object.values(p.segments)) {
        if (!s) continue;
        expect(s.after).toBeGreaterThanOrEqual(0);
        expect(s.after).toBeLessThanOrEqual(1);
      }
  });

  it("describes media and campaign edits in plain language", () => {
    expect(describeChange("plan.p1.na.media.trade", 0, 50_000, { p1: "Pulse One" })).toMatch(/Trade promotion.*Pulse One.*North America/);
    expect(describeChange("products.#p1.campaign.tone", "", "caring", { p1: "Pulse One" })).toMatch(/tone/i);
  });
});

describe("pro forma profit and loss", () => {
  it("adds up from the team's own forecast", () => {
    const p = { ...newProduct("p1", 1), commission: true };
    const d = normalizeDecision({
      products: [p],
      regions: { na: { enter: true, entryMode: "distributor", channels: ["online", "mass"] } },
      plan: { p1: { na: { price: 100, production: 10_000, forecast: 8_000, media: { digital: 50_000, search: 0, traditional: 0, trade: 50_000 } } } },
      research: [],
    } as never);
    const pf = proForma({ round: 1, decision: d, unitCost: { p1: 40 }, sellable: ["p1"], regionsEntered: {}, channelsOpen: {}, committed: ["p1"], capital: 3_000_000, marketingAvailable: 500_000, capacity: 70_000 });
    const line = (k: string) => pf.lines.find((l) => l.key === k)!.value;
    expect(line("grossSales")).toBe(800_000);
    const mass = CHANNEL_TERMS.mass.margin + ENTRY_MODES.distributor.extraMargin;
    const online = CHANNEL_TERMS.online.fulfillmentCost ?? 0;
    expect(line("partnerMargin")).toBe(-Math.round(400_000 * mass + 400_000 * online));
    expect(line("cogs")).toBe(-400_000);
    expect(line("promotion")).toBe(-100_000);
    expect(line("entry")).toBe(-(ENTRY_MODES.distributor.fee + CHANNEL_TERMS.online.setupFee + CHANNEL_TERMS.mass.setupFee));
    expect(line("fixed")).toBeLessThanOrEqual(-(FINANCE.overheadPerRound + FINANCE.overheadPerRegion));
    const costs = ["cogs", "holding", "promotion", "research", "devFees", "entry", "expansion", "fixed"].reduce((a, k) => a + line(k), 0);
    expect(Math.abs(line("revenue") + costs - pf.operatingProfit)).toBeLessThanOrEqual(3);
    expect(line("grossSales") + line("partnerMargin")).toBe(line("revenue"));
    expect(pf.marketingEnd).toBe(400_000);
  });
});

describe("campaign edits after a product is accepted", () => {
  it("use the latest campaign from the decision", () => {
    const firms = makeAiFirms(8, 0);
    let prev: RoundResult | null = null;
    for (let r = 0; r <= 2; r++) prev = runRound({ round: r, seed: 3, firms, prevResult: prev, studentDecisions: {} });
    for (const rep of Object.values(prev!.reports)) for (const p of rep.promo ?? []) expect(p.campaignSegment).not.toBe("");
  });
});
