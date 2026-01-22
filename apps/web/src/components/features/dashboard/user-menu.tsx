"use client";

import { ANALYTICS_EVENTS, resetUser, trackEvent } from "@/lib/analytics";
import { authClient } from "@/lib/auth/client";
import { Avatar, AvatarFallback, AvatarImage, Button } from "@repo/ui";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface UserMenuProps {
  user: User;
}

export function UserMenu({ user }: UserMenuProps) {
  const router = useRouter();

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (user.email?.charAt(0).toUpperCase() ?? "?");

  const handleSignOut = async () => {
    // Track sign-out before clearing identity
    trackEvent(ANALYTICS_EVENTS.USER_SIGNED_OUT);
    resetUser();

    await authClient.signOut();
    router.push("/sign-in");
    router.refresh();
  };

  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-9 w-9">
        {user.image && (
          <AvatarImage src={user.image} alt={user.name ?? "User"} />
        )}
        <AvatarFallback className="bg-primary/10 text-primary">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 overflow-hidden">
        <p className="truncate text-sm font-medium">{user.name ?? "User"}</p>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSignOut}
        className="text-muted-foreground"
      >
        Sign out
      </Button>
    </div>
  );
}
