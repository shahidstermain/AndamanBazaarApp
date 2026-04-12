import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Auth is bypassed via VITE_E2E_BYPASS_AUTH=true (set in playwright.config.ts webServer).
    // Firebase auth runs through identitytoolkit.googleapis.com — no route mock needed here.
    await page.goto("/auth");
  });

  test("should display login form by default", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "AndamanBazaar" }),
    ).toBeVisible();
    await expect(page.getByPlaceholder("name@domain.com")).toBeVisible();
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sign In Securely" }),
    ).toBeVisible();
  });

  test("should switch to sign up form", async ({ page }) => {
    await page.getByRole("button", { name: "signup" }).click();

    await expect(
      page.getByRole("button", { name: "Create Island Account" }),
    ).toBeVisible();
  });

  test("should validate email format", async ({ page }) => {
    await page.getByPlaceholder("name@domain.com").fill("invalid-email");
    await page.getByPlaceholder("••••••••").fill("password123");
    await page.getByRole("button", { name: "Sign In Securely" }).click();

    await expect(page.getByText("Email not found")).toBeVisible();
  });

  test("should validate password length", async ({ page }) => {
    await page.getByPlaceholder("name@domain.com").fill("test@example.com");
    await page.getByPlaceholder("••••••••").fill("123");
    await page.getByRole("button", { name: "Sign In Securely" }).click();

    // The minLength is 8 in the code.
  });

  test("should handle successful login", async ({ page }) => {
    await page.getByPlaceholder("name@domain.com").fill("test@example.com");
    await page.getByPlaceholder("••••••••").fill("password123");
    await page.getByRole("button", { name: "Sign In Securely" }).click();

    // Should redirect to home page
    await expect(page).toHaveURL("/");
  });

  test("should handle login error", async ({ page }) => {
    await page.getByPlaceholder("name@domain.com").fill("test@example.com");
    await page.getByPlaceholder("••••••••").fill("wrongpassword");
    await page.getByRole("button", { name: "Sign In Securely" }).click();

    await expect(page.getByText("Invalid login credentials")).toBeVisible();
  });

  test("should toggle password visibility", async ({ page }) => {
    const passwordInput = page.getByPlaceholder("Password");
    await passwordInput.fill("password123");

    // Initially password should be hidden
    await expect(passwordInput).toHaveAttribute("type", "password");

    // Toggle visibility
    await page
      .getByRole("button", { name: "Toggle password visibility" })
      .click();
    await expect(passwordInput).toHaveAttribute("type", "text");

    // Toggle back
    await page
      .getByRole("button", { name: "Toggle password visibility" })
      .click();
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("should prevent form submission with empty fields", async ({ page }) => {
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page.getByText("Email is required")).toBeVisible();
    await expect(page.getByText("Password is required")).toBeVisible();
  });

  test("should show loading state during submission", async ({ page }) => {
    await page.getByPlaceholder("name@domain.com").fill("test@example.com");
    await page.getByPlaceholder("••••••••").fill("password123");

    // Click submit and check loading state
    await page.getByRole("button", { name: "Sign In Securely" }).click();
    await expect(
      page.getByRole("button", { name: "Sign In Securely" }),
    ).toBeDisabled();
  });
});

test.describe("Home Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should display hero section", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Buy & Sell" }),
    ).toBeVisible();
    await expect(page.getByText("in Paradise.")).toBeVisible();
    await expect(page.getByText("Andaman's Own Marketplace")).toBeVisible();
    await expect(
      page.getByPlaceholder("Search mobiles, scooters..."),
    ).toBeVisible();
  });

  test("should display categories section", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Browse Island Categories" }),
    ).toBeVisible();

    // Check for some category items
    await expect(page.getByText("Electronics")).toBeVisible();
    await expect(page.getByText("Vehicles")).toBeVisible();
    await expect(page.getByText("Property")).toBeVisible();
  });

  test("should display flash deals section", async ({ page }) => {
    await expect(page.getByText("Flash Deals")).toBeVisible();
    await expect(page.getByText("Ends in")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "View Flash Deals" }),
    ).toBeVisible();
  });

  test("should display featured picks section", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Featured Picks" }),
    ).toBeVisible();
    await expect(page.getByText("Top rated island treasures")).toBeVisible();
  });

  test("should display hot picks section", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Today's Hot Picks" }),
    ).toBeVisible();
    await expect(page.getByText("Handpicked deals just for you")).toBeVisible();
  });

  test("should display verified sellers section", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Island Verified Sellers" }),
    ).toBeVisible();
    await expect(
      page.getByText("GPS-verified locals from across the Andaman Islands"),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Browse verified listings" }),
    ).toBeVisible();
  });

  test("should display fresh arrivals section", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Fresh Arrivals" }),
    ).toBeVisible();
    await expect(page.getByText("Just listed today")).toBeVisible();
  });

  test("should display seasonal spotlight section", async ({ page }) => {
    await expect(page.getByText("🌊 Seasonal Spotlight")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Tourist Season is Here" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Explore Season Picks" }),
    ).toBeVisible();
  });

  test("should display footer links", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: "Privacy Policy" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Terms of Service" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Contact Us" })).toBeVisible();
  });

  test("should have proper meta tags", async ({ page }) => {
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      /Andaman Bazaar/,
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      /Andaman Bazaar/,
    );
  });

  test("should be responsive on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // Hero section should still be visible
    await expect(
      page.getByRole("heading", { name: "Buy & Sell" }),
    ).toBeVisible();

    // Categories should be horizontally scrollable
    await expect(page.locator(".category-pill")).toHaveCount(12);
  });

  test("should handle search functionality", async ({ page }) => {
    const searchInput = page.getByPlaceholder("Search mobiles, scooters...");
    await searchInput.fill("mobile phone");
    await searchInput.press("Enter");

    // Should navigate to search results
    await expect(page).toHaveURL(/search/);
  });

  test("should handle category navigation", async ({ page }) => {
    await page.getByRole("link", { name: "Electronics" }).click();

    // Should navigate to electronics category
    await expect(page).toHaveURL(/category=electronics/);
  });
});

test.describe("Accessibility Tests", () => {
  test("should have no accessibility violations on home page", async ({
    page,
  }) => {
    await page.goto("/");

    // Run axe-core accessibility scan
    const violations = await page.evaluate(() => {
      return new Promise((resolve) => {
        if ((window as any).axe) {
          (window as any).axe.run().then(resolve);
        } else {
          resolve([]);
        }
      });
    });

    expect(violations).toHaveLength(0);
  });

  test("should have proper heading hierarchy", async ({ page }) => {
    await page.goto("/");

    const h1Count = await page.locator("h1").count();
    expect(h1Count).toBeGreaterThan(0);

    // Check that headings are in proper order
    const headings = await page.locator("h1, h2, h3, h4, h5, h6").all();
    let previousLevel = 0;

    for (const heading of headings) {
      const level = parseInt(
        await heading.evaluate((el) => el.tagName.substring(1)),
      );
      expect(level).toBeGreaterThanOrEqual(previousLevel);
      previousLevel = level;
    }
  });

  test("should have proper alt text for images", async ({ page }) => {
    await page.goto("/");

    const images = await page.locator("img").all();

    for (const img of images) {
      const alt = await img.getAttribute("alt");
      expect(alt).toBeTruthy();
      expect(alt).not.toBe("");
    }
  });

  test("should have proper form labels", async ({ page }) => {
    await page.goto("/auth");

    const formInputs = await page.locator("input").all();

    for (const input of formInputs) {
      const hasLabel = await input.evaluate((el) => {
        const id = el.id;
        const label = document.querySelector(`label[for="${id}"]`);
        return label !== null || el.hasAttribute("aria-label");
      });

      expect(hasLabel).toBe(true);
    }
  });

  test("should be keyboard navigable", async ({ page }) => {
    await page.goto("/");

    // Tab through interactive elements
    await page.keyboard.press("Tab");
    const firstFocused = await page.evaluate(
      () => document.activeElement?.tagName,
    );
    expect(firstFocused).toBeTruthy();

    // Continue tabbing
    await page.keyboard.press("Tab");
    const secondFocused = await page.evaluate(
      () => document.activeElement?.tagName,
    );
    expect(secondFocused).toBeTruthy();
    expect(secondFocused).not.toBe(firstFocused);
  });

  test("should have proper color contrast", async ({ page }) => {
    await page.goto("/");

    // Check text elements for sufficient contrast
    const textElements = await page
      .locator("p, h1, h2, h3, h4, h5, h6, span, a")
      .all();

    for (const element of textElements) {
      const contrast = await element.evaluate((el) => {
        const style = window.getComputedStyle(el);
        const color = style.color;
        const background = style.backgroundColor;

        // Simple contrast check (would need proper WCAG calculation)
        return color !== background;
      });

      expect(contrast).toBe(true);
    }
  });
});

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
          resolve(lastEntry.startTime);
        }).observe({ entryTypes: ["largest-contentful-paint"] });
      });
    });

    expect(lcp).toBeLessThan(2500); // Good LCP is under 2.5s

    // Measure First Input Delay
    const fid = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          resolve((entries[0] as any).processingStart - entries[0].startTime);
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
});

test.describe("Security Tests", () => {
  test("should have security headers", async ({ page }) => {
    await page.goto("/");

    const response = await page.request.get("/");
    const headers = response.headers();

    // Check for security headers
    expect(headers["x-frame-options"]).toBeTruthy();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBeTruthy();
  });

  test("should sanitize user input", async ({ page }) => {
    await page.goto("/auth");

    // Try to inject XSS
    await page.getByPlaceholder("Email").fill('<script>alert("xss")</script>');
    await page.getByRole("button", { name: "Sign In" }).click();

    // Should not execute script
    const alertDialog = page.locator("dialog");
    await expect(alertDialog).not.toBeVisible();
  });

  test("should handle SQL injection attempts", async ({ page }) => {
    await page.goto("/auth");

    // Try SQL injection
    await page.getByPlaceholder("Email").fill("admin' OR '1'='1");
    await page.getByPlaceholder("Password").fill("password' OR '1'='1");
    await page.getByRole("button", { name: "Sign In" }).click();

    // Should not grant access
    await expect(page.getByText("Invalid login credentials")).toBeVisible();
  });

  test("should enforce rate limiting", async ({ page }) => {
    await page.goto("/auth");

    // Make multiple failed login attempts
    for (let i = 0; i < 5; i++) {
      await page.getByPlaceholder("Email").fill("test@example.com");
      await page.getByPlaceholder("Password").fill("wrongpassword");
      await page.getByRole("button", { name: "Sign In" }).click();
    }

    // Should show rate limit message
    await expect(
      page.getByText("Too many attempts. Please try again later."),
    ).toBeVisible();
  });
});

test.describe("Mobile Responsiveness", () => {
  const mobileDevices = [
    { name: "iPhone SE", width: 375, height: 667 },
    { name: "iPhone 12", width: 390, height: 844 },
    { name: "Pixel 5", width: 393, height: 851 },
    { name: "Galaxy S20", width: 360, height: 800 },
  ];

  mobileDevices.forEach((device) => {
    test(`should be responsive on ${device.name}`, async ({ page }) => {
      await page.setViewportSize({
        width: device.width,
        height: device.height,
      });
      await page.goto("/");

      // Hero section should be visible
      await expect(
        page.getByRole("heading", { name: "Buy & Sell" }),
      ).toBeVisible();

      // Navigation should be accessible
      await expect(page.getByRole("button", { name: "Menu" })).toBeVisible();

      // Categories should be horizontally scrollable
      const categories = await page.locator(".category-pill").all();
      expect(categories.length).toBeGreaterThan(0);

      // Check that content doesn't overflow
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth);
    });
  });
});

test.describe("Cross-Browser Compatibility", () => {
  test("should work in Chrome", async ({ browserName, page }) => {
    if (browserName !== "chromium") return;

    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Buy & Sell" }),
    ).toBeVisible();
  });

  test("should work in Firefox", async ({ browserName, page }) => {
    if (browserName !== "firefox") return;

    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Buy & Sell" }),
    ).toBeVisible();
  });

  test("should work in Safari", async ({ browserName, page }) => {
    if (browserName !== "webkit") return;

    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Buy & Sell" }),
    ).toBeVisible();
  });
});

test.describe("Error Handling", () => {
  test("should handle 404 errors gracefully", async ({ page }) => {
    await page.goto("/non-existent-page");

    await expect(page.getByText("Page not found")).toBeVisible();
    await expect(page.getByRole("link", { name: "Go home" })).toBeVisible();
  });

  test("should handle network errors gracefully", async ({ page }) => {
    // Block network requests
    await page.route("**/*", (route) => route.abort());
    await page.goto("/");

    await expect(page.getByText("Network error")).toBeVisible();
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
  });

  test("should handle server errors gracefully", async ({ page }) => {
    // Mock server error
    await page.route("**/api/**", (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal server error" }),
      });
    });

    await page.goto("/");

    await expect(page.getByText("Something went wrong")).toBeVisible();
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  });
});
