import { expect, test } from "@playwright/test";

test.describe("Home Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should display the main heading", async ({ page }) => {
    const heading = page.getByRole("heading", {
      name: /AI-Native Boilerplate/i,
    });
    await expect(heading).toBeVisible();
  });

  test("should have a get started link", async ({ page }) => {
    const getStartedLink = page.getByRole("link", { name: /get started/i });
    await expect(getStartedLink).toBeVisible();
    await expect(getStartedLink).toHaveAttribute("href", "/dashboard");
  });

  test("should have a GitHub link", async ({ page }) => {
    const githubLink = page.getByRole("link", { name: /github/i });
    await expect(githubLink).toBeVisible();
  });

  test("should be accessible", async ({ page }) => {
    // Basic accessibility check - no duplicate IDs
    const ids = await page.evaluate(() => {
      const elements = document.querySelectorAll("[id]");
      const idList: string[] = [];
      elements.forEach((el) => {
        if (el.id) {
          idList.push(el.id);
        }
      });
      return idList;
    });

    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    expect(duplicates).toHaveLength(0);
  });

  test("should be responsive", async ({ page }) => {
    // Mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    const heading = page.getByRole("heading", {
      name: /AI-Native Boilerplate/i,
    });
    await expect(heading).toBeVisible();

    // Desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(heading).toBeVisible();
  });
});
