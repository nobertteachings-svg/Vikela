import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { notificationPrefsFromOrgSettings } from "../lib/notify-helpers.js";

describe("notificationPrefsFromOrgSettings", () => {
  it("defaults both prefs to true when settings are missing", () => {
    assert.deepEqual(notificationPrefsFromOrgSettings(null), {
      scanComplete: true,
      gapAlerts: true,
    });
    assert.deepEqual(notificationPrefsFromOrgSettings(undefined), {
      scanComplete: true,
      gapAlerts: true,
    });
  });

  it("reads explicit notification toggles", () => {
    assert.deepEqual(
      notificationPrefsFromOrgSettings({
        notifications: { scanComplete: false, gapAlerts: true },
      }),
      {
        scanComplete: false,
        gapAlerts: true,
      }
    );
  });

  it("falls back per-key when only one toggle is set", () => {
    assert.deepEqual(
      notificationPrefsFromOrgSettings({
        notifications: { gapAlerts: false },
      }),
      {
        scanComplete: true,
        gapAlerts: false,
      }
    );
  });
});
