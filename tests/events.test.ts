import { describe, expect, it } from "vitest";
import { runRound, makeAiFirms } from "../src/sim/run";
import { DEFAULT_SETTINGS } from "../src/sim/config";
import { RIVAL_ID } from "../src/sim/engine";
import { eventResponses, eventSchedule, newsFor } from "../src/sim/events";
import type { RoundResult } from "../src/sim/types";
import { LESSONS } from "../src/sim/lessons";

const OFF = { chip: null, rival: null, tariff: null };

function season(events: Record<string, number | null>, seed = 3) {
  const firms = makeAiFirms(8, 0);
  firms[0].isAi = true;
  const settings = { ...DEFAULT_SETTINGS, events };
  const results: Record<number, RoundResult> = {};
  let prev: RoundResult | null = null;
  for (let r = 0; r <= 7; r++) {
    prev = runRound({ round: r, seed, firms, prevResult: prev, studentDecisions: {}, settings });
    results[r] = prev;
  }
  return { firms, results, settings };
}

describe("market events", () => {
  it("uses the default schedule unless the instructor changes it", () => {
    expect(eventSchedule(null)).toEqual({ chip: 4, rival: 5, tariff: 6 });
    expect(eventSchedule({ events: { rival: null, tariff: 7 } })).toEqual({ chip: 4, rival: null, tariff: 7 });
  });

  it("changes nothing when every event is off", () => {
    const a = season(OFF);
    const b = season(OFF);
    expect(a.results[7].scores).toEqual(b.results[7].scores);
    expect(a.results[7].state.events).toBeUndefined();
  });

  it("chip shortage raises advanced-chip unit costs", () => {
    const off = season(OFF);
    const on = season({ ...OFF, chip: 4 });
    const costs = (res: RoundResult) => Object.values(res.reports).flatMap((rep) => Object.values(rep.byProduct).map((p) => p.unitCost));
    expect(on.results[3].scores).toEqual(off.results[3].scores);
    expect(Math.max(...costs(on.results[4]))).toBeGreaterThan(Math.max(...costs(off.results[4])));
    expect(on.results[4].state.events?.chipAlloc).toBeDefined();
  });

  it("tariff raises every firm's costs", () => {
    const off = season(OFF);
    const on = season({ ...OFF, tariff: 6 });
    const cogs = (res: RoundResult) => Object.values(res.reports).reduce((a, r) => a + r.pnl.cogs, 0) / Object.values(res.reports).reduce((a, r) => a + Object.values(r.byProduct).reduce((x, p) => x + p.units, 0), 0);
    expect(cogs(on.results[6])).toBeGreaterThan(cogs(off.results[6]) * 1.1);
  });

  it("the rival takes sales in its segment and stays fixed once chosen", () => {
    const on = season({ ...OFF, rival: 5 });
    const v = on.results[5].state.events?.rival;
    expect(v).toBeDefined();
    expect(on.results[7].state.events?.rival).toEqual(v);
    const news = newsFor(5, 3, on.firms, on.results[4], on.settings);
    expect(news.some((n) => n.id === "rival")).toBe(true);
    // Rival rows are not any firm's rows, but they count in segment totals.
    expect(Object.values(on.results[5].reports).every((r) => r.rows.every((x) => x.productId !== RIVAL_ID))).toBe(true);
    const resp = eventResponses(on.firms[0].id, on.results, on.settings);
    expect(resp.find((e) => e.id === "rival")).toBeDefined();
  });

  it("warns about the chip shortage a round early", () => {
    const on = season({ ...OFF, chip: 4 });
    expect(newsFor(3, 3, on.firms, on.results[2], on.settings).map((n) => n.when)).toEqual(["next"]);
  });

  it("keeps the event sizes out of the student part of the lesson", () => {
    const l = LESSONS.find((x) => x.id === "events");
    expect(l).toBeDefined();
    const student = l!.body.split("\n").filter((line) => !line.startsWith(">")).join("\n");
    for (const secret of ["150%", "30%", "35%", "70%", "92%", "78%", "4,000", "Orvane"]) expect(student).not.toContain(secret);
    expect(l!.body).toContain("> Instructor note");
  });
});
