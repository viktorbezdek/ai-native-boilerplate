import { page } from "@vitest/browser/context";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";
import { DashboardNav } from "@/components/features/dashboard/nav";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/dashboard"),
}));

describe("DashboardNav", () => {
  it("renders navigation links", async () => {
    render(<DashboardNav />);

    await expect.element(page.getByText("Dashboard")).toBeVisible();
    await expect.element(page.getByText("Projects")).toBeVisible();
    await expect.element(page.getByText("Analytics")).toBeVisible();
    await expect.element(page.getByText("Settings")).toBeVisible();
  });

  it("highlights active link based on pathname", async () => {
    render(<DashboardNav />);

    const dashboardLink = page.getByText("Dashboard");
    await expect.element(dashboardLink).toBeVisible();
    // In browser mode, check class via element attribute
    const linkElement = dashboardLink.element().closest("a");
    expect(linkElement?.className).toContain("bg-primary");
  });

  it("renders all expected navigation items", async () => {
    render(<DashboardNav />);

    const links = page.getByRole("link");
    await expect.element(links.first()).toBeVisible();
    // Verify we have the expected number of links
    const allLinks = await links.all();
    expect(allLinks).toHaveLength(4);
  });
});
