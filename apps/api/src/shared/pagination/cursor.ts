import { createHmac, timingSafeEqual } from 'node:crypto';
import { DomainError } from '../errors/domain-error';

export const DEFAULT_PAGE_LIMIT = 50;
export const MAX_PAGE_LIMIT = 100;

/** Position stable d'un curseur : (createdAt, id). Jamais un OFFSET. */
export interface CursorPayload {
  createdAt: string;
  id: string;
}

export interface PageInfo {
  nextCursor: string | null;
  hasNextPage: boolean;
  limit: number;
}

export interface Page<T> {
  items: T[];
  pageInfo: PageInfo;
}

/**
 * Encode un curseur opaque, signé par HMAC pour empêcher de forger une
 * position (et donc de tenter un saut d'organisation).
 */
export function encodeCursor(payload: CursorPayload, secret: string): string {
  const raw = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = sign(raw, secret);
  return `${raw}.${signature}`;
}

export function decodeCursor(cursor: string, secret: string): CursorPayload {
  const parts = cursor.split('.');
  if (parts.length !== 2) {
    throw new DomainError('VALIDATION.INVALID_PAYLOAD', { cursor: 'Curseur illisible.' });
  }
  const [raw, signature] = parts;
  const expected = sign(raw, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new DomainError('VALIDATION.INVALID_PAYLOAD', {
      cursor: 'Signature de curseur invalide.',
    });
  }
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as CursorPayload;
    if (typeof parsed?.createdAt !== 'string' || typeof parsed?.id !== 'string') {
      throw new Error('shape');
    }
    return parsed;
  } catch {
    throw new DomainError('VALIDATION.INVALID_PAYLOAD', { cursor: 'Curseur illisible.' });
  }
}

export function clampLimit(limit: number | undefined, max = MAX_PAGE_LIMIT): number {
  if (limit === undefined || Number.isNaN(limit)) return DEFAULT_PAGE_LIMIT;
  const asInt = Math.trunc(limit);
  if (asInt < 1) return 1;
  return Math.min(asInt, max);
}

/**
 * Construit une page à partir de `limit + 1` lignes lues : la ligne
 * excédentaire indique seulement l'existence d'une page suivante.
 */
export function buildPage<T extends { id: string; created_at: Date }>(
  rows: T[],
  limit: number,
  secret: string,
): Page<T> {
  const hasNextPage = rows.length > limit;
  const items = hasNextPage ? rows.slice(0, limit) : rows;
  const last = items.at(-1);
  return {
    items,
    pageInfo: {
      nextCursor:
        hasNextPage && last
          ? encodeCursor({ createdAt: last.created_at.toISOString(), id: last.id }, secret)
          : null,
      hasNextPage,
      limit,
    },
  };
}

function sign(raw: string, secret: string): string {
  return createHmac('sha256', secret).update(raw).digest('base64url');
}
