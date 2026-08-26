# Reflex Database

This directory contains the Reflex database schema, migrations, seed data, and database-related documentation.

## Database Responsibility

The database is responsible for persistent application data including:

- Users
- Tenants
- Customers
- Retailers
- Deliveries
- Delivery status events
- Riders
- Vehicles
- Assignments
- Locations
- Payments
- Agreements
- Incidents
- Audit records

## Database Technology

Expected direction:

- PostgreSQL
- Prisma ORM

## Design Principles

The database design must support:

- Data integrity
- Referential integrity
- Transactional consistency
- Tenant isolation
- Auditability
- Concurrent operations
- Reliable state transitions

## Documentation

The Entity Relationship Diagram (ERD) will be maintained under:

`/docs/architecture/`

Database-specific decisions will be recorded under:

`/docs/decisions/`

## Important

Application code must not bypass the backend to access the database directly.

Client → Backend → Database
