import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseOrgSettings, DEFAULT_ORG_SETTINGS } from "../lib/org-settings.js";

describe("org settings integration", () => {
  it("parses empty settings into defaults including reserved MFA/SSO/digest fields", () => {
    const parsed = parseOrgSettings(null);
    assert.equal(parsed.notifications.gapAlerts, DEFAULT_ORG_SETTINGS.notifications.gapAlerts);
    assert.equal(parsed.security.ipAllowlist.length, 0);
    assert.equal(typeof parsed.security.mfaRequired, "boolean");
    assert.equal(typeof parsed.security.ssoEnforced, "boolean");
    assert.equal(typeof parsed.notifications.weeklyDigest, "boolean");
  });
});
