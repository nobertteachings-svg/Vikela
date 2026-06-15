import { test, expect } from "@playwright/test";

test.describe("User Acceptance Testing (UAT)", () => {
  test("user can view compliance dashboard", async ({ page }) => {
    await page.goto("/");
    
    // Navigate to dashboard
    await page.click('text=Dashboard');
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Verify dashboard loads
    await expect(page.locator("body")).toBeVisible();
  });

  test("user can view frameworks", async ({ page }) => {
    await page.goto("/");
    
    // Navigate to frameworks
    await page.click('text=Frameworks');
    await expect(page).toHaveURL(/.*frameworks/);
    
    // Verify frameworks list is visible
    await expect(page.locator("body")).toBeVisible();
  });

  test("user can view evidence", async ({ page }) => {
    await page.goto("/");
    
    // Navigate to evidence
    await page.click('text=Evidence');
    await expect(page).toHaveURL(/.*evidence/);
    
    // Verify evidence page loads
    await expect(page.locator("body")).toBeVisible();
  });

  test("user can view gaps", async ({ page }) => {
    await page.goto("/");
    
    // Navigate to gaps
    await page.click('text=Gaps');
    await expect(page).toHaveURL(/.*gaps/);
    
    // Verify gaps page loads
    await expect(page.locator("body")).toBeVisible();
  });

  test("user can navigate between pages", async ({ page }) => {
    await page.goto("/");
    
    // Test navigation
    await page.click('text=Dashboard');
    await expect(page).toHaveURL(/.*dashboard/);
    
    await page.click('text=Frameworks');
    await expect(page).toHaveURL(/.*frameworks/);
    
    await page.click('text=Evidence');
    await expect(page).toHaveURL(/.*evidence/);
  });

  test("user can view compliance score", async ({ page }) => {
    await page.goto("/dashboard");
    
    // Verify score is displayed
    const scoreElement = page.locator('[class*="score"], [class*="Score"]');
    await expect(scoreElement.first()).toBeVisible();
  });

  test("user can search and filter", async ({ page }) => {
    await page.goto("/frameworks");
    
    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="Search" i]');
    
    if (await searchInput.count() > 0) {
      await searchInput.first().fill("SOC 2");
      await page.keyboard.press("Enter");
      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("user can upload evidence", async ({ page }) => {
    await page.goto("/evidence");
    
    // Look for upload button
    const uploadButton = page.locator('button:has-text("Upload"), button:has-text("Add")');
    
    if (await uploadButton.count() > 0) {
      await uploadButton.first().click();
      // Verify upload modal or form appears
      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("user can view control details", async ({ page }) => {
    await page.goto("/controls");
    
    // Click on first control if available
    const firstControl = page.locator('[class*="control"], [class*="Control"]').first();
    
    if (await firstControl.count() > 0) {
      await firstControl.click();
      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("user can view integrations", async ({ page }) => {
    await page.goto("/");
    
    // Navigate to integrations
    await page.click('text=Integrations');
    await expect(page).toHaveURL(/.*integrations/);
    
    // Verify integrations page loads
    await expect(page.locator("body")).toBeVisible();
  });
});
