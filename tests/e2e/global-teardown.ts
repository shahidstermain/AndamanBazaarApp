import { FullConfig } from "@playwright/test";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function globalTeardown(_config: FullConfig): Promise<void> {
  // Global teardown runs once after all E2E tests.
  // Add any cleanup logic here (e.g., remove test data, stop services).
}

export default globalTeardown;
