import { test, expect } from "@playwright/test";

test.describe("Integration tests", () => {
  const apiUrl = process.env.PLAYWRIGHT_API_URL ?? "http://localhost:3001";

  test("complete evidence workflow", async ({ request }) => {
    // Create evidence
    const createRes = await request.post(`${apiUrl}/api/v1/evidence`, {
      headers: {
        "X-Org-Slug": "demo",
        "Content-Type": "application/json",
      },
      data: {
        title: "Integration Test Evidence",
        type: "OTHER",
        description: "Test evidence for integration testing",
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const created = await createRes.json();
    expect(created.data?.id).toBeTruthy();

    // Retrieve evidence
    const getRes = await request.get(
      `${apiUrl}/api/v1/evidence/${created.data.id}`,
      {
        headers: { "X-Org-Slug": "demo" },
      }
    );
    expect(getRes.ok()).toBeTruthy();
    const retrieved = await getRes.json();
    expect(retrieved.data?.title).toBe("Integration Test Evidence");

    // List evidence
    const listRes = await request.get(`${apiUrl}/api/v1/evidence`, {
      headers: { "X-Org-Slug": "demo" },
    });
    expect(listRes.ok()).toBeTruthy();
    const list = await listRes.json();
    expect(Array.isArray(list.data)).toBeTruthy();
    expect(
      list.data.some((e: { id: string }) => e.id === created.data.id)
    ).toBeTruthy();
  });

  test("framework and controls integration", async ({ request }) => {
    // Get frameworks
    const frameworksRes = await request.get(`${apiUrl}/api/v1/frameworks`, {
      headers: { "X-Org-Slug": "demo" },
    });
    expect(frameworksRes.ok()).toBeTruthy();
    const frameworks = await frameworksRes.json();
    expect(Array.isArray(frameworks.data)).toBeTruthy();

    if (frameworks.data.length > 0) {
      const frameworkId = frameworks.data[0].id;

      // Get controls for framework
      const controlsRes = await request.get(
        `${apiUrl}/api/v1/frameworks/${frameworkId}/controls`,
        {
          headers: { "X-Org-Slug": "demo" },
        }
      );
      expect(controlsRes.ok()).toBeTruthy();
      const controls = await controlsRes.json();
      expect(Array.isArray(controls.data)).toBeTruthy();
    }
  });

  test("dashboard data aggregation", async ({ request }) => {
    // Get dashboard data
    const dashboardRes = await request.get(`${apiUrl}/api/v1/dashboard`, {
      headers: { "X-Org-Slug": "demo" },
    });
    expect(dashboardRes.ok()).toBeTruthy();
    const dashboard = await dashboardRes.json();
    
    // Verify dashboard has expected structure
    expect(dashboard.data).toBeDefined();
    expect(typeof dashboard.data).toBe("object");
  });

  test("authentication and authorization flow", async ({ request }) => {
    // Test protected endpoint without auth
    const protectedRes = await request.get(`${apiUrl}/api/v1/organizations`, {
      headers: { "X-Org-Slug": "demo" },
    });
    
    // Should either succeed (if demo mode) or fail with 401/403
    expect([200, 401, 403]).toContain(protectedRes.status());
  });

  test("error handling integration", async ({ request }) => {
    // Test invalid data
    const invalidRes = await request.post(`${apiUrl}/api/v1/evidence`, {
      headers: {
        "X-Org-Slug": "demo",
        "Content-Type": "application/json",
      },
      data: {
        invalidField: "test",
      },
    });
    expect(invalidRes.ok()).toBeFalsy();
    expect([400, 422]).toContain(invalidRes.status());
  });

  test("rate limiting integration", async ({ request }) => {
    // Make multiple rapid requests
    const requests = Array(20).fill(null).map(() =>
      request.get(`${apiUrl}/api/v1/frameworks`, {
        headers: { "X-Org-Slug": "demo" },
      })
    );

    const responses = await Promise.all(requests);
    const rateLimited = responses.some((r) => r.status() === 429);
    
    // Rate limiting should kick in after many requests
    expect(rateLimited).toBeTruthy();
  });
});
