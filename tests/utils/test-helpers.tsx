/**
 * Test Utilities and Helpers
 * Common utilities for testing across the suite
 */

import { render, RenderOptions } from "@testing-library/react";
import { ReactElement } from "react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";

// Custom render function with providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything from testing-library
export * from "@testing-library/react";
export { customRender as render };

// Mock utilities
export const createMockProps = <T extends Record<string, any>>(
  defaults: T,
  overrides: Partial<T> = {},
) => ({
  ...defaults,
  ...overrides,
});

// Async utilities
export const waitForAsync = (ms: number = 0) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Form utilities
export const createMockFormEvent = (data: Record<string, any>) => ({
  preventDefault: vi.fn(),
  target: {
    elements: Object.entries(data).reduce(
      (acc, [key, value]) => {
        acc[key] = { value };
        return acc;
      },
      {} as Record<string, { value: any }>,
    ),
  },
});

// Firebase mock utilities
export const createMockFirebaseUser = (overrides = {}) => ({
  uid: "test-user-123",
  email: "test@example.com",
  displayName: "Test User",
  photoURL: "https://example.com/avatar.jpg",
  emailVerified: true,
  ...overrides,
});

export const createMockFirebaseError = (code: string, message: string) => ({
  code,
  message,
  name: "FirebaseError",
});

// Geolocation mock utilities
export const createMockGeolocationPosition = (overrides = {}) => ({
  coords: {
    latitude: 11.5,
    longitude: 92.5,
    accuracy: 10,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
    ...overrides,
  },
  timestamp: Date.now(),
});

// Storage mock utilities
export const createMockStorageRef = (path: string) => ({
  path,
  name: path.split("/").pop(),
  bucket: "test-bucket",
  fullPath: path,
  put: vi.fn().mockResolvedValue({}),
  getDownloadURL: vi.fn().mockResolvedValue(`https://example.com/${path}`),
  delete: vi.fn().mockResolvedValue(undefined),
});

// Network utilities
export const createMockResponse = <T,>(data: T, status = 200) => ({
  data,
  status,
  statusText: "OK",
  headers: new Headers(),
  config: {},
});

export const createMockErrorResponse = (message: string, status = 400) => ({
  response: {
    data: { message },
    status,
    statusText: "Error",
  },
});

// Date utilities
export const createMockDate = (date: string | Date = new Date()) => {
  const mockDate = new Date(date);
  vi.setSystemTime(mockDate);
  return mockDate;
};

// Reset all mocks
export const resetAllMocks = () => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
};

// Cleanup utilities
export const cleanupTestEnvironment = () => {
  resetAllMocks();
  localStorage.clear();
  sessionStorage.clear();
};

// Performance utilities
export const measureRenderTime = async (renderFn: () => void) => {
  const start = performance.now();
  renderFn();
  await waitForAsync(0); // Allow React to render
  const end = performance.now();
  return end - start;
};

// Accessibility utilities
export const checkAccessibility = async (container: HTMLElement) => {
  const { axe, toHaveNoViolations } = await import("jest-axe");
  expect.extend(toHaveNoViolations);
  const results = await axe(container);
  return results;
};

// Integration test utilities
export const setupIntegrationTest = () => {
  // Mock fetch if needed
  global.fetch = vi.fn();

  // Setup localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  };
  Object.defineProperty(window, "localStorage", { value: localStorageMock });

  return { localStorageMock };
};

// E2E test utilities
export const createE2ETestHelpers = () => ({
  // Wait for element to be visible
  waitForElement: async (page: any, selector: string, timeout = 5000) => {
    await page.waitForSelector(selector, { state: "visible", timeout });
  },

  // Fill form safely
  fillForm: async (page: any, formData: Record<string, string>) => {
    for (const [selector, value] of Object.entries(formData)) {
      await page.fill(selector, value);
    }
  },

  // Take screenshot with timestamp
  takeScreenshot: async (page: any, name: string) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    await page.screenshot({
      path: `test-results/screenshots/${name}-${timestamp}.png`,
    });
  },
});

// Test data validation utilities
export const validateTestData = (data: any, schema: Record<string, any>) => {
  const errors: string[] = [];

  for (const [key, rules] of Object.entries(schema)) {
    if (rules.required && (data[key] === undefined || data[key] === null)) {
      errors.push(`${key} is required`);
    }

    if (rules.type && typeof data[key] !== rules.type) {
      errors.push(`${key} must be of type ${rules.type}`);
    }

    if (rules.min && data[key] < rules.min) {
      errors.push(`${key} must be at least ${rules.min}`);
    }

    if (rules.max && data[key] > rules.max) {
      errors.push(`${key} must be at most ${rules.max}`);
    }
  }

  return errors;
};
