import type { ApiErrorBody } from '@/lib/api/types';

/** Erreur applicative normalisée : reflète le format { code, message, details } du contrat. */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiError';
    this.code = body.code;
    this.status = status;
    this.details = body.details;
  }
}

/** Messages fr-CG de secours si l'API ne renvoie pas de message exploitable. */
export const genericErrorMessage = 'Une erreur est survenue. Veuillez réessayer.';

export function toApiError(status: number, payload: unknown): ApiError {
  if (
    payload &&
    typeof payload === 'object' &&
    'code' in payload &&
    'message' in payload &&
    typeof (payload as Record<string, unknown>).code === 'string' &&
    typeof (payload as Record<string, unknown>).message === 'string'
  ) {
    return new ApiError(status, payload as ApiErrorBody);
  }
  return new ApiError(status, { code: 'HTTP.UNKNOWN', message: genericErrorMessage });
}
