import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("production auth helpers", () => {
  it("treats production NODE_ENV as enforced when clerk is absent", async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    delete process.env.CLERK_SECRET_KEY;
    const { isAuthEnforced } = await import("../lib/auth.js");
    assert.equal(isAuthEnforced(), true);
    process.env.NODE_ENV = prev;
  });
});
