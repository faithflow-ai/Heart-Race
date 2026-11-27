"use client";
import { useEffect, useState } from "react";
import { ROUNDS, SCORECARD_WEIGHTS, type ScoreKey } from "@/sim/config";
import { AXIS_LABELS } from "@/sim/perception";
import type { ClaimId } from "@/sim/config";
import type { FirmReport, ScoreBreakdown } from "@/sim/types";
import { api, money, num, pct } from "./client";
import { Term } from "./Glossary";
import { AI_GREY, TeamBadge, teamColor } from "./team";

const SCORE_LABELS: Record<ScoreKey, string> = { market: "Market", customer: "Customer", financial: "Financial", channel: "Channel", goals: "Goal accuracy" };

/** The card at the top of Results: score, rank change, top win, top concern. */
export function RoundSummary({ roundName, score, prevRank, report }: { roundName: string; score: ScoreBreakdown; prevRank: number | null; report: FirmReport }) {
  const keys = Object.keys(SCORE_LABELS) as ScoreKey[];
  const best = keys.reduce((a, b) => (score.points[b] > score.points[a] ? b : a));
  const concern = report.concerns[0];
  const moved = prevRank !== null ? prevRank - score.rank : 0;
  return (
    <div className="summary-card">
      <div className="eyebrow light">{roundName} scored</div>
      <div className="summary-top">
        <span className="big">{score.total.toFixed(1)}</span>
        <span className="rank">
          Rank {score.rank} of 8
          {prevRank !== null && moved !== 0 && <span className={moved > 0 ? "up" : "down"}>{moved > 0 ? ` ▲ from ${prevRank}` : ` ▼ from ${prevRank}`}</span>}
          {prevRank !== null && moved === 0 && <span className="same"> · same as last round</span>}
        </span>
      </div>
      <div className="summary-row">
        <div><b className="win">Top strength</b><br />{SCORE_LABELS[best]}: {score.points[best].toFixed(0)} points (weight {Math.round(SCORECARD_WEIGHTS[best] * 100)}%)</div>
        <div><b className="worry">Top concern</b><br />{concern ? `${concern.title}. ${concern.detail}` : "None flagged this round."}</div>
        <div><b>Goal accuracy</b><br />{score.points.goals.toFixed(0)} points</div>
      </div>
    </div>
  );
}

/** A small line chart drawn to scale. Your team in pulse red, everyone else grey. */
export function LineChart({ title, labels, series, format, height = 180 }: { title: string; labels: string[]; series: { name: string; values: (number | null)[]; color: string; strong?: boolean }[]; format: (n: number) => string; height?: number }) {
  const W = 520, H = height, L = 52, R = 110, T = 12, B = 26;
  const vals = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  if (!vals.length || labels.length < 1) return null;
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (lo === hi) { lo -= 1; hi += 1; }
  const pad = (hi - lo) * 0.1;
  lo -= pad; hi += pad;
  const x = (i: number) => L + (labels.length === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (labels.length - 1));
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const ticks = [0, 1, 2, 3].map((k) => lo + ((hi - lo) * k) / 3);
  const strong = series.filter((s) => s.strong);
  return (
    <figure className="chart">
      <figcaption>{title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={title}>
        {ticks.map((v, i) => (
          <g key={i}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--line)" />
            <text x={L - 6} y={y(v) + 4} textAnchor="end" className="axis">{format(v)}</text>
          </g>
        ))}
        {labels.map((l, i) => <text key={l} x={x(i)} y={H - 6} textAnchor="middle" className="axis">{l}</text>)}
        {[...series.filter((s) => !s.strong), ...strong].map((s) => {
          const pts = s.values.map((v, i) => (v === null ? null : `${x(i)},${y(v)}`)).filter(Boolean).join(" ");
          const lastI = s.values.map((v, i) => (v === null ? -1 : i)).reduce((a, b) => Math.max(a, b), -1);
          return (
            <g key={s.name}>
              <polyline points={pts} fill="none" stroke={s.color} strokeWidth={s.strong ? 3 : 1.5} strokeLinejoin="round" />
              {lastI >= 0 && <circle cx={x(lastI)} cy={y(s.values[lastI]!)} r={s.strong ? 4.5 : 2.5} fill={s.color} />}
            </g>
          );
        })}
        {strong.map((s, k) => {
          const lastI = s.values.map((v, i) => (v === null ? -1 : i)).reduce((a, b) => Math.max(a, b), -1);
          if (lastI < 0) return null;
          return <text key={s.name} x={W - R + 8} y={y(s.values[lastI]!) + 4 + k * 14} className="axis strong" fill={s.color}>{s.name} {format(s.values[lastI]!)}</text>;
        })}
      </svg>
    </figure>
  );
}

/** Score and money trends across every scored round. */
export function Trends() {
  const [d, setD] = useState<{ firms: { id: string; name: string; isAi: boolean; mine: boolean }[]; points: { round: number; scores: Record<string, number>; revenue: number; profit: number }[] } | null>(null);
  useEffect(() => {
    api("/api/team/trends").then(setD).catch(() => {});
  }, []);
  if (!d || d.points.length < 1) return null;
  const labels = d.points.map((p) => (p.round === ROUNDS.final ? "Final" : `R${p.round}`));
  const me = d.firms.find((f) => f.mine);
  return (
    <div className="panel" id="trends">
      <h2 style={{ marginTop: 0 }}>Round by round</h2>
      <div className="grid2">
        <LineChart
          title="Total score, every firm"
          labels={labels}
          format={(n) => n.toFixed(0)}
          series={d.firms.map((f) => ({ name: f.mine ? f.name : f.name, values: d.points.map((p) => p.scores[f.id] ?? null), color: f.mine ? "var(--pulse)" : "#c2cad6", strong: f.mine }))}
        />
        <LineChart
          title={`${me?.name ?? "Your"} revenue and operating profit`}
          labels={labels}
          format={(n) => money(n, true)}
          series={[
            { name: "Revenue", values: d.points.map((p) => p.revenue), color: "var(--data)", strong: true },
            { name: "Profit", values: d.points.map((p) => p.profit), color: "var(--mint)", strong: true },
          ]}
        />
      </div>
    </div>
  );
}

export interface SegmentPanelData {
  id: string;
  name: string;
  buyers: number;
  unitsSold: number;
  myUnits: number;
  myAvgPrice: number | null;
  firms: { id: string; name: string; isAi: boolean; mine: boolean; actual: number; potential: number }[];
  weighs: { caresAbout: string[]; typicalPrice: number } | null;
}

/** One identical panel per segment: stats, what buyers weigh, actual vs. potential share. */
export function SegmentPanels({ segments, targets, colors, reality }: { segments: SegmentPanelData[]; targets: string[]; colors: Record<string, string>; reality?: React.ReactNode }) {
  const first = segments.find((s) => targets.includes(s.id)) ?? segments[0];
  const [sel, setSel] = useState(first?.id);
  const i = Math.max(0, segments.findIndex((s) => s.id === sel));
  const s = segments[i];
  if (!s) return null;
  const next = segments[(i + 1) % segments.length];
  const max = Math.max(0.01, ...s.firms.map((f) => Math.max(f.actual, f.potential)));
  return (
    <div className="panel" id="segments">
      <div className="row" style={{ alignItems: "baseline" }}>
        <h2 style={{ margin: 0 }}>Segment by segment</h2>
        <span className="spacer" />
        <span className="small muted">Segment {i + 1} of {segments.length} · <a href="#segments" onClick={() => setSel(next.id)}>Next: {next.name} →</a></span>
      </div>
      <div className="segpills" role="tablist">
        {segments.map((x) => (
          <button key={x.id} role="tab" aria-selected={x.id === s.id} className={x.id === s.id ? "on" : ""} onClick={() => setSel(x.id)}>
            {x.name}{targets.includes(x.id) && <span className="chip good" style={{ marginLeft: 6 }}>Target</span>}
          </button>
        ))}
      </div>
      <div className="segpanel">
        <div className="segbox">
          <h3>Segment stats</h3>
          <div className="kv">
            <div>Buyers this round</div><div>{num(s.buyers)}</div>
            <div>Units sold, all firms</div><div>{num(s.unitsSold)}</div>
            <div>Your units</div><div>{num(s.myUnits)}</div>
            <div>Your share</div><div>{pct(s.unitsSold ? s.myUnits / s.unitsSold : 0, 1)}</div>
            <div>Your average price</div><div>{s.myAvgPrice ? money(s.myAvgPrice) : "–"}</div>
          </div>
        </div>
        <div className="segbox">
          <h3>What these buyers weigh</h3>
          {s.weighs ? (
            <>
              <p className="small" style={{ margin: "0 0 6px" }}>Messages that resonate:</p>
              <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>{s.weighs.caresAbout.map((c) => <li key={c}>{c}</li>)}</ul>
              <p className="small">Typical price expected: about {money(s.weighs.typicalPrice)}</p>
              <p className="small muted">From your Customer needs study. The full study, feature by feature, is on <a href="/play/research">Research</a>.</p>
            </>
          ) : (
            <p className="small muted">Buy the Customer needs study on <a href="/play/research">Research</a> to see what this segment cares about.</p>
          )}
        </div>
        <div className="segbox wide">
          <h3>Actual vs. <Term t="potential share">potential share</Term></h3>
          {s.firms.length === 0 ? (
            <p className="small muted">No firm sold to this segment this round.</p>
          ) : (
            <div className="avp">
              {s.firms.map((f) => (
                <div key={f.id} className={`avp-row ${f.mine ? "mine" : ""}`}>
                  <span className="avp-name">{f.name}{f.isAi && <span className="badge" style={{ marginLeft: 4 }}>AI</span>}</span>
                  <span className="avp-bars" aria-label={`${f.name}: actual ${pct(f.actual)}, potential ${pct(f.potential)}`}>
                    <i className="pot" style={{ width: `${(f.potential / max) * 100}%`, background: f.mine ? "#ffd3da" : "#e4e8ef" }} />
                    <i className="act" style={{ width: `${(f.actual / max) * 100}%`, background: f.mine ? "var(--pulse)" : f.isAi ? AI_GREY : colors[f.id] ?? AI_GREY }} />
                  </span>
                  <span className="avp-num">{pct(f.actual)} / {pct(f.potential)}</span>
                </div>
              ))}
              <p className="small muted" style={{ marginBottom: 0 }}>Dark bar: share of units sold. Light bar: share of buyers who wanted the product before any stockouts. The gap is sales left on the table.</p>
            </div>
          )}
        </div>
      </div>
      {reality}
    </div>
  );
}

export interface RealityData {
  x: ClaimId;
  y: ClaimId;
  products: { firm: string; firmName: string; mine: boolean; id: string; name: string; x: number; y: number }[];
  segments: { id: string; name: string; x: number; y: number }[];
}

/** Buyers' view of the market on the team's own two axes, over the dots the team placed. */
export function RealityMap({ data, planned, names, targets }: { data: RealityData; planned: { kind: string; ref: string; x: number; y: number }[]; names: Record<string, string>; targets: string[] }) {
  const W = 520, H = 360, P = 44;
  const sx = (v: number) => P + v * (W - P * 2);
  const sy = (v: number) => H - P - v * (H - P * 2);
  const ax = AXIS_LABELS[data.x], ay = AXIS_LABELS[data.y];
  const mine = data.products.filter((p) => p.mine);
  // Labels go above each red dot; if two would collide, the later one moves below its dot.
  const placed: { x: number; y: number; w: number }[] = [];
  const labelPos = (x: number, y: number, text: string) => {
    const w = text.length * 6.2;
    const hits = (ly: number) => placed.some((p) => Math.abs(p.x - x) < (p.w + w) / 2 + 4 && Math.abs(p.y - ly) < 14);
    let ly = y - 13;
    for (const cand of [y - 13, y + 22, y - 30, y + 38]) { if (!hits(cand)) { ly = cand; break; } }
    placed.push({ x, y: ly, w });
    return ly;
  };
  return (
    <div className="reality">
      <h3 style={{ marginBottom: 4 }}>Reality check: your <Term t="positioning map">positioning map</Term> vs. how buyers see it</h3>
      <p className="small muted" style={{ marginTop: 0 }}>Hollow red rings are where your team placed its products. Solid red dots are where buyers put them after this round. Grey dots are rivals (hover for names).{data.segments.length ? " Numbered areas are where each segment's ideal product sits, from your Customer needs study." : " Buy the Customer needs study to see where each segment's ideal product sits."}</p>
      <div className="reality-grid">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Map of ${ax.name} against ${ay.name}`} className="mapsvg">
          <rect x={P} y={P} width={W - P * 2} height={H - P * 2} fill="none" stroke="var(--line)" />
          <line x1={W / 2} x2={W / 2} y1={P} y2={H - P} stroke="var(--line)" strokeDasharray="3 4" />
          <line y1={H / 2} y2={H / 2} x1={P} x2={W - P} stroke="var(--line)" strokeDasharray="3 4" />
          <text x={W / 2} y={H - 10} textAnchor="middle" className="axis strong">{ax.name} →</text>
          <text x={P} y={H - P + 14} className="axis">{ax.low}</text>
          <text x={W - P} y={H - P + 14} textAnchor="end" className="axis">{ax.high}</text>
          <text x={14} y={H / 2} textAnchor="middle" className="axis strong" transform={`rotate(-90 14 ${H / 2})`}>{ay.name} →</text>
          <text x={P - 6} y={H - P} className="axis" transform={`rotate(-90 ${P - 6} ${H - P})`}>{ay.low}</text>
          <text x={P - 6} y={P} textAnchor="end" className="axis" transform={`rotate(-90 ${P - 6} ${P})`}>{ay.high}</text>
          {data.segments.map((s, i) => (
            <g key={s.id}>
              <circle cx={sx(s.x)} cy={sy(s.y)} r={28} fill={targets.includes(s.id) ? "var(--amber)" : "#8a94a6"} opacity={targets.includes(s.id) ? 0.22 : 0.12} />
              <text x={sx(s.x)} y={sy(s.y) + 4} textAnchor="middle" className="segnum">{i + 1}</text>
              <title>{s.name}: ideal area</title>
            </g>
          ))}
          {data.products.filter((p) => !p.mine).map((p) => (
            <circle key={`${p.firm}-${p.id}`} cx={sx(p.x)} cy={sy(p.y)} r={5} fill="#c2cad6"><title>{p.firmName}: {p.name}</title></circle>
          ))}
          {mine.map((p) => {
            const plan = planned.find((d) => d.kind === "product" && d.ref === p.id);
            return (
              <g key={p.id}>
                {plan && <line x1={sx(plan.x)} y1={sy(plan.y)} x2={sx(p.x)} y2={sy(p.y)} stroke="var(--pulse)" strokeDasharray="4 3" />}
                {plan && <circle cx={sx(plan.x)} cy={sy(plan.y)} r={7} fill="#fff" stroke="var(--pulse)" strokeWidth={2}><title>Where you placed {p.name}</title></circle>}
                <circle cx={sx(p.x)} cy={sy(p.y)} r={7} fill="var(--pulse)"><title>{p.name}: buyers' view</title></circle>
              </g>
            );
          })}
          {mine.map((p) => {
            const name = names[p.id] ?? p.name;
            const ly = labelPos(sx(p.x), sy(p.y), name);
            return <text key={`l-${p.id}`} x={sx(p.x)} y={ly} textAnchor="middle" className="maplabel">{name}</text>;
          })}
        </svg>
        <div className="small">
          <div className="legend-row"><span className="legend-ring" /> Where you placed it</div>
          <div className="legend-row"><span className="legend-dot" style={{ background: "var(--pulse)" }} /> Where buyers put it</div>
          <div className="legend-row"><span className="legend-dot" style={{ background: "#c2cad6" }} /> Rival products</div>
          {data.segments.length > 0 && (
            <>
              <div className="muted" style={{ marginTop: 10, fontWeight: 600 }}>Segment ideal areas</div>
              <ol className="segkey">
                {data.segments.map((s) => (
                  <li key={s.id}>{s.name}{targets.includes(s.id) && <span className="chip good" style={{ marginLeft: 6 }}>Target</span>}</li>
                ))}
              </ol>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export { TeamBadge, teamColor };
