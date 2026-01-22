import { test as base, expect, type Page } from "@playwright/test";

/**
 * Extended test fixtures for common testing scenarios
 */
export const test = base.extend<{
  authenticatedPage: Page;
}>({
  authenticatedPage: async ({ page }, use) => {
    // Set up mock auth state
    // In a real scenario, this would either:
    // 1. Use API to create a test session
    // 2. Mock the auth cookies
    // 3. Use a test account with known credentials

    // For now, we'll navigate to sign-in and simulate auth
    await page.goto("/sign-in");

    // Mock authentication by setting cookies
    // This is a placeholder - implement based on your auth system
    await page.context().addCookies([
      {
        name: "test_session",
        value: "mock_session_value",
        domain: "localhost",
        path: "/",
      },
    ]);

    await use(page);
  },
});

export { expect };

/**
 * Page Object Model: Sign In Page
 */
export class SignInPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/sign-in");
  }

  async signIn(email: string, password: string) {
    await this.page.getByLabel(/email/i).fill(email);
    await this.page.getByLabel(/password/i).fill(password);
    await this.page.getByRole("button", { name: /sign in/i }).click();
  }

  async signInWithGitHub() {
    await this.page.getByRole("button", { name: /github/i }).click();
  }

  async signInWithGoogle() {
    await this.page.getByRole("button", { name: /google/i }).click();
  }

  async goToSignUp() {
    await this.page.getByRole("link", { name: /sign up/i }).click();
  }

  async expectError(message: string | RegExp) {
    await expect(this.page.locator(`text=${message}`)).toBeVisible();
  }
}

/**
 * Page Object Model: Sign Up Page
 */
export class SignUpPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/sign-up");
  }

  async signUp(email: string, password: string, confirmPassword: string) {
    await this.page.getByLabel(/email/i).fill(email);
    await this.page.getByLabel(/^password$/i).fill(password);
    await this.page.getByLabel(/confirm password/i).fill(confirmPassword);
    await this.page.getByRole("button", { name: /sign up/i }).click();
  }

  async goToSignIn() {
    await this.page.getByRole("link", { name: /sign in/i }).click();
  }

  async expectError(message: string | RegExp) {
    await expect(this.page.locator(`text=${message}`)).toBeVisible();
  }
}

/**
 * Page Object Model: Dashboard Page
 */
export class DashboardPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/dashboard");
  }

  async expectLoaded() {
    await expect(
      this.page.getByRole("heading", { name: /dashboard/i })
    ).toBeVisible();
  }

  async goToProfile() {
    await this.page.getByRole("link", { name: /profile/i }).click();
  }

  async goToSettings() {
    await this.page.getByRole("link", { name: /settings/i }).click();
  }

  async signOut() {
    await this.page.getByRole("button", { name: /sign out/i }).click();
  }
}

/**
 * Helper: Wait for navigation and network idle
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState("networkidle");
}

/**
 * Helper: Take a screenshot for debugging
 */
export async function takeDebugScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `playwright-report/debug-${name}-${Date.now()}.png`,
    fullPage: true,
  });
}
