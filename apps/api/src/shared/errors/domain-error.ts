import { ERROR_CATALOG, type ErrorCode } from './error-codes';

export type ErrorDetails = Record<string, unknown>;

/**
 * Erreur métier transportant un code stable du catalogue.
 *
 * Elle est traduite en réponse HTTP `{ code, message, details }` par
 * `DomainExceptionFilter`. Aucune couche `domain/` ou `application/` ne
 * manipule de statut HTTP directement : elle lève une `DomainError`.
 */
export class DomainError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: ErrorDetails;

  constructor(code: ErrorCode, details?: ErrorDetails, message?: string) {
    const entry = ERROR_CATALOG[code];
    super(message ?? entry.message);
    this.name = 'DomainError';
    this.code = code;
    this.status = entry.status;
    this.details = details;
    Object.setPrototypeOf(this, DomainError.prototype);
  }

  toJSON(): { code: ErrorCode; message: string; details: ErrorDetails } {
    return { code: this.code, message: this.message, details: this.details ?? {} };
  }
}

/**
 * Toute ressource appartenant à une autre organisation doit se comporter
 * comme inexistante : 404, jamais 403 (docs/api/phase0-contract.md).
 */
export function notFound(resource: string, id?: string): DomainError {
  return new DomainError('PLATFORM.NOT_FOUND', { resource, id }, 'Ressource introuvable.');
}
