import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const authFile = path.join(__dirname, "playwright/.clerk/user.json");
const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    ...(clerkConfigured
      ? [
          {
            name: "setup",
            testMatch: /global\.setup\.ts/,
          },
        ]
      : []),
    {
      name: "chromium",
      testIgnore: [
        /global\.setup\.ts/,
        /user-acceptance\.spec\.ts/,
        /clickable-audit\.spec\.ts$/,
      ],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium-authenticated",
      testMatch: /user-acceptance\.spec\.ts|clickable-audit\.spec\.ts$/,
      use: {
        ...devices["Desktop Chrome"],
        ...(clerkConfigured ? { storageState: authFile } : {}),
      },
      dependencies: clerkConfigured ? ["setup"] : [],
    },
    {
      name: "firefox",
      testIgnore: [
        /global\.setup\.ts/,
        /user-acceptance\.spec\.ts/,
        /clickable-audit\.spec\.ts$/,
      ],
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      testIgnore: [
        /global\.setup\.ts/,
        /user-acceptance\.spec\.ts/,
        /clickable-audit\.spec\.ts$/,
      ],
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "Mobile Chrome",
      testIgnore: [
        /global\.setup\.ts/,
        /user-acceptance\.spec\.ts/,
        /clickable-audit\.spec\.ts$/,
      ],
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: process.env.CI
    ? undefined
    : {
        command: "npm run dev -w @vikela/web",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
