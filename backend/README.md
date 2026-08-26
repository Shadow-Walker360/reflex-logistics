# Reflex Backend

This directory contains the Reflex backend application and server-side business logic.

## Responsibility

The backend is responsible for:

- Authentication
- Authorization
- Tenant isolation
- Delivery management
- Dispatch and assignment
- Rider management
- Delivery status transitions
- Payment workflows
- Notifications
- Real-time communication
- Validation
- Business rules
- API endpoints
- Integration with external services

## Technology

Expected direction:

- NestJS
- TypeScript
- PostgreSQL
- Prisma
- Redis
- BullMQ
- Socket.IO

Final technology decisions are documented in:

`/docs/decisions/`

## Architecture

The backend communicates with the database through the application's data-access layer.

Client → API → Business Logic → Database

The backend is the authority for business rules and state transitions.

## Development

Backend-specific setup instructions will be added when the application is initialized.
