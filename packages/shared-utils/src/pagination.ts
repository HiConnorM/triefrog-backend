import type { PaginatedResponse } from '@triefrog/shared-types';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
}

/**
 * Parses and normalises pagination query parameters.
 * Returns `skip` and `take` values suitable for use with an ORM (e.g. Prisma).
 */
export function parsePagination(query: PaginationQuery): {
  skip: number;
  take: number;
  page: number;
  pageSize: number;
} {
  const page = Math.max(1, Math.floor(Number(query.page) || DEFAULT_PAGE));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.floor(Number(query.pageSize) || DEFAULT_PAGE_SIZE)),
  );

  return {
    skip: (page - 1) * pageSize,
    take: pageSize,
    page,
    pageSize,
  };
}

/**
 * Wraps a page of items in a standard PaginatedResponse envelope.
 */
export function buildPaginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedResponse<T> {
  return { items, total, page, pageSize };
}
