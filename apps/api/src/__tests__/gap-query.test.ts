import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { gapSourceWhere, parseGapSourceFilter } from "../lib/gap-query.js";

describe("parseGapSourceFilter", () => {
  it("returns undefined for empty input", () => {
    assert.equal(parseGapSourceFilter(undefined), undefined);
    assert.equal(parseGapSourceFilter(""), undefined);
    assert.equal(parseGapSourceFilter("  "), undefined);
  });

  it("parses a single source", () => {
    assert.deepEqual(parseGapSourceFilter("CODE"), ["CODE"]);
  });

  it("parses comma-separated cloud sources", () => {
    assert.deepEqual(parseGapSourceFilter("NETWORK,ENCRYPTION,LOGGING,BACKUP,MONITORING"), [
      "NETWORK",
      "ENCRYPTION",
      "LOGGING",
      "BACKUP",
      "MONITORING",
    ]);
  });

  it("ignores invalid values", () => {
    assert.deepEqual(parseGapSourceFilter("CODE,INVALID,IAM"), ["CODE", "IAM"]);
    assert.equal(parseGapSourceFilter("INVALID"), undefined);
  });
});

describe("gapSourceWhere", () => {
  it("returns empty object when no sources", () => {
    assert.deepEqual(gapSourceWhere(undefined), {});
  });

  it("uses equality for one source", () => {
    assert.deepEqual(gapSourceWhere(["CODE"]), { source: "CODE" });
  });

  it("uses in for multiple sources", () => {
    assert.deepEqual(gapSourceWhere(["NETWORK", "ENCRYPTION"]), {
      source: { in: ["NETWORK", "ENCRYPTION"] },
    });
  });
});
