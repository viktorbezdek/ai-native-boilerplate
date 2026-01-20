# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please report it responsibly.

### How to Report

1. **Do NOT** open a public GitHub issue
2. Email security concerns to: [security@yourdomain.com]
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any suggested fixes (optional)

### Response Timeline

- **Initial response**: Within 48 hours
- **Status update**: Within 5 business days
- **Resolution target**: Within 30 days for critical issues

### What to Expect

1. Acknowledgment of your report
2. Assessment of the vulnerability
3. Development of a fix
4. Coordinated disclosure (if applicable)
5. Credit in the security advisory (optional)

## Security Measures

This project implements several security measures:

### Authentication
- Secure session management with Better Auth
- OAuth integration with major providers
- Password hashing with industry-standard algorithms

### Data Protection
- Environment variable validation
- SQL injection prevention via Drizzle ORM
- Input validation with Zod schemas

### API Security
- CORS configuration
- Rate limiting
- CSRF protection

### Infrastructure
- Security headers (CSP, X-Frame-Options, etc.)
- HTTPS enforcement
- Secure cookie settings

### Development
- Protected file hooks prevent accidental exposure
- Command validation blocks dangerous operations
- Dependency scanning with Dependabot

## Best Practices for Users

When deploying this boilerplate:

1. **Environment Variables**
   - Use strong, unique secrets
   - Never commit `.env` files
   - Rotate secrets regularly

2. **Database**
   - Use connection pooling
   - Enable SSL for database connections
   - Regularly backup data

3. **Authentication**
   - Enable MFA where possible
   - Use OAuth over password-based auth
   - Monitor for suspicious activity

4. **Updates**
   - Keep dependencies updated
   - Monitor security advisories
   - Apply patches promptly

## Security Features in Claude Code

The Claude Code configuration includes security-focused features:

- `guard-protected.sh`: Blocks modifications to sensitive files
- `validate-command.sh`: Prevents dangerous shell commands
- Security review in `/review` command
- Security audit in `/audit` command

## Acknowledgments

We thank the security researchers who have helped improve this project.

---

Thank you for helping keep AI-Native Boilerplate secure!
