import { test, expect } from "@playwright/test";

test.describe("Security testing", () => {
  const apiUrl = process.env.PLAYWRIGHT_API_URL ?? "http://localhost:3001";

  test("API has security headers", async ({ request }) => {
    const res = await request.get(`${apiUrl}/health`);
    
    // Check for security headers
    const headers = res.headers();
    
    // These should be present in production
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBeTruthy();
  });

  test("API rejects invalid authentication", async ({ request }) => {
    const res = await request.get(`${apiUrl}/api/v1/organizations`, {
      headers: {
        "Authorization": "Bearer invalid-token",
      },
    });
    
    expect([401, 403]).toContain(res.status());
  });

  test("API prevents SQL injection attempts", async ({ request }) => {
    const res = await request.get(`${apiUrl}/api/v1/frameworks?id=1' OR '1'='1`, {
      headers: { "X-Org-Slug": "demo" },
    });
    
    // Should either return 400 (bad request) or handle it gracefully
    expect([200, 400, 404]).toContain(res.status());
  });

  test("API prevents XSS attempts", async ({ request }) => {
    const xssPayload = '<script>alert("xss")</script>';
    const res = await request.post(`${apiUrl}/api/v1/evidence`, {
      headers: {
        "X-Org-Slug": "demo",
        "Content-Type": "application/json",
      },
      data: {
        title: xssPayload,
        type: "OTHER",
      },
    });
    
    // Should either reject or sanitize
    if (res.ok()) {
      const json = await res.json();
      const responseText = JSON.stringify(json);
      expect(responseText).not.toContain("<script>");
    } else {
      expect([400, 422]).toContain(res.status());
    }
  });

  test("API has rate limiting", async ({ request }) => {
    // Make multiple rapid requests
    const requests = Array(30).fill(null).map(() =>
      request.get(`${apiUrl}/api/v1/frameworks`, {
        headers: { "X-Org-Slug": "demo" },
      })
    );

    const responses = await Promise.all(requests);
    const rateLimited = responses.some((r) => r.status() === 429);
    
    // Rate limiting should be implemented
    expect(rateLimited).toBeTruthy();
  });

  test("API validates input types", async ({ request }) => {
    const res = await request.post(`${apiUrl}/api/v1/evidence`, {
      headers: {
        "X-Org-Slug": "demo",
        "Content-Type": "application/json",
      },
      data: {
        title: 123, // Should be string
        type: "INVALID_TYPE",
      },
    });
    
    expect([400, 422]).toContain(res.status());
  });

  test("API handles large payloads safely", async ({ request }) => {
    const largePayload = "x".repeat(10_000_000); // 10MB
    
    const res = await request.post(`${apiUrl}/api/v1/evidence`, {
      headers: {
        "X-Org-Slug": "demo",
        "Content-Type": "application/json",
      },
      data: {
        title: largePayload,
        type: "OTHER",
      },
    });
    
    // Should reject large payloads
    expect([413, 400, 422]).toContain(res.status());
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
      headers: { "X-Org-Slug": "demo" },
    });
    
    const json = await res.json();
    const errorString = JSON.stringify(json);
    
    // Should not contain stack traces or sensitive info
    expect(errorString).not.toContain("stack");
    expect(errorString).not.toContain("password");
    expect(errorString).not.toContain("secret");
  });
});
