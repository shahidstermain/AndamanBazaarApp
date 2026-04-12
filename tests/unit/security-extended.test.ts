/**
 * PHASE 2 — Security Module Extended Tests
 * Covers: rate limiting, suspicious activity detection, error sanitization, retryAsync
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  checkRateLimit,
  detectSuspiciousActivity,
  sanitizeErrorMessage,
  isTransientError,
  retryAsync,
  secureStorage,
  trackRequest,
  getRequestMetrics,
} from "../../src/lib/security";

vi.mock(
  "../../src/lib/supabase",
  () => import("../../src/lib/__mocks__/supabase"),
);

describe("checkRateLimit()", () => {
  it("allows first request", () => {
    const result = checkRateLimit("test-key-1");
    expect(result.allowed).toBe(true);
  });

  it("allows requests under the limit", () => {
    const key = `test-key-${Date.now()}`;
    for (let i = 0; i < 19; i++) {
      checkRateLimit(key, { maxRequests: 20 });
    }
    const result = checkRateLimit(key, { maxRequests: 20 });
    expect(result.allowed).toBe(true);
  });

  it("blocks requests over the limit", () => {
    const key = `blocked-key-${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      checkRateLimit(key, { maxRequests: 5, windowSeconds: 60 });
    }
    const result = checkRateLimit(key, { maxRequests: 5, windowSeconds: 60 });
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);
  });
});

describe("sanitizeErrorMessage()", () => {
  it("redacts email addresses", () => {
    const result = sanitizeErrorMessage({
      message: "Error for user@example.com",
    });
    expect(result).not.toContain("user@example.com");
    expect(result).toContain("[EMAIL]");
  });

  it("redacts phone numbers", () => {
    const result = sanitizeErrorMessage({ message: "Contact 9876543210" });
    expect(result).not.toContain("9876543210");
    expect(result).toContain("[PHONE]");
  });

  it("redacts Bearer tokens", () => {
    const result = sanitizeErrorMessage({ message: "Bearer eyJhbGciOiJ..." });
    expect(result).not.toContain("eyJhbGciOiJ");
    expect(result).toContain("[TOKEN]");
  });

  it("redacts api keys", () => {
    const result = sanitizeErrorMessage({ message: "api_key=sk_live_abc123" });
    expect(result).toContain("[REDACTED]");
  });

  it("returns generic message for database errors", () => {
    const result = sanitizeErrorMessage({
      message: "database connection failed",
    });
    expect(result).toBe("An error occurred. Please try again later.");
  });

  it("returns generic message for SQL errors", () => {
    const result = sanitizeErrorMessage({
      message: "SQL syntax error at position 12",
    });
    expect(result).toBe("An error occurred. Please try again later.");
  });

  it("returns generic message for JWT errors", () => {
    const result = sanitizeErrorMessage({ message: "jwt malformed" });
    expect(result).toBe("An error occurred. Please try again later.");
  });

  it("handles string errors", () => {
    const result = sanitizeErrorMessage("simple error");
    expect(result).toBe("simple error");
  });
});

describe("isTransientError()", () => {
  it("identifies 429 as transient", () => {
    expect(isTransientError({ status: 429 })).toBe(true);
  });

  it("identifies 500 as transient", () => {
    expect(isTransientError({ status: 500 })).toBe(true);
  });

  it("identifies 503 as transient", () => {
    expect(isTransientError({ status: 503 })).toBe(true);
  });

  it('identifies "failed to fetch" as transient', () => {
    expect(
      isTransientError({ message: "failed to fetch", name: "TypeError" }),
    ).toBe(true);
  });

  it("identifies timeout as transient", () => {
    expect(isTransientError({ message: "Request timed out" })).toBe(true);
  });

  it("does not identify 400 as transient", () => {
    expect(isTransientError({ status: 400 })).toBe(false);
  });

  it("does not identify 401 as transient", () => {
    expect(isTransientError({ status: 401 })).toBe(false);
  });

  it("returns false for null", () => {
    expect(isTransientError(null)).toBe(false);
  });
});

describe("retryAsync()", () => {
  it("succeeds on first attempt", async () => {
    const op = vi.fn().mockResolvedValue("ok");
    const result = await retryAsync(op, { maxAttempts: 3 });
    expect(result).toBe("ok");
    expect(op).toHaveBeenCalledTimes(1);
  });

  it("retries on transient error and succeeds", async () => {
    const op = vi
      .fn()
      .mockRejectedValueOnce({ status: 500, message: "server error" })
      .mockResolvedValueOnce("recovered");

    const result = await retryAsync(op, {
      maxAttempts: 3,
      baseDelayMs: 1,
      jitterMs: 0,
    });
    expect(result).toBe("recovered");
    expect(op).toHaveBeenCalledTimes(2);
  });

  it("throws immediately on non-transient error", async () => {
    const op = vi
      .fn()
      .mockRejectedValue({ status: 400, message: "bad request" });

    await expect(
      retryAsync(op, { maxAttempts: 3, baseDelayMs: 1 }),
    ).rejects.toEqual(expect.objectContaining({ status: 400 }));
    expect(op).toHaveBeenCalledTimes(1);
  });

  it("exhausts all attempts and throws last error", async () => {
    const op = vi.fn().mockRejectedValue({ status: 500, message: "down" });

    await expect(
      retryAsync(op, { maxAttempts: 2, baseDelayMs: 1, jitterMs: 0 }),
    ).rejects.toEqual(expect.objectContaining({ status: 500 }));
    expect(op).toHaveBeenCalledTimes(2);
  });
});

describe("secureStorage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gets value from localStorage", () => {
    (localStorage.getItem as any).mockReturnValue('{"key":"val"}');
    expect(secureStorage.get("test", null)).toEqual({ key: "val" });
  });

  it("returns fallback when key missing", () => {
    (localStorage.getItem as any).mockReturnValue(null);
    expect(secureStorage.get("missing", "default")).toBe("default");
  });

  it("returns fallback on parse error", () => {
    (localStorage.getItem as any).mockReturnValue("not-json");
    expect(secureStorage.get("bad", [])).toEqual([]);
  });

  it("sets value in localStorage", () => {
    const result = secureStorage.set("key", { a: 1 });
    expect(result).toBe(true);
    expect(localStorage.setItem).toHaveBeenCalledWith("key", '{"a":1}');
  });

  it("removes key from localStorage", () => {
    secureStorage.remove("key");
    expect(localStorage.removeItem).toHaveBeenCalledWith("key");
  });
});

describe("trackRequest() & getRequestMetrics()", () => {
  it("tracks and retrieves metrics", () => {
    trackRequest({ endpoint: "/api/test", duration: 100, status: "success" });
    const metrics = getRequestMetrics();
    expect(metrics.length).toBeGreaterThan(0);
    const last = metrics[metrics.length - 1];
    expect(last.endpoint).toBe("/api/test");
    expect(last.status).toBe("success");
  });
});

describe("detectSuspiciousActivity()", () => {
  it("returns not suspicious with few requests", () => {
    const result = detectSuspiciousActivity();
    expect(result.suspicious).toBe(false);
  });
});
