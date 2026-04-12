import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BOOST_TIERS, getTier } from "../../src/lib/pricing";

type BoostStatus = "pending" | "paid" | "failed";

const computeFeaturedUntil = (from: Date, durationDays: number) =>
  new Date(from.getTime() + durationDays * 24 * 60 * 60 * 1000);

const canActivateBoost = (status: BoostStatus) => status !== "paid";

describe("Boost activation logic (deterministic)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("validates only known tier keys", () => {
    expect(getTier("spark").priceInr).toBe(49);
    expect(getTier("boost").priceInr).toBe(99);
    expect(getTier("power").priceInr).toBe(199);
    expect(() => getTier("premium")).toThrow("Unknown boost tier: premium");
  });

  it("keeps pricing synchronized (pricePaise = priceInr * 100)", () => {
    for (const tier of BOOST_TIERS) {
      expect(tier.pricePaise).toBe(tier.priceInr * 100);
    }
  });

  it("computes featured_until based on duration days with frozen time", () => {
    const now = new Date();
    const spark = getTier("spark");
    const boost = getTier("boost");
    const power = getTier("power");

    expect(computeFeaturedUntil(now, spark.durationDays).toISOString()).toBe(
      "2026-03-04T00:00:00.000Z",
    );
    expect(computeFeaturedUntil(now, boost.durationDays).toISOString()).toBe(
      "2026-03-08T00:00:00.000Z",
    );
    expect(computeFeaturedUntil(now, power.durationDays).toISOString()).toBe(
      "2026-03-31T00:00:00.000Z",
    );
  });

  it("prevents re-activation when boost is already paid", () => {
    expect(canActivateBoost("pending")).toBe(true);
    expect(canActivateBoost("failed")).toBe(true);
    expect(canActivateBoost("paid")).toBe(false);
  });
});
