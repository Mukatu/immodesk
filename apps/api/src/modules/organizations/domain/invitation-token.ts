import { createHash } from 'node:crypto';
import { newOpaqueToken } from '../../../shared/ids/uuid';

/**
 * Jeton d'invitation : 32 octets aléatoires transmis par SMS. Seul son
 * condensat SHA-256 est stocké (`invitations.token_hash`, unique) : la
 * lecture de la table ne permet pas de fabriquer un lien d'acceptation.
 */
export function generateInvitationToken(): string {
  return newOpaqueToken(32);
}

export function hashInvitationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function invitationExpiresAt(now: Date, ttlDays: number): Date {
  return new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000);
}

export function buildInvitationLink(baseUrl: string, token: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/${token}`;
}
