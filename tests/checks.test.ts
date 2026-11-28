import { describe, expect, it } from "vitest";
import { checkOp } from "../src/lib/validate";
import { excessStock, stepStatus } from "../src/components/checklist";
import { describeChange } from "../src/sim/describe";
import { emptyDecision, newProduct } from "../src/sim/product";
import type { TeamData } from "../src/components/TeamContext";

const ctx = (round: number) => {
  const data = emptyDecision();
  data.products.push(newProduct("p1", 1));
  return { round, data, committed: new Set<string>() };
};
const refused = (fn: () => void) => {
  try {
    fn();
    return null;
  } catch (e) {
    return (e as Error).message;
  }
};

describe("server checks the screens' rules (item 16)", () => {
  it("refuses goals and markets before they open", () => {
    expect(refused(() => checkOp({ path: "goals.revenue", value: 1000 }, ctx(0)))).toMatch(/open in Round 1/);
    expect(refused(() => checkOp({ path: "regions.na.enter", value: true }, ctx(0)))).toMatch(/opens in Round 1/);
    expect(refused(() => checkOp({ path: "goals.revenue", value: 1000 }, ctx(1)))).toBeNull();
  });
  it("refuses components the screen doesn't offer and briefs that break the design rules", () => {
    expect(refused(() => checkOp({ path: "products.#p1.chip", value: "quantum" }, ctx(1)))).toMatch(/options/);
    const c = ctx(1);
    Object.assign(c.data.products[0], { chip: "basic", display: "color" });
    expect(refused(() => checkOp({ path: "products.#p1.briefSent", value: true }, c))).toMatch(/Fix the design first/);
  });
  it("refuses a new product pushed as already accepted, and negative numbers", () => {
    const c = ctx(1);
    expect(refused(() => checkOp({ path: "products", op: "push", value: { ...newProduct("p2", 2), commission: true } }, c))).toMatch(/draft/);
    expect(refused(() => checkOp({ path: "plan.p1.na.price", value: -5 }, c))).toMatch(/or more/);
  });
  it("accepts 'Looks right, keep it' on a step", () => {
    expect(refused(() => checkOp({ path: "reviewed.pricing", value: true }, ctx(2)))).toBeNull();
    expect(refused(() => checkOp({ path: "reviewed.nope", value: true }, ctx(2)))).toMatch(/Unknown step/);
  });
});

describe("leftover stock warning (item 9)", () => {
  it("warns when stock plus production is well above the forecast", () => {
    expect(excessStock(18_000, 44_000, 30_000)).toMatch(/18,000 units in stock now and plan to make 44,000 more, against a forecast of 30,000/);
    expect(excessStock(2_000, 30_000, 30_000)).toBeNull();
    expect(excessStock(0, 60_000, 30_000)).toBeNull();
  });
});

describe("step status (item 9)", () => {
  const team = (round: number, lastEdits: TeamData["lastEdits"] = {}) =>
    ({
      game: { round },
      decision: emptyDecision(),
      committed: [],
      regionsEntered: {},
      channelsOpen: {},
      inventory: {},
      budget: { capital: 3_000_000, available: 500_000, remaining: 500_000, promotion: 0, research: 0, limit: 500_000, capacity: 70_000, loan: 0 },
      lastEdits,
    }) as unknown as TeamData;
  it("shows production as waiting on an earlier step, not done", () => {
    const s = stepStatus(team(1)).find((x) => x.id === "production")!;
    expect(s.state).toBe("waiting");
    expect(s.waiting).toBe("Products");
  });
  it("marks untouched steps carried forward from Round 2, done once reviewed", () => {
    const d = team(2);
    d.decision.strategy = { ...d.decision.strategy, companyName: "A", mission: "m", norms: "n", targetSegments: ["budget"], targetRegions: ["na"], positionMap: { x: "price", y: "fit", confirmedRound: 2 } as never };
    d.decision.goals = { ...d.decision.goals, revenue: 1, margin: 1, awareness: 1, satisfaction: 1, segmentShare: { budget: 5 } } as never;
    expect(stepStatus(d).find((x) => x.id === "strategy")!.state).toBe("carried");
    d.lastEdits = { strategy: { name: "A", at: "" } };
    expect(stepStatus(d).find((x) => x.id === "strategy")!.state).toBe("done");
  });
});

describe("no raw codes in the change log (item 12)", () => {
  it("describes a team color change and a reviewed step in words", () => {
    expect(describeChange("strategy.teamColor", null, "#6c7cf0")).toBe("changed the team color");
    expect(describeChange("reviewed.pricing", null, true)).toBe("reviewed Price and promotion and kept last round's choices");
  });
});
