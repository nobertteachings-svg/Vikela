import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scoreFromGapCounts, deriveControlStatus } from "../lib/framework-score.js";

describe("scoreFromGapCounts", () => {
  it("returns 0 when framework has no controls", () => {
    assert.equal(scoreFromGapCounts(0, 0), 0);
  });

  it("returns 100 when every control is gap-free", () => {
    assert.equal(scoreFromGapCounts(10, 0), 100);
  });

  it("returns 0 when every control has an open gap", () => {
    assert.equal(scoreFromGapCounts(5, 5), 0);
  });

  it("rounds percentage of gap-free controls", () => {
    assert.equal(scoreFromGapCounts(4, 1), 75);
    assert.equal(scoreFromGapCounts(3, 1), 67);
  });
});

describe("deriveControlStatus", () => {
  it("returns NOT_STARTED before any completed scan", () => {
    assert.equal(deriveControlStatus(0, false), "NOT_STARTED");
    assert.equal(deriveControlStatus(3, false), "NOT_STARTED");
  });

  it("returns NEEDS_REVIEW when open gaps exist after scan", () => {
    assert.equal(deriveControlStatus(1, true), "NEEDS_REVIEW");
  });

  it("returns IMPLEMENTED when gap-free after scan", () => {
    assert.equal(deriveControlStatus(0, true), "IMPLEMENTED");
  });
});
