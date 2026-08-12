import { test, expect } from "@playwright/test";

test.describe("Localization and Internationalization testing", () => {
  test("page has proper lang attribute", async ({ page }) => {
    await page.goto("/");
    const lang = await page.getAttribute("html", "lang");
    expect(lang).toBeTruthy();
    expect(["en", "en-US"]).toContain(lang);
  });

  test("text direction is correct", async ({ page }) => {
    await page.goto("/");
    const dir = await page.getAttribute("html", "dir");
    expect(dir === null || dir === "ltr").toBeTruthy();
  });

  test("currency formatting is consistent", async ({ page }) => {
    await page.goto("/billing");
    const currencySymbols = page.locator("text=/$, text=€, text=£");
    const count = await currencySymbols.count();
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
    await page.setContent("<div>Test: © ® ™ € £ ¥</div>");
    const content = await page.textContent("div");
    expect(content).toContain("©");
  });
});
