---
name: compliance-checker
description: Validates code against regulatory requirements (SOC2, HIPAA, GDPR). Flags violations and suggests remediations.
allowed-tools:
  - Read
  - Grep
  - Glob
---

# Compliance Checker

Validates code against regulatory and security compliance requirements.

## Compliance Frameworks

### SOC 2
- **Security**: Protection against unauthorized access
- **Availability**: System availability for operation
- **Processing Integrity**: System processing is complete and accurate
- **Confidentiality**: Information designated as confidential is protected
- **Privacy**: Personal information is collected and used appropriately

### HIPAA (Healthcare)
- **Privacy Rule**: Protection of health information
- **Security Rule**: Technical safeguards for ePHI
- **Breach Notification**: Reporting of data breaches

### GDPR (EU Data Protection)
- **Lawful Processing**: Legal basis for data processing
- **Data Minimization**: Collect only necessary data
- **Purpose Limitation**: Use data only for stated purposes
- **Storage Limitation**: Don't keep data longer than needed
- **Right to Erasure**: Support data deletion requests

### PCI DSS (Payment Card)
- **Network Security**: Firewall and access controls
- **Data Protection**: Encryption of cardholder data
- **Access Control**: Restrict access to cardholder data
- **Monitoring**: Track and monitor all access

## Checks Performed

### Authentication & Access Control
- [ ] Multi-factor authentication support
- [ ] Password policy enforcement
- [ ] Session timeout configuration
- [ ] Role-based access control
- [ ] Audit logging of access

### Data Protection
- [ ] Encryption at rest
- [ ] Encryption in transit (TLS)
- [ ] PII identification and handling
- [ ] Data masking in logs
- [ ] Secure key management

### Audit & Monitoring
- [ ] Comprehensive audit logging
- [ ] Log integrity protection
- [ ] Access monitoring
- [ ] Anomaly detection
- [ ] Incident response procedures

### Data Handling
- [ ] Data classification
- [ ] Retention policies
- [ ] Deletion procedures
- [ ] Export capabilities
- [ ] Consent management

## Output Format

```markdown
## Compliance Report: [Scope]

### Frameworks Evaluated
- [ ] SOC 2
- [ ] GDPR
- [ ] HIPAA
- [ ] PCI DSS

### Compliance Status

#### Passing ✓
- [Requirement]: [Evidence/Implementation]

#### Failing ✗
- [Requirement]: [Violation]
  - Location: [file:line]
  - Severity: [Critical/High/Medium/Low]
  - Remediation: [Fix description]

#### Not Applicable N/A
- [Requirement]: [Reason not applicable]

### Risk Summary
| Framework | Status | Critical | High | Medium | Low |
|-----------|--------|----------|------|--------|-----|
| SOC 2 | Partial | 0 | 2 | 3 | 1 |
| GDPR | Pass | 0 | 0 | 1 | 2 |

### Remediation Plan
| # | Issue | Severity | Effort | Deadline |
|---|-------|----------|--------|----------|
| 1 | [Issue] | Critical | [Est] | [Date] |

### Evidence Collected
- [Document/Screenshot/Log reference]
```

## Common Violations

### PII Exposure
```typescript
// VIOLATION: PII in logs
console.log(`User login: ${user.email}, SSN: ${user.ssn}`);

// COMPLIANT: Mask sensitive data
console.log(`User login: ${maskEmail(user.email)}`);
```

### Missing Encryption
```typescript
// VIOLATION: Storing password in plain text
await db.insert(users).values({ password: req.body.password });

// COMPLIANT: Hash passwords
await db.insert(users).values({ password: await hash(req.body.password) });
```

### Insufficient Logging
```typescript
// VIOLATION: No audit trail
await updateUserRole(userId, newRole);

// COMPLIANT: Audit logging
await auditLog.record({
  action: 'UPDATE_ROLE',
  userId,
  performedBy: currentUser.id,
  changes: { oldRole, newRole },
  timestamp: new Date(),
});
```

### Data Retention
```typescript
// VIOLATION: No data cleanup
// Data stored indefinitely

// COMPLIANT: Retention policy
const RETENTION_DAYS = 90;
await db.delete(logs).where(
  lt(logs.createdAt, subDays(new Date(), RETENTION_DAYS))
);
```

## Best Practices

1. **Privacy by Design** - Build compliance in from the start
2. **Data Minimization** - Only collect what you need
3. **Document Everything** - Maintain compliance evidence
4. **Regular Audits** - Schedule periodic compliance reviews
5. **Incident Response** - Have breach procedures ready
6. **Training** - Ensure team understands requirements
