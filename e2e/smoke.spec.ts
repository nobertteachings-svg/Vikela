import { test, expect } from "@playwright/test";
import { apiHeaders, apiBaseUrl } from "./helpers/api";

test("marketing home page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();
});

test("API health endpoint", async ({ request }) => {
  const apiUrl = apiBaseUrl();
  const res = await request.get(`${apiUrl}/health`);
  expect(res.ok()).toBeTruthy();
  const json = await res.json();
  expect(json.status).toBe("ok");
});

test("evidence upload flow", async ({ request }) => {
  const apiUrl = apiBaseUrl();
  const uploadRes = await request.post(`${apiUrl}/api/v1/evidence`, {
    headers: apiHeaders(),
    multipart: {
      title: "E2E evidence",
      type: "OTHER",
      file: {
        name: "e2e-evidence.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("audit evidence fixture"),
      },
    },
  });

  if (!uploadRes.ok()) {
    const body = await uploadRes.text();
    test.skip(/s3:PutObject|not authorized/i.test(body), `S3 not writable in this env: ${body.slice(0, 120)}`);
  }
  expect(uploadRes.ok()).toBeTruthy();
  const json = await uploadRes.json();
  expect(json.data?.id).toBeTruthy();

  const listRes = await request.get(`${apiUrl}/api/v1/evidence`, {
    headers: apiHeaders(),
  });
  expect(listRes.ok()).toBeTruthy();
  const list = await listRes.json();
  expect(Array.isArray(list.data)).toBeTruthy();
  expect(list.data.some((e: { title: string }) => e.title === "E2E evidence")).toBeTruthy();
});
