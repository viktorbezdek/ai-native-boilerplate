import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  updateUserSchema,
  createSuccessResponse,
  createErrorResponse,
} from "@/lib/validations";

// GET /api/v1/users - Get current user
export async function GET() {
  try {
    const session = await auth();

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
  try {
    const session = await auth();

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
