/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardNav } from "@/components/features/dashboard/nav";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/dashboard"),
}));

describe("DashboardNav", () => {
  it("renders navigation links", () => {
    render(<DashboardNav />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Projects")).toBeInTheDocument();
    expect(screen.getByText("Analytics")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("highlights active link based on pathname", () => {
    render(<DashboardNav />);

    const dashboardLink = screen.getByText("Dashboard").closest("a");
    expect(dashboardLink).toHaveClass("bg-primary");
  });

  it("renders all expected navigation items", () => {
    render(<DashboardNav />);

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(4);
  });
});
