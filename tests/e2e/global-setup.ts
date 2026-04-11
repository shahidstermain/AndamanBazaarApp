import { FullConfig } from '@playwright/test'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function globalSetup(_config: FullConfig): Promise<void> {
  // Global setup runs once before all E2E tests.
  // Add any one-time setup logic here (e.g., seed test data, start services).
}

export default globalSetup
