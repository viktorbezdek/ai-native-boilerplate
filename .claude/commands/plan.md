# /plan - Feature Planning

Decompose a feature request into actionable tasks.

## Usage
```
/plan [feature description]
```

## Process

1. **Analyze Requirements**
   - Parse explicit requirements from the description
   - Identify implicit requirements
   - Flag ambiguities for clarification

2. **Research Existing Code**
   - Search for related components and patterns
   - Identify affected areas
   - Note reusable code

3. **Decompose into Tasks**
   - Break into atomic, PR-sized tasks
   - Establish dependencies between tasks
   - Mark parallelizable work

4. **Estimate Complexity**
   - S (Small): < 1 hour, single file
   - M (Medium): 1-4 hours, few files
   - L (Large): 4+ hours, multiple areas

5. **Output Plan**
   Use this format:
   
   ```markdown
   ## Feature: [Name]
   
   ### Overview
   [One paragraph summary]
   
   ### Tasks
   
   - [ ] 1. [Task title] (S/M/L)
     - Description: [What to do]
     - Files: [Affected files]
     - Dependencies: [Prereqs]
     - Acceptance: [How to verify]
   ```

## Example

```
/plan Add user profile page with avatar upload
```

Output:
```markdown
## Feature: User Profile Page

### Overview
Create a profile page where users can view and edit their information,
including uploading a custom avatar image.

### Tasks

- [ ] 1. Create profile page route (S)
  - Description: Add /dashboard/profile route with basic layout
  - Files: src/app/(dashboard)/profile/page.tsx
  - Dependencies: None
  - Acceptance: Route accessible, renders placeholder

- [ ] 2. Add profile form component (M)
  - Description: Create form with name, email, bio fields
  - Files: src/components/features/profile-form.tsx
  - Dependencies: Task 1
  - Acceptance: Form validates and submits

- [ ] 3. Implement avatar upload (M)
  - Description: Add image upload with preview and crop
  - Files: src/components/features/avatar-upload.tsx
  - Dependencies: Task 1
  - Acceptance: Images upload to R2, display correctly

- [ ] 4. Add profile server actions (M)
  - Description: Create updateProfile and uploadAvatar actions
  - Files: src/server/actions/profile.ts
  - Dependencies: Task 2, 3
  - Acceptance: Actions update DB and storage

- [ ] 5. Add tests (M)
  - Description: Unit tests for components, E2E for flow
  - Files: tests/unit/profile.test.ts, tests/e2e/profile.spec.ts
  - Dependencies: Task 1-4
  - Acceptance: 80%+ coverage, E2E passes
```

## Notes
- Always consider auth requirements
- Include error handling in acceptance criteria
- Consider mobile responsiveness
