# Contributing to AI-Native Boilerplate

Thank you for your interest in contributing! This document provides guidelines for contributing to this project.

## Code of Conduct

Be respectful, inclusive, and constructive. We're all here to build something great together.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/ai-native-boilerplate.git`
3. Install dependencies: `bun install`
4. Create a branch: `git checkout -b feature/your-feature-name`

## Development Workflow

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions/updates

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`

Examples:
```
feat(auth): add password reset flow
fix(api): handle null user in projects endpoint
docs: update README with deployment instructions
```

### Code Style

This project uses **Biome** for linting and formatting:

```bash
# Check linting
bun run lint

# Format code
bun run format

# Check formatting
bun run format:check
```

Run these before committing. The CI will fail if there are linting errors.

### Testing Requirements

All contributions must include appropriate tests:

- **New features**: Unit tests + integration tests
- **Bug fixes**: Test that reproduces the bug
- **API changes**: Update integration tests

```bash
# Run all tests
bun run test

# Run with coverage
bun run test:coverage
```

Minimum coverage threshold: 80%

## Pull Request Process

1. **Update documentation** if needed
2. **Add tests** for new functionality
3. **Run the full test suite**: `bun run test`
4. **Run linting**: `bun run lint`
5. **Update CHANGELOG.md** if applicable

### PR Checklist

- [ ] Tests pass locally
- [ ] Linting passes
- [ ] Documentation updated
- [ ] Commit messages follow convention
- [ ] PR description explains the change

### Review Process

1. Automated checks must pass
2. At least one maintainer review required
3. Address review feedback
4. Squash and merge when approved

## Architecture Guidelines

### File Organization

```
src/
├── app/          # Routes and pages
├── components/   # React components
│   ├── ui/       # shadcn/ui primitives
│   └── features/ # Feature-specific components
├── lib/          # Utilities and helpers
│   ├── db/       # Database layer
│   ├── actions/  # Server actions
│   └── utils/    # Pure utilities
└── types/        # TypeScript types
```

### Patterns

- **Server Components** by default, Client Components when needed
- **Zod** for all validation
- **Drizzle** for database operations
- **Server Actions** for mutations
- **API routes** for external integrations

### Database Changes

1. Modify schema in `src/lib/db/schema.ts`
2. Generate migration: `bun run db:generate`
3. Apply migration: `bun run db:push`
4. Update queries in `src/lib/db/queries/`

## Claude Code Development

When using Claude Code with this project:

### Commands

Use the built-in commands for consistent workflows:

- `/plan` before starting new features
- `/test` to verify changes
- `/review` before opening PRs

### Skills

Reference existing skills when implementing:

- `code-standards` for formatting
- `testing-patterns` for test structure
- `api-design` for endpoint conventions

### Subagents

Delegate specialized tasks:

- Use `tester` for comprehensive test coverage
- Use `reviewer` for security review
- Use `analyst` for performance analysis

## Reporting Issues

### Bug Reports

Include:
- Clear description
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Bun version, etc.)

### Feature Requests

Include:
- Problem statement
- Proposed solution
- Alternative approaches considered

## Questions?

- Open a [Discussion](https://github.com/yourusername/ai-native-boilerplate/discussions)
- Check existing issues and PRs
- Review documentation in `.claude/` directory

---

Thank you for contributing! 🎉
