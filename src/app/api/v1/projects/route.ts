import { and, asc, count, desc, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { applyApiMiddleware } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import {
  createErrorResponse,
  createProjectSchema,
  createSuccessResponse,
  paginationSchema,
} from "@/lib/validations";

// GET /api/v1/projects - List user's projects
export async function GET(request: NextRequest) {
  // Apply rate limiting (no CSRF for GET requests)
  const middleware = await applyApiMiddleware(request, {
    rateLimit: "standard",
    csrf: false,
    routePrefix: "projects",
  });
  if (!middleware.success && middleware.error) {
    return middleware.error;
  }

  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return createErrorResponse("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const validation = paginationSchema.safeParse(
      Object.fromEntries(searchParams)
    );

    if (!validation.success) {
      return createErrorResponse(
        "Invalid query parameters",
        400,
        validation.error.issues
      );
    }

    const { page, limit, sort } = validation.data;
    const offset = (page - 1) * limit;

    const [userProjects, totalCount] = await Promise.all([
      db.query.projects.findMany({
        where: eq(projects.userId, session.user.id),
        limit,
        offset,
        orderBy:
          sort === "desc" ? desc(projects.createdAt) : asc(projects.createdAt),
        columns: {
          id: true,
          name: true,
          description: true,
          isPublic: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db
        .select({ count: count() })
        .from(projects)
        .where(eq(projects.userId, session.user.id)),
    ]);

    const total = totalCount[0]?.count ?? 0;

    return createSuccessResponse(userProjects, {
      page,
      limit,
      total,
      hasMore: offset + userProjects.length < total,
    });
  } catch (error) {
    console.error("GET /api/v1/projects error:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

// POST /api/v1/projects - Create a new project
export async function POST(request: NextRequest) {
  // Apply rate limiting and CSRF protection for state-changing request
  const middleware = await applyApiMiddleware(request, {
    rateLimit: "standard",
    csrf: true,
    routePrefix: "projects",
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
    const validation = createProjectSchema.safeParse(body);

    if (!validation.success) {
      return createErrorResponse(
        "Validation failed",
        400,
        validation.error.issues
      );
    }

    const data = validation.data;

    const [newProject] = await db
      .insert(projects)
      .values({
        ...data,
        userId: session.user.id,
      })
      .returning();

    return Response.json({ data: newProject }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse("Validation failed", 400, error.issues);
    }
    console.error("POST /api/v1/projects error:", error);
    return createErrorResponse("Internal server error", 500);
  }
}
