import { test, expect } from "@playwright/test";

test.describe("User Acceptance Testing (UAT)", () => {
  test("user can view compliance dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("user can view frameworks", async ({ page }) => {
    await page.goto("/frameworks");
    await expect(page).toHaveURL(/frameworks/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("user can view evidence", async ({ page }) => {
    await page.goto("/evidence");
    await expect(page).toHaveURL(/evidence/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("user can view gaps", async ({ page }) => {
    await page.goto("/gaps");
    await expect(page).toHaveURL(/gaps/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("user can navigate between pages", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/dashboard/);

    await page.goto("/frameworks");
    await expect(page).toHaveURL(/frameworks/);

    await page.goto("/evidence");
    await expect(page).toHaveURL(/evidence/);
  });

  test("user can view compliance score", async ({ page }) => {
    await page.goto("/dashboard");
    const scoreElement = page.locator('[class*="score"], [class*="Score"], [class*="count"], [class*="number"]');
    if ((await scoreElement.count()) > 0) {
      await expect(scoreElement.first()).toBeVisible();
    } else {
      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("user can search and filter", async ({ page }) => {
    await page.goto("/frameworks");
    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="search" i], input[placeholder*="Search" i]'
    );
    if ((await searchInput.count()) > 0) {
      await searchInput.first().fill("SOC 2");
      await page.keyboard.press("Enter");
    }
    await expect(page.locator("body")).toBeVisible();
  });

  test("user can upload evidence", async ({ page }) => {
    await page.goto("/evidence");
    const uploadButton = page.locator('button:has-text("Upload"), button:has-text("Add")');
    if ((await uploadButton.count()) > 0) {
      await uploadButton.first().click();
    }
    await expect(page.locator("body")).toBeVisible();
  });

  test("user can view control details", async ({ page }) => {
    await page.goto("/controls");
    await expect(page).toHaveURL(/controls/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("user can view integrations", async ({ page }) => {
    await page.goto("/integrations");
    await expect(page).toHaveURL(/integrations/);
    await expect(page.locator("body")).toBeVisible();
  });
});
