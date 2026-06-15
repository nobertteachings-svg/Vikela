# Testing Setup Instructions

This document explains how to set up the complete testing infrastructure after the initial implementation.

## Current Status

The testing infrastructure has been implemented but requires dependency installation to be fully functional.

## What Works Now

The following tests can be run immediately without additional setup:

```bash
# API unit tests (using existing Node.js test runner)
npm run test

# Linting
npm run lint

# Complete test suite (lint + unit tests)
npm run test:all
```

**Results:**
- ✅ 81 API unit tests passing
- ✅ Linting passing (with some accessibility warnings in web app)

## What Requires Dependency Installation

The following testing features require installing the new dependencies that were added to package.json files:

### Web App Testing
- Jest unit tests for React components
- React Testing Library
- Jest configuration

### E2E Testing Enhancements
- Multi-browser testing (Firefox, Safari, Mobile)
- Accessibility testing with axe-core
- Contract testing
- Security E2E tests
- Localization tests
- Regression tests

### Performance Testing
- K6 load testing
- K6 stress testing
- K6 volume testing

### Advanced Code Quality
- Mutation testing with Stryker
- Code coverage with c8
- Security linting for web app
- Accessibility linting

## Installation Steps

To enable all testing features, run:

```bash
# Install all dependencies including new testing packages
npm install
```

This will install:
- `c8` - Code coverage for API
- `eslint-plugin-security` - Security linting
- `eslint-plugin-jsx-a11y` - Accessibility linting
- `eslint-plugin-react` - React linting
- `@stryker-mutator/*` - Mutation testing
- `jest` and related packages - Web app unit testing
- `@axe-core/playwright` - Accessibility testing
- `k6` - Performance testing (via global or manual install)

## After Installation

Once dependencies are installed, you can run:

```bash
# All tests (API + Web)
npm run test

# Coverage reports
npm run test:coverage

# Mutation testing
npm run test:mutation

# Security tests (npm audit + security linting)
npm run test:security

# Security linting only
npm run lint:security

# E2E tests (requires running services)
npm run test:e2e

# Accessibility tests (requires running services)
npm run test:a11y

# Performance tests (requires running services)
npm run test:performance

# Complete test suite
npm run test:all
```

## Running Services for E2E Tests

For E2E, accessibility, and performance tests, you need the services running:

```bash
# Start database and Redis
docker compose up -d postgres redis

# Setup database
npm run db:local

# Start API and web apps
npm run dev

# In another terminal, run E2E tests
npm run test:e2e
```

## Current Security Vulnerabilities

The project has 4 npm audit vulnerabilities that should be addressed:

1. **@fastify/static** (moderate) - Path traversal and route guard bypass
2. **esbuild** (high) - Binary integrity verification and arbitrary file read
3. **js-cookie** (high) - Prototype hijack in assign()
4. **@clerk/shared** - Depends on vulnerable js-cookie

To fix these:
```bash
npm audit fix              # Fix non-breaking changes
npm audit fix --force      # Fix all (may include breaking changes)
```

## Troubleshooting

### "Cannot find module" errors
This means dependencies aren't installed. Run `npm install`.

### "Could not find" errors for test files
The test scripts have been fixed to use `find` instead of glob patterns. Try running the test again.

### Port already in use
```bash
# Kill processes on ports 3000 and 3001
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

### Database connection issues
```bash
# Restart database
docker compose restart postgres

# Recreate database
docker compose down -v
docker compose up -d postgres
npm run db:local
```

## Testing Categories

### Functional Testing
- ✅ Unit tests (API) - Working now (81 tests passing)
- ⏳ Unit tests (Web) - Needs `npm install`
- ✅ Integration tests - Working now
- ⏳ E2E tests - Needs services running
- ⏳ UAT tests - Needs services running

### Non-Functional Testing
- ⏳ Performance testing - Needs `npm install` + services
- ⏳ Load testing - Needs `npm install` + services
- ⏳ Stress testing - Needs `npm install` + services
- ⏳ Security testing - Needs `npm install`
- ⏳ Accessibility testing - Needs `npm install` + services
- ⏳ Compatibility testing - Needs `npm install` + services
- ⏳ Localization testing - Needs services running

### Structural Testing
- ✅ Static analysis (linting) - Working now
- ⏳ Code coverage - Needs `npm install`
- ⏳ Mutation testing - Needs `npm install`
- ⏳ Dependency scanning - Needs `npm install`

### Regression Testing
- ✅ Regression tests - Working now
- ✅ Smoke tests - Working now

## CI/CD Pipeline

The CI pipeline in `.github/workflows/ci.yml` includes:
- ✅ Lint and build
- ⏳ Security audit (needs Snyk token configuration)
- ⏳ E2E tests (needs dependency installation in CI)
- ⏳ Performance tests (needs dependency installation in CI)

## Next Steps

1. Run `npm install` to install all testing dependencies
2. Run `npm run test` to verify unit tests work
3. Address npm audit vulnerabilities with `npm audit fix`
4. Start services with `docker compose up -d postgres redis && npm run db:local && npm run dev`
5. Run `npm run test:e2e` to verify E2E tests work
6. Configure Snyk token in GitHub secrets for security scanning
7. Review coverage reports after running `npm run test:coverage`

## Documentation

See the following documentation for more details:
- `docs/TESTING_STRATEGY.md` - Complete testing strategy
- `docs/TESTING_GUIDE.md` - Developer testing guide
