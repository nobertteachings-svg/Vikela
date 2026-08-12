import { clerk, clerkSetup } from "@clerk/testing/playwright";
import { test as setup, expect } from "@playwright/test";
import path from "node:path";

setup.describe.configure({ mode: "serial" });

const authFile = path.join(__dirname, "../playwright/.clerk/user.json");

setup("global setup", async () => {
  await clerkSetup();
});

setup("authenticate and save Clerk storage state", async ({ page }) => {
  setup.setTimeout(90_000);
  const email = process.env.E2E_CLERK_USER_EMAIL?.trim();
  setup.skip(!email, "Set E2E_CLERK_USER_EMAIL to a Clerk user email for authenticated e2e");

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await clerk.signIn({
    page,
    emailAddress: email!,
  });

  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/dashboard/);
  await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible({ timeout: 30_000 });

  await page.context().storageState({ path: authFile });
});
