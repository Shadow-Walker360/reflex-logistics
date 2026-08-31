/**
 * Foundational types shared across all domain types.
 *
 * PROVISIONAL: exact ID formats (UUID vs numeric) and pagination envelope
 * shape are assumed from common REST/NestJS conventions and have not been
 * confirmed against the actual backend contract. Once the backend exposes
 * an OpenAPI spec, these should be replaced/verified by generated types
 * (see Section 26 of the frontend spec and "Backend Dependencies" in
 * client/README.md).
 */

/** Opaque identifier. Branded loosely by usage via type aliases below. */
export type Id = string;

/** ISO-8601 timestamp string, as returned by the backend. */
export type IsoDateTime = string;

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}
