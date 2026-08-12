import { test, expect } from "@playwright/test";

test.describe.configure({ timeout: 90_000 });

const MARKETING_ROUTES = ["/", "/docs", "/privacy", "/security", "/terms"] as const;

test.describe("Marketing + auth clickables", () => {
  test("marketing pages load and primary CTAs resolve", async ({ page }) => {
    for (const route of MARKETING_ROUTES) {
      let lastErr: unknown;
      for (let i = 0; i < 3; i++) {
        try {
          const res = await page.goto(route, { waitUntil: "domcontentloaded", timeout: 45_000 });
          expect(res?.status() ?? 0).toBeLessThan(500);
          await expect(page.locator("body")).toBeVisible();
          lastErr = null;
          break;
        } catch (e) {
          lastErr = e;
          await page.waitForTimeout(500);
        }
      }
      if (lastErr) throw lastErr;
    }

    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 45_000 });
    const signUp = page.locator('a[href="/sign-up"]').first();
    await expect(signUp).toBeVisible({ timeout: 20_000 });
    await signUp.click();
    await expect(page).toHaveURL(/sign-up/i, { timeout: 20_000 });

    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.locator('a[href="/login"]').first().click();
    await expect(page).toHaveURL(/sign-in|login/i, { timeout: 20_000 });
  });
});
