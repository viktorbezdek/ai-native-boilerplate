import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserMenu } from "@/components/features/dashboard/user-menu";

// Mock auth
const mockSignOut = vi.fn();

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signOut: mockSignOut,
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

  it("renders user image when provided", () => {
    const propsWithImage = {
      user: {
        ...defaultProps.user,
        image: "https://example.com/avatar.jpg",
      },
    };

    render(<UserMenu {...propsWithImage} />);
    const avatar = screen.getByRole("img");
    expect(avatar).toHaveAttribute("src", expect.stringContaining("avatar.jpg"));
  });
});
