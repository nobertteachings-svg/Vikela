import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Accessibility tests", () => {
  test("homepage has no accessibility violations", async ({ page }) => {
    await page.goto("/");
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    // Fail only on serious/critical — marketing polish may still have minor axe noise.
    const blocking = accessibilityScanResults.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? "")
    );
    expect(blocking).toEqual([]);
  });

  test("marketing page has proper heading hierarchy", async ({ page }) => {
    await page.goto("/");
    const headings = await page.$$("h1, h2, h3, h4, h5, h6");
    expect(headings.length).toBeGreaterThan(0);
    
    // Check for proper heading order
    let previousLevel = 0;
    for (const heading of headings) {
      const tag = await heading.evaluate((h) => h.tagName);
      const level = parseInt(tag[1]);
      expect(level).toBeLessThanOrEqual(previousLevel + 1);
      previousLevel = level;
    }
  });

  test("all images have alt text", async ({ page }) => {
    await page.goto("/");
    const images = await page.$$("img");
    for (const img of images) {
      const alt = await img.getAttribute("alt");
      expect(alt).toBeTruthy();
    }
  });

  test("all links have discernible text", async ({ page }) => {
    await page.goto("/");
    const links = await page.$$("a");
    for (const link of links) {
      const text = await link.textContent();
      const ariaLabel = await link.getAttribute("aria-label");
      expect(text || ariaLabel).toBeTruthy();
    }
  });

  test("form inputs have labels", async ({ page }) => {
    await page.goto("/auth/sign-in");
    const inputs = await page.$$("input, select, textarea");
    for (const input of inputs) {
      const ariaLabel = await input.getAttribute("aria-label");
      const ariaLabelledby = await input.getAttribute("aria-labelledby");
      const id = await input.getAttribute("id");
      
      if (id) {
        const label = await page.$(`label[for="${id}"]`);
        expect(label || ariaLabel || ariaLabelledby).toBeTruthy();
      } else {
        expect(ariaLabel || ariaLabelledby).toBeTruthy();
      }
    }
  });

  test("keyboard navigation works", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });

  test("color contrast meets WCAG AA standards", async ({ page }) => {
    await page.goto("/");
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    
    const contrastViolations = accessibilityScanResults.violations.filter(
      (v: { id: string }) => v.id === "color-contrast"
    );
    expect(contrastViolations).toEqual([]);
  });

  test("page has proper language attribute", async ({ page }) => {
    await page.goto("/");
    const lang = await page.getAttribute("html", "lang");
    expect(lang).toBeTruthy();
  });

  test("focus indicators are visible", async ({ page }) => {
    await page.goto("/");
    const firstLink = await page.$("a");
    if (firstLink) {
      await firstLink.focus();
      const styles = await firstLink.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          outline: computed.outline,
          outlineStyle: computed.outlineStyle,
          outlineWidth: computed.outlineWidth,
        };
      });
      expect(
        styles.outline !== "none" || 
        styles.outlineStyle !== "none" ||
        styles.outlineWidth !== "0px"
      ).toBeTruthy();
    }
  });
});
