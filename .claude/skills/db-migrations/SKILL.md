---
name: db-migrations
description: Safe database schema changes using Drizzle ORM. Handles migrations, rollbacks, and data transformations. Use when modifying database schema, adding tables/columns, or performing data migrations.
allowed-tools: Read, Write, Edit, Bash
---

# Database Migrations Skill

## Purpose
Execute safe, reversible database schema changes following best practices for zero-downtime deployments.

## Technology
- **ORM**: Drizzle
- **Database**: Neon PostgreSQL
- **Migration Tool**: drizzle-kit

## Migration Process

### 1. Schema Change
Edit `src/lib/db/schema.ts`:
```typescript
// Add new table/column following existing patterns
export const newTable = pgTable('new_table', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  // ... other columns
});
```

### 2. Generate Migration
```bash
bun drizzle-kit generate
```

### 3. Review Migration
- Check generated SQL in `drizzle/` folder
- Verify reversibility
- Check for data loss risks
- Estimate execution time

### 4. Test Migration
```bash
# On development branch database
bun drizzle-kit push
bun test
```

### 5. Apply Migration
```bash
bun drizzle-kit migrate
```

## Safety Rules

### NEVER
- Drop columns without data backup
- Rename columns (add new, migrate data, drop old)
- Add NOT NULL without default on existing tables
- Run migrations during peak traffic

### ALWAYS
- Test on branch database first
- Have rollback plan ready
- Backup data before destructive changes
- Use transactions where possible
- Add new columns as nullable first

## Migration Patterns

### Adding a Column
```typescript
// Step 1: Add nullable
newColumn: text('new_column'),

// Step 2: Backfill data
// Step 3: Add NOT NULL constraint if needed
```

### Renaming a Column
```typescript
// Step 1: Add new column
newName: text('new_name'),

// Step 2: Copy data
// UPDATE table SET new_name = old_name;

// Step 3: Update application code

// Step 4: Drop old column (after verification)
```

### Adding an Index
```typescript
export const tableNameIdx = index('table_name_idx')
  .on(tableName.columnName);
```

## Rollback Procedures

### Automatic (Drizzle)
```bash
# Rollback last migration
bun drizzle-kit rollback
```

### Manual (if needed)
1. Identify migration to revert
2. Write reverse SQL
3. Test on branch database
4. Apply in transaction
5. Verify application works

## Output Format
```markdown
## Migration: [Description]

### Changes
- [Change 1]
- [Change 2]

### SQL Generated
\`\`\`sql
[migration SQL]
\`\`\`

### Rollback SQL
\`\`\`sql
[rollback SQL]
\`\`\`

### Risks
- [Risk and mitigation]

### Verification
- [ ] Tests pass
- [ ] No data loss
- [ ] Performance acceptable
```
