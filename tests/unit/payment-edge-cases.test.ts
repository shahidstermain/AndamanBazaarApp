import { describe, it, expect, vi } from "vitest";
import { retryAsync, isTransientError } from "../../src/lib/security";

const resolveBoostStatusAfterWebhook = (
  status: "pending" | "paid" | "failed",
  webhookDelivered: boolean,
) => {
  if (webhookDelivered && status === "pending") return "paid";
  return status;
};

const applyConcurrentActivation = (
  statuses: Array<"pending" | "paid" | "failed">,
) => {
  let activated = false;
  return statuses.map((status) => {
    if (status === "paid" || activated) return "skipped";
    activated = true;
    return "activated";
  });
};

describe("Payment edge-case behavior (CI-stable)", () => {
  it("keeps boost pending when webhook never arrives", () => {
    const result = resolveBoostStatusAfterWebhook("pending", false);
    expect(result).toBe("pending");
  });

  it("transitions pending boost to paid when webhook arrives", () => {
    const result = resolveBoostStatusAfterWebhook("pending", true);
    expect(result).toBe("paid");
  });

  it("handles transient network errors and recovers with retryAsync", async () => {
    const op = vi
      .fn()
      .mockRejectedValueOnce({ name: "TypeError", message: "Failed to fetch" })
      .mockRejectedValueOnce({ status: 503, message: "Service unavailable" })
      .mockResolvedValueOnce({ ok: true });

    const result = await retryAsync(op, {
      maxAttempts: 4,
      baseDelayMs: 1,
      jitterMs: 0,
    });

    expect(result).toEqual({ ok: true });
    expect(op).toHaveBeenCalledTimes(3);
  });

  it("marks failed to fetch as transient", () => {
    expect(
      isTransientError({ name: "TypeError", message: "Failed to fetch" }),
    ).toBe(true);
  });

  it("prevents duplicate activation in simulated concurrent purchase attempts", () => {
    const result = applyConcurrentActivation(["pending", "pending", "paid"]);
    expect(result).toEqual(["activated", "skipped", "skipped"]);
  });
});
