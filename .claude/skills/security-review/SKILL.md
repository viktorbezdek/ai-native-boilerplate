---
name: security-review
description: Reviews code for security vulnerabilities. Use when reviewing PRs, auditing code, or implementing auth/data handling.
allowed-tools: Read, Grep, Glob
---

# Security Review

## When to Use
- Reviewing PRs with auth changes
- Implementing user input handling
- Working with sensitive data
- API endpoint development
- Database query implementation

## Security Checklist

### 1. Input Validation
- [ ] All user inputs validated with Zod
- [ ] File uploads restricted by type/size
- [ ] SQL/NoSQL injection prevented
- [ ] Path traversal prevented

```typescript
// ✅ Good - Zod validation
const schema = z.object({
  email: z.string().email(),
  age: z.number().int().min(0).max(150),
});

const result = schema.safeParse(input);
if (!result.success) {
  throw new ValidationError(result.error);
}
```

### 2. Authentication
- [ ] Auth required on protected routes
- [ ] Session tokens secure (httpOnly, secure, sameSite)
- [ ] Password requirements enforced
- [ ] Rate limiting on auth endpoints

```typescript
// ✅ Good - Protected API route
export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Continue with authenticated request
}
```

### 3. Authorization
- [ ] Resource ownership verified
- [ ] Role-based access enforced
- [ ] No direct object references in URLs

```typescript
// ✅ Good - Ownership check
async function getDocument(id: string, userId: string) {
  const doc = await db.documents.find(id);
  
  if (doc.ownerId !== userId) {
    throw new ForbiddenError("Access denied");
  }
  
  return doc;
}
```

### 4. Data Exposure
- [ ] Sensitive fields excluded from responses
- [ ] Errors don't leak internal details
- [ ] No secrets in client bundles

```typescript
// ✅ Good - Exclude sensitive fields
const user = await getUser(id);
const { password, ...safeUser } = user;
return safeUser;
```

### 5. XSS Prevention
- [ ] User content sanitized
- [ ] dangerouslySetInnerHTML avoided
- [ ] CSP headers configured

```typescript
// ❌ Bad
<div dangerouslySetInnerHTML={{ __html: userContent }} />

// ✅ Good
import DOMPurify from "dompurify";
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userContent) }} />
```

### 6. CSRF Protection
- [ ] State-changing operations use POST/PUT/DELETE
- [ ] CSRF tokens for forms (Better Auth handles this)

### 7. Secrets Management
- [ ] No hardcoded secrets
- [ ] Secrets in environment variables
- [ ] .env files in .gitignore

```typescript
// ❌ Bad
const API_KEY = "sk_live_abc123";

// ✅ Good
const API_KEY = process.env.STRIPE_SECRET_KEY;
if (!API_KEY) {
  throw new Error("STRIPE_SECRET_KEY is required");
}
```

### 8. Dependencies
- [ ] No known vulnerabilities (run `bun audit`)
- [ ] Dependencies regularly updated
- [ ] Minimal dependency footprint

## Common Vulnerabilities

### SQL Injection
```typescript
// ❌ Vulnerable
const user = await db.raw(`SELECT * FROM users WHERE id = '${id}'`);

// ✅ Safe - Parameterized query
const user = await db.select().from(users).where(eq(users.id, id));
```

### Path Traversal
```typescript
// ❌ Vulnerable
const file = fs.readFileSync(`./uploads/${filename}`);

// ✅ Safe - Validate path
const safeName = path.basename(filename);
const file = fs.readFileSync(`./uploads/${safeName}`);
```

### Open Redirect
```typescript
// ❌ Vulnerable
redirect(req.query.returnUrl);

// ✅ Safe - Validate URL
const url = new URL(returnUrl, process.env.APP_URL);
if (url.origin !== process.env.APP_URL) {
  throw new Error("Invalid redirect");
}
redirect(url.pathname);
```

## Output Format

```markdown
## Security Review: [File/PR]

### Risk Level
🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low

### Findings

#### 🔴 Critical
- **[Location]**: [Vulnerability]
  - Risk: [What could happen]
  - Fix: [How to resolve]

#### 🟠 High
- ...

### Recommendations
1. [Action item]
2. [Action item]

### Passed Checks
- [x] Input validation
- [x] Authentication
- [ ] Authorization (needs review)
```
