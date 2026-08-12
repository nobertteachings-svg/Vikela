import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeScanScoreFromFindings } from "../lib/scan-score.js";

describe("computeScanScoreFromFindings", () => {
  it("returns 100 with no findings", () => {
    const r = computeScanScoreFromFindings([]);
    assert.equal(r.score, 100);
    assert.equal(r.passedChecks, r.totalChecks);
  });

  it("does not collapse to 0 when one rule hits many files", () => {
    const findings = Array.from({ length: 56 }, (_, i) => ({
      severity: "HIGH",
      title: "FedRAMP: Weak cryptography configuration",
      controlCode: "SC-13",
      file: `file-${i}.ts`,
    }));
    findings.push(
      { severity: "CRITICAL", title: "Generic API Key detected", controlCode: "CC6.1", file: "a" },
      { severity: "CRITICAL", title: "Generic API Key detected", controlCode: "CC6.1", file: "b" },
      { severity: "MEDIUM", title: "Insecure HTTP URL in code", controlCode: null, file: "c" }
    );
    const r = computeScanScoreFromFindings(findings);
    assert.ok(r.score >= 60, `expected score >= 60, got ${r.score}`);
    assert.ok(r.score < 100);
    assert.ok(r.passedChecks >= 0);
  });

  it("penalizes distinct critical issues more than duplicates", () => {
    const manyDupes = computeScanScoreFromFindings(
      Array.from({ length: 20 }, () => ({
        severity: "CRITICAL",
        title: "Same secret",
      }))
    );
    const distinct = computeScanScoreFromFindings(
      Array.from({ length: 5 }, (_, i) => ({
        severity: "CRITICAL",
        title: `Secret ${i}`,
      }))
    );
    assert.ok(distinct.score < manyDupes.score);
  });
});
