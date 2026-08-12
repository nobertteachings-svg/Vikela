import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { utcStartOfMonth } from "../lib/plan-limits.js";

describe("plan-limits UTC month + billable scan filter", () => {
  it("utcStartOfMonth returns first day of UTC month at midnight", () => {
    const d = utcStartOfMonth(new Date("2026-08-15T23:30:00.000Z"));
    assert.equal(d.toISOString(), "2026-08-01T00:00:00.000Z");
  });

  it("utcStartOfMonth handles January boundary", () => {
    const d = utcStartOfMonth(new Date("2026-01-01T00:00:00.000Z"));
    assert.equal(d.toISOString(), "2026-01-01T00:00:00.000Z");
  });
});
