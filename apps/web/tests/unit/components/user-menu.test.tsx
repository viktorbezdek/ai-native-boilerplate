import { page } from "@vitest/browser/context";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

// Mock modules before importing the component (vi.mock is hoisted)
vi.mock("@/lib/auth/client", () => ({
  authClient: {
    signOut: vi.fn(),
  },
}));

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
  resetUser: vi.fn(),
  ANALYTICS_EVENTS: {
    USER_SIGNED_OUT: "user_signed_out",
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Import component after mocks are defined
import { UserMenu } from "@/components/features/dashboard/user-menu";
import { authClient } from "@/lib/auth/client";

describe("UserMenu", () => {
  const defaultProps = {
    user: {
      id: "user-1",
      name: "Test User",
      email: "test@example.com",
      image: null,
    },
  };

  it("renders user name", async () => {
    render(<UserMenu {...defaultProps} />);
    await expect.element(page.getByText("Test User")).toBeVisible();
  });

  it("renders user email", async () => {
    render(<UserMenu {...defaultProps} />);
    await expect.element(page.getByText("test@example.com")).toBeVisible();
  });

  it("shows sign out button", async () => {
    render(<UserMenu {...defaultProps} />);
    await expect.element(page.getByText("Sign out")).toBeVisible();
  });

  it("renders avatar with user initials when no image", async () => {
    render(<UserMenu {...defaultProps} />);
    await expect.element(page.getByText("TU")).toBeVisible();
  });

  it("handles sign out click", async () => {
    render(<UserMenu {...defaultProps} />);

    const signOutButton = page.getByText("Sign out");
    await signOutButton.click();

    expect(authClient.signOut).toHaveBeenCalled();
  });

  it("renders fallback to User when name is null", async () => {
    const propsWithNoName = {
      user: {
        id: "user-1",
        name: null,
        email: "test@example.com",
        image: null,
      },
    };

    render(<UserMenu {...propsWithNoName} />);
    await expect.element(page.getByText("User")).toBeVisible();
  });

  it("renders email initial when name is null", async () => {
    const propsWithNoName = {
      user: {
        id: "user-1",
        name: null,
        email: "test@example.com",
        image: null,
      },
    };

    render(<UserMenu {...propsWithNoName} />);
    await expect.element(page.getByText("T")).toBeVisible();
  });
});
