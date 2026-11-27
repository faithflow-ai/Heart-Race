/**
 * Pro forma (projected) profit and loss built only from a team's own decisions:
 * its forecast, prices, production, promotion and fees. It does not predict the market;
 * it shows what the plan adds up to if the forecast comes true.
 */
import { CHANNEL_TERMS, ENTRY_MODES, FINANCE, PRODUCTION, STUDIES, type ChannelId, type RegionId } from "./config";
import { cellPromo, quote, regionIds } from "./product";
import type { FirmDecision } from "./types";

export interface ProFormaInput {
  round: number;
  decision: FirmDecision;
  /** Unit cost now for each accepted product. */
  unitCost: Record<string, number>;
  /** Products on the market this round (accepted earlier, not retired). */
  sellable: string[];
  /** Regions already entered, with entry mode. */
  regionsEntered: Partial<Record<RegionId, keyof typeof ENTRY_MODES>>;
  /** Channels already open, by region (no setup fee for these). */
  channelsOpen?: Partial<Record<RegionId, ChannelId[]>>;
  /** Accepted products (no development fee for these). */
  committed: string[];
  capital: number;
  marketingAvailable: number;
  capacity: number;
  /** HQ emergency loan outstanding (interest is charged this round). */
  loan?: number;
  inventory?: Record<string, Partial<Record<RegionId, number>>>;
}

export interface ProForma {
  lines: { key: string; label: string; value: number }[];
  revenue: number;
  operatingProfit: number;
  capitalEnd: number;
  marketingEnd: number;
  units: number;
}

export function proForma(x: ProFormaInput): ProForma {
  const d = x.decision;
  const round = x.round;
  let gross = 0;
  let partner = 0;
  let fulfillment = 0;
  let cogs = 0;
  let holding = 0;
  let units = 0;
  let promotion = 0;
  const regionsActive = regionIds.filter((r) => (x.regionsEntered[r] && !d.regions[r]?.exit) || (!x.regionsEntered[r] && d.regions[r]?.enter));
  for (const pid of x.sellable) {
    const uc = x.unitCost[pid] ?? 0;
    for (const r of regionsActive) {
      const pl = d.plan[pid]?.[r];
      if (!pl) continue;
      const chans = d.regions[r]?.channels ?? [];
      const stock = (x.inventory?.[pid]?.[r] ?? 0) + Math.max(0, pl.production || 0);
      const sold = Math.min(Math.max(0, pl.forecast || 0), stock);
      const g = sold * Math.max(0, pl.price || 0);
      units += sold;
      gross += g;
      // Assume sales split evenly across the region's chosen channels.
      const mode = x.regionsEntered[r] ?? d.regions[r]?.entryMode ?? "distributor";
      if (chans.length) {
        for (const ch of chans) {
          const m = CHANNEL_TERMS[ch].margin > 0 ? CHANNEL_TERMS[ch].margin + ENTRY_MODES[mode].extraMargin : 0;
          partner += (g / chans.length) * m;
          fulfillment += (g / chans.length) * (CHANNEL_TERMS[ch].fulfillmentCost ?? 0);
        }
      }
      cogs += Math.max(0, pl.production || 0) * uc;
      holding += Math.max(0, stock - sold) * uc * PRODUCTION.holdingCostRate;
      if (round >= 1) promotion += cellPromo(pl);
    }
  }
  const research = d.research.reduce((a, s) => a + (STUDIES[s]?.cost ?? 0), 0);
  const devFees = d.products.filter((p) => p.commission && !x.committed.includes(p.id)).reduce((a, p) => a + quote(p, round).devFee, 0);
  let entryFees = 0;
  let channelSetup = 0;
  if (round >= 1)
    for (const r of regionIds) {
      const rd = d.regions[r];
      const had = x.regionsEntered[r];
      if (rd?.exit && had) {
        entryFees += ENTRY_MODES[had].fee * FINANCE.exitFeeShare;
        continue;
      }
      if (rd?.enter && !had) entryFees += ENTRY_MODES[rd.entryMode].fee;
      if (rd?.enter || had) for (const ch of rd?.channels ?? []) if (!(x.channelsOpen?.[r] ?? []).includes(ch)) channelSetup += CHANNEL_TERMS[ch].setupFee;
    }
  const expansion = round >= 1 ? d.capacityExpansion * PRODUCTION.expansionCostPerUnit : 0;
  const overhead = round >= 1 ? FINANCE.overheadPerRound + FINANCE.overheadPerRegion * regionsActive.length : 0;
  const capacityFixed = round >= 1 ? x.capacity * PRODUCTION.fixedCostPerCapacityUnit : 0;
  const interest = round >= 1 ? (x.loan ?? 0) * FINANCE.loanInterestPerRound : 0;
  const revenue = gross - partner - fulfillment;
  const operatingProfit = revenue - cogs - holding - capacityFixed - overhead - interest - promotion - research - devFees - entryFees - channelSetup - expansion;
  const capitalEnd = x.capital - devFees - entryFees - channelSetup - expansion + revenue - cogs - holding - capacityFixed - overhead - interest;
  const r0 = (n: number) => Math.round(n);
  return {
    lines: [
      { key: "grossSales", label: "Sales at list price (forecast × price)", value: r0(gross) },
      { key: "partnerMargin", label: "Partner margins and fulfillment", value: -r0(partner + fulfillment) },
      { key: "revenue", label: "Net revenue", value: r0(revenue) },
      { key: "cogs", label: "Cost of units produced", value: -r0(cogs) },
      { key: "holding", label: "Holding cost of unsold units", value: -r0(holding) },
      { key: "promotion", label: "Promotion", value: -r0(promotion) },
      { key: "research", label: "Research", value: -r0(research) },
      { key: "devFees", label: "Engineering development fees", value: -r0(devFees) },
      { key: "entry", label: "Region entry, exit and channel setup", value: -r0(entryFees + channelSetup) },
      { key: "expansion", label: "Capacity expansion", value: -r0(expansion) },
      { key: "fixed", label: interest > 0 ? "Overhead, factory fixed cost and loan interest" : "Overhead and factory fixed cost", value: -r0(overhead + capacityFixed + interest) },
      { key: "operatingProfit", label: "Projected operating profit", value: r0(operatingProfit) },
    ],
    revenue: r0(revenue),
    operatingProfit: r0(operatingProfit),
    capitalEnd: r0(capitalEnd),
    marketingEnd: r0(x.marketingAvailable - research - promotion),
    units: r0(units),
  };
}
