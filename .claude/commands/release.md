# /release $VERSION

Create a new release with changelog and deployment.

## Arguments
- `$VERSION`: Semantic version (major | minor | patch | X.Y.Z)

## Release Process

### 1. Pre-Release Checks
- [ ] All tests passing
- [ ] No uncommitted changes
- [ ] On main/develop branch
- [ ] No critical security issues
- [ ] Coverage threshold met (≥80%)

### 2. Version Bump
```bash
# Determine next version
bun run version $VERSION

# Update package.json
# Update CHANGELOG.md
```

### 3. Generate Changelog
Analyze commits since last tag:
- Group by type (feat, fix, docs, etc.)
- Include breaking changes prominently
- Link to PRs/issues
- Credit contributors

### 4. Create Git Tag
```bash
git tag -a v$VERSION -m "Release v$VERSION"
git push origin v$VERSION
```

### 5. Deploy to Production
**REQUIRES HUMAN APPROVAL**

After approval:
```bash
/deploy production
```

### 6. Post-Release
- Create GitHub release with changelog
- Notify Sentry of new release
- Update status page
- Send release notification

## Output Format
```
## Release v$VERSION

### Changelog

#### 🚀 Features
- [feature description] (#PR)

#### 🐛 Bug Fixes
- [fix description] (#PR)

#### 📚 Documentation
- [doc updates] (#PR)

#### ⚠️ Breaking Changes
- [breaking change description]

### Deployment
**Status**: Awaiting Approval | Deployed
**URL**: [production-url]
**Commit**: [sha]

### Notifications
- [ ] GitHub Release created
- [ ] Sentry release tagged
- [ ] Team notified
```
