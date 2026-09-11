import { createHash } from 'node:crypto';
import { DomainError } from '../../../shared/errors/domain-error';

/** Plafond d'une signature capturée à l'écran (docs/02_architecture_technique.md, § 8.1). */
export const MAX_SIGNATURE_BYTES = 512 * 1024;

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export interface ParsedSignature {
  body: Buffer;
  /** SHA-256 hexadécimal : colonne `cash_receipts.signature_hash`. */
  sha256: string;
}

/**
 * Décode une signature `data:image/png;base64,...`.
 *
 * On vérifie la signature binaire PNG et non le seul préfixe déclaré : un
 * client pourrait sinon faire stocker n'importe quel contenu sous couvert
 * d'une image. L'empreinte est calculée sur les octets décodés — c'est elle
 * qui rend toute altération ultérieure du fichier détectable.
 */
export function parseSignatureDataUrl(dataUrl: string): ParsedSignature {
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl.trim());
  if (!match) throw new DomainError('CASH.SIGNATURE_INVALID', { reason: 'FORMAT' });
  const body = Buffer.from(match[1].replace(/\s+/g, ''), 'base64');
  if (body.byteLength === 0 || body.byteLength > MAX_SIGNATURE_BYTES) {
    throw new DomainError('CASH.SIGNATURE_INVALID', {
      reason: 'SIZE',
      maxBytes: MAX_SIGNATURE_BYTES,
    });
  }
  if (!body.subarray(0, PNG_MAGIC.length).equals(PNG_MAGIC)) {
    throw new DomainError('CASH.SIGNATURE_INVALID', { reason: 'NOT_PNG' });
  }
  return { body, sha256: createHash('sha256').update(body).digest('hex') };
}

/** Énumération SQL `remittance_status`. */
export const REMITTANCE_STATUSES = [
  'OPEN',
  'SUBMITTED',
  'VERIFIED',
  'DEPOSITED',
  'REJECTED',
  'CANCELLED',
] as const;
export type RemittanceStatus = (typeof REMITTANCE_STATUSES)[number];

/**
 * Cycle d'une remise d'espèces : brouillon (OPEN) → soumise → contrôlée
 * (VERIFIED, même avec écart : l'écart est enregistré, jamais absorbé) →
 * déposée en banque. Une remise soumise peut être rejetée : ses reçus
 * redeviennent disponibles pour une nouvelle remise.
 */
export const REMITTANCE_TRANSITIONS: Readonly<
  Record<RemittanceStatus, readonly RemittanceStatus[]>
> = {
  OPEN: ['SUBMITTED', 'REJECTED', 'CANCELLED'],
  SUBMITTED: ['VERIFIED', 'REJECTED'],
  VERIFIED: ['DEPOSITED'],
  DEPOSITED: [],
  REJECTED: [],
  CANCELLED: [],
};

export function assertRemittanceTransition(from: RemittanceStatus, to: RemittanceStatus): void {
  if (!REMITTANCE_TRANSITIONS[from].includes(to)) {
    throw new DomainError('CASH.REMITTANCE_INVALID_TRANSITION', { from, to });
  }
}

/** Écart de caisse : compté − attendu. Négatif = manquant, positif = excédent. */
export function varianceOf(countedAmount: bigint, expectedAmount: bigint): bigint {
  return countedAmount - expectedAmount;
}

/**
 * Plafond d'encours d'un démarcheur : celui de son adhésion s'il est fixé
 * (`organization_members.cash_limit_amount`, 0 = non fixé), sinon celui de
 * l'organisation. Au-delà : alerte, jamais de blocage (contrat).
 */
export function holdingCap(memberLimit: bigint, organizationCap: bigint): bigint {
  return memberLimit > 0n ? memberLimit : organizationCap;
}

export function isOverCap(heldAmount: bigint, cap: bigint): boolean {
  return cap > 0n && heldAmount > cap;
}
