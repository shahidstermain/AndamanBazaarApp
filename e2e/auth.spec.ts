import { test, expect } from "@playwright/test";

test("auth page allows navigation between sign in and sign up", async ({
  page,
}) => {
  await page.goto("/auth");

  // Check initial state (Sign In)
  await expect(page.getByText("Sign In Securely")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeVisible();

  // Switch to Sign Up
  await page.getByText("signup").click();

  // Check Sign Up state
  await expect(
    page.getByRole("button", { name: "Create Island Account" }),
  ).toBeVisible();
  await expect(page.getByText("Display Name")).toBeVisible();
  await expect(page.getByPlaceholder("e.g. Rahul Sharma")).toBeVisible();

  // Switch back to Sign In
  await page.getByText("login").click();
  await expect(page.getByText("Sign In Securely")).toBeVisible();
});
