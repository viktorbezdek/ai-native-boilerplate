---
name: api-design
description: Design and implement RESTful APIs with Zod validation, proper error handling, and OpenAPI documentation. Use when creating new API endpoints, designing API contracts, or refactoring existing APIs.
allowed-tools: Read, Write, Edit, Bash, Grep
---

# API Design Skill

## Purpose
Create consistent, well-documented, type-safe APIs following REST conventions and project standards.

## Technology Stack
- **Framework**: Next.js App Router (Route Handlers)
- **Validation**: Zod
- **Documentation**: OpenAPI 3.1
- **Authentication**: Better Auth

## API Conventions

### URL Structure
```
/api/v1/{resource}           # Collection
/api/v1/{resource}/{id}      # Single resource
/api/v1/{resource}/{id}/{sub} # Nested resource
```

### HTTP Methods
- `GET` - Retrieve (idempotent)
- `POST` - Create
- `PUT` - Full update (idempotent)
- `PATCH` - Partial update
- `DELETE` - Remove (idempotent)

### Status Codes
- `200` - Success
- `201` - Created
- `204` - No Content (DELETE)
- `400` - Bad Request (validation error)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Unprocessable Entity
- `500` - Server Error

## Implementation Pattern

### Route Handler Template
```typescript
// src/app/api/v1/[resource]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

// Validation schemas
const createSchema = z.object({
  name: z.string().min(1).max(255),
  // ... other fields
});

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort: z.enum(['asc', 'desc']).default('desc'),
});

// GET /api/v1/resource
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = querySchema.parse(Object.fromEntries(searchParams));

    const items = await db.query.resources.findMany({
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
      orderBy: (t, { desc, asc }) => 
        query.sort === 'desc' ? desc(t.createdAt) : asc(t.createdAt),
    });

    return NextResponse.json({
      data: items,
      meta: { page: query.page, limit: query.limit },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/v1/resource
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const data = createSchema.parse(body);

    const item = await db.insert(resources).values({
      ...data,
      userId: session.user.id,
    }).returning();

    return NextResponse.json(
      { data: item[0] },
      { status: 201 }
    );
  } catch (error) {
    // ... error handling
  }
}
```

## Response Format

### Success Response
```json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

### Error Response
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": [ ... ]
}
```

## Validation Best Practices

### Input Validation
- Validate ALL inputs with Zod
- Provide meaningful error messages
- Sanitize strings (trim, escape)
- Validate enums strictly

### Output Validation
- Never expose internal IDs in URLs
- Use consistent date formats (ISO 8601)
- Paginate all list endpoints
- Include meta information

## Security Checklist
- [ ] Authentication required
- [ ] Authorization checked (resource ownership)
- [ ] Input validated and sanitized
- [ ] Rate limiting configured
- [ ] No sensitive data in logs
- [ ] CORS configured correctly

## Output Format
```markdown
## API Endpoint: [METHOD] [PATH]

### Purpose
[What this endpoint does]

### Authentication
Required | Optional | None

### Request
\`\`\`typescript
// Schema
\`\`\`

### Response
\`\`\`typescript
// Success response type
\`\`\`

### Error Codes
| Code | Description |
|------|-------------|

### Example
\`\`\`bash
curl -X [METHOD] ...
\`\`\`
```
