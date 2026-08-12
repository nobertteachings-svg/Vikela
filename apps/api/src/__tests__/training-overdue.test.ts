import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeAssignmentStatus,
  computeModuleStatus,
} from "../services/training/sync-module-stats.js";

describe("training overdue status helpers", () => {
  const now = new Date("2026-08-10T12:00:00.000Z");

  it("keeps COMPLETE unchanged even when past due", () => {
    assert.equal(
      computeAssignmentStatus({
        current: "COMPLETE",
        dueAt: new Date("2026-01-01T00:00:00.000Z"),
        now,
      }),
      "COMPLETE"
    );
  });

  it("marks incomplete past-due assignments OVERDUE", () => {
    assert.equal(
      computeAssignmentStatus({
        current: "NOT_STARTED",
        dueAt: new Date("2026-08-01T00:00:00.000Z"),
        now,
      }),
      "OVERDUE"
    );
    assert.equal(
      computeAssignmentStatus({
        current: "IN_PROGRESS",
        dueAt: new Date("2026-08-01T00:00:00.000Z"),
        now,
      }),
      "OVERDUE"
    );
  });

  it("clears stale OVERDUE when due date is in the future", () => {
    assert.equal(
      computeAssignmentStatus({
        current: "OVERDUE",
        dueAt: new Date("2026-12-01T00:00:00.000Z"),
        now,
      }),
      "NOT_STARTED"
    );
  });

  it("computes module status from completion and overdue counts", () => {
    assert.equal(
      computeModuleStatus({
        assigned: 4,
        completed: 4,
        overdueCount: 0,
        dueAt: null,
        now,
      }),
      "COMPLETE"
    );
    assert.equal(
      computeModuleStatus({
        assigned: 4,
        completed: 1,
        overdueCount: 2,
        dueAt: new Date("2026-08-01T00:00:00.000Z"),
        now,
      }),
      "OVERDUE"
    );
    assert.equal(
      computeModuleStatus({
        assigned: 4,
        completed: 1,
        overdueCount: 0,
        dueAt: new Date("2026-08-01T00:00:00.000Z"),
        now,
      }),
      "AT_RISK"
    );
    assert.equal(
      computeModuleStatus({
        assigned: 4,
        completed: 1,
        overdueCount: 0,
        dueAt: new Date("2026-12-01T00:00:00.000Z"),
        now,
      }),
      "ON_TRACK"
    );
  });
});
