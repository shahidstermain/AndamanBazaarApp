import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: [path.resolve(__dirname, './tests/setup.ts')],
    include: ['tests/**/*.test.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'tests/e2e/**',
      'tests/performance/**',
      // Legacy Supabase-era tests retained for historical reference.
      'tests/BoostListingModal.test.tsx',
      'tests/BoostSuccess.test.tsx',
      'tests/chats.test.tsx',
      'tests/chatRoom.test.tsx',
      'tests/createListing.test.tsx',
      'tests/listingDetail.test.tsx',
      'tests/listings.test.tsx',
      'tests/profile.test.tsx',
      'tests/todos.test.tsx',
      'tests/payment-architecture.test.ts',
      'tests/security/security-audit.test.ts',
      'tests/unit/admin-auth.test.tsx',
      'tests/unit/admin-auth-extended.test.ts',
      'tests/unit/auth-flows.test.ts',
      'tests/unit/auth-flows-extended.test.ts',
      'tests/unit/auth_ui.test.tsx',
      'tests/unit/edge-cases.test.ts',
      'tests/unit/security-extended.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{js,jsx,ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.{js,jsx,ts,tsx}',
        'src/**/*.spec.{js,jsx,ts,tsx}',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/**/index.ts',
        'src/types/**',
      ],
      thresholds: {
        lines: 30,
        functions: 20,
        branches: 25,
        statements: 30,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
