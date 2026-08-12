import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GitlabProvider } from "../services/git/gitlab/gitlab.provider.js";

describe("GitLab webhook token verification", () => {
  const provider = new GitlabProvider("");

  it("accepts matching X-Gitlab-Token (static secret, not HMAC)", () => {
    const secret = "gitlab-test-secret";
    assert.equal(provider.verifyWebhookSignature("any-body", secret, secret), true);
  });

  it("rejects mismatched token", () => {
    assert.equal(
      provider.verifyWebhookSignature("{}", "wrong-token", "gitlab-test-secret"),
      false
    );
  });

  it("rejects empty token or secret", () => {
    assert.equal(provider.verifyWebhookSignature("{}", "", "secret"), false);
    assert.equal(provider.verifyWebhookSignature("{}", "token", ""), false);
  });
});
