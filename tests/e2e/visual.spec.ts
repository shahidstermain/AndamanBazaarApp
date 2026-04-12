import { test, expect } from "@playwright/test";

test.describe("Visual Regression Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Default to no session for most tests
    await page.route("**/auth/v1/session", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ session: null }),
      });
    });
  });

  test("Home Page Visual", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveScreenshot("home-page.png", { fullPage: true });
  });

  test("Auth Page Visual", async ({ page }) => {
    await page.goto("/auth");
    await expect(page).toHaveScreenshot("auth-page.png");
  });

  test("Listings Page Visual", async ({ page }) => {
    // Mock listings data to ensure consistent visual snapshot
    await page.route("**/rest/v1/listings*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "1",
            title: "Test Scooter",
            price: 50000,
            city: "Port Blair",
            is_location_verified: true,
            category_id: "vehicles",
            images: [{ image_url: "https://picsum.photos/200" }],
            created_at: "2023-01-01T00:00:00Z",
            views_count: 100,
          },
          {
            id: "2",
            title: "Fresh Coconut",
            price: 50,
            city: "Havelock",
            is_location_verified: false,
            category_id: "produce",
            images: [{ image_url: "https://picsum.photos/201" }],
            created_at: "2023-01-02T00:00:00Z",
            views_count: 50,
          },
        ]),
      });
    });

    await page.goto("/listings");
    // Wait for listings to load
    await expect(page.getByText("Test Scooter")).toBeVisible();
    await expect(page).toHaveScreenshot("listings-page.png", {
      fullPage: true,
    });
  });

  test("Create Listing Page Visual (Auth Required)", async ({ page }) => {
    // VITE_E2E_BYPASS_AUTH=true is set by playwright.config.ts webServer command.
    // Firebase auth is bypassed in test mode — no manual session injection needed.

    await page.goto("/post");
    await expect(page).toHaveURL(/\/post/);
    await expect(page.getByText("Step 1 of 4 — Photos")).toBeVisible();
    await expect(page).toHaveScreenshot("create-listing-page.png", {
      fullPage: true,
    });
  });
});
