# CI/CD & Visual Testing Strategy

## Overview

This document outlines the comprehensive CI/CD and Visual Testing strategy for Andaman Bazaar. We utilize **GitHub Actions** for automation, **Vitest** for unit/integration testing with coverage enforcement, and **Playwright** for end-to-end and visual regression testing.

## CI/CD Pipeline (`.github/workflows/ci.yml`)

### Triggers

- **Push to Main**: Ensures the `main` branch is always stable.
- **Pull Request**: Validates every change before it can be merged.
- **Nightly Schedule**: Runs at midnight (00:00 UTC) to catch regressions and flaky tests.

### Jobs & Steps

1.  **Lint, Test & Verify**:
    - **Linting**: Runs `eslint` and `tsc` to ensure code quality.
    - **Unit Tests**: Runs `npm run test:coverage` using Vitest.
      - **Coverage Gate**: Fails if coverage drops below **80%** (Lines, Functions, Branches, Statements).
    - **E2E Tests**: Runs `npx playwright test` to verify critical user flows.
    - **Visual Regression Tests**: Runs `npm run test:visual` to detect UI changes.
      - **Note**: Currently set to `continue-on-error: true` to prevent blocking builds on minor pixel differences initially.
    - **Artifacts**: Uploads `coverage-report`, `playwright-report`, and `visual-test-results` for 30 days.

2.  **Deploy**:
    - Deploys to the production VPS only on a successful push to `main`.
    - Uses Docker Compose to rebuild and restart services.

## Visual Regression Testing

We use Playwright's built-in visual comparison capabilities.

### Configuration

- **Tolerance**: 0.1% max pixel difference (`maxDiffPixelRatio: 0.1`).
- **Threshold**: 0.2 (`threshold: 0.2`).
- **Snapshots**: Stored in `tests/e2e/visual.spec.ts-snapshots/`.

### Test Suite (`tests/e2e/visual.spec.ts`)

- **Home Page**: Full-page snapshot.
- **Auth Page**: Login/Signup UI.
- **Listings Page**: Marketplace grid with mocked data.
- **Create Listing**: Seller flow with mocked auth session.

### Workflow

1.  **Baseline Creation**: Run `npx playwright test tests/e2e/visual.spec.ts --update-snapshots` locally to generate baselines.
2.  **CI Execution**: The pipeline runs these tests against the committed baselines.
3.  **Review**: If a test fails, download the `visual-test-results` artifact to inspect the diffs.
4.  **Approval**: If the change is intentional, update snapshots locally and commit them.

## Quality Gates & Monitoring

### Thresholds

- **Unit Test Coverage**: > 80% required.
- **E2E Tests**: 100% pass rate required.
- **Linting**: Zero errors required.

### Monitoring

- **GitHub Actions Dashboard**: View current and historical run status.
- **Slack Notifications**: (Configurable) Failed builds can trigger Slack alerts.
- **Artifact Retention**: Reports are kept for 30 days for debugging.

## Rollback Procedure

If a bad deployment occurs:

1.  Revert the merge commit on `main`.
2.  Push the reversion.
3.  The CI/CD pipeline will automatically run tests and re-deploy the previous stable version.
