import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Global supabase mock — prevents DNS resolution of mock.supabase.co in CI
vi.mock('../src/lib/supabase', () => import('../src/lib/__mocks__/supabase'))

// Re-export createMockChain from the __mocks__ file so test files can import it from here
export { createMockChain } from '../src/lib/__mocks__/supabase'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// ──────────────────────────────────────────────────────────────────────────────
// Browser API mocks
// ──────────────────────────────────────────────────────────────────────────────

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

Object.defineProperty(window, 'location', {
  writable: true,
  value: {
    href: 'http://localhost:5173',
    origin: 'http://localhost:5173',
    pathname: '/',
    search: '',
    hash: '',
    reload: vi.fn(),
    assign: vi.fn(),
    replace: vi.fn(),
  },
})

// Smooth scroll behaviour expected by layout.test.tsx
Object.defineProperty(document.documentElement.style, 'scrollBehavior', {
  writable: true,
  value: 'smooth',
})

global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  takeRecords: vi.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
}))

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

global.Notification = vi.fn().mockImplementation(() => ({
  permission: 'default',
  requestPermission: vi.fn().mockResolvedValue('granted'),
})) as any

if (!global.crypto) {
  global.crypto = {} as Crypto
}
global.crypto.randomUUID = vi.fn().mockReturnValue('test-uuid-12345')

const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
}
global.localStorage = localStorageMock as any

const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
}
global.sessionStorage = sessionStorageMock as any

global.navigator = {
  ...global.navigator,
  onLine: true,
  geolocation: {
    getCurrentPosition: vi.fn().mockImplementation((success) => {
      success({
        coords: { latitude: 11.5, longitude: 92.5, accuracy: 10 },
        timestamp: Date.now(),
      })
    }),
    watchPosition: vi.fn().mockReturnValue(1),
    clearWatch: vi.fn(),
  },
}

// Add a minimal meta description so DOM queries in tests don't fail
if (!document.querySelector('meta[name="description"]')) {
  const metaDesc = document.createElement('meta')
  metaDesc.setAttribute('name', 'description')
  metaDesc.setAttribute('content', 'AndamanBazaar – hyperlocal marketplace')
  document.head.appendChild(metaDesc)
}