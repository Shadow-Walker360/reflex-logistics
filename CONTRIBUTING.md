# Contributing to Reflex Logistics

Thank you for your interest in contributing to Reflex Logistics, an intelligent delivery and dispatch platform for Kenyan retailers.

## Development Principles

### 1. Follow Documented Architecture
- Respect the established project structure and architectural boundaries.
- Refer to documentation in `/docs/architecture/` before making significant changes.
- Propose changes to architecture through Architecture Decision Records (ADRs) in `/docs/decisions/`.

### 2. Do Not Invent Requirements
- Validate requirements against project documentation and specifications.
- Ask for clarification when requirements are ambiguous.
- Do not implement features that are not documented in project planning materials.

### 3. Respect Team Areas
- Do not modify code in another team's area unnecessarily.
- Coordinate with the responsible team before making changes to shared components.
- Reference the CODEOWNERS file for area ownership information.

### 4. API Contracts and Integration
- Frontend must communicate with the backend through documented API contracts in `/docs/api/`.
- Frontend must never directly access the database.
- Backend owns business logic, validation, and authorization.
- Changes to API contracts require clear documentation and team approval.

### 5. Small, Reviewable Changes
- Prefer small, focused pull requests over large monolithic changes.
- Each PR should represent a logically complete unit of work.
- This enables better review, testing, and easier rollback if needed.

### 6. Database Changes
- Database schema changes must be documented and reviewed carefully.
- Migrations must be tested in development and staging environments.
- Reference the database architecture in `/docs/architecture/` and `/database/` for context.

### 7. Security-Sensitive Work
- Security-related changes require careful review and testing.
- Reference `/docs/security/` for security architecture and guidelines.
- Never commit secrets, credentials, or personal information to the repository.
- Use environment variables for sensitive configuration.

### 8. No Shortcuts on Authorization
- Do not bypass documented API contracts or authorization checks.
- Authorization logic belongs in the backend, not the frontend.
- Tenant isolation must be enforced at all layers.

## Pull Request Process

1. Create a feature branch with a descriptive name.
2. Make small, focused commits with clear messages.
3. Reference related issues or ADRs in your PR description.
4. Ensure your changes follow the principles listed above.
5. Address review feedback promptly.
6. Obtain approval from relevant team members before merging.

## Documentation

- Update relevant documentation when creating or modifying functionality.
- Create ADRs for significant architectural decisions.
- Keep API documentation synchronized with implementation.
- Document any new security considerations.

## Questions or Clarifications?

Ask in pull request discussions or reach out to the technical team. Ambiguity is better resolved upfront than discovered in review.
