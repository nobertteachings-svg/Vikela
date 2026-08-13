import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  collectFromGapsMessageTone,
  formatCollectFromGapsMessage,
} from "../../../web/lib/collect-from-gaps.js";

describe("formatCollectFromGapsMessage", () => {
  it("reports created and skipped counts", () => {
    assert.equal(
      formatCollectFromGapsMessage({ created: 5, skipped: 3, openGaps: 8 }),
      "5 evidence records created, 3 already existed"
    );
  });

  it("reports already collected when nothing new is created", () => {
    assert.equal(
      formatCollectFromGapsMessage({ created: 0, skipped: 8, openGaps: 8 }),
      "Evidence already collected for all open gaps"
    );
  });

  it("prompts to scan when there are no open gaps", () => {
    assert.equal(
      formatCollectFromGapsMessage({ created: 0, skipped: 0, openGaps: 0 }),
      "No open gaps to collect from, run a scan first"
    );
  });

  it("uses success tone when records are created", () => {
    assert.equal(collectFromGapsMessageTone({ created: 2, skipped: 0, openGaps: 2 }), "success");
  });
});
