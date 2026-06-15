import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  optionalDateFilter,
  parseAuditDateRange,
} from "../lib/audit-date-range.js";

describe("parseAuditDateRange", () => {
  it("parses YYYY-MM-DD boundaries inclusive", () => {
    const range = parseAuditDateRange("2025-01-01", "2025-01-31");
    assert.equal(range.fromLabel, "2025-01-01");
    assert.equal(range.toLabel, "2025-01-31");
    assert.equal(range.from.getUTCHours(), 0);
    assert.equal(range.to.getUTCHours(), 23);
  });

  it("rejects inverted ranges", () => {
    assert.throws(() => parseAuditDateRange("2025-02-01", "2025-01-01"), /before/);
  });

  it("requires both dates", () => {
    assert.throws(() => parseAuditDateRange("2025-01-01", undefined), /required/);
  });
});

describe("optionalDateFilter", () => {
  it("allows partial from-only filter", () => {
    const filter = optionalDateFilter("2025-01-01", undefined);
    assert.ok(filter?.gte);
    assert.equal(filter?.lte, undefined);
  });

  it("allows partial to-only filter", () => {
    const filter = optionalDateFilter(undefined, "2025-01-31");
    assert.equal(filter?.gte, undefined);
    assert.ok(filter?.lte);
  });
});
