"use client";

import { identifyUser, setUserProperties } from "@/lib/analytics";
import { useEffect } from "react";

interface UserIdentifierProps {
  user: {
    id: string;
    email?: string | null;
    name?: string | null;
  };
  subscription?: {
    status?: string;
    plan?: string;
  } | null;
}

/**
 * Client component that identifies the user in PostHog
 * Place this in authenticated layouts to ensure user tracking
 */
export function UserIdentifier({ user, subscription }: UserIdentifierProps) {
  useEffect(() => {
    if (!user.id) return;

    // Identify the user with PostHog
    identifyUser(user.id, {
      email: user.email,
      name: user.name,
    });

    // Set subscription properties separately for segmentation
    if (subscription) {
      setUserProperties({
        subscription_status: subscription.status,
        subscription_plan: subscription.plan,
        is_subscriber: subscription.status === "active",
      });
    }
  }, [user.id, user.email, user.name, subscription]);

  // This component renders nothing
  return null;
}
