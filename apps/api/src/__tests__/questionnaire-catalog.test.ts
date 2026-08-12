import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  QUESTIONNAIRE_CATEGORIES,
  VENDOR_SECURITY_CATALOG,
  catalogCreateRows,
} from "../services/questionnaires/catalog.js";

describe("questionnaire catalog", () => {
  it("covers all production categories with enough questions", () => {
    assert.ok(VENDOR_SECURITY_CATALOG.length >= 24);
    for (const cat of QUESTIONNAIRE_CATEGORIES) {
      assert.ok(
        VENDOR_SECURITY_CATALOG.some((q) => q.category === cat),
        `missing category: ${cat}`
      );
    }
  });

  it("catalogCreateRows seeds PENDING with category and sortOrder", () => {
    const rows = catalogCreateRows();
    assert.equal(rows.length, VENDOR_SECURITY_CATALOG.length);
    assert.equal(rows[0]?.status, "PENDING");
    assert.ok(rows[0]?.category);
    assert.ok(rows.every((r, i) => r.sortOrder === i));
    assert.ok(rows.every((r) => r.question.length > 20 && r.suggestedAnswer.length > 10));
  });
});
