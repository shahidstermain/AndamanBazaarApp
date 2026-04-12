import { test, expect } from "@playwright/test";

test.describe("Integration Tests", () => {
  test("should create a new listing", async ({ page }) => {
    // Login first
    await page.goto("/auth");
    await page.getByPlaceholder("Email").fill("test@example.com");
    await page.getByPlaceholder("Password").fill("password123");
    await page.getByRole("button", { name: "Sign In" }).click();

    // Navigate to create listing
    await page.goto("/post");

    // Fill out listing form
    await page.getByPlaceholder("Title").fill("Test Item");
    await page.getByPlaceholder("Description").fill("This is a test item");
    await page.getByPlaceholder("Price").fill("100");
    await page
      .getByRole("combobox", { name: "Category" })
      .selectOption("electronics");
    await page
      .getByRole("combobox", { name: "Condition" })
      .selectOption("good");

    // Upload image
    await page.setInputFiles(
      'input[type="file"]',
      "tests/fixtures/test-image.jpg",
    );

    // Submit form
    await page.getByRole("button", { name: "Post Listing" }).click();

    // Verify listing was created
    await expect(page.getByText("Listing posted successfully")).toBeVisible();
    await expect(page.getByText("Test Item")).toBeVisible();
  });

  test("should search for listings", async ({ page }) => {
    await page.goto("/");

    // Search for electronics
    await page.getByPlaceholder("Search mobiles, scooters...").fill("mobile");
    await page.keyboard.press("Enter");

    // Verify search results
    await expect(page.getByText("Search Results")).toBeVisible();
    await expect(page.locator(".listing-card")).toHaveCountGreaterThan(0);
  });

  test("should filter listings by category", async ({ page }) => {
    await page.goto("/listings");

    // Filter by electronics
    await page
      .getByRole("combobox", { name: "Category" })
      .selectOption("electronics");

    // Verify filtered results
    await expect(page.locator(".listing-card")).toHaveCountGreaterThan(0);

    // Check that all results are in electronics category
    const categories = await page.locator(".category-badge").allTextContents();
    categories.forEach((category) => {
      expect(category.toLowerCase()).toContain("electronics");
    });
  });

  test("should save a listing", async ({ page }) => {
    // Login first
    await page.goto("/auth");
    await page.getByPlaceholder("Email").fill("test@example.com");
    await page.getByPlaceholder("Password").fill("password123");
    await page.getByRole("button", { name: "Sign In" }).click();

    // Navigate to a listing
    await page.goto("/listings/1");

    // Click save button
    await page.getByRole("button", { name: "Save" }).click();

    // Verify listing was saved
    await expect(page.getByRole("button", { name: "Saved" })).toBeVisible();
  });

  test("should send a message in chat", async ({ page }) => {
    // Login first
    await page.goto("/auth");
    await page.getByPlaceholder("Email").fill("test@example.com");
    await page.getByPlaceholder("Password").fill("password123");
    await page.getByRole("button", { name: "Sign In" }).click();

    // Navigate to chat
    await page.goto("/chats/1");

    // Send a message
    await page
      .getByPlaceholder("Type a message...")
      .fill("Hello, this is a test message");
    await page.getByRole("button", { name: "Send" }).click();

    // Verify message was sent
    await expect(page.getByText("Hello, this is a test message")).toBeVisible();
  });

  test("should report inappropriate content", async ({ page }) => {
    // Login first
    await page.goto("/auth");
    await page.getByPlaceholder("Email").fill("test@example.com");
    await page.getByPlaceholder("Password").fill("password123");
    await page.getByRole("button", { name: "Sign In" }).click();

    // Navigate to a listing
    await page.goto("/listings/1");

    // Click report button
    await page.getByRole("button", { name: "Report" }).click();

    // Select reason
    await page.getByRole("radio", { name: "Inappropriate content" }).check();
    await page
      .getByPlaceholder("Additional details")
      .fill("This content is inappropriate");

    // Submit report
    await page.getByRole("button", { name: "Submit Report" }).click();

    // Verify report was submitted
    await expect(page.getByText("Report submitted successfully")).toBeVisible();
  });

  test("should boost a listing", async ({ page }) => {
    // Login first
    await page.goto("/auth");
    await page.getByPlaceholder("Email").fill("test@example.com");
    await page.getByPlaceholder("Password").fill("password123");
    await page.getByRole("button", { name: "Sign In" }).click();

    // Navigate to user's listing
    await page.goto("/dashboard");

    // Click boost button
    await page.getByRole("button", { name: "Boost" }).first().click();

    // Select boost duration
    await page.getByRole("radio", { name: "7 days" }).check();

    // Proceed to payment
    await page.getByRole("button", { name: "Continue to Payment" }).click();

    // Fill payment details
    await page.getByPlaceholder("Card number").fill("4242424242424242");
    await page.getByPlaceholder("MM/YY").fill("12/25");
    await page.getByPlaceholder("CVC").fill("123");

    // Submit payment
    await page.getByRole("button", { name: "Pay ₹99" }).click();

    // Verify payment was successful
    await expect(page.getByText("Payment successful!")).toBeVisible();
    await expect(page.getByText("Listing boosted for 7 days")).toBeVisible();
  });

  test("should update user profile", async ({ page }) => {
    // Login first
    await page.goto("/auth");
    await page.getByPlaceholder("Email").fill("test@example.com");
    await page.getByPlaceholder("Password").fill("password123");
    await page.getByRole("button", { name: "Sign In" }).click();

    // Navigate to profile
    await page.goto("/profile");

    // Update profile information
    await page.getByPlaceholder("Name").fill("Updated Name");
    await page.getByPlaceholder("Phone").fill("9876543210");
    await page.getByPlaceholder("Bio").fill("This is my updated bio");

    // Upload profile picture
    await page.setInputFiles(
      'input[type="file"]',
      "tests/fixtures/profile-pic.jpg",
    );

    // Save changes
    await page.getByRole("button", { name: "Save Changes" }).click();

    // Verify changes were saved
    await expect(page.getByText("Profile updated successfully")).toBeVisible();
    await expect(page.getByText("Updated Name")).toBeVisible();
  });

  test("should handle real-time notifications", async ({ page }) => {
    // Login first
    await page.goto("/auth");
    await page.getByPlaceholder("Email").fill("test@example.com");
    await page.getByPlaceholder("Password").fill("password123");
    await page.getByRole("button", { name: "Sign In" }).click();

    // Grant notification permission
    await page.context().grantPermissions(["notifications"]);

    // Navigate to notifications
    await page.goto("/notifications");

    // Wait for real-time notification
    await page.waitForTimeout(2000);

    // Verify notification appears
    await expect(page.getByText("New message received")).toBeVisible();
  });

  test("should handle offline mode", async ({ page }) => {
    await page.goto("/");

    // Go offline
    await page.context().setOffline(true);

    // Try to navigate
    await page.goto("/listings");

    // Should show offline message
    await expect(page.getByText("You are offline")).toBeVisible();

    // Go back online
    await page.context().setOffline(false);

    // Should work normally
    await expect(page.locator(".listing-card")).toHaveCountGreaterThan(0);
  });

  test("should handle concurrent user actions", async ({ browser }) => {
    // Create two browser contexts
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Both users login
    await page1.goto("/auth");
    await page1.getByPlaceholder("Email").fill("user1@example.com");
    await page1.getByPlaceholder("Password").fill("password123");
    await page1.getByRole("button", { name: "Sign In" }).click();

    await page2.goto("/auth");
    await page2.getByPlaceholder("Email").fill("user2@example.com");
    await page2.getByPlaceholder("Password").fill("password123");
    await page2.getByRole("button", { name: "Sign In" }).click();

    // User 1 creates a listing
    await page1.goto("/post");
    await page1.getByPlaceholder("Title").fill("Concurrent Test Item");
    await page1
      .getByPlaceholder("Description")
      .fill("This is a concurrent test");
    await page1.getByPlaceholder("Price").fill("200");
    await page1
      .getByRole("combobox", { name: "Category" })
      .selectOption("electronics");
    await page1
      .getByRole("combobox", { name: "Condition" })
      .selectOption("excellent");
    await page1.getByRole("button", { name: "Post Listing" }).click();

    // User 2 should see the new listing
    await page2.goto("/listings");
    await expect(page2.getByText("Concurrent Test Item")).toBeVisible();

    // Clean up
    await context1.close();
    await context2.close();
  });
});
