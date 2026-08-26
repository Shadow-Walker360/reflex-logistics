# Copilot Instructions for Reflex Logistics

This document provides guidance for AI-assisted development on the Reflex Logistics project.

## Project Overview

Reflex Logistics is an intelligent delivery and dispatch platform designed for Kenyan retailers. The system connects retailers, dispatchers, riders, and customers through a coordinated platform for delivery management, dispatch, tracking, and payments.

The project is currently in the repository and architecture preparation phase. Specific implementation details will be added as the project progresses.

## Repository Structure

- **client/**: Frontend application containing interfaces for retailers, dispatchers, riders, customers, and administrative users.
- **backend/**: Backend API and server-side business logic including authentication, authorization, tenant isolation, delivery management, dispatch, assignment, and payment workflows.
- **database/**: Database schema, Prisma configuration, migrations, and database-specific documentation.
- **docs/**: Project documentation including architecture, API contracts, security, and architectural decisions.
  - **architecture/**: System and technical architecture documentation.
  - **api/**: API contracts and endpoint specifications.
  - **security/**: Security architecture and implementation guidelines.
  - **decisions/**: Architecture Decision Records (ADRs).
- **infrastructure/**: Infrastructure and deployment configuration.
- **.github/**: GitHub-specific workflows and governance.

## Core Principles

### 1. Follow Documented Architecture
- Respect the established project structure and architectural boundaries.
- Refer to documentation in `/docs/architecture/` before making significant changes.
- Propose architectural changes through Architecture Decision Records in `/docs/decisions/`.

### 2. Do Not Invent Requirements
- Base all work on documented project specifications and requirements.
- Ask for clarification when requirements are ambiguous or unclear.
- Do not implement features that are not present in project documentation.
- Reference project planning materials, ADRs, and specifications before proceeding.

### 3. No Undocumented Architectural Decisions
- Make architectural decisions with careful consideration of alternatives.
- Document all significant technical decisions as Architecture Decision Records.
- Include problem statement, alternatives considered, decision rationale, and trade-offs.
- Obtain team consensus before implementing major architectural changes.

### 4. Respect Team Areas
- Do not modify code in another team's area unnecessarily.
- Coordinate with the responsible team before making changes to shared components.
- Refer to CODEOWNERS for area ownership and required reviewers.
- Frontend: Tedde Adams, Sylvia Achieng
- Backend: Tiffany Kariuki
- Overall: Collins Joshua (Technical Lead)

### 5. API Contracts and Integration Boundaries
- Frontend must communicate with the backend exclusively through documented API contracts in `/docs/api/`.
- Frontend must never directly access the database.
- Backend owns all business logic, validation, authorization, and enforcement.
- Changes to API contracts require documentation updates and team review.
- Do not silently change API behavior or contracts.

### 6. Security and Secrets
- Never expose secrets, credentials, API keys, or personal information in code or documentation.
- Never commit secrets to source control.
- Use environment variables for sensitive configuration.
- Reference `/docs/security/` for security architecture and best practices.
- Implement proper authentication, authorization, and tenant isolation.
- Tenant isolation must be enforced at all layers (API, application, database).

### 7. Database Design and Access
- All database access must pass through backend APIs.
- Database schema must support data integrity, referential integrity, and tenant isolation.
- Database changes must be documented and reviewed carefully.
- Use Prisma for schema management and migrations.
- Implement Row-Level Security (RLS) for tenant isolation at the database layer.

### 8. Prefer Small, Reviewable Changes
- Create small, focused pull requests representing logically complete units of work.
- Prefer incremental progress over monolithic changes.
- Small changes enable better review, testing, and easier rollback.
- Each commit should have a clear, descriptive message.

### 9. No API Contract Bypasses
- Do not bypass documented API contracts or authorization checks.
- Do not implement business logic that conflicts with backend validation.
- Enforce authorization at the backend layer, not the frontend.
- Frontend should trust but verify backend responses through proper error handling.

## Development Guidelines

### When Starting Work

1. Check `/docs/` for relevant documentation and architectural guidance.
2. Verify requirements are documented in project planning materials or ADRs.
3. Identify the appropriate team area (client/, backend/, database/, docs/, infrastructure/).
4. If making an architectural decision, check if an ADR exists or create one.
5. Coordinate with relevant team members before starting work.

### During Development

- Follow the established directory structure and naming conventions.
- Reference API contracts when implementing client-server communication.
- Document security considerations for sensitive features.
- Write clear, descriptive commit messages.
- Make changes incrementally and avoid large monolithic PRs.

### Before Submitting Changes

- Verify changes align with documented architecture and requirements.
- Ensure API contracts are respected (if applicable).
- Check that no secrets or credentials are exposed.
- Update documentation if architecture or API contracts have changed.
- Create or update ADRs for significant architectural decisions.

## Anti-Patterns to Avoid

- ❌ Inventing technologies, frameworks, or architecture without documentation.
- ❌ Implementing features not present in project documentation.
- ❌ Committing secrets, credentials, or personal information.
- ❌ Frontend directly accessing the database.
- ❌ Making architectural decisions without documenting alternatives and reasoning.
- ❌ Silently changing API contracts or behavior.
- ❌ Modifying another team's code area unnecessarily.
- ❌ Large, monolithic pull requests that are difficult to review.
- ❌ Bypassing documented authorization or validation logic.
- ❌ Adding frameworks (React, Vite, NestJS, Prisma, etc.) during repository initialization.

## When in Doubt

Ask clarifying questions:
- Is this requirement documented in project specifications?
- Does this architectural decision align with the documented architecture?
- Who is the owner of the code area I'm modifying?
- Should this be an API contract change or implementation detail?
- Is there an existing ADR that addresses this decision?
- Does this affect tenant isolation or security?

Clear communication prevents rework and ensures team alignment.

## References

- Project documentation: `/docs/`
- Architecture: `/docs/architecture/`
- API contracts: `/docs/api/`
- Security guidelines: `/docs/security/`
- Architectural decisions: `/docs/decisions/`
- Contribution guidelines: `/CONTRIBUTING.md`
- Security policy: `/SECURITY.md`
