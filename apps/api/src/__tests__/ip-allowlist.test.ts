import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isIpAllowed,
  isValidAllowlistEntry,
  normalizeAllowlist,
} from "../lib/ip-allowlist.js";

describe("isValidAllowlistEntry", () => {
  it("accepts IPv4 addresses and CIDR ranges", () => {
    assert.equal(isValidAllowlistEntry("198.51.100.42"), true);
    assert.equal(isValidAllowlistEntry("192.168.1.0/24"), true);
    assert.equal(isValidAllowlistEntry("not-an-ip"), false);
    assert.equal(isValidAllowlistEntry("192.168.1.0/99"), false);
  });
});

describe("normalizeAllowlist", () => {
  it("dedupes and drops invalid entries", () => {
    assert.deepEqual(
      normalizeAllowlist([" 10.0.0.1 ", "10.0.0.1", "bad", "10.0.0.0/8"]),
      ["10.0.0.1", "10.0.0.0/8"]
    );
  });
});

describe("isIpAllowed", () => {
  it("allows all when allowlist is empty", () => {
    assert.equal(isIpAllowed("203.0.113.10", []), true);
  });

  it("matches exact IPv4 entries", () => {
    assert.equal(isIpAllowed("203.0.113.10", ["203.0.113.10"]), true);
    assert.equal(isIpAllowed("203.0.113.11", ["203.0.113.10"]), false);
  });

  it("matches IPv4 CIDR ranges", () => {
    const allowlist = ["192.168.1.0/24"];
    assert.equal(isIpAllowed("192.168.1.42", allowlist), true);
    assert.equal(isIpAllowed("192.168.2.1", allowlist), false);
  });
});
