import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeVendorScore } from "../services/vendors/vendor-score.js";

describe("computeVendorScore", () => {
  it("scores low-risk SOC2 approved vendors highly", () => {
    const score = computeVendorScore({
      riskLevel: "LOW",
      soc2Certified: true,
      dataProcessing: true,
      reviewStatus: "APPROVED",
      questionnaireStatus: "Complete",
    });
    assert.ok(score >= 90);
  });

  it("penalizes critical vendors without SOC2", () => {
    const score = computeVendorScore({
      riskLevel: "CRITICAL",
      soc2Certified: false,
      dataProcessing: true,
      reviewStatus: "PENDING",
      questionnaireStatus: null,
    });
    assert.ok(score < 50);
  });
});
