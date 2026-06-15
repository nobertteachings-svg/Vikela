import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isMembershipBootstrapPath } from "../lib/membership.js";

describe("membership bootstrap paths", () => {
  it("allows onboarding status without membership check", () => {
    assert.equal(isMembershipBootstrapPath("/api/v1/onboarding/status"), true);
    assert.equal(isMembershipBootstrapPath("/api/v1/onboarding/ensure-membership"), true);
    assert.equal(isMembershipBootstrapPath("/api/v1/onboarding/lite-scan"), true);
    assert.equal(isMembershipBootstrapPath("/api/v1/onboarding/lite-scan/status"), true);
    assert.equal(isMembershipBootstrapPath("/api/v1/onboarding/framework-selection"), true);
    assert.equal(isMembershipBootstrapPath("/api/v1/dashboard"), false);
  });
});
