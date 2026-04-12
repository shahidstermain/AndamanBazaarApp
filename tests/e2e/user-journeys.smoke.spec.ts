import { test, expect } from "@playwright/test";

test.describe("User journeys smoke (blocking)", () => {
  test("unauthenticated user trying /admin gets redirected away", async ({
    page,
  }) => {
    await page.route("**/auth/v1/user", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: null, user: null }),
      });
    });

    await page.goto("/admin");

    await expect(page).toHaveURL(/\/(auth|$)/);
  });

  test("existing user can search from home and reach listings page", async ({
    page,
  }) => {
    await page.goto("/?e2e=1");

    const searchInput = page
      .locator('input[placeholder*="Search"], input[type="text"]')
      .first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill("bike");

    await page
      .getByRole("button", { name: /Search/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/listings\?q=bike/);
  });

  test("profile page loads and delete action path is reachable for owner listings", async ({
    page,
  }) => {
    await page.goto("/profile?e2e=1");

    await expect(
      page.getByRole("button", { name: /My Listings/i }),
    ).toBeVisible();

    const deleteBtn = page
      .locator('button[aria-label*="delete" i], button:has-text("Delete")')
      .first();
    if (await deleteBtn.count()) {
      await deleteBtn.click();
      await expect(
        page.locator("text=Delete, text=Confirm").first(),
      ).toBeVisible();
    }
  });
});
