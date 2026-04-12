import "@testing-library/jest-dom";
import "fake-indexeddb/auto";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Test-safe Firebase public config to prevent SDK init failures in unit tests.
vi.stubEnv("VITE_FIREBASE_API_KEY", "AIzaSyTestKey1234567890");
vi.stubEnv("VITE_FIREBASE_AUTH_DOMAIN", "test-project.firebaseapp.com");
vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "test-project");
vi.stubEnv("VITE_FIREBASE_STORAGE_BUCKET", "test-project.firebasestorage.app");
vi.stubEnv("VITE_FIREBASE_MESSAGING_SENDER_ID", "1234567890");
vi.stubEnv("VITE_FIREBASE_APP_ID", "1:1234567890:web:testappid");
vi.stubEnv("VITE_FIREBASE_MEASUREMENT_ID", "G-TESTMEASURE");

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// ──────────────────────────────────────────────────────────────────────────────
// Browser API mocks
// ──────────────────────────────────────────────────────────────────────────────

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

Object.defineProperty(window, "location", {
  writable: true,
  value: {
    href: "http://localhost:5173",
    origin: "http://localhost:5173",
    pathname: "/",
    search: "",
    hash: "",
    reload: vi.fn(),
    assign: vi.fn(),
    replace: vi.fn(),
  },
});

// Smooth scroll behaviour expected by layout.test.tsx
Object.defineProperty(document.documentElement.style, "scrollBehavior", {
  writable: true,
  value: "smooth",
});

global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  takeRecords: vi.fn(),
  root: null,
  rootMargin: "",
  thresholds: [],
}));

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

global.Notification = vi.fn().mockImplementation(() => ({
  permission: "default",
  requestPermission: vi.fn().mockResolvedValue("granted"),
})) as any;

if (!global.crypto) {
  global.crypto = {} as Crypto;
}
global.crypto.randomUUID = vi.fn().mockReturnValue("test-uuid-12345");

const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
global.localStorage = localStorageMock as any;

const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
global.sessionStorage = sessionStorageMock as any;

global.navigator = {
  ...global.navigator,
  onLine: true,
  geolocation: {
    getCurrentPosition: vi.fn().mockImplementation((success) => {
      success({
        coords: { latitude: 11.5, longitude: 92.5, accuracy: 10 },
        timestamp: Date.now(),
      });
    }),
    watchPosition: vi.fn().mockReturnValue(1),
    clearWatch: vi.fn(),
  },
};

// Add a minimal meta description so DOM queries in tests don't fail
if (!document.querySelector('meta[name="description"]')) {
  const metaDesc = document.createElement("meta");
  metaDesc.setAttribute("name", "description");
  metaDesc.setAttribute("content", "AndamanBazaar – hyperlocal marketplace");
  document.head.appendChild(metaDesc);
}

// Mock backend-only modules that are imported by some tests
vi.mock("cashfree-pg", () => ({
  Cashfree: vi.fn(),
}));

vi.mock("firebase-admin", () => ({
  default: {
    initializeApp: vi.fn(),
    firestore: vi.fn(),
  },
  initializeApp: vi.fn(),
  firestore: vi.fn(),
}));

vi.mock("firebase-functions/v2", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));
