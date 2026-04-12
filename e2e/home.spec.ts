import { test, expect } from "@playwright/test";

test("homepage has title and listings", async ({ page }) => {
  await page.goto("/");

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/AndamanBazaar/);

  // Check for main heading or logo text
  // The app uses a Logo component, let's check for "AndamanBazaar" text in header
  await expect(page.locator("header")).toContainText("AndamanBazaar");

  // Check if categories are visible
  await expect(page.getByText("Fresh Catch")).toBeVisible();

  // Check if listings are loaded (might need wait)
  // We can look for the "Featured Picks" or "Trending" section
  await expect(page.getByText("Featured Picks")).toBeVisible();
});
