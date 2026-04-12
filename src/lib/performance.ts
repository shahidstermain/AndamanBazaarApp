import React from "react";

// Performance optimizations for images
export const optimizeImage = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Canvas context not available"));
          return;
        }

        // Calculate new dimensions (max 1200px width/height)
        const maxSize = 1200;
        let { width, height } = img;

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize;
            width = maxSize;
          } else {
            width = (width / height) * maxSize;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw image with high quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to WebP with quality 0.8
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Failed to create optimized image"));
            }
          },
          "image/webp",
          0.8,
        );
      };

      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
};

// Lazy loading for images
export const lazyLoadImages = (): void => {
  if ("IntersectionObserver" in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          img.src = img.dataset.src || img.src;
          img.classList.add("loaded");
          observer.unobserve(img);
        }
      });
    });

    document.querySelectorAll("img[data-src]").forEach((img) => {
      imageObserver.observe(img);
    });
  }
};

// Preload critical images
export const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to preload image: ${src}`));
    img.src = src;
  });
};

// Cache management
export class ImageCache {
  private static instance: ImageCache;
  private cache = new Map<string, { data: string; timestamp: number }>();
  private maxSize = 50; // Maximum 50 images in cache
  private ttl = 3600000; // 1 hour TTL

  static getInstance(): ImageCache {
    if (!ImageCache.instance) {
      ImageCache.instance = new ImageCache();
    }
    return ImageCache.instance;
  }

  set(key: string, data: string): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) this.cache.delete(oldestKey);
    }

    this.cache.set(key, { data, timestamp: Date.now() });
  }

  get(key: string): string | null {
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // Could be implemented with hit/miss tracking
    };
  }
}

// WebP support detection
export const supportsWebP = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const webP = new Image();
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2);
    };
    webP.src =
      "data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA";
  });
};

// Progressive image loading
export const progressiveImageLoader = (
  src: string,
  placeholder: string,
): {
  src: string;
  placeholder: string;
  loading: "lazy" | "eager";
} => {
  return {
    src,
    placeholder,
    loading: "lazy",
  };
};

// Responsive image generation
export const generateResponsiveImage = (
  src: string,
  sizes: number[],
): string => {
  // Generate srcset for responsive images
  const srcset = sizes.map((size) => `${src}?w=${size} ${size}w`).join(", ");
  return srcset;
};

// Critical CSS extraction
export const extractCriticalCSS = (html: string): string => {
  // This would typically be done server-side
  // For now, return empty string as placeholder
  return "";
};

// Resource hints
export const addResourceHints = (urls: string[]): void => {
  urls.forEach((url) => {
    const link = document.createElement("link");
    link.rel = "dns-prefetch";
    link.href = new URL(url).origin;
    document.head.appendChild(link);
  });
};

// Performance monitoring
export interface PerformanceMetrics {
  ttfb: number;
  fcp: number;
  lcp: number;
  fid: number;
  cls: number;
}

export const measurePerformance = (): Promise<PerformanceMetrics> => {
  return new Promise((resolve) => {
    if ("PerformanceObserver" in window) {
      const metrics: Partial<PerformanceMetrics> = {};

      // Measure TTFB
      const navigation = performance.getEntriesByType(
        "navigation",
      )[0] as PerformanceNavigationTiming;
      if (navigation) {
        metrics.ttfb = navigation.responseStart - navigation.requestStart;
      }

      // Measure FCP
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcp = entries.find(
          (entry) => entry.name === "first-contentful-paint",
        );
        if (fcp) {
          metrics.fcp = fcp.startTime;
        }
      }).observe({ entryTypes: ["paint"] });

      // Measure LCP
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        metrics.lcp = lastEntry.startTime;
      }).observe({ entryTypes: ["largest-contentful-paint"] });

      // Measure FID
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          metrics.fid =
            (entries[0] as any).processingStart - entries[0].startTime;
        }
      }).observe({ entryTypes: ["first-input"] });

      // Measure CLS
      let clsValue = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        metrics.cls = clsValue;
      }).observe({ entryTypes: ["layout-shift"] });

      setTimeout(() => {
        resolve(metrics as PerformanceMetrics);
      }, 3000);
    } else {
      resolve({
        ttfb: 0,
        fcp: 0,
        lcp: 0,
        fid: 0,
        cls: 0,
      });
    }
  });
};

// Bundle size optimization
export const lazyLoadComponent = (importFn: () => Promise<any>) => {
  return React.lazy(importFn);
};

// Service worker registration
export const registerServiceWorker = async (): Promise<void> => {
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      console.log("Service Worker registered:", registration);
    } catch (error) {
      console.error("Service Worker registration failed:", error);
    }
  }
};

// Network information
export const getNetworkInfo = (): {
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
} => {
  const connection =
    (navigator as any).connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection;

  return {
    effectiveType: connection?.effectiveType || "4g",
    downlink: connection?.downlink || 10,
    rtt: connection?.rtt || 50,
    saveData: connection?.saveData || false,
  };
};

// Memory usage monitoring
export const getMemoryUsage = (): {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
} | null => {
  const perf = performance as any;
  if (perf.memory) {
    return {
      usedJSHeapSize: perf.memory.usedJSHeapSize / (1024 * 1024),
      totalJSHeapSize: perf.memory.totalJSHeapSize / (1024 * 1024),
      jsHeapSizeLimit: perf.memory.jsHeapSizeLimit / (1024 * 1024),
    };
  }
  return null;
};

// Performance budget checking
export const checkPerformanceBudget = async (): Promise<{
  passed: boolean;
  violations: string[];
}> => {
  const violations: string[] = [];

  const metrics = await measurePerformance();
  if (metrics.lcp > 2500)
    violations.push(`LCP ${metrics.lcp.toFixed(0)}ms exceeds 2500ms budget`);
  if (metrics.fid > 100)
    violations.push(`FID ${metrics.fid.toFixed(0)}ms exceeds 100ms budget`);
  if (metrics.cls > 0.1)
    violations.push(`CLS ${metrics.cls.toFixed(3)} exceeds 0.1 budget`);

  const memory = getMemoryUsage();
  if (memory && memory.usedJSHeapSize > 100) {
    violations.push(
      `Heap ${memory.usedJSHeapSize.toFixed(0)}MB exceeds 100MB budget`,
    );
  }

  return { passed: violations.length === 0, violations };
};

// Report performance metrics (e.g. to analytics)
export const reportPerformanceMetrics = async (): Promise<void> => {
  try {
    const metrics = await measurePerformance();
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "web_vitals", {
        lcp: metrics.lcp,
        fid: metrics.fid,
        cls: metrics.cls,
        ttfb: metrics.ttfb,
        fcp: metrics.fcp,
      });
    }
  } catch {
    // non-critical
  }
};

// Debounce utility
export const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  ms: number,
): ((...args: Parameters<T>) => void) => {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
};

// Preload critical resources on app start
export const preloadCriticalResources = (): void => {
  addResourceHints([
    "https://firebasestorage.googleapis.com",
    "https://fonts.googleapis.com",
    "https://fonts.gstatic.com",
  ]);
};
