import { createHash } from 'node:crypto';
import { newOpaqueToken } from '../../../shared/ids/uuid';

/**
 * Un refresh token est une valeur opaque de 32 octets. Seul son condensat
 * SHA-256 est stocké (`refresh_tokens.token_hash`, unique) : une fuite de la
 * table ne permet pas de rejouer une session.
 */
export function generateRefreshToken(): string {
  return newOpaqueToken(32);
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function refreshExpiresAt(now: Date, ttlDays: number): Date {
  return new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000);
}

export interface RefreshTokenSnapshot {
  id: string;
  userId: string;
  familyId: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

/**
 * Décision de rotation, sans effet de bord.
 *
 * `REUSE_DETECTED` correspond à la présentation d'un jeton déjà révoqué :
 * signe d'un vol de session. La réaction est la révocation de TOUTE la
 * famille (l'appareil est déconnecté) et un 401 `IAM.REFRESH_REVOKED`.
 */
export type RotationVerdict =
  | { outcome: 'ROTATE'; familyId: string }
  | { outcome: 'NOT_FOUND' }
  | { outcome: 'EXPIRED'; familyId: string }
  | { outcome: 'REUSE_DETECTED'; familyId: string };

export function decideRotation(record: RefreshTokenSnapshot | null, now: Date): RotationVerdict {
  if (!record) return { outcome: 'NOT_FOUND' };
  if (record.revokedAt !== null) {
    return { outcome: 'REUSE_DETECTED', familyId: record.familyId };
  }
  if (record.expiresAt.getTime() <= now.getTime()) {
    return { outcome: 'EXPIRED', familyId: record.familyId };
  }
  return { outcome: 'ROTATE', familyId: record.familyId };
}
