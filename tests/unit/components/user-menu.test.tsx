import { UserMenu } from "@/components/features/dashboard/user-menu";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

// Mock auth
const mockSignOut = vi.fn();

vi.mock("@/lib/auth/client", () => ({
  authClient: {
    signOut: mockSignOut,
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

describe("UserMenu", () => {
  const defaultProps = {
    user: {
      id: "user-1",
      name: "Test User",
      email: "test@example.com",
      image: null,
    },
  };

  it("renders user name", () => {
    render(<UserMenu {...defaultProps} />);
    expect(screen.getByText("Test User")).toBeInTheDocument();
  });

  it("renders user email", () => {
    render(<UserMenu {...defaultProps} />);
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  it("shows sign out button", () => {
    render(<UserMenu {...defaultProps} />);
    expect(screen.getByText("Sign out")).toBeInTheDocument();
  });

  it("renders avatar with user initials when no image", () => {
    render(<UserMenu {...defaultProps} />);
    expect(screen.getByText("TU")).toBeInTheDocument();
  });

  it("handles sign out click", async () => {
    const user = userEvent.setup();
    render(<UserMenu {...defaultProps} />);

    const signOutButton = screen.getByText("Sign out");
    await user.click(signOutButton);

    expect(mockSignOut).toHaveBeenCalled();
  });

  it("renders fallback to User when name is null", () => {
    const propsWithNoName = {
      user: {
        id: "user-1",
        name: null,
        email: "test@example.com",
        image: null,
      },
    };

    render(<UserMenu {...propsWithNoName} />);
    expect(screen.getByText("User")).toBeInTheDocument();
  });

  it("renders email initial when name is null", () => {
    const propsWithNoName = {
      user: {
        id: "user-1",
        name: null,
        email: "test@example.com",
        image: null,
      },
    };

    render(<UserMenu {...propsWithNoName} />);
    expect(screen.getByText("T")).toBeInTheDocument();
  });
});
