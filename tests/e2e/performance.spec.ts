/**
 * E2E Performance Testing with Playwright
 * Real-world performance measurement in browser environment
 */

import { test, expect } from "@playwright/test";

test.describe("E2E Performance Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Enable performance monitoring
    await page.addInitScript(() => {
      // Override performance.now() for consistent timing
      const startTime = Date.now();
      const originalPerformanceNow = performance.now;

      performance.now = () => Date.now() - startTime;
    });
  });

  test("should load main page within performance budget", async ({ page }) => {
    const startTime = Date.now();

    await page.goto("/");

    const loadTime = Date.now() - startTime;

    // Page should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);

    // Wait for all network requests to complete
    await page.waitForLoadState("networkidle");

    // Check Core Web Vitals
    const webVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const vitals: any = {};

          entries.forEach((entry) => {
            if (entry.entryType === "navigation") {
              const navEntry = entry as PerformanceNavigationTiming;
              vitals.domContentLoaded =
                navEntry.domContentLoadedEventEnd -
                navEntry.domContentLoadedEventStart;
              vitals.loadComplete =
                navEntry.loadEventEnd - navEntry.loadEventStart;
              vitals.firstPaint = navEntry.loadEventEnd - navEntry.fetchStart;
            }

            if (entry.entryType === "paint") {
              const paintEntry = entry as PerformancePaintTiming;
              if (paintEntry.name === "first-contentful-paint") {
                vitals.firstContentfulPaint = paintEntry.startTime;
              }
            }
          });

          resolve(vitals);
        });

        observer.observe({ entryTypes: ["navigation", "paint"] });
      });
    });

    expect(webVitals.firstContentfulPaint).toBeLessThan(2000); // 2s
    expect(webVitals.domContentLoaded).toBeLessThan(1500); // 1.5s
  });

  test("should handle large listing lists efficiently", async ({ page }) => {
    await page.goto("/listings");

    // Measure scroll performance
    const scrollMetrics = await page.evaluate(async () => {
      const metrics = {
        frameDrops: 0,
        averageFrameTime: 0,
        scrollDuration: 0,
      };

      const startTime = performance.now();
      let frameCount = 0;
      let lastFrameTime = startTime;

      const measureFrame = () => {
        const currentTime = performance.now();
        const frameTime = currentTime - lastFrameTime;

        if (frameTime > 16.67) {
          // 60fps threshold
          metrics.frameDrops++;
        }

        metrics.averageFrameTime += frameTime;
        frameCount++;
        lastFrameTime = currentTime;
      };

      // Scroll down the page
      const scrollContainer = document.documentElement;
      const totalScroll = scrollContainer.scrollHeight - window.innerHeight;
      const scrollStep = 100;
      let currentScroll = 0;

      const scrollInterval = setInterval(() => {
        if (currentScroll >= totalScroll) {
          clearInterval(scrollInterval);
          metrics.scrollDuration = performance.now() - startTime;
          metrics.averageFrameTime /= frameCount;
          return;
        }

        window.scrollTo(0, currentScroll);
        currentScroll += scrollStep;
        measureFrame();
      }, 50);

      return new Promise((resolve) => {
        setTimeout(() => {
          clearInterval(scrollInterval);
          metrics.scrollDuration = performance.now() - startTime;
          metrics.averageFrameTime /= frameCount || 1;
          resolve(metrics);
        }, 5000);
      });
    });

    expect(scrollMetrics.frameDrops).toBeLessThan(10); // Less than 10 frame drops
    expect(scrollMetrics.averageFrameTime).toBeLessThan(20); // Average frame time under 20ms
  });

  test("should load images progressively without layout shifts", async ({
    page,
  }) => {
    await page.goto("/");

    // Measure Cumulative Layout Shift (CLS)
    const cls = await page.evaluate(() => {
      return new Promise((resolve) => {
        let clsValue = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (
              entry.entryType === "layout-shift" &&
              !(entry as any).hadRecentInput
            ) {
              clsValue += (entry as any).value;
            }
          }
        });

        observer.observe({ entryTypes: ["layout-shift"] });

        // Wait for images to load
        setTimeout(() => {
          observer.disconnect();
          resolve(clsValue);
        }, 3000);
      });
    });

    expect(cls).toBeLessThan(0.1); // CLS should be very low
  });

  test("should maintain performance during image uploads", async ({ page }) => {
    await page.goto("/create-listing");

    // Simulate file upload
    const fileInput = page.locator('input[type="file"]');
    const file = {
      name: "test-image.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("fake image data"),
    };

    const startTime = performance.now();

    await fileInput.setInputFiles(file);

    // Wait for upload processing
    await page.waitForSelector('[data-testid="upload-progress"]', {
      state: "hidden",
    });

    const uploadTime = performance.now() - startTime;

    // Upload should complete within reasonable time
    expect(uploadTime).toBeLessThan(10000); // 10 seconds
  });

  test("should handle real-time updates efficiently", async ({ page }) => {
    await page.goto("/chat");

    // Monitor memory usage during real-time updates
    const memoryMetrics = await page.evaluate(async () => {
      const metrics = {
        initialMemory: 0,
        peakMemory: 0,
        finalMemory: 0,
        memoryGrowth: 0,
      };

      // Get initial memory
      const memory = (performance as any).memory;
      if (memory) {
        metrics.initialMemory = memory.usedJSHeapSize;
        metrics.peakMemory = memory.usedJSHeapSize;
      }

      // Simulate receiving messages
      const messageCount = 100;
      for (let i = 0; i < messageCount; i++) {
        // Simulate WebSocket message
        const event = new MessageEvent("message", {
          data: JSON.stringify({
            type: "new_message",
            message: `Test message ${i}`,
            timestamp: Date.now(),
          }),
        });

        window.dispatchEvent(event);

        // Track peak memory
        if (memory) {
          metrics.peakMemory = Math.max(
            metrics.peakMemory,
            memory.usedJSHeapSize,
          );
        }

        // Small delay between messages
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // Get final memory
      if (memory) {
        metrics.finalMemory = memory.usedJSHeapSize;
        metrics.memoryGrowth = metrics.finalMemory - metrics.initialMemory;
      }

      return metrics;
    });

    // Memory growth should be reasonable
    expect(memoryMetrics.memoryGrowth).toBeLessThan(10 * 1024 * 1024); // 10MB
  });

  test("should maintain responsive UI during heavy operations", async ({
    page,
  }) => {
    await page.goto("/search");

    // Perform search and measure UI responsiveness
    const responsivenessMetrics = await page.evaluate(async () => {
      const metrics = {
        inputDelay: 0,
        frameRate: 0,
        blockingTime: 0,
      };

      // Measure input delay
      const startTime = performance.now();

      // Simulate typing in search
      const searchInput = document.querySelector(
        'input[type="search"]',
      ) as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
        searchInput.value = "test query";
        searchInput.dispatchEvent(new Event("input", { bubbles: true }));
      }

      const inputDelay = performance.now() - startTime;
      metrics.inputDelay = inputDelay;

      // Measure frame rate during search
      let frameCount = 0;
      const frameRateStartTime = performance.now();

      const measureFrameRate = () => {
        frameCount++;
        if (performance.now() - frameRateStartTime < 1000) {
          requestAnimationFrame(measureFrameRate);
        } else {
          metrics.frameRate = frameCount;
        }
      };

      requestAnimationFrame(measureFrameRate);

      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(metrics);
        }, 2000);
      });
    });

    expect(responsivenessMetrics.inputDelay).toBeLessThan(100); // Input delay under 100ms
    expect(responsivenessMetrics.frameRate).toBeGreaterThan(30); // At least 30fps
  });

  test("should optimize bundle loading with code splitting", async ({
    page,
  }) => {
    await page.goto("/");

    // Monitor network requests for bundle loading
    const networkMetrics = await page.evaluate(async () => {
      const metrics = {
        totalBundleSize: 0,
        chunkCount: 0,
        loadTimes: [] as number[],
        lazyLoadedChunks: 0,
      };

      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === "resource") {
            const resource = entry as PerformanceResourceTiming;

            if (
              resource.name.includes(".js") ||
              resource.name.includes(".css")
            ) {
              metrics.totalBundleSize += resource.transferSize || 0;
              metrics.chunkCount++;
              metrics.loadTimes.push(
                resource.responseEnd - resource.requestStart,
              );

              // Check if it's a lazy-loaded chunk
              if (
                resource.name.includes("chunk") ||
                resource.name.includes("lazy")
              ) {
                metrics.lazyLoadedChunks++;
              }
            }
          }
        }
      });

      observer.observe({ entryTypes: ["resource"] });

      // Trigger some navigation to load lazy chunks
      setTimeout(() => {
        window.history.pushState({}, "", "/listings");
        window.dispatchEvent(new PopStateEvent("popstate"));
      }, 1000);

      return new Promise((resolve) => {
        setTimeout(() => {
          observer.disconnect();
          resolve(metrics);
        }, 3000);
      });
    });

    expect(networkMetrics.totalBundleSize).toBeLessThan(1024 * 1024); // Total under 1MB
    expect(networkMetrics.lazyLoadedChunks).toBeGreaterThan(0); // Should have lazy-loaded chunks

    // Average load time should be reasonable
    const averageLoadTime =
      networkMetrics.loadTimes.reduce((a, b) => a + b, 0) /
      networkMetrics.loadTimes.length;
    expect(averageLoadTime).toBeLessThan(500); // Under 500ms
  });
});
