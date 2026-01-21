import { applyApiMiddleware } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import {
  createErrorResponse,
  createSuccessResponse,
  updateUserSchema,
} from "@/lib/validations";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";

// GET /api/v1/users - Get current user
export async function GET(request: NextRequest) {
  // Apply rate limiting (no CSRF for GET requests)
  const middleware = await applyApiMiddleware(request, {
    rateLimit: "standard",
    csrf: false,
    routePrefix: "users",
  });
  if (!middleware.success && middleware.error) {
    return middleware.error;
  }

  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return createErrorResponse("Unauthorized", 401);
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return createErrorResponse("User not found", 404);
    }

    return createSuccessResponse(user);
  } catch (error) {
    console.error("GET /api/v1/users error:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

// PATCH /api/v1/users - Update current user
export async function PATCH(request: NextRequest) {
  // Apply rate limiting and CSRF protection for state-changing request
  const middleware = await applyApiMiddleware(request, {
    rateLimit: "standard",
    csrf: true,
    routePrefix: "users",
  });
  if (!middleware.success && middleware.error) {
    return middleware.error;
  }

  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return createErrorResponse("Unauthorized", 401);
    }

    const body = await request.json();
    const validation = updateUserSchema.safeParse(body);

    if (!validation.success) {
      return createErrorResponse(
        "Validation failed",
        400,
        validation.error.issues
      );
    }

    const data = validation.data;

    const [updatedUser] = await db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.user.id))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        updatedAt: users.updatedAt,
      });

    if (!updatedUser) {
      return createErrorResponse("User not found", 404);
    }

    return createSuccessResponse(updatedUser);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse("Validation failed", 400, error.issues);
    }
    console.error("PATCH /api/v1/users error:", error);
    return createErrorResponse("Internal server error", 500);
  }
}
