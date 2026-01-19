# /audit $TYPE

Perform comprehensive audit of specified area.

## Arguments
- `$TYPE`: Audit type (security | accessibility | performance | ux | code)

## Audit Procedures

### Security Audit
Full security review following OWASP guidelines:

1. **Authentication**
   - Session management
   - Password policies
   - MFA implementation
   - Token handling

2. **Authorization**
   - Role-based access control
   - Resource permissions
   - API endpoint protection

3. **Data Protection**
   - Encryption at rest/transit
   - PII handling
   - Input sanitization
   - SQL injection vectors

4. **Infrastructure**
   - CORS configuration
   - CSP headers
   - Rate limiting
   - Secret management

### Accessibility Audit
WCAG 2.2 AA compliance check:
- Screen reader compatibility
- Keyboard navigation
- Color contrast ratios
- Focus management
- ARIA labels
- Alt text coverage

### Performance Audit
Core Web Vitals assessment:
- LCP (Largest Contentful Paint)
- FID (First Input Delay)
- CLS (Cumulative Layout Shift)
- TTFB (Time to First Byte)
- Bundle analysis

### UX Audit
User experience evaluation:
- User flow friction points
- Error message clarity
- Loading state handling
- Mobile responsiveness
- Form validation UX

### Code Audit
Code quality review:
- Test coverage gaps
- Type safety issues
- Error handling patterns
- Documentation coverage
- Technical debt inventory

## Output Format
```
## Audit Report: $TYPE

**Date**: [timestamp]
**Auditor**: Claude Code
**Scope**: [files/components audited]

### Executive Summary
[Risk level: Critical | High | Medium | Low]
[Brief overview of findings]

### Critical Issues
| Issue | Location | Severity | Remediation |
|-------|----------|----------|-------------|

### Recommendations
1. **[Priority]** [Recommendation]

### Compliance Status
- [ ] [Standard/Requirement]: [Status]

### Appendix
[Detailed findings, evidence, methodology]
```
