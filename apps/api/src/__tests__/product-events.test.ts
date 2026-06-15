import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { captureProductEvent, resolveLiteScanFallbackReason } from "../lib/product-events.js";

describe("captureProductEvent", () => {
  it("logs structured events in non-production without throwing", () => {
    assert.doesNotThrow(() => {
      captureProductEvent("lite_scan_completed", { scanId: "scan_1", findingCount: 2 }, { orgId: "org_1" });
    });
  });
});

describe("resolveLiteScanFallbackReason", () => {
  it("returns none when enough real findings", () => {
    assert.equal(
      resolveLiteScanFallbackReason({ realGapCount: 5, listFailed: false, minRealFindings: 3 }),
      "none"
    );
  });

  it("returns list_failed when listing failed and sparse results", () => {
    assert.equal(
      resolveLiteScanFallbackReason({ realGapCount: 0, listFailed: true, minRealFindings: 3 }),
      "list_failed"
    );
  });

  it("returns sparse_findings when repo is clean", () => {
    assert.equal(
      resolveLiteScanFallbackReason({ realGapCount: 0, listFailed: false, minRealFindings: 3 }),
      "sparse_findings"
    );
  });

  it("returns no_repo for dev sample path", () => {
    assert.equal(
      resolveLiteScanFallbackReason({
        realGapCount: 0,
        listFailed: false,
        minRealFindings: 3,
        noRepo: true,
      }),
      "no_repo"
    );
  });
});
