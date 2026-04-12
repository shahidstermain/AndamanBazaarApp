import { defineConfig, devices } from "@playwright/test";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore: [
    "**/visual.spec.ts",
    "tests/accessibility/**",
    "tests/performance/**",
    "tests/security/**",
    "tests/integration/**",
  ],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["html"],
    ["json", { outputFile: "test-results/results.json" }],
    ["junit", { outputFile: "test-results/results.xml" }],
  ],
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    // Enhanced performance monitoring
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.1,
      threshold: 0.2,
      animations: "disabled",
    },
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 12"] },
    },
    // Add tablet testing
    {
      name: "iPad",
      use: { ...devices["iPad Pro"] },
    },
    // Add performance testing project
    {
      name: "performance",
      testMatch: "**/performance/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        // Collect performance metrics
        launchOptions: {
          args: [
            "--disable-web-security",
            "--disable-features=VizDisplayCompositor",
          ],
        },
      },
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      VITE_E2E_BYPASS_AUTH: "true",
      VITE_FIREBASE_API_KEY:
        process.env.VITE_FIREBASE_API_KEY ||
        "AIzaMock00000000000000000000000ForTest",
      VITE_FIREBASE_AUTH_DOMAIN:
        process.env.VITE_FIREBASE_AUTH_DOMAIN || "mock-project.firebaseapp.com",
      VITE_FIREBASE_PROJECT_ID:
        process.env.VITE_FIREBASE_PROJECT_ID || "mock-project-id",
      VITE_FIREBASE_STORAGE_BUCKET:
        process.env.VITE_FIREBASE_STORAGE_BUCKET ||
        "mock-project-id.appspot.com",
      VITE_FIREBASE_MESSAGING_SENDER_ID:
        process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789012",
      VITE_FIREBASE_APP_ID:
        process.env.VITE_FIREBASE_APP_ID ||
        "1:123456789012:web:abcdefgh12345678",
    },
  },

  // Global setup and teardown
  globalSetup: resolve(__dirname, "./tests/e2e/global-setup.ts"),
  globalTeardown: resolve(__dirname, "./tests/e2e/global-teardown.ts"),
});
