"use client";
import { useRef, useState } from "react";
import { SEGMENTS, type ClaimId } from "@/sim/config";
import { AXIS_LABELS, MAP_AXES, MAP_REQUIRED_ROUNDS, emptyMap, type PositionDot, type PositionMap } from "@/sim/perception";
import { useTeam } from "./TeamContext";
import { Term } from "./Glossary";

const W = 520, H = 380, P = 44;
const sx = (v: number) => P + v * (W - P * 2);
const sy = (v: number) => H - P - v * (H - P * 2);
const clamp = (v: number) => Math.max(0.02, Math.min(0.98, v));

/** The team's positioning map: pick two axes, then drag products, target segments and rivals into place. */
export function PositionMapEditor() {
  const { team, set } = useTeam();
  const t = team!;
  const round = t.game.round;
  const saved = t.decision.strategy.positionMap ?? emptyMap();
  const [map, setMap] = useState<PositionMap>(saved);
  const [drag, setDrag] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const readOnly = (t.viewAs && !t.tryIt) || round > 7;

  const products = t.decision.products.filter((p) => !p.retire);
  const targets = t.decision.strategy.targetSegments;
  const rivalsPicked = map.dots.filter((d) => d.kind === "rival").map((d) => d.ref);

  function commit(next: PositionMap) {
    setMap(next);
    set("strategy.positionMap", next);
  }
  // Every product and target segment gets a dot; new ones start near the middle, spread out.
  function withDots(m: PositionMap): PositionMap {
    const dots = m.dots.filter((d) => (d.kind === "product" ? products.some((p) => p.id === d.ref) : d.kind === "segment" ? targets.includes(d.ref as never) : true));
    let k = dots.length;
    const add = (kind: PositionDot["kind"], ref: string) => {
      if (dots.some((d) => d.kind === kind && d.ref === ref)) return;
      const a = (k++ * 2.4) % (Math.PI * 2);
      dots.push({ id: `${kind}-${ref}`, kind, ref, x: clamp(0.5 + Math.cos(a) * 0.25), y: clamp(0.5 + Math.sin(a) * 0.25) });
    };
    products.forEach((p) => add("product", p.id));
    targets.forEach((s) => add("segment", s));
    return { ...m, dots };
  }
  const shown = map.x && map.y ? withDots(map) : map;

  function pos(e: React.PointerEvent) {
    const r = svgRef.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const py = ((e.clientY - r.top) / r.height) * H;
    return { x: clamp((px - P) / (W - P * 2)), y: clamp((H - P - py) / (H - P * 2)) };
  }
  function move(e: React.PointerEvent) {
    if (!drag) return;
    const p = pos(e);
    setMap({ ...shown, dots: shown.dots.map((d) => (d.id === drag ? { ...d, ...p } : d)) });
  }
  function end() {
    if (!drag) return;
    setDrag(null);
    commit(map);
  }

  const label = (d: PositionDot) =>
    d.kind === "product" ? products.find((p) => p.id === d.ref)?.name ?? "Product" : d.kind === "segment" ? SEGMENTS.find((s) => s.id === d.ref)?.name ?? d.ref : t.rivals.find((r) => r.id === d.ref)?.name ?? "Rival";
  const required = MAP_REQUIRED_ROUNDS.includes(round);
  const confirmed = map.confirmedRound === round;

  return (
    <div className="panel" id="positioning-map">
      <div className="row" style={{ alignItems: "baseline" }}>
        <h3 style={{ margin: 0 }}><Term t="positioning map">Positioning map</Term></h3>
        <span className="spacer" />
        {required && (confirmed ? <span className="chip good">Confirmed for this round</span> : <span className="chip warn">Required this round</span>)}
      </div>
      <p className="small muted">Pick the two buying criteria that matter most for your targets. Then drag your products, your target segments and up to 3 rivals to where you believe buyers see them. After each round, Results shows where buyers actually put you.</p>
      <div className="grid2">
        <div>
          <label htmlFor="map-x">Across (left to right)</label>
          <select id="map-x" value={map.x} disabled={readOnly} onChange={(e) => commit(withDots({ ...map, x: e.target.value as ClaimId }))}>
            <option value="">Choose…</option>
            {MAP_AXES.filter((a) => a !== map.y).map((a) => <option key={a} value={a}>{AXIS_LABELS[a].name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="map-y">Up (bottom to top)</label>
          <select id="map-y" value={map.y} disabled={readOnly} onChange={(e) => commit(withDots({ ...map, y: e.target.value as ClaimId }))}>
            <option value="">Choose…</option>
            {MAP_AXES.filter((a) => a !== map.x).map((a) => <option key={a} value={a}>{AXIS_LABELS[a].name}</option>)}
          </select>
        </div>
      </div>
      <label htmlFor="map-why">Why these two? (one line)</label>
      <input id="map-why" type="text" value={map.why} disabled={readOnly} onChange={(e) => setMap({ ...map, why: e.target.value })} onBlur={() => commit(map)} placeholder="Our target buyers choose mostly on…" />

      {map.x && map.y ? (
        <>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            width="100%"
            className={`mapsvg editable ${readOnly ? "" : "can-drag"}`}
            onPointerMove={move}
            onPointerUp={end}
            onPointerLeave={end}
            role="application"
            aria-label="Positioning map. Drag the dots to place them."
          >
            <rect x={P} y={P} width={W - P * 2} height={H - P * 2} fill="var(--panel)" stroke="var(--line)" />
            <line x1={W / 2} x2={W / 2} y1={P} y2={H - P} stroke="var(--line)" strokeDasharray="3 4" />
            <line y1={H / 2} y2={H / 2} x1={P} x2={W - P} stroke="var(--line)" strokeDasharray="3 4" />
            <text x={W / 2} y={H - 10} textAnchor="middle" className="axis strong">{AXIS_LABELS[map.x].name} →</text>
            <text x={P} y={H - P + 14} className="axis">{AXIS_LABELS[map.x].low}</text>
            <text x={W - P} y={H - P + 14} textAnchor="end" className="axis">{AXIS_LABELS[map.x].high}</text>
            <text x={14} y={H / 2} textAnchor="middle" className="axis strong" transform={`rotate(-90 14 ${H / 2})`}>{AXIS_LABELS[map.y].name} →</text>
            <text x={P - 6} y={H - P} className="axis" transform={`rotate(-90 ${P - 6} ${H - P})`}>{AXIS_LABELS[map.y].low}</text>
            <text x={P - 6} y={P} textAnchor="end" className="axis" transform={`rotate(-90 ${P - 6} ${P})`}>{AXIS_LABELS[map.y].high}</text>
            {[...shown.dots].sort((a, b) => (a.kind === "segment" ? 0 : 1) - (b.kind === "segment" ? 0 : 1)).map((d) => (
              <g
                key={d.id}
                transform={`translate(${sx(d.x)} ${sy(d.y)})`}
                onPointerDown={(e) => {
                  if (readOnly) return;
                  (e.target as Element).setPointerCapture?.(e.pointerId);
                  if (shown !== map) setMap(shown);
                  setDrag(d.id);
                }}
                className="mapdot"
              >
                {d.kind === "segment" ? (
                  <circle r={22} fill="var(--amber)" opacity={0.25} stroke="var(--amber)" />
                ) : (
                  <circle r={8} fill={d.kind === "product" ? "var(--pulse)" : "#9aa5b5"} stroke="#fff" strokeWidth={2} />
                )}
                <text y={d.kind === "segment" ? 36 : -12} textAnchor="middle" className={d.kind === "segment" ? "maplabel seg" : "maplabel"}>{label(d)}</text>
              </g>
            ))}
          </svg>
          <div className="row small" style={{ marginTop: 6 }}>
            <span><span className="legend-dot" style={{ background: "var(--pulse)" }} /> Your products</span>
            <span><span className="legend-dot" style={{ background: "var(--amber)", opacity: 0.5 }} /> Target segments</span>
            <span><span className="legend-dot" style={{ background: "#9aa5b5" }} /> Rivals</span>
            <span className="spacer" />
            {!readOnly && rivalsPicked.length < 3 && (
              <select
                aria-label="Add a rival"
                value=""
                onChange={(e) => {
                  if (!e.target.value) return;
                  const m = withDots(map);
                  commit({ ...m, dots: [...m.dots, { id: `rival-${e.target.value}`, kind: "rival", ref: e.target.value, x: 0.5, y: 0.5 }] });
                }}
                style={{ width: "auto" }}
              >
                <option value="">Add a rival…</option>
                {t.rivals.filter((r) => !rivalsPicked.includes(r.id)).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            )}
            {!readOnly && rivalsPicked.length > 0 && (
              <button type="button" onClick={() => commit({ ...map, dots: map.dots.filter((d) => d.kind !== "rival") })}>Clear rivals</button>
            )}
          </div>
          {!products.length && <p className="small muted">Your products appear here once you brief them on step 2.</p>}
          {!targets.length && <p className="small muted">Your target segments appear here once you pick them on the right.</p>}
          {!readOnly && (
            <div className="row" style={{ marginTop: 10 }}>
              {confirmed ? (
                <span className="small muted">Confirmed for this round. You can keep adjusting it until the deadline.</span>
              ) : (
                <button type="button" className="primary" onClick={() => commit({ ...withDots(map), confirmedRound: round })}>Confirm our map for this round</button>
              )}
            </div>
          )}
        </>
      ) : (
        <p className="small muted" style={{ marginTop: 10 }}>Choose both axes to draw the map.</p>
      )}
    </div>
  );
}
