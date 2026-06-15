import { test, expect } from "@playwright/test";

test.describe("Contract testing - API contracts", () => {
  const apiUrl = process.env.PLAYWRIGHT_API_URL ?? "http://localhost:3001";

  test("GET /health returns correct contract", async ({ request }) => {
    const res = await request.get(`${apiUrl}/health`);
    expect(res.status()).toBe(200);
    
    const json = await res.json();
    expect(json).toHaveProperty("status");
    expect(typeof json.status).toBe("string");
    expect(json.status).toBe("ok");
  });

  test("GET /api/v1/frameworks returns correct contract", async ({ request }) => {
    const res = await request.get(`${apiUrl}/api/v1/frameworks`, {
      headers: { "X-Org-Slug": "demo" },
    });
    expect(res.status()).toBe(200);
    
    const json = await res.json();
    expect(json).toHaveProperty("data");
    expect(Array.isArray(json.data)).toBeTruthy();
    
    if (json.data.length > 0) {
      const framework = json.data[0];
      expect(framework).toHaveProperty("id");
      expect(framework).toHaveProperty("name");
      expect(typeof framework.id).toBe("string");
      expect(typeof framework.name).toBe("string");
    }
  });

  test("POST /api/v1/evidence returns correct contract", async ({ request }) => {
    const res = await request.post(`${apiUrl}/api/v1/evidence`, {
      headers: {
        "X-Org-Slug": "demo",
        "Content-Type": "application/json",
      },
      data: {
        title: "Contract Test Evidence",
        type: "OTHER",
      },
    });
    
    expect([200, 201]).toContain(res.status());
    
    const json = await res.json();
    expect(json).toHaveProperty("data");
    expect(json.data).toHaveProperty("id");
    expect(typeof json.data.id).toBe("string");
  });

  test("API returns proper content-type headers", async ({ request }) => {
    const res = await request.get(`${apiUrl}/api/v1/frameworks`, {
      headers: { "X-Org-Slug": "demo" },
    });
    
    const contentType = res.headers()["content-type"];
    expect(contentType).toContain("application/json");
  });

  test("API returns proper error contract", async ({ request }) => {
    const res = await request.get(`${apiUrl}/api/v1/nonexistent`, {
      headers: { "X-Org-Slug": "demo" },
    });
    
    expect(res.status()).toBe(404);
    
    const json = await res.json();
    expect(json).toHaveProperty("error");
    expect(typeof json.error).toBe("string");
  });

  test("API validates required headers", async ({ request }) => {
    const res = await request.get(`${apiUrl}/api/v1/frameworks`);
    expect([400, 401, 403]).toContain(res.status());
  });

  test("API handles CORS correctly", async ({ request }) => {
    const res = await request.get(`${apiUrl}/health`, {
      headers: {
        Origin: "http://localhost:3000",
      },
    });
    
    const accessControlAllowOrigin = res.headers()["access-control-allow-origin"];
    expect(accessControlAllowOrigin).toBeTruthy();
  });
});
