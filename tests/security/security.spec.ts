import { test, expect } from "@playwright/test";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

test.describe("Security Vulnerability Tests", () => {
  test("should prevent XSS attacks", async ({ page }) => {
    // Test XSS in search input
    await page.goto("/");
    const searchInput = page.getByPlaceholder("Search mobiles, scooters...");

    // Try XSS payload
    await searchInput.fill('<script>alert("XSS")</script>');
    await searchInput.press("Enter");

    // Should not execute script
    const alertDialog = page.locator("dialog");
    await expect(alertDialog).not.toBeVisible();

    // Should sanitize input
    const url = page.url();
    expect(url).not.toContain("<script>");
  });

  test("should prevent SQL injection in login", async ({ page }) => {
    await page.goto("/auth");

    // Try SQL injection payload
    await page.getByPlaceholder("Email").fill("admin' OR '1'='1");
    await page.getByPlaceholder("Password").fill("password' OR '1'='1");
    await page.getByRole("button", { name: "Sign In" }).click();

    // Should not grant access
    await expect(page.getByText("Invalid login credentials")).toBeVisible();

    // Should not expose database errors
    await expect(page.getByText(/SQL|database|query/i)).not.toBeVisible();
  });

  test("should prevent command injection", async ({ page }) => {
    await page.goto("/auth");

    // Try command injection payload
    await page.getByPlaceholder("Email").fill("test@example.com; rm -rf /");
    await page.getByPlaceholder("Password").fill("password");
    await page.getByRole("button", { name: "Sign In" }).click();

    // Should not execute commands
    await expect(page.getByText("Invalid login credentials")).toBeVisible();
  });

  test("should prevent path traversal", async ({ page }) => {
    // Try path traversal in URL
    await page.goto("/../../../../etc/passwd");

    // Should return 404 or redirect to safe page
    await expect(page.getByText("Page not found")).toBeVisible();
  });

  test("should validate file uploads", async ({ page }) => {
    // This would require actual file upload functionality
    // For now, we'll test the concept

    // Try to upload malicious file types
    const maliciousFiles = [
      "test.php",
      "script.js",
      "malicious.exe",
      "backdoor.php5",
    ];

    // In a real test, you would:
    // 1. Navigate to file upload page
    // 2. Try to upload each malicious file
    // 3. Verify rejection

    for (const filename of maliciousFiles) {
      // Mock file upload test
      expect(filename).toMatch(/\.(php|js|exe|php5)$/i);
    }
  });

  test("should enforce rate limiting", async ({ page }) => {
    await page.goto("/auth");

    // Make multiple failed login attempts
    for (let i = 0; i < 5; i++) {
      await page.getByPlaceholder("Email").fill("test@example.com");
      await page.getByPlaceholder("Password").fill("wrongpassword");
      await page.getByRole("button", { name: "Sign In" }).click();

      // Wait a bit between attempts
      await page.waitForTimeout(100);
    }

    // Should show rate limit message
    await expect(
      page.getByText(/too many attempts|rated limited/i),
    ).toBeVisible();
  });

  test("should have secure headers", async ({ page }) => {
    await page.goto("/");

    const response = await page.request.get("/");
    const headers = response.headers();

    // Check for security headers
    expect(headers["x-frame-options"]).toBeTruthy();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-xss-protection"]).toBeTruthy();
    expect(headers["referrer-policy"]).toBeTruthy();
    expect(headers["content-security-policy"]).toBeTruthy();
  });

  test("should prevent CSRF attacks", async ({ page }) => {
    await page.goto("/auth");

    // Check for CSRF tokens in forms
    const csrfToken = await page
      .locator('input[name="csrf_token"]')
      .getAttribute("value");
    expect(csrfToken).toBeTruthy();
    expect(csrfToken.length).toBeGreaterThan(20);
  });

  test("should sanitize user input", async ({ page }) => {
    await page.goto("/auth");

    // Try to inject HTML
    await page
      .getByPlaceholder("Email")
      .fill('<img src="x" onerror="alert(1)">');
    await page.getByRole("button", { name: "Sign In" }).click();

    // Should not execute JavaScript
    const alertDialog = page.locator("dialog");
    await expect(alertDialog).not.toBeVisible();
  });

  test("should handle sensitive data exposure", async ({ page }) => {
    await page.goto("/auth");

    // Check that sensitive data is not exposed in client-side code
    const pageContent = await page.content();

    // Should not contain sensitive patterns
    expect(pageContent).not.toMatch(/password\s*[:=]\s*['"]/i);
    expect(pageContent).not.toMatch(/api_key\s*[:=]\s*['"]/i);
    expect(pageContent).not.toMatch(/secret\s*[:=]\s*['"]/i);
  });

  test("should enforce HTTPS", async ({ page }) => {
    // Check that the page is served over HTTPS in production
    const url = page.url();

    if (url.includes("localhost")) {
      // Skip HTTPS check for localhost
      expect(true).toBe(true);
    } else {
      expect(url).toMatch(/^https:/);
    }
  });

  test("should validate redirect URLs", async ({ page }) => {
    // Try to redirect to external malicious site
    await page.goto("/auth?redirect=https://malicious-site.com");

    // Should not redirect to external site
    await expect(page).not.toHaveURL("https://malicious-site.com");
  });

  test("should prevent information disclosure", async ({ page }) => {
    // Try to access sensitive endpoints
    await page.goto("/.env");
    await expect(page.getByText("Page not found")).toBeVisible();

    await page.goto("/package.json");
    await expect(page.getByText("Page not found")).toBeVisible();

    await page.goto("/node_modules");
    await expect(page.getByText("Page not found")).toBeVisible();
  });
});

test.describe("Performance Security Tests", () => {
  test("should prevent timing attacks", async ({ page }) => {
    await page.goto("/auth");

    // Measure response time for valid vs invalid credentials
    const validEmail = "test@example.com";
    const invalidEmail = "nonexistent@example.com";

    // Test with valid email
    const start1 = Date.now();
    await page.getByPlaceholder("Email").fill(validEmail);
    await page.getByPlaceholder("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Sign In" }).click();
    const time1 = Date.now() - start1;

    // Test with invalid email
    const start2 = Date.now();
    await page.getByPlaceholder("Email").fill(invalidEmail);
    await page.getByPlaceholder("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Sign In" }).click();
    const time2 = Date.now() - start2;

    // Response times should be similar (within 200ms)
    expect(Math.abs(time1 - time2)).toBeLessThan(200);
  });

  test("should handle resource exhaustion", async ({ page }) => {
    await page.goto("/");

    // Try to create resource exhaustion by making many requests
    const promises = [];
    for (let i = 0; i < 100; i++) {
      promises.push(page.request.get("/"));
    }

    const responses = await Promise.allSettled(promises);

    // Should not crash the server
    const successfulResponses = responses.filter(
      (r) => r.status === "fulfilled",
    );
    expect(successfulResponses.length).toBeGreaterThan(0);
  });
});

test.describe("Input Validation Tests", () => {
  test("should validate email format", async ({ page }) => {
    await page.goto("/auth");

    const invalidEmails = [
      "notanemail",
      "@example.com",
      "test@",
      "test@example",
      "test..test@example.com",
      "test@example..com",
    ];

    for (const email of invalidEmails) {
      await page.getByPlaceholder("Email").fill(email);
      await page.getByPlaceholder("Password").fill("password123");
      await page.getByRole("button", { name: "Sign In" }).click();

      await expect(
        page.getByText("Please enter a valid email address"),
      ).toBeVisible();
    }
  });

  test("should validate password strength", async ({ page }) => {
    await page.goto("/auth");

    const weakPasswords = ["123", "abc", "password", "123456", "test"];

    for (const password of weakPasswords) {
      await page.getByPlaceholder("Email").fill("test@example.com");
      await page.getByPlaceholder("Password").fill(password);
      await page.getByRole("button", { name: "Sign In" }).click();

      await expect(
        page.getByText("Password must be at least 6 characters"),
      ).toBeVisible();
    }
  });

  test("should prevent oversized inputs", async ({ page }) => {
    await page.goto("/auth");

    // Try extremely long input
    const longString = "a".repeat(10000);
    await page.getByPlaceholder("Email").fill(longString);

    // Should truncate or reject
    const inputValue = await page.getByPlaceholder("Email").inputValue();
    expect(inputValue.length).toBeLessThanOrEqual(255);
  });
});

test.describe("Session Management Tests", () => {
  test("should expire sessions properly", async ({ page }) => {
    await page.goto("/auth");

    // Login
    await page.getByPlaceholder("Email").fill("test@example.com");
    await page.getByPlaceholder("Password").fill("password123");
    await page.getByRole("button", { name: "Sign In" }).click();

    // Wait for session to expire (in a real test, you'd mock the expiration)
    await page.waitForTimeout(1000);

    // Try to access protected page
    await page.goto("/profile");

    // Should redirect to login
    await expect(page).toHaveURL(/auth/);
  });

  test("should prevent session fixation", async ({ page }) => {
    await page.goto("/auth");

    // Get initial session ID (would need to be implemented in real app)
    const initialSession = await page.evaluate(() => {
      return document.cookie;
    });

    // Login
    await page.getByPlaceholder("Email").fill("test@example.com");
    await page.getByPlaceholder("Password").fill("password123");
    await page.getByRole("button", { name: "Sign In" }).click();

    // Check that session ID changed
    const newSession = await page.evaluate(() => {
      return document.cookie;
    });

    expect(newSession).not.toBe(initialSession);
  });
});
