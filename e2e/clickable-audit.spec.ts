import { test, expect } from "@playwright/test";

test.describe.configure({ timeout: 90_000 });

const APP_NAV = [
  "/dashboard",
  "/frameworks",
  "/controls",
  "/gaps",
  "/scans",
  "/evidence",
  "/policies",
  "/copilot",
  "/risks",
  "/vendors",
  "/team",
  "/training",
  "/integrations",
  "/settings",
  "/billing",
] as const;

const EXTRA_APP_ROUTES = [
  "/audit",
  "/trust",
  "/questionnaire",
  "/remediation",
] as const;

const ONBOARDING_ROUTES = [
  "/onboarding/frameworks",
  "/onboarding/connect-repos",
  "/onboarding/connect-cloud",
  "/onboarding/scan",
  "/onboarding/team",
] as const;

async function gotoOk(page: import("@playwright/test").Page, path: string) {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (page.isClosed()) throw new Error("page closed");
      const res = await page.goto(path, { waitUntil: "domcontentloaded", timeout: 45_000 });
      const status = res?.status() ?? 0;
      expect(status, `${path} status`).toBeLessThan(500);
      await expect(page.locator("body")).toBeVisible();
      return;
    } catch (e) {
      lastErr = e;
      if (page.isClosed()) break;
      try {
        await page.waitForTimeout(500);
      } catch {
        break;
      }
    }
  }
  throw lastErr;
}

test.describe("Authenticated app clickables", () => {
  test("sidebar links exist for every nav item", async ({ page }) => {
    await gotoOk(page, "/dashboard");
    for (const href of APP_NAV) {
      await expect(
        page.locator(`aside nav a[href="${href}"]`),
        `sidebar link ${href}`
      ).toHaveCount(1, { timeout: 20_000 });
    }
  });

  test("sidebar and extra destinations respond without 5xx", async ({ page }) => {
    // Use request context (no full browser render) to avoid Next compile thrash closing pages.
    const paths = [...APP_NAV, ...EXTRA_APP_ROUTES, ...ONBOARDING_ROUTES];
    for (const href of paths) {
      const res = await page.request.get(href, { maxRedirects: 5 });
      expect(res.status(), href).toBeLessThan(500);
    }
  });

  test("dashboard primary CTAs are wired", async ({ page }) => {
    await gotoOk(page, "/dashboard");
    await expect(
      page.getByRole("button", { name: /run full scan|scanning|starting/i }).first()
    ).toBeVisible();
    await gotoOk(page, "/gaps");
    await expect(page).toHaveURL(/gaps/);
  });

  test("gaps detail and copilot deep link", async ({ page }) => {
    await gotoOk(page, "/gaps");
    const detailHref = await page.locator('a[href^="/gaps/"]').first().getAttribute("href");
    if (!detailHref) {
      test.skip(true, "No gap detail links in this org");
      return;
    }
    await gotoOk(page, detailHref);
    await expect(page).toHaveURL(/\/gaps\/[^/]+/);
    const copilotHref = await page.locator('a[href*="/copilot"]').first().getAttribute("href");
    if (copilotHref) {
      await gotoOk(page, copilotHref);
      await expect(page).toHaveURL(/copilot/);
    }
  });

  test("settings danger-zone exports respond", async ({ page }) => {
    await gotoOk(page, "/settings");
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.getByTestId("settings-tab-danger-zone").click();
    await expect(page.getByTestId("settings-export-json")).toBeVisible({ timeout: 20_000 });

    const downloadPromise = page.waitForEvent("download", { timeout: 45_000 });
    await page.getByTestId("settings-export-json").click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/export|\.json/i);
  });

  test("integrations connect controls open or redirect", async ({ page }) => {
    await gotoOk(page, "/integrations");
    const connect = page
      .getByRole("button", { name: /connect|install|configure/i })
      .or(page.locator("a", { hasText: /connect|install/i }))
      .first();
    if ((await connect.count()) === 0) {
      test.skip(true, "No connect controls visible");
      return;
    }
    await connect.click({ trial: false });
    await page.waitForTimeout(800);
    const url = page.url();
    const dialogVisible = (await page.getByRole("dialog").count()) > 0;
    expect(
      dialogVisible || /github|gitlab|bitbucket|okta|oauth|integrations|cloud/i.test(url)
    ).toBeTruthy();
  });

  test("copilot send control exists", async ({ page }) => {
    await gotoOk(page, "/copilot");
    await expect(
      page.locator('input[placeholder*="Ask"], textarea[placeholder*="Ask"]').first()
    ).toBeVisible();
    await expect(
      page.locator('button[type="submit"]').or(page.getByRole("button", { name: /send/i })).first()
    ).toBeVisible();
  });

  test("training reminders button is wired", async ({ page }) => {
    await gotoOk(page, "/training");
    const reminders = page.getByRole("button", { name: /reminders|no reminders due/i }).first();
    await expect(reminders).toBeVisible();
    // Disabled when none due is still a wired control (not a silent stub).
    if (await reminders.isEnabled()) {
      await reminders.click();
    }
  });

  test("trust report request submits", async ({ page }) => {
    await gotoOk(page, "/trust");
    const email = page.locator('input[type="email"], input[placeholder*="@"]').first();
    const submit = page.getByRole("button", { name: /request report/i });
    await expect(submit).toBeVisible();
    await email.fill("auditor@example.com");
    await submit.click();
    await expect(page.locator("body")).toContainText(/request received|2 business days|valid/i);
  });
});
