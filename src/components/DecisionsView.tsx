"use client";
import { CHANNELS, CLAIMS, COMPONENTS, ENTRY_MODES, MEDIA, REGIONS, SEGMENTS, SENSORS, STUDIES, type StudyId } from "@/sim/config";
import type { FirmDecision } from "@/sim/types";
import { money, num } from "./client";

const seg = (id: string) => SEGMENTS.find((s) => s.id === id)?.name ?? id;
const reg = (id: string) => REGIONS.find((r) => r.id === id)?.name ?? id;
const ch = (id: string) => CHANNELS.find((c) => c.id === id)?.name ?? id;
const POSTURE: Record<string, string> = { differentiate: "Differentiate on features and design", cost: "Lead on cost and price", niche: "Focus on a niche", follow: "Fast follower" };
const TIER: Record<string, string> = { good: "Good", better: "Better", best: "Best" };
const opt = (key: keyof typeof COMPONENTS, v: string) => (COMPONENTS[key].options as Record<string, { name: string }>)[v]?.name ?? v;

function Text({ v }: { v: string }) {
  return v.trim() ? <span style={{ whiteSpace: "pre-wrap" }}>{v}</span> : <span className="muted">(blank)</span>;
}

/** A team's inputs for one round, as readable tables (read-only). */
export function DecisionsView({ d, round, accepted = {} }: { d: FirmDecision; round: number; accepted?: Record<string, { briefedRound: number; launchRound: number }> }) {
  const status = (p: FirmDecision["products"][number]) => {
    const a = accepted[p.id];
    if (p.retire) return "Retired at this deadline";
    if (a && a.briefedRound < round) return a.launchRound <= round ? "On the market" : "In development";
    if (p.commission || (a && a.briefedRound === round)) return "Quote accepted this round (ready next round)";
    if (p.briefSent) return "Quote received, not accepted";
    return "Draft brief";
  };
  const s = d.strategy;
  const regions = REGIONS.filter((r) => d.regions[r.id]?.enter);
  const planRows = d.products.flatMap((p) => REGIONS.filter((r) => d.plan[p.id]?.[r.id]).map((r) => ({ p, r, pl: d.plan[p.id][r.id] })));
  const goalRows: [string, number | null, (v: number) => string][] = [
    ["Share of target segments", d.goals.share, (v) => `${v}%`],
    ["Revenue", d.goals.revenue, (v) => money(v)],
    ["Operating margin", d.goals.margin, (v) => `${v}%`],
    ["Awareness in targets", d.goals.awareness, (v) => `${v}%`],
    ["Satisfaction", d.goals.satisfaction, (v) => `${v}%`],
  ];
  return (
    <>
      <div className="grid2">
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Strategy</h3>
          <div className="kv" style={{ gridTemplateColumns: "150px 1fr" }}>
            <div className="muted">Company name</div><div style={{ textAlign: "left" }}><Text v={s.companyName} /></div>
            <div className="muted">Mission</div><div style={{ textAlign: "left" }}><Text v={s.mission} /></div>
            <div className="muted">Positioning</div><div style={{ textAlign: "left" }}><Text v={s.positioning} /></div>
            <div className="muted">Posture</div><div style={{ textAlign: "left" }}>{POSTURE[s.posture] ?? <span className="muted">(not chosen)</span>}</div>
            <div className="muted">Target segments</div><div style={{ textAlign: "left" }}>{s.targetSegments.map(seg).join(", ") || <span className="muted">(none)</span>}</div>
            <div className="muted">Target regions</div><div style={{ textAlign: "left" }}>{s.targetRegions.map(reg).join(", ") || <span className="muted">(none)</span>}</div>
          </div>
          <details style={{ marginTop: 8 }}>
            <summary className="small">Team charter</summary>
            <p className="small"><Text v={s.norms} /></p>
          </details>
        </div>
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Goals {round < 1 && <span className="muted small">(open from Round 1)</span>}</h3>
          <table>
            <tbody>
              {goalRows.map(([label, v, f]) => (
                <tr key={label}><td>{label}</td><td className="num">{v === null || v === undefined ? <span className="muted">–</span> : f(v)}</td></tr>
              ))}
            </tbody>
          </table>
          <h3>Research bought</h3>
          <p className="small">{d.research.length ? d.research.map((r) => STUDIES[r as StudyId]?.name ?? r).join(", ") : <span className="muted">None this round</span>}</p>
        </div>
      </div>

      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Products</h3>
        {!d.products.length && <p className="muted">No products.</p>}
        {d.products.length > 0 && (
          <div className="scroll">
            <table>
              <thead>
                <tr><th>Product</th><th>Status this round</th><th>Tier / segment</th><th>Design</th><th>Sensors</th><th>Ad claims</th><th className="num">App plan</th></tr>
              </thead>
              <tbody>
                {d.products.map((p) => (
                  <tr key={p.id}>
                    <td><b>{p.name}</b></td>
                    <td className="small">{status(p)}</td>
                    <td className="small">{TIER[p.tier]} · {seg(p.targetSegment)}</td>
                    <td className="small">{opt("form", p.form)}, {opt("chip", p.chip)} chip, {opt("battery", p.battery)} battery, {opt("display", p.display)} display, {opt("material", p.material)}, {opt("water", p.water)}, {p.privacy === "medical" ? "medical-grade privacy" : "standard privacy"}</td>
                    <td className="small">{p.sensors.map((x) => SENSORS[x]?.name ?? x).join(", ") || "–"}</td>
                    <td className="small">{p.claims.map((c) => CLAIMS[c]?.name ?? c).join(", ") || "–"}</td>
                    <td className="num small">{p.subscriptionPrice ? `$${p.subscriptionPrice}/mo` : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {round >= 1 && (
        <>
          <div className="panel">
            <h3 style={{ marginTop: 0 }}>Regions and channels</h3>
            {!regions.length && <p className="muted">No regions entered.</p>}
            {regions.length > 0 && (
              <table>
                <thead><tr><th>Region</th><th>Entry mode</th><th>Channels</th></tr></thead>
                <tbody>
                  {regions.map((r) => (
                    <tr key={r.id}>
                      <td>{r.name}</td>
                      <td>{ENTRY_MODES[d.regions[r.id].entryMode]?.name}</td>
                      <td className="small">{d.regions[r.id].channels.map(ch).join(", ") || <span className="muted">(none)</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="panel">
            <h3 style={{ marginTop: 0 }}>Price, promotion, forecast and production</h3>
            {!planRows.length && <p className="muted">Nothing planned.</p>}
            {planRows.length > 0 && (
              <div className="scroll">
                <table>
                  <thead><tr><th>Product</th><th>Region</th><th className="num">Price</th><th className="num">Promotion</th><th className="num">Sales forecast</th><th className="num">Production</th></tr></thead>
                  <tbody>
                    {planRows.map(({ p, r, pl }) => (
                      <tr key={p.id + r.id}>
                        <td>{p.name}</td><td>{r.name}</td>
                        <td className="num">{pl.price ? `$${pl.price}` : "–"}</td>
                        <td className="num">{money(pl.promotion)}</td>
                        <td className="num">{num(pl.forecast)}</td>
                        <td className="num">{num(pl.production)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="small" style={{ marginTop: 10 }}>
              <b>Media split:</b> {MEDIA.map((m) => `${m.name} ${d.mediaMix[m.id] ?? 0}%`).join(" · ")}
              {" · "}<b>Capacity added:</b> {d.capacityExpansion ? `${num(d.capacityExpansion)} units` : "none"}
            </p>
          </div>
        </>
      )}

      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Round reflection</h3>
        <p><Text v={d.reflection} /></p>
      </div>
    </>
  );
}
