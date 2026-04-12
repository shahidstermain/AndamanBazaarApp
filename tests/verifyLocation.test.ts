import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/firebase", () => ({
  auth: {
    currentUser: {
      getIdToken: vi.fn().mockResolvedValue("test-id-token"),
    },
  },
}));

import { verifyLocation } from "../src/lib/functions";

describe("verifyLocation", () => {
  beforeEach(() => {
    vi.stubEnv(
      "VITE_FIREBASE_VERIFY_LOCATION_FUNCTION",
      "https://example.com/verify-location",
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("should return success and verified true for valid coordinates", async () => {
    const mockRequest = {
      userId: "user-1",
      latitude: 11.6234,
      longitude: 92.7325,
      accuracy: 50,
      timestamp: Date.now(),
    };

    const mockResponse = {
      success: true,
      verified: true,
      distance: 10,
      city: "Port Blair",
      accuracy: 50,
      ipMatchesAndaman: true,
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const response = await verifyLocation(mockRequest);
    expect(response.success).toBe(true);
    expect(response.verified).toBe(true);
    expect(response.city).toBe("Port Blair");
  });

  it("should return success false for invalid coordinates", async () => {
    const mockRequest = {
      userId: "user-1",
      latitude: 0,
      longitude: 0,
      accuracy: 500,
      timestamp: Date.now(),
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      statusText: "Bad Request",
      json: async () => ({ error: "Location verification failed" }),
    } as Response);

    const response = await verifyLocation(mockRequest);
    expect(response.success).toBe(false);
    expect(response.verified).toBe(false);
  });
});
