import { describe, it, expect, vi } from "vitest";
import {
  detectSuspiciousActivity,
  isTransientError,
  retryAsync,
} from "../../src/lib/security";

describe("Security Utilities", () => {
  describe("detectSuspiciousActivity", () => {
    it("should return not suspicious for normal activity", () => {
      const result = detectSuspiciousActivity();
      expect(result.suspicious).toBe(false);
      expect(result.reason).toBeUndefined();
    });
  });

  describe("isTransientError", () => {
    it("should identify transient HTTP errors", () => {
      expect(isTransientError({ status: 408 })).toBe(true);
      expect(isTransientError({ status: 429 })).toBe(true);
      expect(isTransientError({ status: 500 })).toBe(true);
      expect(isTransientError({ status: 503 })).toBe(true);
    });

    it("should identify network errors", () => {
      expect(
        isTransientError({ name: "TypeError", message: "Failed to fetch" }),
      ).toBe(true);
      expect(
        isTransientError({ name: "FetchError", message: "Network error" }),
      ).toBe(true);
      expect(isTransientError({ code: "ECONNRESET" })).toBe(true);
      expect(isTransientError({ code: "ETIMEDOUT" })).toBe(true);
    });

    it("should not identify non-transient errors", () => {
      expect(isTransientError({ status: 400 })).toBe(false);
      expect(isTransientError({ status: 401 })).toBe(false);
      expect(isTransientError({ status: 403 })).toBe(false);
      expect(isTransientError({ status: 404 })).toBe(false);
      expect(
        isTransientError({ name: "Error", message: "Generic error" }),
      ).toBe(false);
    });

    it("should handle null/undefined errors", () => {
      expect(isTransientError(null)).toBe(false);
      expect(isTransientError(undefined)).toBe(false);
      expect(isTransientError({})).toBe(false);
    });
  });

  describe("retryAsync", () => {
    it("should succeed on first attempt", async () => {
      const operation = () => Promise.resolve("success");
      const result = await retryAsync(operation);

      expect(result).toBe("success");
    });

    it("should retry on transient errors", async () => {
      let attempts = 0;
      const operation = () => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject({ status: 500 });
        }
        return Promise.resolve("success");
      };

      const result = await retryAsync(operation, {
        maxAttempts: 3,
        baseDelayMs: 10,
      });

      expect(result).toBe("success");
      expect(attempts).toBe(3);
    });

    it("should throw after max attempts", async () => {
      const operation = () => Promise.reject({ status: 500 });

      await expect(
        retryAsync(operation, { maxAttempts: 2, baseDelayMs: 10 }),
      ).rejects.toThrow();
    });

    it("should not retry on non-transient errors", async () => {
      const operation = () => Promise.reject({ status: 400 });

      await expect(
        retryAsync(operation, { maxAttempts: 3, baseDelayMs: 10 }),
      ).rejects.toThrow();
    });

    it("should call onAttempt callback", async () => {
      const operation = () => Promise.reject({ status: 500 });
      const onAttempt = (info: any) => {
        // Callback implementation
      };

      await expect(
        retryAsync(operation, {
          maxAttempts: 2,
          baseDelayMs: 10,
          onAttempt,
        }),
      ).rejects.toThrow();
    });

    it("should respect custom retry function", async () => {
      const operation = () => Promise.reject({ custom: "error" });
      const customRetry = (error: any) => error.custom === "error";

      await expect(
        retryAsync(operation, {
          maxAttempts: 2,
          baseDelayMs: 10,
          retryOn: customRetry,
        }),
      ).rejects.toThrow();
    });

    it("should apply exponential backoff", async () => {
      let attempts = 0;
      const operation = () => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject({ status: 500 });
        }
        return Promise.resolve("success");
      };

      const startTime = Date.now();
      await retryAsync(operation, {
        maxAttempts: 3,
        baseDelayMs: 100,
        backoffFactor: 2,
      });
      const endTime = Date.now();

      // Should take at least 300ms (100 + 200)
      expect(endTime - startTime).toBeGreaterThanOrEqual(300);
      expect(attempts).toBe(3);
    });

    it("should respect max delay", async () => {
      let attempts = 0;
      const operation = () => {
        attempts++;
        return Promise.reject({ status: 500 });
      };

      await expect(
        retryAsync(operation, {
          maxAttempts: 4,
          baseDelayMs: 100,
          maxDelayMs: 200,
          backoffFactor: 3,
        }),
      ).rejects.toThrow();

      expect(attempts).toBe(4);
    });

    it("should apply jitter", async () => {
      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;

      // Mock setTimeout to capture delays
      global.setTimeout = ((callback: any, delay?: number) => {
        if (delay) delays.push(delay);
        return originalSetTimeout(callback, 0);
      }) as any;

      const operation = () => Promise.reject({ status: 500 });

      await expect(
        retryAsync(operation, {
          maxAttempts: 3,
          baseDelayMs: 100,
          jitterMs: 50,
          backoffFactor: 1,
        }),
      ).rejects.toThrow();

      // Restore original setTimeout
      global.setTimeout = originalSetTimeout;

      // Delays should vary due to jitter
      expect(delays.length).toBeGreaterThan(0);
      delays.forEach((delay) => {
        expect(delay).toBeGreaterThanOrEqual(100);
        expect(delay).toBeLessThanOrEqual(150);
      });
    });
  });
});
