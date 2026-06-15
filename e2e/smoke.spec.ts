import { test, expect } from "@playwright/test";

test("marketing home page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();
});

test("API health endpoint", async ({ request }) => {
  const apiUrl = process.env.PLAYWRIGHT_API_URL ?? "http://localhost:3001";
  const res = await request.get(`${apiUrl}/health`);
  expect(res.ok()).toBeTruthy();
  const json = await res.json();
  expect(json.status).toBe("ok");
});

test("evidence upload flow", async ({ request }) => {
  const apiUrl = process.env.PLAYWRIGHT_API_URL ?? "http://localhost:3001";
  const boundary = "----vikela-e2e";
  const body = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="title"',
    "",
    "E2E evidence",
    `--${boundary}`,
    'Content-Disposition: form-data; name="type"',
    "",
    "OTHER",
    `--${boundary}`,
    'Content-Disposition: form-data; name="file"; filename="e2e-evidence.txt"',
    "Content-Type: text/plain",
    "",
    "audit evidence fixture",
    `--${boundary}--`,
    "",
  ].join("\r\n");

  const uploadRes = await request.post(`${apiUrl}/api/v1/evidence`, {
    headers: {
      "X-Org-Slug": "demo",
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
    data: body,
  });

  expect(uploadRes.ok()).toBeTruthy();
  const json = await uploadRes.json();
  expect(json.data?.id).toBeTruthy();

  const listRes = await request.get(`${apiUrl}/api/v1/evidence`, {
    headers: { "X-Org-Slug": "demo" },
  });
  expect(listRes.ok()).toBeTruthy();
  const list = await listRes.json();
  expect(Array.isArray(list.data)).toBeTruthy();
  expect(list.data.some((e: { title: string }) => e.title === "E2E evidence")).toBeTruthy();
});
