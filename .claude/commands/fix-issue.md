# /fix-issue - Fix GitHub Issue

Analyze and implement a fix for a GitHub issue.

## Usage
```
/fix-issue [issue number | issue URL]
```

## Process

1. **Fetch Issue Details**
   - Read issue title and description
   - Check labels and assignees
   - Review comments for context

2. **Analyze Problem**
   - Identify root cause
   - Find related code
   - Check for existing tests

3. **Plan Fix**
   - Determine affected files
   - Consider impact on other features
   - Estimate complexity

4. **Implement Fix (TDD)**
   - Write failing test that reproduces issue
   - Implement fix
   - Verify test passes
   - Check for regressions

5. **Create PR**
   - Descriptive title referencing issue
   - Detailed description
   - Link to issue with `Fixes #N`

## Output Format

```markdown
## Issue Analysis: #[number]

### Problem
[Description of the issue]

### Root Cause
[Technical explanation of why this happens]

### Solution
[High-level description of the fix]

### Changes
- `file1.ts`: [What changed]
- `file2.ts`: [What changed]

### Testing
- Added test: [description]
- Existing tests: [pass/fail status]

### PR Ready
- Title: `fix: [description] (#[number])`
- Branch: `fix/issue-[number]`
```

## Example

```
/fix-issue 42
```

### Step 1: Fetch Issue
```
Issue #42: Login button unresponsive on mobile
Labels: bug, priority-high
Description: The sign-in button doesn't respond to taps on iOS Safari.
Users have to tap multiple times or use desktop mode.
```

### Step 2: Analyze
- Likely a touch event handling issue
- Check button component for touch events
- Review any z-index or overlay issues

### Step 3: Find Root Cause
```typescript
// src/components/ui/button.tsx
// Problem: Button uses only onClick, which can have delay on mobile
```

### Step 4: Write Failing Test
```typescript
// tests/unit/button-mobile.test.tsx
it("responds to touch events immediately", async () => {
  const handleClick = vi.fn();
  render(<Button onClick={handleClick}>Tap me</Button>);
  
  const button = screen.getByRole("button");
  fireEvent.touchStart(button);
  fireEvent.touchEnd(button);
  
  expect(handleClick).toHaveBeenCalledOnce();
});
```

### Step 5: Implement Fix
```typescript
// Add touch event handling
<button
  onTouchEnd={(e) => {
    e.preventDefault();
    onClick?.(e as any);
  }}
  onClick={onClick}
  {...props}
>
```

### Step 6: Verify
```bash
bun test tests/unit/button-mobile.test.tsx
# PASS

bun test
# All tests pass, no regressions
```

### Step 7: Create PR
```markdown
## fix: resolve mobile tap responsiveness on buttons (#42)

### Problem
The sign-in button (and other buttons) weren't responding 
reliably to taps on iOS Safari due to the 300ms tap delay.

### Solution
Added `onTouchEnd` handler with `preventDefault()` to ensure
immediate response to touch events while maintaining click
support for desktop.

### Testing
- Added unit test for touch event handling
- Manually tested on iOS Safari and Android Chrome

Fixes #42
```

## Notes
- Always reproduce the issue first
- Consider if this affects other components
- Update documentation if behavior changes
- Don't introduce breaking changes without discussion
