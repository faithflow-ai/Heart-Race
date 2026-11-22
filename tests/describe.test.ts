import { describe, expect, it } from "vitest";
import { describeChange, isNoOp } from "../src/sim/describe";

describe("plain-language change log", () => {
  it("describes common edits without raw data", () => {
    expect(describeChange("strategy.targetSegments", [], ["wellness"])).toBe("changed target segments from none to Everyday Wellness");
    expect(describeChange("plan.p1.eu.price", 99, 89, { p1: "Pulse One" })).toBe("changed price of Pulse One in Europe from $99 to $89");
    expect(describeChange("products", null, { name: "Product 1", tier: "good", targetSegment: "budget" })).toBe("created a draft product: Product 1 (Good tier, Budget & First-Time Buyers)");
    expect(describeChange("products.#p1.briefSent", false, true, { p1: "Product 1" })).toBe("sent the brief for Product 1 to engineering");
    expect(describeChange("regions.apac.channels", [], ["online", "mass"])).toBe("changed channels in Asia-Pacific from none to Own website (online direct), Mass retail");
  });
  it("spots no-op edits", () => {
    expect(isNoOp([], [])).toBe(true);
    expect(isNoOp(null, "")).toBe(true);
    expect(isNoOp(1, 2)).toBe(false);
  });
});
