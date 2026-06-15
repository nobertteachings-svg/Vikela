import { test, expect } from "@playwright/test";

test.describe("Regression testing", () => {
  const apiUrl = process.env.PLAYWRIGHT_API_URL ?? "http://localhost:3001";

  test("regression: evidence upload still works", async ({ request }) => {
    const boundary = "----vikela-e2e";
    const body = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="title"',
      "",
      "Regression Test Evidence",
      `--${boundary}`,
      'Content-Disposition: form-data; name="type"',
      "",
      "OTHER",
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="regression-test.txt"',
      "Content-Type: text/plain",
      "",
      "regression test fixture",
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
  });

  test("regression: framework listing still works", async ({ request }) => {
    const res = await request.get(`${apiUrl}/api/v1/frameworks`, {
      headers: { "X-Org-Slug": "demo" },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(Array.isArray(json.data)).toBeTruthy();
  });

  test("regression: dashboard data still loads", async ({ request }) => {
    const res = await request.get(`${apiUrl}/api/v1/dashboard`, {
      headers: { "X-Org-Slug": "demo" },
    });
    expect(res.ok()).toBeTruthy();
  });

  test("regression: health endpoint still responds", async ({ request }) => {
    const res = await request.get(`${apiUrl}/health`);
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.status).toBe("ok");
  });

  test("regression: controls endpoint still works", async ({ request }) => {
    const res = await request.get(`${apiUrl}/api/v1/controls`, {
      headers: { "X-Org-Slug": "demo" },
    });
    expect(res.ok()).toBeTruthy();
  });

  test("regression: gaps endpoint still works", async ({ request }) => {
    const res = await request.get(`${apiUrl}/api/v1/gaps`, {
      headers: { "X-Org-Slug": "demo" },
    });
    expect(res.ok()).toBeTruthy();
  });
});
