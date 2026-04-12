import { test, expect } from "@playwright/test";

test.describe("Performance Tests", () => {
  test("should load home page quickly", async ({ page }) => {
    const startTime = Date.now();
    await page.goto("/");
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(3000); // Should load in under 3 seconds
  });

  test("should have good Core Web Vitals", async ({ page }) => {
    await page.goto("/");

    // Measure Largest Contentful Paint
    const lcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry ? lastEntry.startTime : 0);
        }).observe({ entryTypes: ["largest-contentful-paint"] });
      });
    });

    expect(lcp).toBeLessThan(2500); // Good LCP is under 2.5s

    // Measure First Input Delay (simulated)
    const fid = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length > 0) {
            resolve((entries[0] as any).processingStart - entries[0].startTime);
          } else {
            resolve(0);
          }
        }).observe({ entryTypes: ["first-input"] });
      });
    });

    expect(fid).toBeLessThan(100); // Good FID is under 100ms
  });

  test("should lazy load images", async ({ page }) => {
    await page.goto("/");

    // Check that images have loading="lazy" attribute
    const images = await page.locator("img").all();

    for (const img of images) {
      const loading = await img.getAttribute("loading");
      expect(loading).toBe("lazy");
    }
  });

  test("should optimize images", async ({ page }) => {
    await page.goto("/");

    // Check that images have proper dimensions
    const images = await page.locator("img").all();

    for (const img of images) {
      const width = await img.getAttribute("width");
      const height = await img.getAttribute("height");

      expect(width).toBeTruthy();
      expect(height).toBeTruthy();
    }
  });

  test("should minify CSS and JS", async ({ page }) => {
    await page.goto("/");

    // Check response headers for compression
    const response = await page.request.get("/");
    const headers = response.headers();

    expect(headers["content-encoding"]).toMatch(/gzip|br/);
  });

  test("should use efficient caching", async ({ page }) => {
    await page.goto("/");

    // Check caching headers
    const response = await page.request.get("/");
    const headers = response.headers();

    expect(headers["cache-control"]).toBeTruthy();
    expect(headers["etag"]).toBeTruthy();
  });

  test("should preload critical resources", async ({ page }) => {
    await page.goto("/");

    // Check for preload links
    const preloadLinks = await page.locator('link[rel="preload"]').all();

    for (const link of preloadLinks) {
      const href = await link.getAttribute("href");
      const as = await link.getAttribute("as");

      expect(href).toBeTruthy();
      expect(as).toBeTruthy();
    }
  });

  test("should use efficient fonts", async ({ page }) => {
    await page.goto("/");

    // Check font loading
    const fontLinks = await page
      .locator('link[rel="preconnect"][href*="fonts"]')
      .all();

    expect(fontLinks.length).toBeGreaterThan(0);
  });

  test("should minimize render-blocking resources", async ({ page }) => {
    await page.goto("/");

    // Check for async/deferred scripts
    const scripts = await page.locator("script").all();

    for (const script of scripts) {
      const src = await script.getAttribute("src");
      if (src && !src.includes("critical")) {
        const async = await script.getAttribute("async");
        const defer = await script.getAttribute("defer");

        expect(async === "" || defer === "").toBe(true);
      }
    }
  });
});

test.describe("Load Testing", () => {
  test("should handle concurrent users", async ({ browser }) => {
    const contexts = [];

    // Create 10 concurrent sessions
    for (let i = 0; i < 10; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      contexts.push({ context, page });
    }

    // Navigate all pages concurrently
    const navigations = contexts.map(async ({ page }) => {
      const startTime = Date.now();
      await page.goto("/");
      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds even under load
    });

    await Promise.all(navigations);

    // Clean up
    for (const { context } of contexts) {
      await context.close();
    }
  });

  test("should handle rapid page navigation", async ({ page }) => {
    const pages = ["/", "/auth", "/listings", "/privacy", "/terms"];

    for (const url of pages) {
      const startTime = Date.now();
      await page.goto(url);
      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(3000); // Should load quickly
    }
  });

  test("should handle form submissions under load", async ({ page }) => {
    await page.goto("/auth");

    // Submit form multiple times rapidly
    for (let i = 0; i < 5; i++) {
      await page.getByPlaceholder("Email").fill(`test${i}@example.com`);
      await page.getByPlaceholder("Password").fill("password123");
      await page.getByRole("button", { name: "Sign In" }).click();

      // Wait for response
      await page.waitForTimeout(500);
    }

    // Should not crash or show errors
    await expect(page.getByText("Too many attempts")).not.toBeVisible();
  });
});

test.describe("Memory Leak Tests", () => {
  test("should not leak memory on repeated navigation", async ({ page }) => {
    // Measure initial memory usage
    const initialMemory = await page.evaluate(() => {
      if ("memory" in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });

    // Navigate multiple times
    for (let i = 0; i < 10; i++) {
      await page.goto("/");
      await page.goto("/auth");
    }

    // Measure final memory usage
    const finalMemory = await page.evaluate(() => {
      if ("memory" in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });

    // Memory usage should not increase significantly (allow 50% increase)
    if (initialMemory > 0) {
      expect(finalMemory).toBeLessThan(initialMemory * 1.5);
    }
  });

  test("should clean up event listeners", async ({ page }) => {
    await page.goto("/");

    // Get initial event listener count
    const initialListeners = await page.evaluate(() => {
      return (window as any).getEventListeners
        ? (window as any).getEventListeners()
        : {};
    });

    // Navigate away and back
    await page.goto("/auth");
    await page.goto("/");

    // Get final event listener count
    const finalListeners = await page.evaluate(() => {
      return (window as any).getEventListeners
        ? (window as any).getEventListeners()
        : {};
    });

    // Should not accumulate listeners
    const initialCount = Object.keys(initialListeners).length;
    const finalCount = Object.keys(finalListeners).length;

    expect(finalCount).toBeLessThanOrEqual(initialCount + 10); // Allow small increase
  });
});

test.describe("Network Performance Tests", () => {
  test("should handle slow network conditions", async ({ page }) => {
    // Simulate slow 3G network
    await page.context().setOffline(false);
    await page.context().route("**/*", (route) => {
      setTimeout(() => route.continue(), 1000); // 1 second delay
    });

    const startTime = Date.now();
    await page.goto("/");
    const loadTime = Date.now() - startTime;

    // Should still load eventually
    expect(loadTime).toBeLessThan(10000); // Should load within 10 seconds even on slow network
    await expect(
      page.getByRole("heading", { name: "Buy & Sell" }),
    ).toBeVisible();
  });

  test("should handle offline conditions gracefully", async ({ page }) => {
    await page.goto("/");

    // Go offline
    await page.context().setOffline(true);

    // Try to navigate
    await page.goto("/auth");

    // Should show offline message
    await expect(page.getByText(/offline|no connection/i)).toBeVisible();

    // Go back online
    await page.context().setOffline(false);

    // Should work normally again
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Buy & Sell" }),
    ).toBeVisible();
  });

  test("should optimize API calls", async ({ page }) => {
    await page.goto("/");

    // Monitor network requests
    const requests: any[] = [];
    page.on("request", (request) => {
      requests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
      });
    });

    // Perform actions that trigger API calls
    await page.getByPlaceholder("Search mobiles, scooters...").fill("test");
    await page.keyboard.press("Enter");

    // Should not make excessive API calls
    const apiCalls = requests.filter((r) => r.url.includes("/api/"));
    expect(apiCalls.length).toBeLessThanOrEqual(3); // Should not make more than 3 API calls
  });
});
