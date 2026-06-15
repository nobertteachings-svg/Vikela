import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { gapScanIdWhere, gapsFoundForScan } from "../lib/scan-query.js";

describe("gapsFoundForScan", () => {
  it("returns direct gap count for non-FULL scans", () => {
    assert.equal(
      gapsFoundForScan({ scanType: "CODE", _count: { gaps: 3 }, children: [] }),
      3
    );
  });

  it("sums child gap counts for FULL scans", () => {
    assert.equal(
      gapsFoundForScan({
        scanType: "FULL",
        _count: { gaps: 0 },
        children: [{ _count: { gaps: 2 } }, { _count: { gaps: 5 } }],
      }),
      7
    );
  });
});

describe("gapScanIdWhere", () => {
  it("returns empty object when filter is not ids", () => {
    assert.deepEqual(gapScanIdWhere({ kind: "none" }), {});
    assert.deepEqual(gapScanIdWhere({ kind: "empty" }), {});
  });

  it("uses equality for a single id", () => {
    assert.deepEqual(gapScanIdWhere({ kind: "ids", ids: ["scan_1"] }), { scanId: "scan_1" });
  });

  it("uses in for multiple ids", () => {
    assert.deepEqual(gapScanIdWhere({ kind: "ids", ids: ["a", "b"] }), {
      scanId: { in: ["a", "b"] },
    });
  });
});
