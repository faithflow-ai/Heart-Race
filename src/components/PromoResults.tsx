"use client";
import { CHANNELS, MEDIA, REGIONS, SEGMENTS, type SegmentId } from "@/sim/config";
import type { ProForma } from "@/sim/proforma";
import type { PnL, PromoResult } from "@/sim/types";
import { money, pct } from "./client";

const segName = (id: string) => SEGMENTS.find((s) => s.id === id)?.name ?? id;
const regName = (id: string) => REGIONS.find((r) => r.id === id)?.name ?? id;
const chName = (id: string) => CHANNELS.find((c) => c.id === id)?.name ?? id;
const AD = [
  { id: "digital", name: "Digital & social" },
  { id: "search", name: "Search" },
  { id: "traditional", name: "Traditional media" },
] as const;

function pts(gain: number) {
  return `+${(gain * 100).toFixed(1)}`;
}
function perPoint(spend: number, gain: number) {
  if (spend <= 0) return "";
  if (gain * 100 < 0.05) return "almost no effect";
  return `${money(spend / (gain * 100))}/pt`;
}
function campaignWord(cm: number) {
  return cm >= 1.08 ? "Strong" : cm >= 0.92 ? "OK" : "Weak";
}

/** What each promotion dollar bought: awareness by segment from ads (pull), and partner push from trade promotion. */
export function PromoResults({ promo, names, targets }: { promo: PromoResult[]; names: Record<string, string>; targets: SegmentId[] }) {
  if (!promo.length) return null;
  const order = [...targets, ...SEGMENTS.map((s) => s.id).filter((s) => !targets.includes(s))];
  return (
    <div className="panel">
      <h2 style={{ marginTop: 0 }} id="promotion">Promotion results: what your spending bought</h2>
      <p className="small muted" style={{ marginTop: 0 }}>
        Consumer ads (pull) build awareness, shown in points (1 point = 1% of a segment&apos;s buyers). Cost per point divides what you spent in that medium by the points it added in that one segment, so a medium that reaches a segment well shows a low cost. Trade promotion (push) works through partners: it adds in-store push (buyers in that store meet your brand at the shelf) and wider stocking, but only this round. ★ = your target segments.
      </p>
      {promo.map((p) => {
        const total = MEDIA.reduce((a, m) => a + (p.spend[m.id] ?? 0), 0);
        const chans = Object.entries(p.channels);
        return (
          <div key={p.productId + p.region} style={{ marginBottom: 18 }}>
            <h3 style={{ marginBottom: 4 }}>
              {names[p.productId] ?? p.productId} · {regName(p.region)}
            </h3>
            <p className="small" style={{ marginTop: 0 }}>
              Spent {money(total)}: {MEDIA.map((m) => `${m.name} ${money(p.spend[m.id] ?? 0)}`).join(" · ")}
              {p.campaignSegment ? ` · campaign aimed at ${segName(p.campaignSegment)}` : " · no campaign target set"}
            </p>
            <div className="scroll">
              <table>
                <thead>
                  <tr>
                    <th>Segment</th>
                    <th className="num">Awareness before → after</th>
                    {AD.map((m) => <th key={m.id} className="num">{m.name}</th>)}
                    <th>Campaign fit</th>
                  </tr>
                </thead>
                <tbody>
                  {order.map((s) => {
                    const x = p.segments[s];
                    if (!x) return null;
                    const isT = targets.includes(s);
                    return (
                      <tr key={s} style={isT ? { fontWeight: 600 } : undefined}>
                        <td>{isT ? "★ " : ""}{segName(s)}</td>
                        <td className="num">{pct(x.before)} → {pct(x.after)}</td>
                        {AD.map((m) => (
                          <td key={m.id} className="num small">
                            {(p.spend[m.id] ?? 0) > 0 ? <>{pts(x.byMedium[m.id])} <span className="muted">({perPoint(p.spend[m.id], x.byMedium[m.id])})</span></> : <span className="muted">–</span>}
                          </td>
                        ))}
                        <td className="small">{campaignWord(x.campaign)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {chans.length > 0 && (
              <table style={{ marginTop: 8 }}>
                <thead>
                  <tr><th>Partner channel (trade promotion {money(p.spend.trade ?? 0)})</th><th className="num">In-store push</th><th className="num">Stocking reach without → with trade</th></tr>
                </thead>
                <tbody>
                  {chans.map(([ch, c]) => (
                    <tr key={ch}>
                      <td>{chName(ch)}</td>
                      <td className="num">{c && c.push > 0 ? pct(c.push) : <span className="muted">none</span>}</td>
                      <td className="num">{c ? `${pct(c.reachBase)} → ${pct(c.reachNow)}` : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!chans.length && (p.spend.trade ?? 0) > 0 && <p className="small notice warn">Trade promotion was spent here, but you sell only through your own website in this region, so no partner pushed your brand.</p>}
          </div>
        );
      })}
    </div>
  );
}

/** Projected (pro forma, from the team's own forecast) vs. actual profit and loss. */
export function ProjectedVsActual({ pf, pnl }: { pf: ProForma; pnl: PnL }) {
  const actual: Record<string, number> = {
    grossSales: pnl.grossSales,
    partnerMargin: -(pnl.partnerMargin + pnl.fulfillment),
    revenue: pnl.revenue,
    cogs: -(pnl.cogs + pnl.overtimePremium),
    holding: -pnl.holding,
    promotion: -pnl.promotion,
    research: -pnl.research,
    devFees: -pnl.devFees,
    entry: -(pnl.entryFees + pnl.channelSetup + (pnl.exitFees ?? 0)),
    expansion: -pnl.expansion,
    fixed: -(pnl.overhead + pnl.capacityFixed + (pnl.interest ?? 0)),
    operatingProfit: pnl.operatingProfit,
  };
  return (
    <div className="panel">
      <h2 style={{ marginTop: 0 }} id="projected">Projected vs. actual profit and loss</h2>
      <p className="small muted" style={{ marginTop: 0 }}>Projected = the pro forma built from your own forecast and decisions before the deadline. Actual revenue also includes app subscriptions and clearance sales.</p>
      <table>
        <thead><tr><th></th><th className="num">Projected</th><th className="num">Actual</th><th className="num">Difference</th></tr></thead>
        <tbody>
          {pf.lines.map((l) => {
            const a = actual[l.key] ?? 0;
            const bold = l.key === "revenue" || l.key === "operatingProfit";
            return (
              <tr key={l.key} style={bold ? { fontWeight: 600 } : undefined}>
                <td>{l.label.replace("Projected operating profit", "Operating profit")}</td>
                <td className="num">{money(l.value)}</td>
                <td className="num">{money(a)}</td>
                <td className="num" style={{ color: a - l.value < 0 ? "var(--bad)" : undefined }}>{money(a - l.value)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
