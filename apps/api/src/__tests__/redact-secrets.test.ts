import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { redactCodeSnippet } from "../lib/redact-secrets.js";

describe("redactCodeSnippet", () => {
  it("redacts AWS access keys", () => {
    const input = 'const key = "AKIAIOSFODNN7EXAMPLE";';
    const out = redactCodeSnippet(input);
    assert.ok(out?.includes("[REDACTED"));
    assert.ok(!out?.includes("AKIAIOSFODNN7EXAMPLE"));
  });

  it("redacts GitHub tokens", () => {
    const input = "ghp_1234567890abcdefghijklmnopqrstuvwxyz";
    const out = redactCodeSnippet(input);
    assert.ok(out?.includes("[REDACTED"));
  });

  it("passes through benign snippets", () => {
    const input = "console.log('hello world');";
    assert.equal(redactCodeSnippet(input), input);
  });

  it("handles null/undefined", () => {
    assert.equal(redactCodeSnippet(null), null);
    assert.equal(redactCodeSnippet(undefined), null);
  });
});
