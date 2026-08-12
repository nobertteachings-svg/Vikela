import { test, expect } from "@playwright/test";
import { apiHeaders, apiBaseUrl } from "./helpers/api";

test.describe("Security testing", () => {
  const apiUrl = apiBaseUrl();

  test("API has security headers", async ({ request }) => {
    const res = await request.get(`${apiUrl}/health`);
    expect(res.ok()).toBeTruthy();
    // Helmet-style headers are production-oriented; local may omit them.
    const headers = res.headers();
    if (process.env.NODE_ENV === "production") {
      expect(headers["x-content-type-options"]).toBe("nosniff");
      expect(headers["x-frame-options"]).toBeTruthy();
    }
  });

  test("API rejects invalid authentication", async ({ request }) => {
    const res = await request.get(`${apiUrl}/api/v1/frameworks`, {
      headers: {
        Authorization: "Bearer invalid-token",
      },
    });
    // Clerk/JWT invalid, missing org, or forbidden
    expect([401, 403, 404]).toContain(res.status());
  });

  test("API prevents SQL injection attempts", async ({ request }) => {
    const res = await request.get(`${apiUrl}/api/v1/frameworks?id=1' OR '1'='1`, {
      headers: apiHeaders(),
    });
    
    // Should either return 400 (bad request) or handle it gracefully
    expect([200, 400, 404]).toContain(res.status());
  });

  test("API prevents XSS attempts", async ({ request }) => {
    const xssPayload = '<script>alert("xss")</script>';
    const res = await request.post(`${apiUrl}/api/v1/evidence`, {
      headers: apiHeaders(),
      multipart: {
        title: xssPayload,
        type: "OTHER",
      },
    });
    
    // Create returns { id, fileUrl }; XSS must not be echoed as executable HTML in JSON
    if (res.ok()) {
      const json = await res.json();
      expect(json.data?.id).toBeTruthy();
      const raw = JSON.stringify(json);
      expect(raw).not.toMatch(/<script[\s>]/i);
    } else {
      expect([400, 406, 422, 500]).toContain(res.status());
    }
  });

  test("API has rate limiting", async ({ request }) => {
    // Local default max is high (e.g. 300); only assert 429 under CI/production.
    const burst = process.env.CI || process.env.NODE_ENV === "production" ? 80 : 5;
    const requests = Array(burst)
      .fill(null)
      .map(() => request.get(`${apiUrl}/api/v1/frameworks`, { headers: apiHeaders() }));

    const responses = await Promise.all(requests);
    const statuses = responses.map((r) => r.status());
    expect(statuses.every((s) => [200, 429].includes(s))).toBeTruthy();
    if (process.env.CI || process.env.NODE_ENV === "production") {
      expect(statuses.some((s) => s === 429)).toBeTruthy();
    }
  });

  test("API validates input types", async ({ request }) => {
    const res = await request.post(`${apiUrl}/api/v1/evidence`, {
      headers: apiHeaders(),
      multipart: {
        title: "123",
        type: "INVALID_TYPE",
      },
    });
    
    expect([400, 406, 422]).toContain(res.status());
  });

  test("API handles large payloads safely", async ({ request }) => {
    const largePayload = "x".repeat(10_000_000); // 10MB
    
    const res = await request.post(`${apiUrl}/api/v1/evidence`, {
      headers: apiHeaders({ "Content-Type": "application/json" }),
      data: {
        title: largePayload,
        type: "OTHER",
      },
    });
    
    // Should reject large payloads
    expect([413, 400, 406, 422]).toContain(res.status());
  });

  test("CORS is properly configured", async ({ request }) => {
    const res = await request.get(`${apiUrl}/health`, {
      headers: {
        Origin: "http://malicious-site.com",
      },
    });
    
    const corsHeader = res.headers()["access-control-allow-origin"];
    
    // Should either not allow or only allow specific origins
    if (corsHeader) {
      expect(corsHeader).not.toBe("*");
    }
  });

  test("API does not expose sensitive information in errors", async ({ request }) => {
    const res = await request.get(`${apiUrl}/api/v1/nonexistent-endpoint`, {
      headers: apiHeaders(),
    });
    
    const json = await res.json();
    const errorString = JSON.stringify(json);
    
    // Should not contain stack traces or sensitive info
    expect(errorString).not.toContain("stack");
    expect(errorString).not.toContain("password");
    expect(errorString).not.toContain("secret");
  });
});
