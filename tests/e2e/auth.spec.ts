import { type Page, expect, test } from "@playwright/test";

test.describe("Authentication", () => {
  test.describe("Sign In Page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/sign-in");
    });

    test("should display sign in form", async ({ page }) => {
      await expect(
        page.getByRole("heading", { name: /sign in/i })
      ).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
      await expect(
        page.getByRole("button", { name: /sign in/i })
      ).toBeVisible();
    });

    test("should show validation errors for empty form", async ({ page }) => {
      await page.getByRole("button", { name: /sign in/i }).click();

      // Check for required field validation
      await expect(page.getByLabel(/email/i)).toHaveAttribute("required", "");
    });

    test("should show error for invalid email format", async ({ page }) => {
      await page.getByLabel(/email/i).fill("invalid-email");
      await page.getByLabel(/password/i).fill("password123");
      await page.getByRole("button", { name: /sign in/i }).click();

      // Browser validation should prevent submission
      const emailInput = page.getByLabel(/email/i);
      const validationMessage = await emailInput.evaluate(
        (el: HTMLInputElement) => el.validationMessage
      );
      expect(validationMessage).toBeTruthy();
    });

    test("should have OAuth provider buttons", async ({ page }) => {
      // Check for GitHub OAuth button
      const githubButton = page.getByRole("button", { name: /github/i });
      await expect(githubButton).toBeVisible();

      // Check for Google OAuth button
      const googleButton = page.getByRole("button", { name: /google/i });
      await expect(googleButton).toBeVisible();
    });

    test("should have link to sign up page", async ({ page }) => {
      const signUpLink = page.getByRole("link", { name: /sign up/i });
      await expect(signUpLink).toBeVisible();
      await expect(signUpLink).toHaveAttribute("href", "/sign-up");
    });

    test("should navigate to sign up page", async ({ page }) => {
      await page.getByRole("link", { name: /sign up/i }).click();
      await expect(page).toHaveURL("/sign-up");
    });
  });

  test.describe("Sign Up Page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/sign-up");
    });

    test("should display sign up form", async ({ page }) => {
      await expect(
        page.getByRole("heading", { name: /create an account/i })
      ).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/^password$/i)).toBeVisible();
      await expect(page.getByLabel(/confirm password/i)).toBeVisible();
      await expect(
        page.getByRole("button", { name: /create account/i })
      ).toBeVisible();
    });

    test("should have link to sign in page", async ({ page }) => {
      const signInLink = page.getByRole("link", { name: /sign in/i });
      await expect(signInLink).toBeVisible();
      await expect(signInLink).toHaveAttribute("href", "/sign-in");
    });

    test("should validate password requirements", async ({ page }) => {
      await page.getByLabel(/email/i).fill("test@example.com");
      await page.getByLabel(/^password$/i).fill("short");
      await page.getByLabel(/confirm password/i).fill("short");
      await page.getByRole("button", { name: /create account/i }).click();

      // Should show password length requirement error
      // The exact error depends on your validation implementation
      await expect(page.locator("text=8 characters")).toBeVisible();
    });

    test("should validate password confirmation match", async ({ page }) => {
      await page.getByLabel(/email/i).fill("test@example.com");
      await page.getByLabel(/^password$/i).fill("password123");
      await page.getByLabel(/confirm password/i).fill("different123");
      await page.getByRole("button", { name: /create account/i }).click();

      // Should show password mismatch error
      await expect(page.locator("text=match")).toBeVisible();
    });
  });
});

test.describe("Protected Routes", () => {
  test("should redirect unauthenticated users from dashboard to sign-in", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    // Should redirect to sign-in page
    await expect(page).toHaveURL(/sign-in/);
  });

  test("should redirect unauthenticated users from profile to sign-in", async ({
    page,
  }) => {
    await page.goto("/dashboard/profile");

    // Should redirect to sign-in page
    await expect(page).toHaveURL(/sign-in/);
  });

  test("should redirect unauthenticated users from settings to sign-in", async ({
    page,
  }) => {
    await page.goto("/dashboard/settings");

    // Should redirect to sign-in page
    await expect(page).toHaveURL(/sign-in/);
  });
});
