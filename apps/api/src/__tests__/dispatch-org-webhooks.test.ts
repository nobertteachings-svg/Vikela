import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";
import { signWebhookBody, scanCompletedPayload } from "../lib/dispatch-org-webhooks.js";

describe("signWebhookBody", () => {
  it("produces stable HMAC-SHA256 hex", () => {
    const body = JSON.stringify({ event: "gap.created", data: { gapId: "g1" } });
    const expected = createHmac("sha256", "test-secret").update(body).digest("hex");
    assert.equal(signWebhookBody("test-secret", body), expected);
  });

  it("changes when secret or body changes", () => {
    const body = '{"event":"scan.completed"}';
    const a = signWebhookBody("secret-a", body);
    const b = signWebhookBody("secret-b", body);
    const c = signWebhookBody("secret-a", '{"event":"gap.created"}');
    assert.notEqual(a, b);
    assert.notEqual(a, c);
  });
});

describe("scanCompletedPayload", () => {
  it("matches production scan.completed shape", () => {
    const payload = scanCompletedPayload({
      id: "scan_1",
      scanType: "CODE",
      status: "COMPLETED",
      score: 82,
      gapCount: 3,
      isLiteScan: true,
      completedAt: new Date("2025-03-01T12:00:00.000Z"),
    });
    assert.equal(payload.scanId, "scan_1");
    assert.equal(payload.gapCount, 3);
    assert.equal(payload.isLiteScan, true);
    assert.equal(payload.completedAt, "2025-03-01T12:00:00.000Z");
  });
});

describe("dispatchOrgWebhooks envelope", () => {
  it("documents expected signature header format", () => {
    const body = '{"id":"d1","event":"scan.completed"}';
    const sig = signWebhookBody("whsec", body);
    assert.match(`sha256=${sig}`, /^sha256=[a-f0-9]{64}$/);
  });
});
