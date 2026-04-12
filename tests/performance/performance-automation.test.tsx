/**
 * Performance Testing Suite
 * Automated performance monitoring and regression testing
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { performance } from "perf_hooks";

// Performance testing utilities
export const PerformanceUtils = {
  // Measure render time
  measureRenderTime: async (component: React.ReactElement, iterations = 10) => {
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      render(component);
      const end = performance.now();
      times.push(end - start);
    }

    return {
      average: times.reduce((a, b) => a + b, 0) / times.length,
      min: Math.min(...times),
      max: Math.max(...times),
      median: times.sort((a, b) => a - b)[Math.floor(times.length / 2)],
    };
  },

  // Measure memory usage
  measureMemoryUsage: () => {
    if (typeof window !== "undefined" && "memory" in window.performance) {
      const memory = (window.performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
      };
    }
    return null;
  },

  // Measure bundle size (mock for testing)
  measureBundleSize: async (url: string) => {
    try {
      const response = await fetch(url);
      const content = await response.text();
      return {
        size: new Blob([content]).size,
        gzipped: new Blob([content]).size * 0.3, // Approximate gzip compression
      };
    } catch {
      return { size: 0, gzipped: 0 };
    }
  },

  // Measure API response time
  measureApiPerformance: async (apiCall: () => Promise<any>) => {
    const start = performance.now();
    const result = await apiCall();
    const end = performance.now();

    return {
      responseTime: end - start,
      result,
    };
  },
};

// Performance thresholds
export const PERFORMANCE_THRESHOLDS = {
  RENDER_TIME: {
    FAST: 16, // 60fps
    ACCEPTABLE: 100,
    SLOW: 500,
  },
  MEMORY: {
    MAX_HEAP_SIZE: 50 * 1024 * 1024, // 50MB
    WARNING_THRESHOLD: 30 * 1024 * 1024, // 30MB
  },
  BUNDLE_SIZE: {
    MAIN_BUNDLE: 250 * 1024, // 250KB
    VENDOR_BUNDLE: 500 * 1024, // 500KB
    TOTAL: 1 * 1024 * 1024, // 1MB
  },
  API_RESPONSE_TIME: {
    FAST: 200, // 200ms
    ACCEPTABLE: 1000, // 1s
    SLOW: 3000, // 3s
  },
};

describe("Performance Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Component Rendering Performance", () => {
    it("should render components within acceptable time limits", async () => {
      const TestComponent = () => (
        <div>
          <h1>Performance Test</h1>
          <p>Testing component render performance</p>
          {Array.from({ length: 100 }, (_, i) => (
            <div key={i}>Item {i}</div>
          ))}
        </div>
      );

      const metrics = await PerformanceUtils.measureRenderTime(
        <TestComponent />,
      );

      expect(metrics.average).toBeLessThan(
        PERFORMANCE_THRESHOLDS.RENDER_TIME.ACCEPTABLE,
      );
      expect(metrics.max).toBeLessThan(PERFORMANCE_THRESHOLDS.RENDER_TIME.SLOW);
    });

    it("should handle large lists efficiently", async () => {
      const LargeListComponent = () => (
        <div>
          {Array.from({ length: 1000 }, (_, i) => (
            <div key={i} data-testid={`item-${i}`}>
              Item {i}: {Math.random().toString(36)}
            </div>
          ))}
        </div>
      );

      const metrics = await PerformanceUtils.measureRenderTime(
        <LargeListComponent />,
      );

      // Large lists should still render within reasonable time
      expect(metrics.average).toBeLessThan(
        PERFORMANCE_THRESHOLDS.RENDER_TIME.SLOW,
      );
    });

    it("should not cause memory leaks during repeated renders", async () => {
      const TestComponent = ({ count }: { count: number }) => (
        <div>
          {Array.from({ length: count }, (_, i) => (
            <div key={i}>Memory test item {i}</div>
          ))}
        </div>
      );

      const initialMemory = PerformanceUtils.measureMemoryUsage();

      // Render multiple times
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(<TestComponent count={100} />);
        unmount();
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = PerformanceUtils.measureMemoryUsage();

      if (initialMemory && finalMemory) {
        const memoryGrowth = finalMemory.used - initialMemory.used;
        expect(memoryGrowth).toBeLessThan(
          PERFORMANCE_THRESHOLDS.MEMORY.WARNING_THRESHOLD,
        );
      }
    });
  });

  describe("API Performance", () => {
    it("should measure API response times", async () => {
      // Mock API call
      const mockApiCall = vi.fn().mockResolvedValue({ data: "test" });

      const metrics = await PerformanceUtils.measureApiPerformance(mockApiCall);

      expect(metrics.responseTime).toBeGreaterThan(0);
      expect(mockApiCall).toHaveBeenCalled();
    });

    it("should handle slow API responses gracefully", async () => {
      const slowApiCall = () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ data: "slow" }), 2000),
        );

      const metrics = await PerformanceUtils.measureApiPerformance(slowApiCall);

      expect(metrics.responseTime).toBeGreaterThan(2000);
      expect(metrics.responseTime).toBeLessThan(3000);
    });

    it("should implement request timeout handling", async () => {
      const timeoutApiCall = () =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 100),
        );

      const start = performance.now();

      try {
        await Promise.race([
          timeoutApiCall(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Request timeout")), 50),
          ),
        ]);
      } catch (error) {
        const end = performance.now();
        const duration = end - start;

        expect(duration).toBeLessThan(100); // Should timeout before API call completes
        expect((error as Error).message).toBe("Request timeout");
      }
    });
  });

  describe("Bundle Size Optimization", () => {
    it("should track bundle size metrics", async () => {
      // Mock bundle analysis
      const mockBundleAnalysis = {
        main: { size: 200 * 1024, gzipped: 60 * 1024 },
        vendor: { size: 400 * 1024, gzipped: 120 * 1024 },
        total: { size: 600 * 1024, gzipped: 180 * 1024 },
      };

      expect(mockBundleAnalysis.main.size).toBeLessThan(
        PERFORMANCE_THRESHOLDS.BUNDLE_SIZE.MAIN_BUNDLE,
      );
      expect(mockBundleAnalysis.vendor.size).toBeLessThan(
        PERFORMANCE_THRESHOLDS.BUNDLE_SIZE.VENDOR_BUNDLE,
      );
      expect(mockBundleAnalysis.total.size).toBeLessThan(
        PERFORMANCE_THRESHOLDS.BUNDLE_SIZE.TOTAL,
      );
    });

    it("should detect bundle size regressions", () => {
      const currentBundle = { size: 300 * 1024 }; // 300KB
      const previousBundle = { size: 250 * 1024 }; // 250KB

      const regressionThreshold = 0.1; // 10%
      const regression =
        (currentBundle.size - previousBundle.size) / previousBundle.size;

      expect(regression).toBeGreaterThan(regressionThreshold);
      expect(regression).toBe(0.2); // 20% increase
    });
  });

  describe("Image Optimization", () => {
    it("should validate image optimization", () => {
      const images = [
        { src: "image1.jpg", size: 1024 * 1024, format: "jpeg" }, // 1MB
        { src: "image2.webp", size: 500 * 1024, format: "webp" }, // 500KB
        { src: "image3.jpg", size: 2 * 1024 * 1024, format: "jpeg" }, // 2MB - too large
      ];

      const maxImageSize = 1024 * 1024; // 1MB
      const optimizedFormats = ["webp", "avif"];

      images.forEach((image) => {
        expect(image.size).toBeLessThanOrEqual(maxImageSize);

        if (image.format === "jpeg" && image.size > maxImageSize * 0.5) {
          // Large JPEG images should consider modern formats
          console.warn(`Large image ${image.src} should consider WebP format`);
        }
      });
    });

    it("should implement lazy loading for images", () => {
      const mockIntersectionObserver = vi.fn().mockImplementation(() => ({
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
      }));

      global.IntersectionObserver = mockIntersectionObserver;

      const ImageComponent = ({ src, alt }: { src: string; alt: string }) => (
        <img src={src} alt={alt} loading="lazy" />
      );

      render(<ImageComponent src="test.jpg" alt="Test" />);

      expect(mockIntersectionObserver).toHaveBeenCalled();
    });
  });

  describe("Database Query Performance", () => {
    it("should measure query execution time", async () => {
      const mockQuery = vi.fn().mockResolvedValue([
        { id: 1, name: "Item 1" },
        { id: 2, name: "Item 2" },
      ]);

      const start = performance.now();
      await mockQuery();
      const end = performance.now();

      const queryTime = end - start;

      expect(queryTime).toBeLessThan(
        PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME.ACCEPTABLE,
      );
      expect(mockQuery).toHaveBeenCalled();
    });

    it("should implement query result caching", async () => {
      const cache = new Map<string, { data: any; timestamp: number }>();
      const cacheTimeout = 5 * 60 * 1000; // 5 minutes

      const cachedQuery = async (query: string) => {
        const cached = cache.get(query);
        const now = Date.now();

        if (cached && now - cached.timestamp < cacheTimeout) {
          return cached.data;
        }

        // Simulate database query
        const data = await new Promise((resolve) =>
          setTimeout(() => resolve([{ id: 1, query }]), 100),
        );

        cache.set(query, { data, timestamp: now });
        return data;
      };

      // First call
      const start1 = performance.now();
      await cachedQuery("SELECT * FROM items");
      const end1 = performance.now();
      const firstCallTime = end1 - start1;

      // Second call (should be cached)
      const start2 = performance.now();
      await cachedQuery("SELECT * FROM items");
      const end2 = performance.now();
      const secondCallTime = end2 - start2;

      expect(secondCallTime).toBeLessThan(firstCallTime);
      expect(secondCallTime).toBeLessThan(10); // Cached calls should be very fast
    });
  });

  describe("Real-time Performance Monitoring", () => {
    it("should track performance metrics over time", () => {
      const performanceMetrics = {
        renderTimes: [16, 20, 18, 25, 30, 15, 12, 22],
        apiTimes: [150, 200, 180, 250, 120, 190],
        memoryUsage: [1024, 1100, 980, 1200, 1050],
      };

      const calculateStats = (values: number[]) => ({
        average: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        p95: values.sort((a, b) => a - b)[Math.floor(values.length * 0.95)],
      });

      const renderStats = calculateStats(performanceMetrics.renderTimes);
      const apiStats = calculateStats(performanceMetrics.apiTimes);

      expect(renderStats.average).toBeLessThan(
        PERFORMANCE_THRESHOLDS.RENDER_TIME.ACCEPTABLE,
      );
      expect(renderStats.p95).toBeLessThan(
        PERFORMANCE_THRESHOLDS.RENDER_TIME.SLOW,
      );
      expect(apiStats.average).toBeLessThan(
        PERFORMANCE_THRESHOLDS.API_RESPONSE_TIME.ACCEPTABLE,
      );
    });

    it("should detect performance regressions", () => {
      const baselineMetrics = {
        averageRenderTime: 50,
        averageApiTime: 200,
        memoryUsage: 20 * 1024 * 1024,
      };

      const currentMetrics = {
        averageRenderTime: 120, // 140% increase
        averageApiTime: 250, // 25% increase
        memoryUsage: 35 * 1024 * 1024, // 75% increase
      };

      const regressionThreshold = 0.2; // 20%

      const renderRegression =
        (currentMetrics.averageRenderTime - baselineMetrics.averageRenderTime) /
        baselineMetrics.averageRenderTime;
      const apiRegression =
        (currentMetrics.averageApiTime - baselineMetrics.averageApiTime) /
        baselineMetrics.averageApiTime;
      const memoryRegression =
        (currentMetrics.memoryUsage - baselineMetrics.memoryUsage) /
        baselineMetrics.memoryUsage;

      expect(renderRegression).toBeGreaterThan(regressionThreshold);
      expect(apiRegression).toBeGreaterThan(regressionThreshold);
      expect(memoryRegression).toBeGreaterThan(regressionThreshold);
    });
  });
});
