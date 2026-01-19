# /review - Code Review

Perform comprehensive code review on files or PRs.

## Usage
```
/review [file path | PR number | git diff]
```

## Review Dimensions

### 1. Correctness
- Does the code do what it claims?
- Are edge cases handled?
- Are error conditions managed?

### 2. Types
- No `any` types
- Proper generics usage
- Return types explicit

### 3. Security
- Input validation present
- No hardcoded secrets
- SQL injection prevention
- XSS prevention

### 4. Performance
- No N+1 queries
- Appropriate caching
- Async operations used correctly

### 5. Testing
- Tests present and meaningful
- Edge cases covered
- Mocks appropriate

### 6. Accessibility
- ARIA labels present
- Keyboard navigation
- Color contrast

### 7. Maintainability
- Code is readable
- Names are descriptive
- DRY principles followed

## Output Format

```markdown
## Code Review: [File/PR]

### Summary
[One paragraph assessment]

### Findings

#### 🔴 Must Fix
- [ ] **[Location]**: [Issue description]
  - Why: [Explanation]
  - Fix: [Suggested solution]

#### 🟡 Should Fix
- [ ] **[Location]**: [Issue description]
  - Why: [Explanation]
  - Fix: [Suggested solution]

#### 🟢 Nitpicks
- **[Location]**: [Suggestion]

### Positive Observations
- [Good thing 1]
- [Good thing 2]

### Recommendation
- [ ] ✅ Approve
- [ ] ✅ Approve with comments
- [ ] ❌ Request changes
- [ ] 💬 Needs discussion
```

## Example

```
/review src/components/features/login-form.tsx
```

Output:
```markdown
## Code Review: login-form.tsx

### Summary
Well-structured login form with good error handling. Two security issues
need addressing before merge: missing CSRF protection and password field
autocomplete attribute.

### Findings

#### 🔴 Must Fix
- [ ] **Line 45**: Password field missing autocomplete attribute
  - Why: Browsers may cache passwords insecurely
  - Fix: Add `autoComplete="current-password"`

- [ ] **Line 23**: No CSRF token in form submission
  - Why: Vulnerable to cross-site request forgery
  - Fix: Use Better Auth's built-in CSRF handling

#### 🟡 Should Fix
- [ ] **Line 67**: Error message exposes email existence
  - Why: Allows user enumeration attacks
  - Fix: Use generic "Invalid credentials" message

#### 🟢 Nitpicks
- **Line 12**: Consider extracting validation schema to separate file

### Positive Observations
- Good use of Zod for client-side validation
- Accessible form labels and error messages
- Loading state handled correctly

### Recommendation
- [x] ❌ Request changes
```

## Notes
- Be constructive, not critical
- Explain the "why" behind issues
- Provide concrete fixes when possible
- Acknowledge good patterns
