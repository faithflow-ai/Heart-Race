"use client";
import { CHANNELS, REGIONS, ROUNDS, SCORECARD_WEIGHTS, SEGMENTS, type ScoreKey, type SegmentId } from "@/sim/config";
import type { FirmReport, ScoreBreakdown } from "@/sim/types";
import { money, num, pct } from "./client";
import { PromoResults, ProjectedVsActual } from "./PromoResults";
import type { ProForma } from "@/sim/proforma";

const SCORE_LABELS: Record<ScoreKey, string> = { market: "Market", customer: "Customer", financial: "Financial", channel: "Channel", goals: "Goal accuracy" };
const segName = (id: string) => SEGMENTS.find((s) => s.id === id)?.name ?? id;
const regName = (id: string) => REGIONS.find((r) => r.id === id)?.name ?? id;

export interface LeaderRow {
  id: string;
  name: string;
  isAi: boolean;
  mine?: boolean;
  total: number | null;
  rank: number | null;
}

export function ReportView({ round, report, score, leaderboard, names, proforma, targets = [] }: { round: number; report: FirmReport; score: ScoreBreakdown | null; leaderboard?: LeaderRow[]; names: Record<string, string>; proforma?: ProForma | null; targets?: SegmentId[] }) {
  const r = report;
  const pnl = r.pnl;
  const pn = (id: string) => names[id] ?? id;
  return (
    <>
      {r.carriedForward && <div className="notice warn">No changes were made this round, so last round's decisions were carried forward.</div>}
      {r.notes.map((n, i) => (
        <div key={i} className="notice info">{n}</div>
      ))}
      {round === 0 && <div className="panel"><p>The practice round isn't scored and has no sales. Your briefs and research are recorded; products accepted by engineering are ready to sell in Round 1.</p></div>}

      {round >= 1 && score && (
        <div className="grid2">
          <div className="panel">
            <h2 style={{ marginTop: 0 }}>Scorecard</h2>
            <div className="row">
              <div className="stat" style={{ flex: 1 }}><div className="k">Total</div><div className="v">{score.total.toFixed(1)}</div><div className="s">out of 100</div></div>
              <div className="stat" style={{ flex: 1 }}><div className="k">Rank</div><div className="v">{score.rank} of 8</div><div className="s">including AI rivals</div></div>
            </div>
            <table style={{ marginTop: 12 }}>
              <thead><tr><th>Measure</th><th className="num">Weight</th><th className="num">Points</th><th style={{ width: "40%" }}></th></tr></thead>
              <tbody>
                {(Object.keys(SCORE_LABELS) as ScoreKey[]).map((k) => (
                  <tr key={k}>
                    <td>{SCORE_LABELS[k]}</td>
                    <td className="num">{Math.round(SCORECARD_WEIGHTS[k] * 100)}%</td>
                    <td className="num">{score.points[k].toFixed(0)}</td>
                    <td><div className="bar"><div style={{ width: `${score.points[k]}%` }} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="small muted">Points compare you with the best firm this round (100 = best). Total = sum of weight × points.</p>
          </div>
          {leaderboard && (
            <div className="panel">
              <h2 style={{ marginTop: 0 }}>Leaderboard</h2>
              <table>
                <thead><tr><th>#</th><th>Firm</th><th className="num">Score</th></tr></thead>
                <tbody>
                  {leaderboard.map((l) => (
                    <tr key={l.id} className={l.mine ? "mine" : ""}>
                      <td>{l.rank}</td>
                      <td>{l.name} {l.isAi && <span className="badge">AI</span>}</td>
                      <td className="num">{l.total?.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {r.concerns.length > 0 && (
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Top Concerns</h2>
          {r.concerns.map((c, i) => (
            <div key={i} className="notice warn"><b>{c.title}.</b> {c.detail} <i>How to fix: {c.fix}</i></div>
          ))}
        </div>
      )}

      {round >= 1 && (
        <>
          <div className="panel">
            <h2 style={{ marginTop: 0 }}>What changed and why</h2>
            {!r.drivers.length && <p className="muted">No sales in your target segments this round.</p>}
            <table>
              <thead><tr><th>Product</th><th>Target segment</th><th className="num">Share last round</th><th className="num">Share now</th><th>Biggest drivers</th></tr></thead>
              <tbody>
                {r.drivers.map((d, i) => (
                  <tr key={i}>
                    <td>{pn(d.productId)}</td>
                    <td>{segName(d.segment)}</td>
                    <td className="num">{pct(d.sharePrev, 1)}</td>
                    <td className="num">{pct(d.shareNow, 1)}</td>
                    <td className="small">
                      {d.factors.length ? d.factors.slice(0, 3).map((f) => `${f.name} ${f.change > 0 ? "+" : ""}${Math.round(f.change * 100)}%`).join(" · ") : <span className="muted">first round or no change</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="small muted">Share = your units ÷ all units sold in that segment and region, averaged across regions. Drivers compare each part of buyer appeal with last round.</p>
          </div>

          <div className="grid2">
            <div className="panel">
              <h2 style={{ marginTop: 0 }}>Profit and loss</h2>
              <div className="kv">
                <div>Sales at list price</div><div>{money(pnl.grossSales)}</div>
                <div>Partner margins</div><div>-{money(pnl.partnerMargin)}</div>
                <div>Online fulfillment</div><div>-{money(pnl.fulfillment)}</div>
                <div>App subscriptions</div><div>{money(pnl.subscriptionRevenue)}</div>
                <div>Clearance sales</div><div>{money(pnl.clearanceRevenue)}</div>
                <div><b>Revenue</b></div><div><b>{money(pnl.revenue)}</b></div>
                <div>Cost of goods made</div><div>-{money(pnl.cogs)}</div>
                <div>Overtime premium</div><div>-{money(pnl.overtimePremium)}</div>
                <div>Inventory holding</div><div>-{money(pnl.holding)}</div>
                <div>Factory fixed cost</div><div>-{money(pnl.capacityFixed)}</div>
                <div>Promotion</div><div>-{money(pnl.promotion)}</div>
                <div>Research</div><div>-{money(pnl.research)}</div>
                <div>Engineering fees</div><div>-{money(pnl.devFees)}</div>
                <div>Region entry and channel setup</div><div>-{money(pnl.entryFees + pnl.channelSetup)}</div>
                <div>Capacity expansion</div><div>-{money(pnl.expansion)}</div>
                <div>Overhead</div><div>-{money(pnl.overhead)}</div>
                <div><b>Operating profit</b></div><div><b style={{ color: pnl.operatingProfit < 0 ? "var(--bad)" : "var(--good)" }}>{money(pnl.operatingProfit)}</b></div>
              </div>
            </div>
            <div className="panel">
              <h2 style={{ marginTop: 0 }}>Goals vs. actual</h2>
              <table>
                <thead><tr><th>Goal</th><th className="num">Target</th><th className="num">Actual</th></tr></thead>
                <tbody>
                  {r.goals.map((g) => (
                    <tr key={g.key}>
                      <td>{g.label}</td>
                      <td className="num">{g.goal === null || g.goal === undefined ? <span className="muted">not set</span> : g.key === "revenue" ? money(g.goal) : g.goal}</td>
                      <td className="num">{g.key === "revenue" ? money(g.actual) : g.actual}</td>
                    </tr>
                  ))}
                  <tr><td>Sales forecast accuracy</td><td></td><td className="num">{pct(r.forecastAccuracy)}</td></tr>
                </tbody>
              </table>
              <h3>Money and capacity</h3>
              <div className="kv">
                <div>Marketing budget: start → end</div><div>{money(r.budget.start + r.budget.release + r.budget.earned, true)} → {money(r.budget.end, true)}</div>
                <div>Company capital: start → end</div><div>{money(r.capital.start, true)} → {money(r.capital.end, true)}</div>
                <div>Capacity used</div><div>{num(r.capacity.used)} of {num(r.capacity.capacity)}</div>
                <div>Overtime units</div><div>{num(r.capacity.overtime)}</div>
                <div>Capacity next round</div><div>{num(r.capacity.nextRound)}</div>
              </div>
            </div>
          </div>

          {proforma && <ProjectedVsActual pf={proforma} pnl={pnl} />}
          {r.promo && <PromoResults promo={r.promo} names={names} targets={targets} />}

          <div className="panel">
            <h2 style={{ marginTop: 0 }}>Supply: forecast, production and sales</h2>
            <table>
              <thead><tr><th>Product</th><th>Region</th><th className="num">Forecast</th><th className="num">Produced</th><th className="num">Demand</th><th className="num">Sold</th><th className="num">Lost (stockout)</th><th className="num">Left in stock</th></tr></thead>
              <tbody>
                {r.supply.map((s, i) => (
                  <tr key={i}>
                    <td>{pn(s.productId)}</td>
                    <td>{regName(s.region)}</td>
                    <td className="num">{num(s.forecast)}</td>
                    <td className="num">{num(s.produced)}</td>
                    <td className="num">{num(s.demand)}</td>
                    <td className="num">{num(s.sold)}</td>
                    <td className="num">{num(s.lost)}</td>
                    <td className="num">{num(s.endInventory)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid2">
            <div className="panel">
              <h2 style={{ marginTop: 0 }}>By product</h2>
              <table>
                <thead><tr><th>Product</th><th className="num">Units</th><th className="num">Revenue</th><th className="num">Unit cost</th><th className="num">Satisfaction</th></tr></thead>
                <tbody>
                  {Object.entries(r.byProduct).map(([id, p]) => (
                    <tr key={id}><td>{p.name}</td><td className="num">{num(p.units)}</td><td className="num">{money(p.revenue, true)}</td><td className="num">${p.unitCost.toFixed(2)}</td><td className="num">{p.satisfaction ? pct(p.satisfaction) : "–"}</td></tr>
                  ))}
                </tbody>
              </table>
              <h3>By region</h3>
              <table>
                <tbody>
                  {Object.entries(r.byRegion).map(([id, x]) => (
                    <tr key={id}><td>{regName(id)}</td><td className="num">{num(x?.units)} units</td><td className="num">{money(x?.revenue, true)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="panel">
              <h2 style={{ marginTop: 0 }}>By channel</h2>
              <table>
                <thead><tr><th>Channel</th><th className="num">Units</th><th className="num">Net revenue</th><th className="num">Margin paid</th></tr></thead>
                <tbody>
                  {Object.entries(r.byChannel).map(([id, x]) => (
                    <tr key={id}><td>{CHANNELS.find((c) => c.id === id)?.name}</td><td className="num">{num(x?.units)}</td><td className="num">{money(x?.revenue, true)}</td><td className="num">{money(x?.margin, true)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel">
            <h2 style={{ marginTop: 0 }}>Sales and share by segment and region</h2>
            <div className="scroll">
              <table>
                <thead><tr><th>Product</th><th>Segment</th><th>Region</th><th className="num">Price</th><th className="num">Units</th><th className="num">Share</th><th className="num">Fit</th><th className="num">Price appeal</th><th className="num">Awareness</th><th className="num">Reach</th></tr></thead>
                <tbody>
                  {r.rows.filter((x) => x.units >= 1).sort((a, b) => b.units - a.units).map((x, i) => (
                    <tr key={i}>
                      <td>{pn(x.productId)}</td>
                      <td>{segName(x.segment)}</td>
                      <td>{regName(x.region)}</td>
                      <td className="num">${x.price.toFixed(0)}</td>
                      <td className="num">{num(x.units)}</td>
                      <td className="num">{pct(x.share, 1)}</td>
                      <td className="num">{Math.round(x.fit * 100)}</td>
                      <td className="num">{Math.round(Math.min(1, x.priceFactor) * 100)}</td>
                      <td className="num">{pct(x.awareness)}</td>
                      <td className="num">{pct(x.availability)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="small muted">Fit and price appeal are 0-100 ratings from industry reviewers. Reach is the share of the segment's buyers who shop where you sell.</p>
          </div>
        </>
      )}
      <p className="small muted">{ROUNDS.names[round]} results.</p>
    </>
  );
}
