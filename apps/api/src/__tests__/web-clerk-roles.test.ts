import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canExportEvidence,
  isAuditor,
  isAuditorBlockedPath,
  navItemsForAuditor,
  parseOrgRole,
} from "../../../web/lib/clerk-roles.js";

describe("web clerk-roles", () => {
  it("parses auditor org role", () => {
    assert.equal(parseOrgRole("org:auditor"), "auditor");
    assert.equal(isAuditor("org:auditor"), true);
  });

  it("treats missing orgRole as member", () => {
    assert.equal(parseOrgRole(undefined), "member");
    assert.equal(isAuditor(undefined), false);
    assert.equal(canExportEvidence(undefined), false);
  });

  it("blocks auditor from admin routes", () => {
    assert.equal(isAuditorBlockedPath("/settings"), true);
    assert.equal(isAuditorBlockedPath("/onboarding/connect-repos"), true);
    assert.equal(isAuditorBlockedPath("/dashboard"), false);
  });

  it("filters nav items for auditors", () => {
    const items = [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/scans", label: "Scans" },
      { divider: true },
      { href: "/settings", label: "Settings" },
    ];
    const filtered = navItemsForAuditor(items, true);
    assert.deepEqual(
      filtered.map((i) => i.href ?? "divider"),
      ["/dashboard"]
    );
  });
});
