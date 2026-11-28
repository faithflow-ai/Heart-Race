"use client";
import { Fragment, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, fmtShort, money, num } from "@/components/client";
import { STEPS, activeRegions, capitalWarnings, checklistItems, proFormaInputOf, sellable, stepStatus } from "@/components/checklist";
import { SaveState, useTeam, type TeamData } from "@/components/TeamContext";
import {
  CHANNELS,
  CHANNEL_TERMS,
  CLAIMS,
  COMPONENTS,
  ENTRY_MODES,
  FINANCE,
  MEDIA,
  PRODUCTION,
  PRODUCT_RULES,
  REGIONS,
  ROUNDS,
  SEGMENTS,
  SENSORS,
  TONES,
  UNLOCKS,
  type ChannelId,
  type ClaimId,
  type MediaId,
  type RegionId,
  type SegmentId,
  type SensorId,
  type ToneId,
} from "@/sim/config";
import { PromoSummary } from "@/components/PromoSummary";
import { PositionMapEditor } from "@/components/PositionMapEditor";
import { Term } from "@/components/Glossary";
import { TEAM_COLORS, TeamBadge, teamColor } from "@/components/team";
import { capitalCheck, proForma } from "@/sim/proforma";
import { LEARN } from "@/sim/content";
import { newProduct, quote, supportedClaims } from "@/sim/product";
import type { FirmDecision, ProductSpec } from "@/sim/types";

// Region channels (public): mirrors the hidden region settings' channel lists.
const REGION_CHANNELS: Record<RegionId, ChannelId[]> = {
  na: ["online", "marketplace", "mass", "electronics", "pharmacy", "specialty", "carrier", "bizdist"],
  eu: ["online", "marketplace", "mass", "electronics", "pharmacy", "specialty", "carrier", "bizdist"],
  apac: ["online", "marketplace", "mass", "electronics", "pharmacy", "specialty", "carrier", "bizdist"],
  latam: ["online", "marketplace", "mass", "electronics", "pharmacy", "carrier", "bizdist"],
};

/** Company capital warnings for one decision step (or all of them on Review). */
function CapitalWarnings({ step }: { step?: "products" | "production" }) {
  const { team } = useTeam();
  const ws = capitalWarnings(team!).filter((w) => !step || w.step === step || w.step === "review");
  if (!ws.length) return null;
  return (
    <div className="notice bad" role="alert">
      <b>Company capital warning</b>
      {ws.map((w, i) => <p key={i} style={{ margin: "4px 0 0" }}>{w.text}</p>)}
    </div>
  );
}

function Learn({ id }: { id: string }) {
  // Open the first time a student sees it; closed on later visits (remembered in this browser).
  const [open] = useState(() => {
    try {
      const k = `hr_learn_${id}`;
      const seen = localStorage.getItem(k);
      localStorage.setItem(k, "1");
      return !seen;
    } catch {
      return true;
    }
  });
  return (
    <details className="learn" open={open}>
      <summary>Learn</summary>
      <p style={{ margin: "6px 0 0" }}>{LEARN[id]}</p>
    </details>
  );
}

/** Number input that shows thousands separators (500,000) except while you type. */
function NumIn({ value, onChange, min = 0, disabled }: { value: number | null | undefined; onChange: (v: number | null) => void; step?: number; min?: number; disabled?: boolean }) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (value === null || value === undefined ? "" : value.toLocaleString("en-US", { maximumFractionDigits: 2 }));
  return (
    <input
      type="text"
      inputMode="decimal"
      className="num-in"
      disabled={disabled}
      value={shown}
      onFocus={() => setDraft(value === null || value === undefined ? "" : String(value))}
      onBlur={() => setDraft(null)}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^0-9.\-]/g, "");
        setDraft(raw);
        if (raw === "" || raw === "-" || raw === ".") return onChange(null);
        const n = Number(raw);
        if (!Number.isNaN(n)) onChange(min !== undefined && min >= 0 ? Math.max(min, n) : n);
      }}
    />
  );
}

export default function DecidePage() {
  return (
    <Suspense>
      <Decide />
    </Suspense>
  );
}

function Decide() {
  const { team } = useTeam();
  const sp = useSearchParams();
  const t = team!;
  const round = t.game.round;
  const over = round > ROUNDS.final;
  const steps = stepStatus(t);
  // Step 1 by default; from Round 2 on, open on the first step that needs attention.
  const firstOpen = round >= 2 && !t.viewAs ? steps.find((x) => x.state === "attention" && x.id !== "review") : undefined;
  const tab = sp.get("tab") ?? firstOpen?.id ?? "strategy";
  const idx = Math.max(0, STEPS.findIndex((x) => x.id === tab));
  const current = steps[idx];
  const next = steps[idx + 1];
  const prev = steps[idx - 1];
  const edit = t.lastEdits?.[current.id];

  return (
    <div className="decide">
      <aside className="steplist" aria-label="Decision steps">
        <div className="steplist-head">{ROUNDS.names[Math.min(round, ROUNDS.final)]} decisions</div>
        {steps.map((x, i) => (
          <a key={x.id} href={`/play/decide?tab=${x.id}`} className={`step ${x.id === current.id ? "cur" : ""} ${x.state}`} aria-current={x.id === current.id ? "step" : undefined}>
            <span className={`dot ${x.state}`}>{x.state === "done" ? "✓" : x.state === "attention" ? "!" : x.locked ? "" : i + 1}</span>
            <span className="step-label">
              {i + 1}. {x.label}
              {x.locked && <small>Opens in {x.opens}</small>}
              {x.state === "attention" && <small>{x.issues} to check</small>}
            </span>
          </a>
        ))}
      </aside>
      <section className="decide-main">
        <div className="row" style={{ marginBottom: 12 }}>
          <h1 style={{ margin: 0 }}>{idx + 1}. {current.label}</h1>
        </div>
        {over && <div className="notice info">The game is over. These are the team&apos;s Final round decisions, read-only. Earlier rounds are on <a href="/play/history">Past decisions</a>.</div>}
        {current.locked ? (
          <div className="panel">
            <p><b>This step opens in {current.opens}.</b> You can read what it covers below and plan ahead.</p>
            <Learn id={current.id} />
          </div>
        ) : (
          <fieldset className="plain" disabled={(t.viewAs && !t.tryIt) || over}>
            {current.id === "strategy" && <Strategy />}
            {current.id === "products" && <Products />}
            {current.id === "markets" && <Markets />}
            {current.id === "pricing" && <Pricing />}
            {current.id === "production" && <Production />}
            {current.id === "review" && <Review />}
          </fieldset>
        )}
      </section>
      <aside className="rail" aria-label="Money left">
        <div className="rail-block">
          <div className="k">Marketing budget left</div>
          {round === 0 ? (
            <div className="v small-v">Starts in Round 1</div>
          ) : (
            <>
              <div className={`v ${t.budget.remaining < 0 ? "neg" : ""}`}>{money(t.budget.remaining, true)}</div>
              <div className="meter"><i style={{ width: `${Math.max(0, Math.min(100, t.budget.available > 0 ? ((t.budget.available - Math.max(0, t.budget.remaining)) / t.budget.available) * 100 : 0))}%` }} /></div>
              <div className="s">{money(t.budget.promotion + t.budget.research, true)} of {money(t.budget.available, true)} planned</div>
              <div className={`s ${t.budget.promotion + t.budget.research > t.budget.limit ? "neg" : ""}`}>This round&apos;s spending limit: {money(t.budget.limit, true)}</div>
            </>
          )}
        </div>
        <div className="rail-block">
          <div className="k">Company capital</div>
          <div className="v">{money(t.budget.capital, true)}</div>
          <div className="s">For engineering, production and entry</div>
          {t.budget.loan > 0 && <div className="s neg">HQ loan owed: {money(t.budget.loan, true)}</div>}
        </div>
        <div className="rail-block">
          <div className="k">Team status</div>
          <div>{t.decision.ready ? <span className="badge good">Marked ready</span> : <span className="badge">Not marked ready</span>}</div>
        </div>
      </aside>
      <div className="stepbar">
        <SaveState />
        {edit && <span className="muted">Last edited by {edit.name}, {fmtShort(edit.at, t.game.timezone)}</span>}
        <span className="spacer" />
        {prev && <a className="btn ghost" href={`/play/decide?tab=${prev.id}`}>← {prev.label}</a>}
        {next ? <a className="btn primary" href={`/play/decide?tab=${next.id}`}>Next: {next.label} →</a> : <a className="btn primary" href="/play">Back to Home</a>}
      </div>
    </div>
  );
}

function Strategy() {
  const { team, set } = useTeam();
  const t = team!;
  const s = t.decision.strategy;
  const g = t.decision.goals;
  const toggle = (path: string, list: string[], id: string) => set(path, list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  return (
    <>
    <div className="grid2">
      <div className="panel">
        <Learn id="strategy" />
        <label>Company name</label>
        <input type="text" value={s.companyName} onChange={(e) => set("strategy.companyName", e.target.value)} placeholder={t.firm.name} />
        <label>Team color</label>
        <div className="swatches" role="radiogroup" aria-label="Team color">
          {TEAM_COLORS.map((c) => (
            <button key={c} type="button" role="radio" aria-checked={teamColor(s.teamColor, undefined, false) === c && !!s.teamColor} aria-label={`Color ${c}`} className={`swatch ${s.teamColor === c ? "on" : ""}`} style={{ background: c }} onClick={() => set("strategy.teamColor", c)} />
          ))}
          <TeamBadge name={s.companyName || t.firm.name} color={teamColor(s.teamColor, undefined, false)} size={28} />
        </div>
        <p className="small muted" style={{ marginTop: 4 }}>Shows on the leaderboard and charts so your team is easy to spot.</p>
        <label>Mission</label>
        <p className="small muted" style={{ marginTop: 0 }}>Why your company exists, in one or two sentences. Ask: Who do we serve? What need do we meet? What do we offer that others don&apos;t? What do we stand for?</p>
        <textarea value={s.mission} onChange={(e) => set("strategy.mission", e.target.value)} placeholder="We help [customers] [achieve / solve ___] by [offering ___], unlike [alternatives]." />
        <label>Positioning statement</label>
        <textarea value={s.positioning} onChange={(e) => set("strategy.positioning", e.target.value)} placeholder="For [target], [brand] is the [category] that [key benefit] because [reason to believe]." />
        <label>Competitive posture</label>
        <select value={s.posture} onChange={(e) => set("strategy.posture", e.target.value)}>
          <option value="">Choose…</option>
          <option value="differentiate">Differentiate on features and design</option>
          <option value="cost">Lead on cost and price</option>
          <option value="niche">Focus on a niche</option>
          <option value="follow">Fast follower</option>
        </select>
        <label>Team charter (how you&apos;ll work together)</label>
        <details className="small" style={{ marginBottom: 6 }}>
          <summary>Answer these 8 questions</summary>
          <ol style={{ margin: "6px 0", paddingLeft: 20 }}>
            <li>Roles: who owns which decision area?</li>
            <li>How and how fast do we communicate?</li>
            <li>When do we meet?</li>
            <li>How do we decide (consensus or vote), and who finalizes before the deadline?</li>
            <li>How do we split the work?</li>
            <li>What happens if a member isn&apos;t doing their share? (For example: direct reminder, then team discussion, then tell the instructor; it also shows in peer evaluation.)</li>
            <li>How do we resolve disagreements?</li>
            <li>Do all members agree to this charter?</li>
          </ol>
          <p className="muted" style={{ margin: 0 }}>The change log records who did what, and peer evaluation will refer back to this charter.</p>
        </details>
        <textarea value={s.norms} onChange={(e) => set("strategy.norms", e.target.value)} style={{ minHeight: 120 }} placeholder={"1) Roles: \n2) Communication: \n3) Meetings: \n4) Decisions: \n5) Splitting work: \n6) If someone isn't doing their share: \n7) Disagreements: \n8) We all agree: "} />
      </div>
      <div>
        <div className="panel">
          <p className="small notice info" style={{ marginTop: 0 }}>Pick your target segments and regions in Practice; you can change them until the Round 1 deadline (and later too).</p>
          <h3>Target segments</h3>
          <p className="small muted">Your Market and Customer scores count only these segments.</p>
          {SEGMENTS.map((x) => (
            <label className="inline" key={x.id} style={{ display: "flex" }}>
              <input type="checkbox" checked={s.targetSegments.includes(x.id)} onChange={() => toggle("strategy.targetSegments", s.targetSegments, x.id)} />
              {x.name}
            </label>
          ))}
          <h3>Target regions</h3>
          <p className="small muted">Your Channel score measures coverage of target buyers in these regions.</p>
          {REGIONS.map((x) => (
            <label className="inline" key={x.id}>
              <input type="checkbox" checked={s.targetRegions.includes(x.id)} onChange={() => toggle("strategy.targetRegions", s.targetRegions, x.id)} />
              {x.name}
            </label>
          ))}
        </div>
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Goals for this round</h3>
          {t.game.round < UNLOCKS.goals ? (
            <p className="muted">Goals open in Round 1.</p>
          ) : (
            <>
              <p className="small muted">{LEARN.goals}</p>
              <p className="small muted">Every goal counts. A goal left blank scores 0 in Goal accuracy.</p>
              <div className="grid2">
                {s.targetSegments.length === 0 && <p className="small muted" style={{ gridColumn: "1 / -1" }}>Pick your target segments above to set a share goal for each one.</p>}
                {s.targetSegments.map((id) => (
                  <div key={id}>
                    <label>Share of {SEGMENTS.find((x) => x.id === id)?.name} (%)</label>
                    <NumIn value={g.segmentShare?.[id] ?? null} onChange={(v) => set(`goals.segmentShare.${id}`, v)} />
                  </div>
                ))}
                <div>
                  <label>Revenue ($)</label>
                  <NumIn value={g.revenue} step={10000} onChange={(v) => set("goals.revenue", v)} />
                </div>
                <div>
                  <label>Operating margin (%)</label>
                  <NumIn value={g.margin} min={-100} onChange={(v) => set("goals.margin", v)} />
                </div>
                <div>
                  <label>Awareness in targets (%)</label>
                  <NumIn value={g.awareness} onChange={(v) => set("goals.awareness", v)} />
                </div>
                <div>
                  <label>Satisfaction (%)</label>
                  <NumIn value={g.satisfaction} onChange={(v) => set("goals.satisfaction", v)} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
    <PositionMapEditor />
    </>
  );
}

function Products() {
  const { team, push, remove } = useTeam();
  const t = team!;
  const round = t.game.round;
  const committed = new Map(t.committed.map((c) => [c.id, c]));
  const live = t.decision.products.filter((p) => !(committed.get(p.id)?.retired));
  const allowed = round < PRODUCT_RULES.thirdProductBriefRound ? PRODUCT_RULES.maxProductsAtLaunch : PRODUCT_RULES.maxProductsTotal;
  return (
    <>
      <Learn id="products" />
      <CapitalWarnings step="products" />
      <div className="notice info">
        Brief up to {PRODUCT_RULES.maxProductsAtLaunch} products now. A third product can be briefed by {ROUNDS.names[PRODUCT_RULES.thirdProductBriefRound]} to launch in {ROUNDS.names[PRODUCT_RULES.thirdProductBriefRound + 1]}.
        Each brief goes through three steps: <b>Draft</b> → <b>Send brief to engineering</b> (you get a quote) → <b>Accept quote</b> (the design locks and the fee is charged at the deadline).
      </div>
      {t.decision.products.map((p) => (
        <ProductCard key={p.id} p={p} committed={committed.get(p.id)} onRemove={() => remove("products", p.id)} />
      ))}
      {live.length < allowed ? (
        <button
          className="primary"
          onClick={() => push("products", { ...newProduct(`p${Date.now().toString(36)}`, t.decision.products.length + 1) })}
        >
          {t.decision.products.length ? "+ Add another product" : "+ Add a product"}
        </button>
      ) : (
        <p className="muted small">
          You have {live.length} of {allowed} products allowed {round < PRODUCT_RULES.thirdProductBriefRound ? `now. A third product can be briefed from ${ROUNDS.names[PRODUCT_RULES.thirdProductBriefRound]}.` : "(the most a team can have)."}
        </p>
      )}
    </>
  );
}

function ProductCard({ p, committed, onRemove }: { p: ProductSpec; committed?: TeamData["committed"][number]; onRemove: () => void }) {
  const { team, set } = useTeam();
  const t = team!;
  const round = t.game.round;
  const locked = !!committed;
  const frozen = locked || p.briefSent || p.commission;
  const q = quote(p, round);
  const assembly = q.lines[0].cost;
  const parts = q.lines.slice(1).reduce((a, l) => a + l.cost, 0);
  const listTotal = assembly + parts;
  const base = `products.#${p.id}`;
  const sel = (key: keyof typeof COMPONENTS) => (
    <div>
      <label>{COMPONENTS[key].label}</label>
      <select disabled={frozen} value={p[key] as string} onChange={(e) => set(`${base}.${key}`, e.target.value)}>
        {Object.entries(COMPONENTS[key].options).map(([k, v]) => (
          <option key={k} value={k}>
            {v.name} (${v.cost})
          </option>
        ))}
      </select>
    </div>
  );
  const status = committed
    ? committed.retired
      ? <span className="badge">Retired</span>
      : committed.launchRound > round
        ? <span className="badge warn">In development: ready in {ROUNDS.names[committed.launchRound]}</span>
        : <span className="badge good">On the market</span>
    : p.commission
      ? <span className="badge accent">Quote accepted: design locks at the deadline</span>
      : p.briefSent
        ? <span className="badge warn">Quote received: review and accept</span>
        : <span className="badge">Draft</span>;
  const stage = committed ? 3 : p.commission ? 3 : p.briefSent ? 2 : 1;
  return (
    <div className="product-card">
      <div className="row">
        <input type="text" value={p.name} onChange={(e) => set(`${base}.name`, e.target.value)} style={{ maxWidth: 260, fontWeight: 600 }} />
        {status}
        <span className="spacer" />
        {!locked && (
          <button className="danger" onClick={() => window.confirm(`Delete ${p.name}? This removes the brief.`) && onRemove()}>
            Delete
          </button>
        )}
        {locked && !committed!.retired && (
          <label className="inline">
            <input type="checkbox" checked={p.retire} onChange={(e) => set(`${base}.retire`, e.target.checked)} /> Retire at the deadline
          </label>
        )}
      </div>
      {!committed && (
        <div className="steps">
          <span className={stage === 1 ? "on" : ""}>1. Draft</span> →
          <span className={stage === 2 ? "on" : ""}>2. Quote received</span> →
          <span className={stage === 3 ? "on" : ""}>3. Accepted (locked)</span>
        </div>
      )}
      <div className="grid2">
        <div>
          <div className="grid2">
            <div>
              <label>Tier</label>
              <select disabled={frozen} value={p.tier} onChange={(e) => set(`${base}.tier`, e.target.value)}>
                <option value="good">Good</option>
                <option value="better">Better</option>
                <option value="best">Best</option>
              </select>
            </div>
            <div>
              <label>Main target segment</label>
              <select disabled={frozen} value={p.targetSegment} onChange={(e) => set(`${base}.targetSegment`, e.target.value as SegmentId)}>
                {SEGMENTS.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            {sel("chip")}
            {sel("form")}
            {sel("battery")}
            {sel("display")}
            {sel("material")}
            {sel("water")}
            {sel("privacy")}
            <div>
              <label>Premium app plan ($/month, 0 = none)</label>
              <NumIn value={p.subscriptionPrice} step={1} onChange={(v) => set(`${base}.subscriptionPrice`, v ?? 0)} />
            </div>
          </div>
          <label>Sensors</label>
          {(Object.keys(SENSORS) as SensorId[]).map((s) => (
            <label key={s} className="inline">
              <input
                type="checkbox"
                disabled={frozen}
                checked={p.sensors.includes(s)}
                onChange={() => set(`${base}.sensors`, p.sensors.includes(s) ? p.sensors.filter((x) => x !== s) : [...p.sensors, s])}
              />
              {SENSORS[s].name} (${SENSORS[s].cost})
            </label>
          ))}
        </div>
        <div>
          <div className="panel" style={{ background: "#fafbfc" }}>
            <h3 style={{ marginTop: 0 }}>{p.briefSent || locked ? "Engineering quote" : "Cost estimate (updates as you edit)"}</h3>
            {locked ? (
              <div className="kv">
                <div><b>Unit cost now</b> <span className="muted small">(after volume savings)</span></div><div><b>${committed!.unitCost.toFixed(2)}</b></div>
                <div>Parts at today&apos;s prices</div><div>${parts.toFixed(2)}</div>
                <div>Assembly, packaging, app</div><div>${assembly.toFixed(2)}</div>
              </div>
            ) : (
            <div className="kv">
              <div>Parts</div><div>${parts.toFixed(2)}</div>
              <div>Assembly, packaging, app</div><div>+ ${assembly.toFixed(2)}</div>
              {Math.abs(listTotal - q.unitCost) > 0.005 && (<><div>Industry price drop since Round 1</div><div>- ${(listTotal - q.unitCost).toFixed(2)}</div></>)}
              <div><b>Unit cost</b></div><div><b>${q.unitCost.toFixed(2)}</b></div>
              <div>Development fee (one time)</div><div><b>{money(q.devFee)}</b></div>
              <div>Lead time</div><div>{q.leadTime} round</div>
            </div>
            )}
            <p className="small muted" style={{ marginBottom: 0 }}>Costs fall over time. See &quot;How costs work&quot; in the scenario briefing (Start here).</p>
            <details style={{ marginTop: 8 }} open={p.briefSent && !locked}>
              <summary className="small">Parts, one by one</summary>
              <div className="kv small">
                {q.lines.slice(1).map((l, i) => (
                  <Fragment key={i}><div>{l.label}</div><div>${l.cost}</div></Fragment>
                ))}
              </div>
            </details>
            {q.problems.map((x, i) => (
              <div key={i} className="notice bad">{x}</div>
            ))}
            {!locked && !p.briefSent && (
              <>
                <p style={{ marginTop: 12 }}>
                  <button className="primary" disabled={q.problems.length > 0} onClick={() => set(`${base}.briefSent`, true)}>Send brief to engineering</button>
                </p>
                <p className="small muted">Engineering returns a quote right away. Nothing is charged until you accept it.</p>
              </>
            )}
            {!locked && p.briefSent && !p.commission && (
              <>
                <div className="row" style={{ marginTop: 12 }}>
                  <button
                    className="primary"
                    onClick={() => window.confirm(`Accept the quote for ${p.name}?\n\nThis locks the design and charges ${money(q.devFee)} from company capital at the deadline. The product goes on sale in ${ROUNDS.names[round + q.leadTime] ?? "the next round"}.`) && set(`${base}.commission`, true)}
                  >
                    Accept quote
                  </button>
                  <button onClick={() => set(`${base}.briefSent`, false)}>Revise brief</button>
                </div>
                <p className="small notice warn">Not accepted yet: if it stays this way at the deadline, this product won&apos;t be ready next round.</p>
              </>
            )}
            {!locked && p.commission && (
              <>
                <p className="small" style={{ marginTop: 12 }}>
                  Accepted. At the deadline the design locks and {money(q.devFee)} is charged from company capital. The product goes on sale in {ROUNDS.names[round + q.leadTime] ?? "the next round"}.
                </p>
                <button onClick={() => { set(`${base}.commission`, false); }}>Undo acceptance</button>
              </>
            )}
            {locked && <p className="small muted">Accepted. Components are locked; you can still rename it, change its app plan price and its ad claims.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Markets() {
  const { team, set } = useTeam();
  const t = team!;
  return (
    <>
      <Learn id="markets" />
      <div className="grid2">
        {REGIONS.map((r) => {
          const rd = t.decision.regions[r.id];
          const entered = t.regionsEntered[r.id] as keyof typeof ENTRY_MODES | undefined;
          return (
            <div className="panel" key={r.id}>
              <div className="row">
                <h3 style={{ margin: 0 }}>{r.name}</h3>
                <span className="spacer" />
                {entered ? <span className="badge good">Entered via {ENTRY_MODES[entered].name.toLowerCase()}</span> : (
                  <label className="inline">
                    <input type="checkbox" checked={rd.enter} onChange={(e) => set(`regions.${r.id}.enter`, e.target.checked)} /> Enter this round
                  </label>
                )}
              </div>
              {entered && (
                <label className="inline small" style={{ marginTop: 6 }}>
                  <input type="checkbox" checked={!!rd.exit} onChange={(e) => set(`regions.${r.id}.exit`, e.target.checked)} /> Exit this region this round (one-time fee {money(ENTRY_MODES[entered].fee * FINANCE.exitFeeShare)})
                </label>
              )}
              {entered && rd.exit && (
                <div className="notice warn small">Exiting ends this region&apos;s overhead from this round. Nothing sells here this round, any stock left here is cleared at a discount, partner volume discounts here reset and awareness fades. Coming back later costs the full entry and channel setup fees again.</div>
              )}
              {!entered && rd.enter && (
                <>
                  <label>Entry mode</label>
                  <select value={rd.entryMode} onChange={(e) => set(`regions.${r.id}.entryMode`, e.target.value)}>
                    {Object.entries(ENTRY_MODES).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.name}: fee {money(v.fee)}, partner margin +{Math.round(v.extraMargin * 100)} pts, reach x{v.coverageBoost}
                      </option>
                    ))}
                  </select>
                </>
              )}
              {(entered || rd.enter) && (
                <>
                  <label>Channels</label>
                  <table>
                    <thead>
                      <tr><th></th><th>Channel</th><th className="num">Partner margin</th><th className="num">Setup fee</th></tr>
                    </thead>
                    <tbody>
                      {REGION_CHANNELS[r.id].map((ch) => (
                        <tr key={ch}>
                          <td>
                            <input
                              type="checkbox"
                              checked={rd.channels.includes(ch)}
                              onChange={() => set(`regions.${r.id}.channels`, rd.channels.includes(ch) ? rd.channels.filter((x) => x !== ch) : [...rd.channels, ch])}
                            />
                          </td>
                          <td>{CHANNELS.find((c) => c.id === ch)!.name}</td>
                          <td className="num">{ch === "online" ? "0% + fulfillment" : `${Math.round(CHANNEL_TERMS[ch].margin * 100)}%`}</td>
                          <td className="num">{money(CHANNEL_TERMS[ch].setupFee)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="small muted">Setup fees are paid once, the first round you open a channel. Dropping a channel is free, but reopening it later costs the fee again and starts over on volume discounts with that partner.</p>
                </>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function Pricing() {
  const { team, set } = useTeam();
  const t = team!;
  const d = t.decision;
  const prods = sellable(t);
  const regions = activeRegions(t);
  const cell = (pid: string, r: RegionId) => d.plan[pid]?.[r];
  const spend = (pid: string, r: RegionId, m: MediaId) => Math.max(0, Number(cell(pid, r)?.media?.[m]) || 0);
  const available = t.budget.available - t.budget.research;
  const total = prods.reduce((a, p) => a + regions.reduce((b, r) => b + MEDIA.reduce((c, m) => c + spend(p.id, r.id, m.id), 0), 0), 0);
  return (
    <>
      <Learn id="pricing" />
      {!prods.length && <div className="notice warn">You have no products on the market this round. Products are ready one round after engineering accepts the brief.</div>}
      {!regions.length && <div className="notice warn">Enter at least one region on the Markets & channels screen first.</div>}
      <div className="notice info small">
        Enter promotion in <b>dollars for each medium</b>, for each product in each region. <b>Digital & social, Search and Traditional media</b> are consumer ads (<Term t="pull">pull</Term>): they build <Term t="awareness">awareness</Term> in every segment, most in the segments each medium reaches best.{" "}
        <b><Term t="trade promotion">Trade promotion</Term></b> pays your channel partners for displays, shelf space and staff incentives (<Term t="push">push</Term>): buyers who shop there meet your brand in the store. It works only through partners, not your own website. You don&apos;t have to spend the whole budget; whatever is left carries over.
      </div>
      {prods.map((p) => {
        const truthful = supportedClaims(p);
        const camp = p.campaign ?? { message: "", tone: "", segment: "" };
        const rowTotal = (r: RegionId) => MEDIA.reduce((a, m) => a + spend(p.id, r, m.id), 0);
        return (
          <div className="panel" key={p.id}>
            <h3 style={{ marginTop: 0 }}>{p.name} <span className="muted small">({p.tier}, unit cost about ${t.committed.find((c) => c.id === p.id)?.unitCost.toFixed(2)})</span></h3>
            <div className="scroll">
              <table className="media-table">
                <thead>
                  <tr>
                    <th>Region</th>
                    <th className="num">List price ($)</th>
                    {MEDIA.map((m) => <th key={m.id} className="num">{m.name} ($)</th>)}
                    <th className="num">Promotion total</th>
                  </tr>
                </thead>
                <tbody>
                  {regions.map((r) => (
                    <tr key={r.id}>
                      <td>{r.name}</td>
                      <td style={{ minWidth: 100 }}><NumIn value={cell(p.id, r.id)?.price ?? null} step={1} onChange={(v) => set(`plan.${p.id}.${r.id}.price`, v ?? 0)} /></td>
                      {MEDIA.map((m) => (
                        <td key={m.id} style={{ minWidth: 110 }}>
                          <NumIn value={cell(p.id, r.id)?.media?.[m.id] ?? null} step={5000} onChange={(v) => set(`plan.${p.id}.${r.id}.media.${m.id}`, Math.max(0, v ?? 0))} />
                        </td>
                      ))}
                      <td className="num"><b>{money(rowTotal(r.id))}</b></td>
                    </tr>
                  ))}
                </tbody>
                {regions.length > 1 && (
                  <tfoot>
                    <tr>
                      <td colSpan={2}><b>All regions</b></td>
                      {MEDIA.map((m) => <td key={m.id} className="num">{money(regions.reduce((a, r) => a + spend(p.id, r.id, m.id), 0))}</td>)}
                      <td className="num"><b>{money(regions.reduce((a, r) => a + rowTotal(r.id), 0))}</b></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            <h4 style={{ marginBottom: 4 }}>Campaign</h4>
            <p className="small muted" style={{ marginTop: 0 }}>One campaign per product: who it speaks to, in what tone, with one main message. It shapes how well your ads work with that segment. It carries forward until you change it. Your creative work (Creative tab) should bring this campaign to life.</p>
            <div className="grid2">
              <div>
                <label>Campaign target segment</label>
                <select value={camp.segment} onChange={(e) => set(`products.#${p.id}.campaign.segment`, e.target.value)}>
                  <option value="">Choose a segment…</option>
                  {SEGMENTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label>Tone</label>
                <select value={camp.tone} onChange={(e) => set(`products.#${p.id}.campaign.tone`, e.target.value)}>
                  <option value="">Choose a tone…</option>
                  {(Object.keys(TONES) as ToneId[]).map((k) => <option key={k} value={k}>{TONES[k].name}</option>)}
                </select>
              </div>
            </div>
            <label>Main message (one sentence a buyer should remember)</label>
            <textarea value={camp.message} onChange={(e) => set(`products.#${p.id}.campaign.message`, e.target.value)} style={{ minHeight: 60 }} placeholder="e.g. Peace of mind on every wrist: CareBand calls family the moment a fall happens." />

            <label style={{ marginTop: 10 }}>Ad claims (pick up to 3, most important first)</label>
            {(Object.keys(CLAIMS) as ClaimId[]).map((c) => {
              const on = p.claims.includes(c);
              const unsupported = c !== "price" && !truthful.has(c);
              return (
                <label key={c} className="inline">
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={!on && p.claims.length >= 3}
                    onChange={() => set(`products.#${p.id}.claims`, on ? p.claims.filter((x) => x !== c) : [...p.claims, c])}
                  />
                  {CLAIMS[c].name}
                  {unsupported && <span className="badge bad" title="The product doesn't have the features to back this claim">can&apos;t back up</span>}
                </label>
              );
            })}
          </div>
        );
      })}
      {prods.length > 0 && regions.length > 0 && <PromoSummary d={d} products={prods} regions={regions.map((r) => r.id)} available={available} />}
      {!(prods.length > 0 && regions.length > 0) && <p className="muted">Promotion planned: <b>{money(total)}</b> · marketing budget available: {money(available)}</p>}
    </>
  );
}

function Production() {
  const { team, set } = useTeam();
  const t = team!;
  const d = t.decision;
  const prods = sellable(t);
  const regions = activeRegions(t);
  const total = prods.reduce((a, p) => a + regions.reduce((b, r) => b + (d.plan[p.id]?.[r.id]?.production ?? 0), 0), 0);
  const cap = t.budget.capacity;
  const usedPct = cap ? total / cap : 0;
  return (
    <>
      <Learn id="production" />
      <CapitalWarnings step="production" />
      <div className="panel">
        <div className="row">
          <b>Factory capacity this round: {num(cap)} units</b>
          <span className="spacer" />
          <span>Planned: {num(total)} ({Math.round(usedPct * 100)}%)</span>
        </div>
        <div className="bar" style={{ marginTop: 8 }}>
          <div style={{ width: `${Math.min(100, usedPct * 100)}%`, background: usedPct > 1 + PRODUCTION.overtimeMax ? "var(--bad)" : usedPct > 1 ? "var(--warn)" : "var(--accent)" }} />
        </div>
        {usedPct > 1 && usedPct <= 1 + PRODUCTION.overtimeMax && <div className="notice warn">You're into overtime: units above capacity cost {Math.round(PRODUCTION.overtimeCostPremium * 100)}% more.</div>}
        {(() => {
          const cc = capitalCheck(proFormaInputOf(t));
          if (t.game.round < 1) return null;
          return (
            <p className="small" style={{ margin: "8px 0 0" }}>
              <b>Cost of making these units: {money(cc.production)}</b>, paid from company capital this round. Capital left for production after this round&apos;s fees: {money(Math.max(0, cc.beforeProduction))}.
            </p>
          );
        })()}
        {usedPct > 1 + PRODUCTION.overtimeMax && <div className="notice bad">Over the limit. The factory can make at most {num(cap * (1 + PRODUCTION.overtimeMax))} units with overtime; production will be cut proportionally.</div>}
      </div>
      {prods.map((p) => (
        <div className="panel" key={p.id}>
          <h3 style={{ marginTop: 0 }}>{p.name}</h3>
          <table>
            <thead>
              <tr><th>Region</th><th className="num">In stock now</th><th className="num">Sales forecast (units)</th><th className="num">Production (units)</th><th></th></tr>
            </thead>
            <tbody>
              {regions.map((r) => {
                const pl = d.plan[p.id]?.[r.id];
                const stock = t.inventory[p.id]?.[r.id] ?? 0;
                const f = pl?.forecast ?? 0;
                const supply = (pl?.production ?? 0) + stock;
                const gap = f > 0 ? Math.abs(supply - f) / f : supply > 0 ? 1 : 0;
                return (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td className="num">{num(stock)}</td>
                    <td style={{ width: 180 }}><NumIn value={pl?.forecast ?? null} step={500} onChange={(v) => set(`plan.${p.id}.${r.id}.forecast`, v ?? 0)} /></td>
                    <td style={{ width: 180 }}><NumIn value={pl?.production ?? null} step={500} onChange={(v) => set(`plan.${p.id}.${r.id}.production`, v ?? 0)} /></td>
                    <td>{gap > PRODUCTION.forecastGapWarning && <span className="badge warn">Stock + production is {Math.round(gap * 100)}% off forecast</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Add capacity</h3>
        <div className="row">
          <div style={{ width: 200 }}>
            <label>Extra units per round</label>
            <NumIn value={d.capacityExpansion} step={5000} onChange={(v) => set("capacityExpansion", v ?? 0)} />
          </div>
          <p className="small muted" style={{ flex: 1 }}>
            Costs {money(PRODUCTION.expansionCostPerUnit)} per unit of capacity from company capital ({money(d.capacityExpansion * PRODUCTION.expansionCostPerUnit)} now). It comes online next round, and every unit of capacity costs {money(PRODUCTION.fixedCostPerCapacityUnit)} per round whether you use it or not.
          </p>
        </div>
      </div>
    </>
  );
}

function Review() {
  const { team, set, flush } = useTeam();
  const t = team!;
  const d = t.decision;
  const b = t.budget;
  const [proj, setProj] = useState<null | { pnl: Record<string, number>; supply: { productId: string; region: string; demand: number; sold: number; lost: number; endInventory: number }[]; notes: string[] }>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const round = t.game.round;
  const committed = new Set(t.committed.map((c) => c.id));
  const devFees = d.products.filter((p) => p.commission && !committed.has(p.id)).reduce((a, p) => a + quote(p, round).devFee, 0);
  const entryFees = REGIONS.filter((r) => d.regions[r.id].enter && !t.regionsEntered[r.id]).reduce((a, r) => a + ENTRY_MODES[d.regions[r.id].entryMode].fee, 0);
  const exitFees = REGIONS.filter((r) => d.regions[r.id].exit && t.regionsEntered[r.id]).reduce((a, r) => a + ENTRY_MODES[t.regionsEntered[r.id] as keyof typeof ENTRY_MODES].fee * FINANCE.exitFeeShare, 0);
  const expansion = d.capacityExpansion * PRODUCTION.expansionCostPerUnit;
  const roundsLeft = ROUNDS.final - round + 1;
  const pace = round >= 3 && b.promotion + b.research > 0 && (b.available - b.research - b.promotion) < (b.promotion + b.research) * (roundsLeft - 1) * 0.6;

  async function project() {
    setBusy(true);
    setErr("");
    try {
      await flush();
      const r = await api("/api/team/projection", { body: {} });
      setProj(r.projection);
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  }

  return (
    <>
      <Learn id="review" />
      <CapitalWarnings />
      <Checklist />
      <div className="grid2">
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Budget check: marketing</h3>
          <div className="kv">
            <div>Carried over</div><div>{money(b.carried)}</div>
            <div>Released by head office this round</div><div>{money(b.release)}</div>
            <div>Earned top-up</div><div>{money(b.earned)}</div>
            <div><b>Available</b></div><div><b>{money(b.available)}</b></div>
            <div>Research bought</div><div>-{money(b.research)}</div>
            <div>Promotion planned</div><div>-{money(b.promotion)}</div>
            <div><b>Left after this round</b></div><div><b style={{ color: b.remaining < 0 ? "var(--bad)" : undefined }}>{money(b.remaining)}</b></div>
          </div>
          <div className="kv" style={{ marginTop: 6 }}>
            <div>This round&apos;s spending limit</div><div>{money(b.limit)}</div>
          </div>
          <p className="small muted">Promotion and research together can&apos;t go over the greater of $500,000 or 20% of last round&apos;s revenue. Anything you don&apos;t spend carries over.</p>
          {b.remaining < 0 && <div className="notice bad">Promotion is over budget. It will be scaled down to fit at the deadline.</div>}
          {round >= 1 && b.remaining >= 0 && b.promotion + b.research > b.limit && <div className="notice bad">Promotion and research are over this round&apos;s spending limit. Promotion will be scaled down to fit at the deadline.</div>}
          {pace && <div className="notice warn">Burn-rate warning: at this pace, the marketing budget runs out before the final round.</div>}
          {b.futureReleases > 0 && <p className="small muted">Still to come from head office: {money(b.futureReleases)}.</p>}
        </div>
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Budget check: company capital</h3>
          <div className="kv">
            <div>Capital now</div><div>{money(b.capital)}</div>
            <div>Engineering fees (new briefs)</div><div>-{money(devFees)}</div>
            <div>Region entry fees</div><div>-{money(entryFees)}</div>
            {exitFees > 0 && <><div>Region exit fees</div><div>-{money(exitFees)}</div></>}
            <div>Capacity expansion</div><div>-{money(expansion)}</div>
            <div><b>Before production and sales</b></div><div><b>{money(b.capital - devFees - entryFees - exitFees - expansion)}</b></div>
          </div>
          <p className="small muted">Production, holding costs, channel setup and overhead also come from capital; sales revenue flows back in. If capital runs out, Vibe Electronics HQ lends the difference at {Math.round(FINANCE.loanInterestPerRound * 100)}% interest a round, charged to profit.</p>
          {b.loan > 0 && <div className="notice warn">You owe HQ {money(b.loan)}. It&apos;s repaid automatically from capital above {money(FINANCE.loanRepayCushion)}.</div>}
        </div>
      </div>
      {round >= 1 && <ProFormaPanel />}
      {round >= 1 && (
        <div className="panel">
          <div className="row">
            <h3 style={{ margin: 0 }}>Market simulation (optional)</h3>
            <span className="spacer" />
            <button onClick={project} disabled={busy}>{busy ? "Projecting…" : "Run projection"}</button>
          </div>
          <p className="small muted">A different estimate from the projected profit and loss above. The pro forma assumes you sell exactly your forecast; this runs the market model, where buyers choose among all firms. {t.game.round === 1 ? "Nobody has sold yet, so each rival is filled in with a typical launch plan." : "It assumes every rival repeats its last-round decisions."} Expect the two to differ: the gap is worth discussing. Real results will differ too.</p>
          {err && <div className="notice bad">{err}</div>}
          {proj && (
            <>
              <div className="grid4">
                <div className="stat"><div className="k">Revenue</div><div className="v">{money(proj.pnl.revenue, true)}</div></div>
                <div className="stat"><div className="k">Operating profit</div><div className="v">{money(proj.pnl.operatingProfit, true)}</div></div>
                <div className="stat"><div className="k">Units demanded</div><div className="v">{num(proj.supply.reduce((a, s) => a + s.demand, 0))}</div></div>
                <div className="stat"><div className="k">Units short</div><div className="v">{num(proj.supply.reduce((a, s) => a + s.lost, 0))}</div></div>
              </div>
              <table style={{ marginTop: 12 }}>
                <thead><tr><th>Product</th><th>Region</th><th className="num">Demand</th><th className="num">Sold</th><th className="num">Short</th><th className="num">Left over</th></tr></thead>
                <tbody>
                  {proj.supply.map((s, i) => (
                    <tr key={i}>
                      <td>{d.products.find((p) => p.id === s.productId)?.name}</td>
                      <td>{REGIONS.find((r) => r.id === s.region)?.name}</td>
                      <td className="num">{num(s.demand)}</td>
                      <td className="num">{num(s.sold)}</td>
                      <td className="num">{num(s.lost)}</td>
                      <td className="num">{num(s.endInventory)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {proj.notes.map((n, i) => <div key={i} className="notice info">{n}</div>)}
            </>
          )}
        </div>
      )}
      <div className="panel">
        <h3 style={{ marginTop: 0 }} id="reflection">Round reflection</h3>
        <p className="small muted">What did you decide this round and why? What did last round teach you? Your instructor grades this.</p>
        <textarea value={d.reflection} onChange={(e) => set("reflection", e.target.value)} style={{ minHeight: 120 }} />
      </div>
      <div className="panel">
        <div className="row">
          <h3 style={{ margin: 0 }}>Team status</h3>
          {d.ready ? <span className="badge good">✓ Ready</span> : <span className="badge">Not ready</span>}
          <span className="spacer" />
          {d.ready ? <button onClick={() => set("ready", false)}>Mark not ready</button> : <button className="primary" onClick={() => set("ready", true)}>Mark our team ready</button>}
        </div>
        <p className="small muted" style={{ marginBottom: 0 }}>This only tells your teammates and instructor you&apos;re done. It doesn&apos;t lock or submit anything: anyone can keep editing, and whatever is saved at the deadline is used.</p>
      </div>
      <div className="notice info">There&apos;s no submit button: whatever is saved at the deadline is used. <SaveState /></div>
    </>
  );
}

function ProFormaPanel() {
  const { team } = useTeam();
  const t = team!;
  const pf = proForma(proFormaInputOf(t));
  return (
    <div className="panel">
      <h3 style={{ marginTop: 0 }}>Projected profit and loss (<Term t="pro forma">pro forma</Term>)</h3>
      <p className="small muted" style={{ marginTop: 0 }}><b>Based on your forecast and decisions, not a prediction of the market.</b> It assumes you sell exactly your forecast (up to the units you have), split evenly across each region&apos;s channels. Profit counts the cost of units you sell; units left over stay as inventory, but capital pays for every unit you make. It updates as you edit. After the round, Results shows projected vs. actual.</p>
      <div className="grid2">
        <table>
          <tbody>
            {pf.lines.map((l) => (
              <tr key={l.key} style={l.key === "revenue" || l.key === "operatingProfit" ? { fontWeight: 600 } : undefined}>
                <td>{l.label}</td>
                <td className="num" style={l.value < 0 ? { color: "var(--muted)" } : undefined}>{money(l.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div>
          <div className="stat"><div className="k">Projected operating profit</div><div className="v" style={{ color: pf.operatingProfit < 0 ? "var(--bad)" : undefined }}>{money(pf.operatingProfit, true)}</div><div className="s">on {num(pf.units)} units</div></div>
          <div className="stat" style={{ marginTop: 10 }}><div className="k">Projected company capital at the end of the round</div><div className="v">{money(pf.capitalEnd, true)}</div></div>
          <div className="stat" style={{ marginTop: 10 }}><div className="k">Marketing budget left after this round</div><div className="v" style={{ color: pf.marketingEnd < 0 ? "var(--bad)" : undefined }}>{money(pf.marketingEnd, true)}</div></div>
        </div>
      </div>
    </div>
  );
}

function Checklist() {
  const { team } = useTeam();
  const t = team!;
  const round = t.game.round;
  const items = checklistItems(t);
  return (
    <div className="panel">
      <h3 style={{ marginTop: 0 }}>Checklist for {ROUNDS.names[Math.min(round, ROUNDS.final)]}</h3>
      {!items.length ? (
        <div className="notice good">✓ Everything is filled in. You can keep editing until the deadline.</div>
      ) : (
        <ul className="checklist">
          {items.map((x, i) => (
            <li key={i}>
              <span>⚠</span>
              <span style={{ flex: 1 }}>{x.text}</span>
              {x.tab === "review" ? <a href="#reflection">Write it below</a> : <a href={`/play/decide?tab=${x.tab}`}>Fix</a>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export type { FirmDecision };
