# API Standards

## Route Structure

All API routes follow RESTful conventions under `/api/v1/`:

```
GET    /api/v1/[resource]      # List resources
POST   /api/v1/[resource]      # Create resource
GET    /api/v1/[resource]/[id] # Get single resource
PATCH  /api/v1/[resource]/[id] # Update resource
DELETE /api/v1/[resource]/[id] # Delete resource
```

## Request Validation

All input is validated using Zod schemas:

```typescript
import { z } from "zod";

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const validation = createProjectSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  // Use validation.data
}
```

## Response Format

### Success Response

```typescript
// Single resource
{ "data": { "id": "...", "name": "..." } }

// List with pagination
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20
  }
}
```

### Error Response

```typescript
{
  "error": "Human-readable error message"
}

// With validation details
{
  "error": "Validation failed",
  "issues": [{ "path": ["name"], "message": "Required" }]
}
```

## HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 | Success (GET, PATCH) |
| 201 | Created (POST) |
| 204 | No Content (DELETE) |
| 400 | Bad Request (validation errors) |
| 401 | Unauthorized (no/invalid auth) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |

## Authentication

Protected routes require a valid session:

```typescript
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Proceed with authenticated request
}
```

## Rate Limiting

Apply rate limits via middleware:

```typescript
import { applyApiMiddleware } from "@/lib/api";

export async function POST(request: Request) {
  const middleware = await applyApiMiddleware(request, {
    rateLimit: "strict",  // strict | standard | auth | webhook
    csrf: true,
    routePrefix: "billing",
  });

  if (!middleware.success && middleware.error) {
    return middleware.error;
  }

  // Continue with request
}
```

Rate limit tiers:
- `strict`: 10 requests/minute (billing, checkout)
- `standard`: 100 requests/minute (general API)
- `auth`: 20 requests/minute (authentication)
- `webhook`: 500 requests/minute (external webhooks)

## CSRF Protection

State-changing requests (POST, PATCH, DELETE) should enable CSRF:

```typescript
const middleware = await applyApiMiddleware(request, {
  csrf: true,  // Validates CSRF token
});
```

## Error Handling

Use the Result pattern for business logic:

```typescript
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

async function getProject(id: string): Promise<Result<Project>> {
  try {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, id),
    });

    if (!project) {
      return { success: false, error: new Error("Project not found") };
    }

    return { success: true, data: project };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
```

## Pagination

List endpoints support pagination:

```typescript
// Request
GET /api/v1/projects?page=2&limit=20&sort=createdAt&order=desc

// Parameters
const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));
const offset = (page - 1) * limit;
```

## Example Route

```typescript
import { applyApiMiddleware } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { db, projects } from "@repo/database";
import { createProjectSchema } from "@repo/validations";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  // 1. Apply middleware
  const middleware = await applyApiMiddleware(request, {
    rateLimit: "standard",
    csrf: true,
    routePrefix: "projects",
  });
  if (!middleware.success && middleware.error) {
    return middleware.error;
  }

  // 2. Authenticate
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 3. Validate input
  const body = await request.json();
  const validation = createProjectSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0]?.message },
      { status: 400 }
    );
  }

  // 4. Execute business logic
  try {
    const [project] = await db
      .insert(projects)
      .values({
        ...validation.data,
        userId: session.user.id,
      })
      .returning();

    return NextResponse.json({ data: project }, { status: 201 });
  } catch (error) {
    console.error("Create project error:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
```
