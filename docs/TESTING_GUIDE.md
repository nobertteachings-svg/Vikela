# Testing Guide for Developers

This guide helps developers run and write tests for the Vikela project.

## Quick Start

### Install Dependencies
```bash
npm install
```

### Run All Tests
```bash
npm run test:all
```

### Run Specific Test Types
```bash
# Unit tests
npm run test

# E2E tests (requires running services)
npm run test:e2e

# Security tests
npm run test:security

# Accessibility tests
npm run test:a11y

# Performance tests
npm run test:performance
```

## Writing Unit Tests

### API Tests (Node.js)

Create test files in `apps/api/src/__tests__/`:

```typescript
import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("My feature", () => {
  it("should do something", async () => {
    const result = await myFunction();
    assert.equal(result, expected);
  });
});
```

### Web Tests (Jest + React Testing Library)

Create test files in `apps/web/__tests__/` or next to components:

```typescript
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

## Writing E2E Tests

Create test files in `e2e/`:

```typescript
import { test, expect } from "@playwright/test";

test("my test", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
});
```

### E2E Test Categories

- **Smoke tests** (`smoke.spec.ts`): Quick validation of core functionality
- **Integration tests** (`integration.spec.ts`): API interactions
- **Accessibility tests** (`accessibility.spec.ts`): WCAG compliance
- **Security tests** (`security.spec.ts`): Security vulnerabilities
- **UAT tests** (`user-acceptance.spec.ts`): User workflows
- **Regression tests** (`regression.spec.ts`): Prevent regressions
- **Localization tests** (`localization.spec.ts`): i18n validation
- **Contract tests** (`contract.spec.ts`): API contracts

## Running Tests Locally

### With Docker Services

```bash
# Start database and Redis
docker compose up -d postgres redis

# Setup database
npm run db:local

# Run API and web
npm run dev

# In another terminal, run tests
npm run test:e2e
```

### Without Docker (if services already running)

```bash
npm run test                    # Unit tests
npm run test:e2e                # E2E tests
```

## Test Coverage

### Generate Coverage Report

```bash
npm run test:coverage
```

Coverage reports are generated in:
- API: `apps/api/coverage/`
- Web: `apps/web/coverage/`

### Coverage Thresholds

- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

## Security Testing

### Run Security Linting

```bash
npm run lint:security
```

### Run Dependency Audit

```bash
npm audit
```

### Fix Security Issues

```bash
npm audit fix
```

## Accessibility Testing

### Run Accessibility Tests

```bash
npm run test:a11y
```

### Common Accessibility Issues

- Missing alt text on images
- Insufficient color contrast
- Missing form labels
- Keyboard navigation issues
- Missing ARIA attributes

## Performance Testing

### Run Load Tests

```bash
npm run test:performance
```

### Performance Test Files

- `performance/load-test.js`: Normal load testing
- `performance/stress-test.js`: Stress testing
- `performance/volume-test.js`: Volume testing

### Performance Thresholds

- p95 response time < 500ms
- p99 response time < 1000ms
- Error rate < 10%

## Debugging Tests

### Debug Unit Tests

```bash
# API tests
node --inspect-brk --import tsx --test src/__tests__/my-test.test.ts

# Web tests
node --inspect-brk node_modules/.bin/jest --runInBand my-test.test.ts
```

### Debug E2E Tests

```bash
# Run in headed mode
npx playwright test --headed

# Run with UI
npx playwright test --ui

# Debug specific test
npx playwright test my-test.spec.ts --debug
```

## Common Issues

### Port Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Kill process on port 3001
lsof -ti:3001 | xargs kill -9
```

### Database Connection Issues

```bash
# Restart database
docker compose restart postgres

# Check database logs
docker compose logs postgres

# Recreate database
docker compose down -v
docker compose up -d postgres
npm run db:local
```

### Test Timeout

Increase timeout in test file:

```typescript
test.setTimeout(10000); // 10 seconds
```

Or in playwright.config.ts:

```typescript
use: {
  timeout: 10000,
}
```

## Best Practices

1. **Test behavior, not implementation**
   - Good: `expect(page.getByText('Submit')).toBeVisible()`
   - Bad: `expect(page.locator('.btn-primary')).toBeVisible()`

2. **Keep tests independent**
   - Each test should set up its own data
   - Don't rely on test order

3. **Use descriptive test names**
   - Good: `it('should create evidence successfully')`
   - Bad: `it('works')`

4. **Mock external dependencies**
   - Use test database
   - Mock external APIs
   - Use test fixtures

5. **Write fast unit tests**
   - Unit tests should run in milliseconds
   - Move slow operations to integration/E2E tests

6. **Test edge cases**
   - Empty inputs
   - Null/undefined values
   - Error conditions
   - Boundary values

## CI/CD

Tests run automatically on:
- Every push to main/develop
- Every pull request to main

### CI Jobs

1. **Lint and Build**: Linting, building, unit tests, coverage
2. **Security Audit**: npm audit, Snyk scan
3. **E2E**: End-to-end tests, accessibility tests
4. **Performance**: Load testing (main branch only)

### Failing Tests in CI

1. Check the job logs
2. Reproduce locally
3. Fix the issue
4. Push the fix

## Resources

- [Playwright Docs](https://playwright.dev/)
- [Jest Docs](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [K6 Docs](https://k6.io/docs/)
- [axe-core](https://www.deque.com/axe/)
