"use client";
import { Fragment, use, useCallback, useEffect, useState } from "react";
import { api, money } from "@/components/client";
import { TeamBadge, teamColor } from "@/components/team";
import { ROUNDS } from "@/sim/config";
import type { DebriefRound, DebriefSeason } from "@/lib/debrief";
import { DEBRIEF_QUESTIONS } from "@/lib/debrief-questions";

interface Firm { id: string; name: string; isAi: boolean; slot: number; color: string | null }
interface Data { game: { id: string; name: string }; scored: number[]; firms: Firm[]; round: DebriefRound | null; season: DebriefSeason | null }

const pct = (x: number | null | undefined, d = 0) => (x === null || x === undefined ? "–" : `${(x * 100).toFixed(d)}%`);
const n0 = (x: number) => Math.round(x).toLocaleString();

export default function Debrief({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [round, setRound] = useState<number | null>(null);
  const [slide, setSlide] = useState(0);
  const [showAi, setShowAi] = useState(true);
  const [showQ, setShowQ] = useState(true);

  useEffect(() => {
    api<Data>(`/api/games/${id}/debrief${round !== null ? `?round=${round}` : ""}`).then((x) => { setD(x); setErr(""); }).catch((e) => setErr(e.message));
  }, [id, round]);

  const slides = d?.round ? buildSlides(d) : [];
  const go = useCallback((delta: number) => setSlide((s) => Math.max(0, Math.min(slides.length - 1, s + delta))), [slides.length]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "SELECT") return;
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") { e.preventDefault(); go(1); }
      if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); go(-1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  if (err) return <div className="notice bad">{err}</div>;
  if (!d) return <p className="muted">Loading…</p>;
  if (!d.round)
    return (
      <>
        <Header id={id} name={d.game.name} />
        <div className="panel"><p className="muted" style={{ margin: 0 }}>Nothing to debrief yet. The debrief opens after Round 1 is scored (the Practice round isn&apos;t scored).</p></div>
      </>
    );

  const firm = (fid: string) => d.firms.find((f) => f.id === fid);
  const keep = (fid: string) => showAi || !firm(fid)?.isAi;
  const s = slides[Math.min(slide, slides.length - 1)];
  const ctx: Ctx = { d, r: d.round, firm, keep };

  return (
    <div className="deck-wrap">
      <Header id={id} name={d.game.name} />
      <div className="row deck-controls">
        <label className="inline">Round:
          <select value={d.round.round} onChange={(e) => { setRound(Number(e.target.value)); setSlide(0); }}>
            {d.scored.map((r) => <option key={r} value={r}>{ROUNDS.names[r]}</option>)}
          </select>
        </label>
        <label className="inline"><input type="checkbox" checked={showAi} onChange={(e) => setShowAi(e.target.checked)} style={{ width: "auto" }} /> Show AI rivals</label>
        <label className="inline"><input type="checkbox" checked={showQ} onChange={(e) => setShowQ(e.target.checked)} style={{ width: "auto" }} /> Show discussion questions</label>
        <span className="spacer" />
        <button onClick={() => { const el = document.querySelector(".deck") as HTMLElement | null; if (document.fullscreenElement) document.exitFullscreen(); else el?.requestFullscreen?.(); }}>Full screen</button>
      </div>
      <div className="deck-dots">
        {slides.map((x, i) => <button key={x.id} className={i === slide ? "active" : ""} onClick={() => setSlide(i)}>{x.title}</button>)}
      </div>
      <div className="deck">
        <div className="deck-head">
          <span className="deck-kicker">{d.round.name} debrief · {d.game.name}</span>
          <h2>{s.title}</h2>
        </div>
        <div className="deck-body">{s.render(ctx)}</div>
        {showQ && DEBRIEF_QUESTIONS[s.id] && (
          <div className="deck-q">
            <b>Talk about it</b>
            <ul>{DEBRIEF_QUESTIONS[s.id].map((q) => <li key={q}>{q}</li>)}</ul>
          </div>
        )}
        <div className="deck-nav">
          <button disabled={slide === 0} onClick={() => go(-1)}>← Previous</button>
          <span className="muted">{slide + 1} of {slides.length}</span>
          <button className="primary" disabled={slide >= slides.length - 1} onClick={() => go(1)}>Next: {slides[slide + 1]?.title ?? "end"} →</button>
        </div>
      </div>
      <p className="small muted">Use the arrow keys or the buttons to move between slides. Everything here comes from the scored results. It describes what happened and never tells teams what to do.</p>
    </div>
  );
}

function Header({ id, name }: { id: string; name: string }) {
  return (
    <div className="row" style={{ marginBottom: 8 }}>
      <h1 style={{ margin: 0 }}>Debrief</h1>
      <span className="muted">{name}</span>
      <span className="spacer" />
      <a href={`/admin/${id}`}>← Class screen</a>
    </div>
  );
}

interface Ctx { d: Data; r: DebriefRound; firm: (id: string) => Firm | undefined; keep: (id: string) => boolean }
interface Slide { id: string; title: string; render: (c: Ctx) => React.ReactNode }

function buildSlides(d: Data): Slide[] {
  const out: Slide[] = [
    { id: "overview", title: "The market this round", render: Overview },
    { id: "leaderboard", title: "Leaderboard", render: Leaderboard },
    { id: "segments", title: "Who won each segment", render: Segments },
    ...(d.round?.launch?.length ? [{ id: "launch", title: "How a rival launched", render: Launch }] : []),
    { id: "pushPull", title: "Push and pull", render: PushPull },
    { id: "supply", title: "Forecast vs. reality", render: Supply },
    { id: "goals", title: "Goals vs. actual", render: Goals },
    { id: "moments", title: "Notable moments", render: Moments },
  ];
  if ((d.season?.rounds.length ?? 0) >= 2) out.push({ id: "season", title: "Season so far", render: Season });
  return out;
}

function Name({ c, id }: { c: Ctx; id: string }) {
  const f = c.firm(id);
  if (!f) return <>–</>;
  return <span className="row" style={{ gap: 8, display: "inline-flex", flexWrap: "nowrap", whiteSpace: "nowrap" }}><TeamBadge name={f.name} color={teamColor(f.color, f.slot, f.isAi)} size={26} /> {f.name}{f.isAi && <span className="badge">AI</span>}</span>;
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  return <div className="deck-bar"><span style={{ width: `${max > 0 ? Math.max(1, (value / max) * 100) : 0}%`, background: color }} /></div>;
}

function Overview(c: Ctx) {
  const m = c.r.market;
  return (
    <div className="grid4 deck-stats">
      <div className="stat"><div className="k">Buyers in the market</div><div className="v">{n0(m.buyers)}</div></div>
      <div className="stat"><div className="k">Units sold</div><div className="v">{n0(m.unitsSold)}</div><div className="s">{pct(m.buyers > 0 ? m.unitsSold / m.buyers : null)} of buyers bought</div></div>
      <div className="stat"><div className="k">Average price paid</div><div className="v">{money(m.avgPrice)}</div></div>
      <div className="stat"><div className="k">Industry revenue</div><div className="v">{money(m.revenue, true)}</div><div className="s">after partner margins</div></div>
    </div>
  );
}

function Leaderboard(c: Ctx) {
  const rows = c.r.leaderboard.filter((x) => c.keep(x.id));
  const max = Math.max(...rows.map((x) => x.total), 1);
  return (
    <table className="deck-table">
      <thead><tr><th>#</th><th>Firm</th><th>Total score</th><th className="num">Change</th><th className="num">Revenue</th><th className="num">Op. profit</th></tr></thead>
      <tbody>
        {rows.map((x) => {
          const f = c.firm(x.id);
          const move = x.prevRank === null ? null : x.prevRank - x.rank;
          return (
            <tr key={x.id}>
              <td>{x.rank}</td>
              <td><Name c={c} id={x.id} /></td>
              <td style={{ minWidth: 220 }}><div className="row" style={{ gap: 8 }}><Bar value={x.total} max={max} color={teamColor(f?.color, f?.slot, !!f?.isAi)} /><b>{x.total.toFixed(1)}</b></div></td>
              <td className="num">{move === null ? <span className="muted">–</span> : move > 0 ? <span style={{ color: "var(--good)" }}>▲ {move}</span> : move < 0 ? <span style={{ color: "var(--bad)" }}>▼ {-move}</span> : <span className="muted">same</span>}</td>
              <td className="num">{money(x.revenue, true)}</td>
              <td className="num" style={{ color: x.profit < 0 ? "var(--bad)" : undefined }}>{money(x.profit, true)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Segments(c: Ctx) {
  return (
    <table className="deck-table">
      <thead><tr><th>Segment</th><th className="num">Buyers</th><th>Top firms by share of units sold</th><th>Most left on the table</th></tr></thead>
      <tbody>
        {c.r.segments.map((s) => {
          const leaders = s.leaders.filter((l) => c.keep(l.id));
          return (
            <tr key={s.id}>
              <td><b>{s.name}</b></td>
              <td className="num">{n0(s.buyers)}</td>
              <td>{leaders.length ? leaders.map((l) => <div key={l.id}><Name c={c} id={l.id} /> <b>{pct(l.share)}</b></div>) : <span className="muted">No sales</span>}</td>
              <td>{s.biggestGap && c.keep(s.biggestGap.id) ? <><Name c={c} id={s.biggestGap.id} /><div className="small muted">could have won {pct(s.biggestGap.potential)}, won {pct(s.biggestGap.actual)}</div></> : <span className="muted">–</span>}</td>
            </tr>
          );
        })}
      </tbody>
      <tfoot><tr><td colSpan={4} className="small muted">&quot;Could have won&quot; is the share buyers wanted to buy from that firm. The difference was lost to stockouts, missing stores or rivals.</td></tr></tfoot>
    </table>
  );
}

/** Round 1: the strongest AI rival's launch choices next to each student team's. Describes, never prescribes. */
function Launch(c: Ctx) {
  const rows = c.r.launch ?? [];
  const list = (xs: string[]) => (xs.length ? xs.join(", ") : <span className="muted">None</span>);
  return (
    <>
      <table className="deck-table">
        <thead><tr><th>Firm</th><th>Regions entered</th><th>Channels used</th><th className="num">Product fit with its target segment</th><th>Prices</th><th className="num">Round score</th></tr></thead>
        <tbody>
          {rows.map((x) => (
            <tr key={x.id} style={x.isAi ? { background: "var(--panel-2, #f3f5f9)" } : undefined}>
              <td><Name c={c} id={x.id} /></td>
              <td>{x.regions.length} <span className="small muted">{list(x.regions)}</span></td>
              <td><span className="small">{list(x.channels)}</span></td>
              <td className="num">{x.fit === null ? <span className="muted">No sales</span> : <b>{x.fit}</b>}{x.products > 0 && <div className="small muted">{x.products} product{x.products > 1 ? "s" : ""}</div>}</td>
              <td>{x.priceRange ? <>{x.pricesVary ? "Different by region" : "Same everywhere"}<div className="small muted">{money(x.priceRange[0])}{x.priceRange[1] !== x.priceRange[0] ? ` to ${money(x.priceRange[1])}` : ""}</div></> : <span className="muted">–</span>}</td>
              <td className="num"><b>{x.total.toFixed(1)}</b></td>
            </tr>
          ))}
        </tbody>
        <tfoot><tr><td colSpan={6} className="small muted">The first row is the AI rival with the highest Round 1 score. AI rivals decide from the same kinds of information teams can buy in Research. Fit is 0 to 100, averaged over the regions where each product sold to its target segment.</td></tr></tfoot>
      </table>
    </>
  );
}

function PushPull(c: Ctx) {
  const rows = c.r.pushPull.filter((x) => c.keep(x.id)).sort((a, b) => (b.tradeShare ?? -1) - (a.tradeShare ?? -1));
  return (
    <table className="deck-table">
      <thead><tr><th>Firm</th><th>Promotion split</th><th className="num">Ads (pull)</th><th className="num">Trade (push)</th><th className="num">Channel score</th><th className="num">Customer score</th><th className="num">Awareness</th></tr></thead>
      <tbody>
        {rows.map((x) => (
          <tr key={x.id}>
            <td><Name c={c} id={x.id} /></td>
            <td style={{ minWidth: 200 }}>
              {x.tradeShare === null ? <span className="muted">No promotion</span> : (
                <div className="deck-split" title={`${pct(1 - x.tradeShare)} ads, ${pct(x.tradeShare)} trade`}>
                  <span style={{ width: `${(1 - x.tradeShare) * 100}%`, background: "var(--accent)" }} />
                  <span style={{ width: `${x.tradeShare * 100}%`, background: "var(--navy)" }} />
                </div>
              )}
            </td>
            <td className="num">{money(x.ads, true)}</td>
            <td className="num">{money(x.trade, true)}</td>
            <td className="num">{Math.round(x.channel)}</td>
            <td className="num">{Math.round(x.customer)}</td>
            <td className="num">{x.awareness === null ? "–" : `${Math.round(x.awareness)}%`}</td>
          </tr>
        ))}
      </tbody>
      <tfoot><tr><td colSpan={7} className="small muted"><span style={{ color: "var(--accent)" }}>■</span> ads to buyers (pull) · <span style={{ color: "var(--navy)" }}>■</span> trade promotion to channel partners (push). Scores are 0 to 100 points against the best firm this round. Awareness is in each firm&apos;s target segments.</td></tr></tfoot>
    </table>
  );
}

function Supply(c: Ctx) {
  const rows = c.r.supply.filter((x) => c.keep(x.id)).sort((a, b) => (b.accuracy ?? -1) - (a.accuracy ?? -1));
  return (
    <table className="deck-table">
      <thead><tr><th>Firm</th><th className="num">Forecast</th><th className="num">Made</th><th className="num">Sold</th><th className="num">Missed sales (out of stock)</th><th className="num">Left over</th><th className="num">Forecast accuracy</th></tr></thead>
      <tbody>
        {rows.map((x) => (
          <tr key={x.id}>
            <td><Name c={c} id={x.id} /></td>
            <td className="num">{n0(x.forecast)}</td>
            <td className="num">{n0(x.produced)}</td>
            <td className="num">{n0(x.sold)}</td>
            <td className="num" style={{ color: x.lost >= 500 ? "var(--bad)" : undefined }}>{n0(x.lost)}</td>
            <td className="num" style={{ color: x.leftover >= 1000 ? "var(--warn)" : undefined }}>{n0(x.leftover)}</td>
            <td className="num"><b>{pct(x.accuracy)}</b></td>
          </tr>
        ))}
      </tbody>
      <tfoot><tr><td colSpan={7} className="small muted">Units, all products and regions. Made includes units from overtime.</td></tr></tfoot>
    </table>
  );
}

function Goals(c: Ctx) {
  const fmt = (k: string, v: number | null) => (v === null ? "not set" : k === "revenue" ? money(v, true) : `${v}%`);
  return (
    <table className="deck-table">
      <thead><tr><th>Team</th><th className="num">On target</th><th>Goal → actual</th></tr></thead>
      <tbody>
        {c.r.goals.map((g) => (
          <tr key={g.id}>
            <td><Name c={c} id={g.id} /></td>
            <td className="num"><b>{g.onTarget}</b> of {g.rows.length}</td>
            <td className="small">
              {g.rows.map((row) => (
                <div key={row.key + row.label}>{row.label}: {fmt(row.key, row.goal)} → <b>{fmt(row.key, row.actual)}</b></div>
              ))}
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot><tr><td colSpan={3} className="small muted">On target means within 10% of a revenue goal, or within 2 points of a percent goal. AI rivals don&apos;t set goals.</td></tr></tfoot>
    </table>
  );
}

function Moments(c: Ctx) {
  if (!c.r.moments.length) return <p className="muted">Nothing stood out this round.</p>;
  return <ul className="deck-moments">{c.r.moments.map((m) => <li key={m}>{m}</li>)}</ul>;
}

function Season(c: Ctx) {
  const s = c.d.season!;
  const firms = s.firms.filter((f) => c.keep(f.id));
  const W = 900, H = 320, P = { l: 40, r: 170, t: 12, b: 28 };
  const all = firms.flatMap((f) => f.totals.filter((x): x is number => x !== null));
  const lo = Math.max(0, Math.floor((Math.min(...all, 100) - 5) / 10) * 10), hi = Math.min(100, Math.ceil((Math.max(...all, 0) + 5) / 10) * 10);
  const x = (i: number) => P.l + (s.rounds.length > 1 ? (i / (s.rounds.length - 1)) * (W - P.l - P.r) : 0);
  const y = (v: number) => P.t + (1 - (v - lo) / (hi - lo || 1)) * (H - P.t - P.b);
  // Spread end labels so they don't overlap.
  const ends = firms.map((f) => ({ f, v: f.totals[f.totals.length - 1] ?? 0 })).sort((a, b) => b.v - a.v);
  let lastY = -Infinity;
  const labelY = new Map<string, number>();
  for (const e of ends) { const yy = Math.max(y(e.v), lastY + 17); labelY.set(e.f.id, yy); lastY = yy; }
  return (
    <div className="deck-season">
      <div>
        <div className="small muted" style={{ marginBottom: 4 }}>Total score by round</div>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }} role="img" aria-label="Total score by round for each firm">
          {[lo, (lo + hi) / 2, hi].map((v) => <g key={v}><line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke="var(--line)" /><text x={P.l - 6} y={y(v) + 4} fontSize={13} textAnchor="end" fill="var(--muted)">{Math.round(v)}</text></g>)}
          {s.rounds.map((r, i) => <text key={r} x={x(i)} y={H - 8} fontSize={13} textAnchor="middle" fill="var(--muted)">{ROUNDS.names[r].replace("Round ", "R")}</text>)}
          {firms.map((f) => {
            const fm = c.firm(f.id);
            const col = teamColor(fm?.color, fm?.slot, !!fm?.isAi);
            const pts = f.totals.map((v, i) => (v === null ? null : `${x(i)},${y(v)}`)).filter(Boolean).join(" ");
            const ly = labelY.get(f.id) ?? 0;
            return (
              <g key={f.id}>
                <polyline points={pts} fill="none" stroke={col} strokeWidth={fm?.isAi ? 1.5 : 3} strokeDasharray={fm?.isAi ? "4 3" : undefined} />
                <text x={W - P.r + 8} y={ly + 4} fontSize={14} fill={fm?.isAi ? "var(--muted)" : "var(--ink)"} fontWeight={fm?.isAi ? 400 : 600}>{fm?.name}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <table className="deck-table small">
        <thead><tr><th>Firm</th><th className="num">Rank path</th><th className="num">Revenue</th><th className="num">Profit</th></tr></thead>
        <tbody>
          {[...firms].sort((a, b) => (a.ranks[a.ranks.length - 1] ?? 99) - (b.ranks[b.ranks.length - 1] ?? 99)).map((f) => (
            <Fragment key={f.id}>
              <tr>
                <td><Name c={c} id={f.id} /></td>
                <td className="num" style={{ whiteSpace: "nowrap" }}>{f.ranks.map((r) => r ?? "–").join(" → ")}</td>
                <td className="num">{money(f.revenue, true)}</td>
                <td className="num" style={{ color: f.profit < 0 ? "var(--bad)" : undefined }}>{money(f.profit, true)}</td>
              </tr>
            </Fragment>
          ))}
        </tbody>
        <tfoot><tr><td colSpan={4} className="muted">Revenue and operating profit added up over the scored rounds.</td></tr></tfoot>
      </table>
    </div>
  );
}
