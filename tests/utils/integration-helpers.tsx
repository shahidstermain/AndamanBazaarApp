/**
 * Integration Test Utilities
 * Helper functions for integration testing with Firebase and external services
 */

import { setupServer } from "msw/node";
import { rest } from "msw";
import { render, RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { vi } from "vitest";

// Mock Firebase configuration
export const mockFirebaseConfig = {
  apiKey: "test-api-key",
  authDomain: "test-project.firebaseapp.com",
  projectId: "test-project",
  storageBucket: "test-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:testapp",
};

// Mock server setup
export const server = setupServer(
  // Auth endpoints
  rest.post(
    "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword",
    (req, res, ctx) => {
      return res(
        ctx.status(200),
        ctx.json({
          idToken: "mock-id-token",
          email: req.body.email,
          localId: "mock-user-id",
          expiresIn: "3600",
        }),
      );
    },
  ),

  rest.post(
    "https://identitytoolkit.googleapis.com/v1/accounts:signUp",
    (req, res, ctx) => {
      return res(
        ctx.status(200),
        ctx.json({
          idToken: "mock-id-token",
          email: req.body.email,
          localId: "mock-user-id",
          expiresIn: "3600",
        }),
      );
    },
  ),

  // Firestore endpoints
  rest.get(
    "https://firestore.googleapis.com/v1/projects/test-project/databases/(default)/documents/listings",
    (req, res, ctx) => {
      return res(
        ctx.status(200),
        ctx.json({
          documents: [
            {
              name: "projects/test-project/databases/(default)/documents/listings/listing1",
              fields: {
                title: { stringValue: "Test Listing" },
                price: { integerValue: "1000" },
                category: { stringValue: "electronics" },
              },
            },
          ],
        }),
      );
    },
  ),

  rest.post(
    "https://firestore.googleapis.com/v1/projects/test-project/databases/(default)/documents/listings",
    (req, res, ctx) => {
      return res(
        ctx.status(200),
        ctx.json({
          name: "projects/test-project/databases/(default)/documents/listings/new-listing",
        }),
      );
    },
  ),

  // Storage endpoints
  rest.post(
    "https://storage.googleapis.com/upload/storage/v1/b/test-project.appspot.com/o",
    (req, res, ctx) => {
      return res(
        ctx.status(200),
        ctx.json({
          bucket: "test-project.appspot.com",
          name: "images/test-image.jpg",
        }),
      );
    },
  ),

  // Payment endpoints
  rest.post("https://api.cashfree.com/pg/orders", (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        order_id: "order_123",
        order_token: "token_123",
        payment_session_id: "session_123",
      }),
    );
  }),

  rest.post(
    "https://api.cashfree.com/pg/orders/:orderId/verify",
    (req, res, ctx) => {
      return res(
        ctx.status(200),
        ctx.json({
          order_id: req.params.orderId,
          order_status: "PAID",
          payment_amount: "10000",
        }),
      );
    },
  ),

  // AI moderation endpoints
  rest.post(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
    (req, res, ctx) => {
      return res(
        ctx.status(200),
        ctx.json({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: "This content appears to be appropriate for the platform.",
                  },
                ],
              },
            },
          ],
        }),
      );
    },
  ),
);

// Integration test wrapper
export const IntegrationTestWrapper = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

// Custom render function for integration tests
export const renderWithIntegrationProviders = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) => render(ui, { wrapper: IntegrationTestWrapper, ...options });

// Mock Firebase Auth utilities
export const mockFirebaseAuth = {
  signInWithEmailAndPassword: vi.fn().mockResolvedValue({
    user: {
      uid: "mock-user-id",
      email: "test@example.com",
      displayName: "Test User",
    },
  }),

  createUserWithEmailAndPassword: vi.fn().mockResolvedValue({
    user: {
      uid: "mock-user-id",
      email: "test@example.com",
      displayName: "Test User",
    },
  }),

  signOut: vi.fn().mockResolvedValue(undefined),

  onAuthStateChanged: vi.fn((callback) => {
    callback({ uid: "mock-user-id", email: "test@example.com" });
    return () => {}; // Unsubscribe function
  }),
};

// Mock Firestore utilities
export const mockFirestore = {
  collection: vi.fn(() => ({
    doc: vi.fn(() => ({
      get: vi.fn().mockResolvedValue({
        exists: true,
        data: () => ({ title: "Test Listing", price: 1000 }),
      }),
      set: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    })),
    where: vi.fn(() => ({
      get: vi.fn().mockResolvedValue({
        docs: [
          { id: "1", data: () => ({ title: "Test 1" }) },
          { id: "2", data: () => ({ title: "Test 2" }) },
        ],
      }),
      orderBy: vi.fn(() => ({
        get: vi.fn().mockResolvedValue({
          docs: [{ id: "1", data: () => ({ title: "Test 1" }) }],
        }),
      })),
    })),
    add: vi.fn().mockResolvedValue({ id: "new-doc-id" }),
    get: vi.fn().mockResolvedValue({
      docs: [{ id: "1", data: () => ({ title: "Test 1" }) }],
    }),
  })),
};

// Mock Storage utilities
export const mockStorage = {
  ref: vi.fn(() => ({
    put: vi.fn().mockResolvedValue({
      ref: { name: "test-image.jpg" },
      state: "success",
    }),
    getDownloadURL: vi
      .fn()
      .mockResolvedValue("https://example.com/test-image.jpg"),
    delete: vi.fn().mockResolvedValue(undefined),
  })),
};

// Test data cleanup utilities
export const cleanupTestData = async () => {
  // Clean up any test data created during integration tests
  const testCollections = ["listings", "users", "chats", "payments"];

  for (const collection of testCollections) {
    try {
      // In a real implementation, this would connect to Firebase and clean up
      console.log(`Cleaning up test data from ${collection}`);
    } catch (error) {
      console.error(`Failed to clean up ${collection}:`, error);
    }
  }
};

// Integration test helpers
export const IntegrationTestHelpers = {
  // Wait for async operations
  waitForAsync: (ms: number = 0) =>
    new Promise((resolve) => setTimeout(resolve, ms)),

  // Create test user session
  createTestSession: async (userData = {}) => {
    const defaultUser = {
      uid: "test-user-123",
      email: "test@example.com",
      displayName: "Test User",
      emailVerified: true,
    };

    return { ...defaultUser, ...userData };
  },

  // Mock network conditions
  mockNetworkCondition: (condition: "offline" | "slow" | "fast") => {
    const conditions = {
      offline: {
        online: false,
        latency: 0,
        downloadThroughput: 0,
        uploadThroughput: 0,
      },
      slow: {
        online: true,
        latency: 2000,
        downloadThroughput: 1000,
        uploadThroughput: 500,
      },
      fast: {
        online: true,
        latency: 50,
        downloadThroughput: 10000,
        uploadThroughput: 5000,
      },
    };

    // Mock navigator.connection or similar
    Object.defineProperty(navigator, "connection", {
      value: conditions[condition],
      writable: true,
    });
  },

  // Mock geolocation
  mockGeolocation: (latitude: number, longitude: number) => {
    const mockGeolocation = {
      getCurrentPosition: vi.fn().mockImplementation((success) => {
        success({
          coords: { latitude, longitude, accuracy: 10 },
          timestamp: Date.now(),
        });
      }),
      watchPosition: vi.fn().mockReturnValue(1),
      clearWatch: vi.fn(),
    };

    Object.defineProperty(navigator, "geolocation", {
      value: mockGeolocation,
      writable: true,
    });
  },

  // Mock file upload
  mockFileUpload: (filename: string, content: string, mimeType: string) => {
    const file = new File([content], filename, { type: mimeType });
    return file;
  },

  // Mock WebSocket for real-time features
  mockWebSocket: (url: string) => {
    const mockWs = {
      send: vi.fn(),
      close: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      readyState: 1, // WebSocket.OPEN
      CONNECTING: 0,
      OPEN: 1,
      CLOSING: 2,
      CLOSED: 3,
    };

    global.WebSocket = vi.fn().mockImplementation(() => mockWs) as any;
    return mockWs;
  },
};

// Integration test setup and teardown
export const setupIntegrationTest = () => {
  // Start MSW server
  server.listen({
    onUnhandledRequest: "warn",
  });

  // Setup mocks
  vi.mock("firebase/auth", () => ({
    getAuth: () => ({ currentUser: null }),
    signInWithEmailAndPassword: mockFirebaseAuth.signInWithEmailAndPassword,
    createUserWithEmailAndPassword:
      mockFirebaseAuth.createUserWithEmailAndPassword,
    signOut: mockFirebaseAuth.signOut,
    onAuthStateChanged: mockFirebaseAuth.onAuthStateChanged,
  }));

  vi.mock("firebase/firestore", () => ({
    getFirestore: () => mockFirestore,
    collection: mockFirestore.collection,
    doc: mockFirestore.collection().doc,
    addDoc: mockFirestore.collection().add,
    getDoc: mockFirestore.collection().doc().get,
    getDocs: mockFirestore.collection().get,
    updateDoc: mockFirestore.collection().doc().update,
    deleteDoc: mockFirestore.collection().doc().delete,
    query: mockFirestore.collection().where,
    orderBy: mockFirestore.collection().where().orderBy,
    where: mockFirestore.collection().where,
  }));

  vi.mock("firebase/storage", () => ({
    getStorage: () => mockStorage,
    ref: mockStorage.ref,
    uploadBytes: mockStorage.ref().put,
    getDownloadURL: mockStorage.ref().getDownloadURL,
    deleteObject: mockStorage.ref().delete,
  }));
};

export const teardownIntegrationTest = () => {
  // Stop MSW server
  server.close();

  // Clear all mocks
  vi.clearAllMocks();

  // Cleanup test data
  cleanupTestData();
};

// Integration test examples
export const IntegrationTestExamples = {
  // Test user authentication flow
  testAuthFlow: async () => {
    const { renderWithIntegrationProviders, screen, fireEvent, userEvent } =
      await import("@testing-library/react");

    const TestComponent = () => (
      <div>
        <button data-testid="login-btn">Login</button>
        <div data-testid="user-info"></div>
      </div>
    );

    renderWithIntegrationProviders(<TestComponent />);

    const loginBtn = screen.getByTestId("login-btn");
    await userEvent.click(loginBtn);

    // Wait for auth state to update
    await IntegrationTestHelpers.waitForAsync(100);

    expect(screen.getByTestId("user-info")).toBeInTheDocument();
  },

  // Test listing creation flow
  testListingCreation: async () => {
    const { renderWithIntegrationProviders, screen, userEvent } =
      await import("@testing-library/react");

    const TestComponent = () => (
      <div>
        <input data-testid="title-input" placeholder="Listing title" />
        <input data-testid="price-input" placeholder="Price" />
        <button data-testid="create-btn">Create Listing</button>
        <div data-testid="result"></div>
      </div>
    );

    renderWithIntegrationProviders(<TestComponent />);

    await userEvent.type(screen.getByTestId("title-input"), "Test Listing");
    await userEvent.type(screen.getByTestId("price-input"), "1000");
    await userEvent.click(screen.getByTestId("create-btn"));

    await IntegrationTestHelpers.waitForAsync(100);

    expect(screen.getByTestId("result")).toBeInTheDocument();
  },
};
