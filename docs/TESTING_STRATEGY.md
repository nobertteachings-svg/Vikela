# Comprehensive Testing Strategy

This document outlines the complete testing strategy for the Vikela project, covering all testing types as requested.

## Testing Overview

The Vikela project implements a comprehensive testing strategy covering functional, non-functional, structural, and regression testing types.

## Functional Testing

### Unit Testing
- **API**: Node.js built-in test runner in `apps/api/src/__tests__/`
- **Web**: Jest with React Testing Library in `apps/web/__tests__/` and component directories
- **Coverage**: 70% threshold for branches, functions, lines, and statements

**Run unit tests:**
```bash
npm run test                    # Run all unit tests
npm run test -w @vikela/api     # API unit tests only
npm run test -w @vikela/web     # Web unit tests only
```

### Integration Testing
- Tests interactions between modules
- Located in `apps/api/src/__tests__/integration.test.ts`
- E2E integration tests in `e2e/integration.spec.ts`

**Run integration tests:**
```bash
npm run test                    # Includes integration tests
npm run test:e2e                # E2E integration tests
```

### System Testing
- Tests the complete integrated system
- Located in `apps/api/src/__tests__/system.test.ts`
- Validates end-to-end workflows

### Acceptance Testing (UAT)
- User acceptance tests in `e2e/user-acceptance.spec.ts`
- Validates against business requirements
- Tests complete user workflows

**Run UAT:**
```bash
npm run test:e2e                # Includes UAT tests
```

## Non-Functional Testing

### Performance Testing
- **Load Testing**: K6 scripts in `performance/load-test.js`
- **Stress Testing**: K6 scripts in `performance/stress-test.js`
- **Volume Testing**: K6 scripts in `performance/volume-test.js`

**Run performance tests:**
```bash
npm run test:performance        # Run load tests
```

### Load Testing
- Simulates expected traffic patterns
- Tests with 10-100 concurrent users
- Validates response times (p95 < 500ms, p99 < 1000ms)

### Stress Testing
- Tests beyond normal limits to find breaking points
- Ramp up to 1000 concurrent users
- Identifies system limits and failure modes

### Scalability Testing
- Validates ability to scale up/down
- Tested through load and stress tests
- Monitors resource usage during tests

### Volume Testing
- Tests handling large amounts of data
- Simulates 1000+ records
- Validates performance with large datasets

### Endurance/Soak Testing
- Tests behavior over long periods
- Can be configured in K6 scripts
- Monitors memory leaks and performance degradation

### Security Testing
- **Static Analysis**: ESLint security plugin
- **Dependency Scanning**: npm audit and Snyk
- **Runtime Security**: E2E security tests in `e2e/security.spec.ts`
- **Penetration Testing**: Security headers, XSS, SQL injection prevention

**Run security tests:**
```bash
npm run test:security           # Security linting and audit
npm run lint:security          # Security linting only
npm audit                       # Dependency vulnerability scan
```

### Usability Testing
- Validated through UAT tests
- Tests user workflows and interfaces
- Ensures intuitive user experience

### Accessibility Testing
- WCAG compliance testing with axe-core
- Tests in `e2e/accessibility.spec.ts`
- Covers keyboard navigation, screen readers, color contrast

**Run accessibility tests:**
```bash
npm run test:a11y               # Accessibility tests
npm run test:e2e:accessibility  # Same as above
```

### Compatibility Testing
- **Browser Testing**: Playwright tests on Chrome, Firefox, Safari
- **Mobile Testing**: Playwright tests on mobile devices (Pixel 5)
- **OS Testing**: CI runs on Ubuntu, can be extended

**Run compatibility tests:**
```bash
npm run test:e2e                # Tests on all configured browsers
```

### Localization/Internationalization Testing
- Tests in `e2e/localization.spec.ts`
- Validates language attributes, date/number formatting
- Tests UTF-8 encoding and special characters

## Structural and Code-Level Testing

### Static Code Analysis
- **Linting**: ESLint for code quality
- **Security Linting**: eslint-plugin-security
- **Accessibility Linting**: eslint-plugin-jsx-a11y
- **React Linting**: eslint-plugin-react

**Run static analysis:**
```bash
npm run lint                    # Standard linting
npm run lint:security          # Security-focused linting
```

### Code Coverage Analysis
- **Tool**: c8 for API, Jest for web
- **Threshold**: 70% for all metrics
- **Reports**: Text, LCOV, and HTML formats

**Run coverage:**
```bash
npm run test:coverage           # Generate coverage reports
```

### Mutation Testing
- **Tool**: Stryker mutator
- **Config**: `apps/api/.stryker.conf.json`
- **Threshold**: 60-80% mutation score

**Run mutation testing:**
```bash
npm run test:mutation           # Run Stryker
```

### Dependency/Vulnerability Scanning
- **npm audit**: Built-in vulnerability scanner
- **Snyk**: Advanced dependency scanning in CI
- **Audit Level**: Moderate severity

**Run dependency scanning:**
```bash
npm audit                       # Local scan
npm audit --audit-level=moderate # CI scan
```

## Regression and Change-Related Testing

### Regression Testing
- Ensures new changes don't break existing functionality
- Tests in `e2e/regression.spec.ts`
- Runs on every PR and push

**Run regression tests:**
```bash
npm run test:e2e                # Includes regression tests
```

### Smoke Testing
- Quick check that build is stable
- Existing tests in `e2e/smoke.spec.ts`
- Validates core functionality (health, evidence upload)

**Run smoke tests:**
```bash
npm run test:e2e                # Includes smoke tests
```

### Sanity Testing
- Quick check that specific bug fixes work
- Can be added as targeted tests
- Validates specific functionality after fixes

## Automation and CI/CD-Related Testing

### Automated Test Suites
- **Unit Tests**: Run on every commit
- **Integration Tests**: Run on every commit
- **E2E Tests**: Run after build passes
- **Security Tests**: Run in parallel with build

### End-to-End (E2E) Testing
- **Tool**: Playwright
- **Browsers**: Chrome, Firefox, Safari, Mobile Chrome
- **Tests**: Smoke, integration, UAT, security, accessibility, regression, localization, contract

**Run E2E tests:**
```bash
npm run test:e2e                # All E2E tests
```

### Contract Testing
- Validates API contracts
- Tests in `e2e/contract.spec.ts`
- Ensures API responses match expected schemas

**Run contract tests:**
```bash
npm run test:e2e                # Includes contract tests
```

## CI/CD Pipeline

The CI pipeline (`.github/workflows/ci.yml`) includes:

1. **Lint and Build Job**
   - Code linting
   - Security linting
   - Build verification
   - Unit tests
   - Coverage reporting
   - Upload to Codecov

2. **Security Audit Job**
   - npm audit
   - Snyk security scan
   - Dependency vulnerability check

3. **E2E Job**
   - Database setup
   - Service startup
   - Playwright E2E tests
   - Accessibility tests
   - Report upload

4. **Performance Job** (main branch only)
   - K6 installation
   - Load testing
   - Performance validation

## Test Structure

```
vikela/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   └── __tests__/          # API unit/integration/system tests
│   │   ├── .stryker.conf.json      # Mutation testing config
│   │   └── .eslintrc.security.json # Security linting config
│   └── web/
│       ├── __tests__/              # Web unit tests
│       ├── components/
│       │   └── **/__tests__/       # Component tests
│       ├── jest.config.js          # Jest configuration
│       └── jest.setup.js           # Jest setup
├── e2e/                            # E2E tests
│   ├── smoke.spec.ts              # Smoke tests
│   ├── integration.spec.ts         # Integration tests
│   ├── accessibility.spec.ts      # Accessibility tests
│   ├── security.spec.ts           # Security tests
│   ├── user-acceptance.spec.ts    # UAT tests
│   ├── regression.spec.ts         # Regression tests
│   ├── localization.spec.ts       # Localization tests
│   └── contract.spec.ts           # Contract tests
├── performance/                    # Performance tests
│   ├── load-test.js              # Load testing
│   ├── stress-test.js            # Stress testing
│   └── volume-test.js            # Volume testing
├── playwright.config.ts           # Playwright configuration
└── .github/workflows/
    └── ci.yml                     # CI/CD pipeline
```

## Running Tests

### All Tests
```bash
npm run test:all                   # Run all test types
```

### Specific Test Types
```bash
npm run test                       # Unit tests
npm run test:coverage              # Unit tests with coverage
npm run test:mutation              # Mutation testing
npm run test:security             # Security tests
npm run test:e2e                  # E2E tests
npm run test:a11y                  # Accessibility tests
npm run test:performance           # Performance tests
```

### Linting
```bash
npm run lint                       # Standard linting
npm run lint:security              # Security linting
```

## Test Coverage Goals

- **Unit Tests**: 70% coverage threshold
- **Integration Tests**: Critical paths covered
- **E2E Tests**: Main user workflows covered
- **Security Tests**: All endpoints tested
- **Accessibility Tests**: WCAG AA compliance
- **Performance Tests**: Response time thresholds met

## Best Practices

1. **Write tests alongside code** - Test-driven development when possible
2. **Keep tests independent** - Each test should run in isolation
3. **Use descriptive names** - Test names should describe what they test
4. **Test behavior, not implementation** - Focus on what the code does
5. **Mock external dependencies** - Use mocks for databases, APIs, etc.
6. **Keep tests fast** - Unit tests should be milliseconds, E2E tests seconds
7. **Run tests locally before pushing** - Catch issues early
8. **Update tests when requirements change** - Keep tests in sync with code
9. **Review coverage reports** - Identify untested code
10. **Use CI/CD** - Automate test execution on every commit

## Troubleshooting

### Tests fail locally but pass in CI
- Check environment variables
- Verify database state
- Ensure all services are running

### Coverage is low
- Identify uncovered code in coverage report
- Add tests for critical paths first
- Focus on business logic over utility functions

### E2E tests are flaky
- Increase timeouts in playwright.config.ts
- Add explicit waits for dynamic content
- Use more specific selectors

### Performance tests fail
- Check if system is under load
- Verify test environment matches production
- Adjust thresholds if unrealistic

## Continuous Improvement

- Review test results regularly
- Update test strategy as project evolves
- Add new test types as needed
- Monitor test execution time
- Optimize slow tests
- Keep dependencies updated
- Incorporate team feedback

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Jest Documentation](https://jestjs.io/)
- [K6 Documentation](https://k6.io/docs/)
- [Stryker Documentation](https://stryker-mutator.io/)
- [axe-core Documentation](https://www.deque.com/axe/)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
