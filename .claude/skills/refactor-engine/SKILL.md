---
name: refactor-engine
description: Identifies code smells, suggests refactors, executes safe transformations. Tracks technical debt by impact/effort ratio.
allowed-tools:
  - Read
  - Grep
  - Glob
---

# Refactor Engine

Identifies code smells and technical debt, prioritizes improvements by impact/effort ratio.

## When to Use

- Before adding features to existing code
- During code review to suggest improvements
- For technical debt assessment
- When code is difficult to understand or modify
- Planning refactoring sprints

## Code Smells Detection

### Function Level
- **Long Functions**: > 50 lines
- **Too Many Parameters**: > 4 parameters
- **Deep Nesting**: > 3 levels
- **Complex Conditionals**: Multiple && / || chains
- **Duplicate Code**: Similar patterns in multiple places

### Class/Module Level
- **God Objects**: Classes doing too much
- **Feature Envy**: Methods using other class data extensively
- **Data Clumps**: Same data groups appearing together
- **Primitive Obsession**: Using primitives instead of small objects

### Architecture Level
- **Circular Dependencies**: A → B → A
- **Shotgun Surgery**: One change requires many file edits
- **Divergent Change**: One file changes for multiple reasons
- **Inappropriate Intimacy**: Classes too coupled

## Refactoring Catalog

### Extract Function
```typescript
// Before
function processOrder(order: Order) {
  // validate
  if (!order.items.length) throw new Error('Empty order');
  if (!order.customer) throw new Error('No customer');
  // calculate total
  let total = 0;
  for (const item of order.items) {
    total += item.price * item.quantity;
  }
  // ...more code
}

// After
function processOrder(order: Order) {
  validateOrder(order);
  const total = calculateTotal(order.items);
  // ...
}
```

### Replace Conditional with Polymorphism
```typescript
// Before
function getArea(shape: Shape) {
  switch (shape.type) {
    case 'circle': return Math.PI * shape.radius ** 2;
    case 'rectangle': return shape.width * shape.height;
  }
}

// After
interface Shape {
  getArea(): number;
}
class Circle implements Shape {
  getArea() { return Math.PI * this.radius ** 2; }
}
```

### Introduce Parameter Object
```typescript
// Before
function createUser(name: string, email: string, age: number, role: string)

// After
function createUser(params: CreateUserParams)
```

## Impact/Effort Matrix

| Quadrant | Impact | Effort | Priority |
|----------|--------|--------|----------|
| Quick Wins | High | Low | P1 - Do First |
| Major Projects | High | High | P2 - Plan Carefully |
| Fill-ins | Low | Low | P3 - When Time Permits |
| Thankless Tasks | Low | High | P4 - Consider Skipping |

## Output Format

```markdown
## Refactoring Analysis: [File/Module]

### Code Smells Detected

#### Critical (Must Fix)
- **[Smell]** at [location]
  - Impact: [description]
  - Suggested refactor: [technique]
  - Effort: [Low/Medium/High]

#### Warning (Should Fix)
- **[Smell]** at [location]
  - ...

#### Info (Nice to Fix)
- **[Smell]** at [location]
  - ...

### Technical Debt Score
[1-10 scale]

### Prioritized Refactoring Plan

| # | Refactor | Impact | Effort | Priority |
|---|----------|--------|--------|----------|
| 1 | [Name] | High | Low | P1 |
| 2 | [Name] | High | Medium | P2 |

### Safe Transformation Steps
1. [Step with verification]
2. [Step with verification]
```

## Safe Refactoring Process

1. **Ensure Test Coverage**
   - Run existing tests
   - Add tests if coverage < 80%
   - Tests must pass before refactoring

2. **Small Steps**
   - One refactoring at a time
   - Commit after each step
   - Run tests after each change

3. **Preserve Behavior**
   - No functional changes during refactor
   - Keep APIs compatible
   - Document any breaking changes

4. **Verify Continuously**
   - Type check after each change
   - Run affected tests
   - Manual verification for UI changes

## Best Practices

1. **Refactor before adding features** - Clean code is easier to extend
2. **Boy Scout Rule** - Leave code cleaner than you found it
3. **Small, focused PRs** - One refactoring theme per PR
4. **Communicate intent** - Explain why in commit messages
5. **Don't mix with features** - Separate refactoring from new functionality
