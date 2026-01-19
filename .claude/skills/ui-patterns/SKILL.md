---
name: ui-patterns
description: Build accessible, responsive UI components using shadcn/ui and Tailwind CSS. Use when creating new components, implementing designs, or improving accessibility.
allowed-tools: Read, Write, Edit, Bash
---

# UI Patterns Skill

## Purpose
Create consistent, accessible, and responsive UI components following project design system and best practices.

## Technology Stack
- **Components**: shadcn/ui (Radix primitives)
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **Animations**: Tailwind + Framer Motion

## Component Structure

### File Organization
```
src/components/
├── ui/              # shadcn/ui primitives (Button, Input, etc.)
├── features/        # Feature-specific components
│   ├── auth/        # Authentication components
│   └── dashboard/   # Dashboard components
└── layouts/         # Layout components
```

### Component Template
```typescript
// src/components/features/[feature]/[component].tsx
import { cn } from '@/lib/utils';

interface ComponentNameProps {
  /** Description of prop */
  prop: string;
  /** Optional prop with default */
  optional?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function ComponentName({
  prop,
  optional = false,
  className,
  children,
}: ComponentNameProps) {
  return (
    <div className={cn('base-classes', className)}>
      {children}
    </div>
  );
}
```

## Design Tokens

### Colors (use semantic tokens)
```typescript
// Background
'bg-background'      // Main background
'bg-card'            // Card background
'bg-muted'           // Muted sections

// Text
'text-foreground'    // Primary text
'text-muted-foreground' // Secondary text

// Borders
'border-border'      // Default border
'border-input'       // Input borders

// Status
'text-destructive'   // Error/danger
'bg-primary'         // Primary action
```

### Spacing (consistent scale)
```typescript
'p-4'    // Standard padding (1rem)
'gap-4'  // Standard gap
'space-y-4' // Vertical spacing
```

### Responsive Breakpoints
```typescript
'sm:'    // 640px+
'md:'    // 768px+
'lg:'    // 1024px+
'xl:'    // 1280px+
'2xl:'   // 1536px+
```

## Accessibility Requirements

### Keyboard Navigation
- All interactive elements focusable
- Logical tab order
- Visible focus indicators
- Escape closes modals/dropdowns

### ARIA
```tsx
// Labels
<button aria-label="Close dialog">
  <X className="h-4 w-4" />
</button>

// Live regions
<div aria-live="polite" aria-atomic="true">
  {notification}
</div>

// Expanded state
<button aria-expanded={isOpen} aria-controls="menu-id">
```

### Color Contrast
- Text: minimum 4.5:1 ratio
- Large text: minimum 3:1 ratio
- Interactive elements: minimum 3:1 ratio

## Common Patterns

### Loading States
```tsx
<Button disabled={isLoading}>
  {isLoading ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Loading...
    </>
  ) : (
    'Submit'
  )}
</Button>
```

### Error States
```tsx
<div className="rounded-md bg-destructive/10 p-4">
  <div className="flex">
    <AlertCircle className="h-5 w-5 text-destructive" />
    <div className="ml-3">
      <h3 className="text-sm font-medium text-destructive">
        Error
      </h3>
      <p className="mt-1 text-sm text-destructive/80">
        {error.message}
      </p>
    </div>
  </div>
</div>
```

### Empty States
```tsx
<div className="flex flex-col items-center justify-center py-12">
  <Inbox className="h-12 w-12 text-muted-foreground" />
  <h3 className="mt-4 text-lg font-semibold">No items yet</h3>
  <p className="mt-2 text-sm text-muted-foreground">
    Get started by creating your first item.
  </p>
  <Button className="mt-4">Create Item</Button>
</div>
```

### Form Pattern
```tsx
<form onSubmit={handleSubmit} className="space-y-4">
  <div className="space-y-2">
    <Label htmlFor="email">Email</Label>
    <Input
      id="email"
      type="email"
      placeholder="you@example.com"
      {...register('email')}
      aria-invalid={errors.email ? 'true' : 'false'}
    />
    {errors.email && (
      <p className="text-sm text-destructive">
        {errors.email.message}
      </p>
    )}
  </div>
  <Button type="submit" className="w-full">
    Submit
  </Button>
</form>
```

## Checklist
- [ ] Component is accessible (keyboard, screen reader)
- [ ] Responsive across breakpoints
- [ ] Loading states handled
- [ ] Error states handled
- [ ] Empty states handled
- [ ] Uses semantic color tokens
- [ ] Follows naming conventions

## Output Format
```markdown
## Component: [Name]

### Purpose
[What this component does]

### Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|

### Usage
\`\`\`tsx
<Component prop="value" />
\`\`\`

### Accessibility
- [Accessibility feature]
- [ARIA attributes used]
```
