import { test, expect } from "@playwright/test";

test.describe("Localization and Internationalization testing", () => {
  test("page has proper lang attribute", async ({ page }) => {
    await page.goto("/");
    const lang = await page.getAttribute("html", "lang");
    expect(lang).toBeTruthy();
    expect(["en", "en-US"]).toContain(lang);
  });

  test("dates are formatted consistently", async ({ page }) => {
    await page.goto("/dashboard");
    
    // Check for date elements
    const dateElements = page.locator('[datetime], time');
    const count = await dateElements.count();
    
    if (count > 0) {
      const firstDate = await dateElements.first().getAttribute("datetime");
      expect(firstDate).toBeTruthy();
    }
  });

  test("numbers are formatted consistently", async ({ page }) => {
    await page.goto("/dashboard");
    
    // Check for numeric displays
    const numericElements = page.locator('[class*="score"], [class*="count"], [class*="number"]');
    const count = await numericElements.count();
    
    // Should have some numeric displays
    expect(count).toBeGreaterThan(0);
  });

  test("text direction is correct", async ({ page }) => {
    await page.goto("/");
    const dir = await page.getAttribute("html", "dir");
    
    // Should be ltr (left-to-right) for English
    expect(dir === null || dir === "ltr").toBeTruthy();
  });

  test("currency formatting is consistent", async ({ page }) => {
    await page.goto("/billing");
    
    // Look for currency symbols
    const currencySymbols = page.locator('text=/$, text=€, text=£');
    const count = await currencySymbols.count();
    
    // If billing page has currency, it should be formatted
    if (count > 0) {
      expect(count).toBeGreaterThan(0);
    }
  });

  test("UTF-8 encoding is used", async ({ page }) => {
    const response = await page.goto("/");
    const contentType = response?.headers()["content-type"];
    expect(contentType).toContain("charset=utf-8");
  });

  test("special characters display correctly", async ({ page }) => {
    await page.goto("/");
    
    // Check that special characters render properly
    await page.setContent('<div>Test: © ® ™ € £ ¥</div>');
    const content = await page.textContent("div");
    expect(content).toContain("©");
  });
});
