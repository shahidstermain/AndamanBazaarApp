# Andaman Bazaar E2E Testing Strategy

## Overview

This document outlines the comprehensive end-to-end (E2E) testing strategy for the Andaman Bazaar application. We use **Playwright** as our primary E2E testing framework to ensure a seamless and reliable user experience across different browsers and devices.

## Core Objectives

- **Reliability**: Ensure critical user paths are always functional.
- **Cross-Browser/Device Support**: Validate functionality across Chromium, Firefox, WebKit, and mobile emulators.
- **Accessibility & Performance**: Maintain high standards for accessibility (A11y) and performance (Core Web Vitals).
- **Security Verification**: Confirm that security mechanisms like CSRF protection, rate limiting, and input sanitization are active.

## Critical User Workflows

### 1. Authentication Lifecycle

- **Login/Sign Up**: Traditional email/password authentication with validation and error handling.
- **Google OAuth**: Integration verification and session persistence.
- **Logout**: Complete session termination and redirection to landing page.

### 2. Marketplace Browsing & Discovery

- **Search**: Accurate product search using the global search bar.
- **Categorization**: Navigation through categories (Electronics, Vehicles, Property, etc.).
- **Hyperlocal Filtering**: Testing the "GPS-Verified Locals" filter to ensure island-specific trust.
- **Featured & Hot Picks**: Validation of curated sections and dynamic content updates.

### 3. Listing Creation & Management

- **Seller Flow**: Multi-step listing creation (Image upload, details, pricing).
- **Location Verification**: GPS-based geofencing check during listing creation to verify Andaman-only listings.
- **Listing Details**: Viewing a specific listing with seller information, price, and location.

### 4. User Profile & Trust

- **Profile Management**: Updating user details and viewing verification status.
- **Verified Seller Badges**: Ensuring badges are correctly displayed on listing cards and detail pages.

### 5. Error Resilience

- **404 Pages**: Proper handling of invalid routes.
- **Network Interruptions**: Graceful degradation and retry mechanisms during API failures.
- **Server Errors**: User-friendly error messages and fallback states.

## Test Infrastructure

- **Framework**: Playwright
- **Browsers**: Chromium (Chrome/Edge), Firefox, WebKit (Safari).
- **Mobile Emulation**: Pixel 5 (Android), iPhone 12 (iOS).
- **Reporting**: HTML reports generated for each test run.
- **CI/CD Integration**: Tests run automatically on PRs and deployments to prevent regressions.

## Execution Plan

1. **Initialize Playwright**: Ensure configuration is optimized for parallel execution.
2. **Implement Baseline Tests**: Focus on critical paths (Auth, Search, Filters).
3. **Advanced Flow Implementation**: Listing lifecycle and OAuth diagnostics.
4. **Verification**: Execute across all browsers and document results in `TEST_EXECUTION_REPORT.md`.
