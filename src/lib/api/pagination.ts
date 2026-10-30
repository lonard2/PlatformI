/**
 * PlatformI - Shared list pagination.
 *
 * List endpoints stay backward compatible: without page params the full
 * filtered list is returned (admin boards render unchanged). With params,
 * the slice is returned with page metadata. pageSize is capped so a
 * single request cannot balloon.
 *
 * Rules: Zero placeholder stubs, zero emojis, strict TypeScript typing (no 'any').
 */

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;

export interface PageRequest {
  page: number;
  /** Null when the caller passed no page params: return everything. */
  pageSize: number | null;
}

function toPositiveInt(raw: string | null, fallback: number): number {
  if (raw === null) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
}

export function readPageParams(url: string): PageRequest {
  const params = new URL(url).searchParams;
  const rawPage = params.get("page");
  const rawSize = params.get("pageSize");
  if (rawPage === null && rawSize === null) {
    return { page: 1, pageSize: null };
  }
  return {
    page: toPositiveInt(rawPage, 1),
    pageSize: Math.min(toPositiveInt(rawSize, DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE),
  };
}

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export function paginate<T>(items: T[], request: PageRequest): Page<T> {
  const total = items.length;
  if (request.pageSize === null) {
    return { items, page: 1, pageSize: total, total };
  }
  const start = (request.page - 1) * request.pageSize;
  return {
    items: items.slice(start, start + request.pageSize),
    page: request.page,
    pageSize: request.pageSize,
    total,
  };
}
