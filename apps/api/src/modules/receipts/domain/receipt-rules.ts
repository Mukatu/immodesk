import { createHash, randomBytes } from 'node:crypto';

/**
 * Jeton de vérification d'une quittance : 128 bits aléatoires en hexadécimal
 * (32 caractères), unique en base (`receipts_token_uk`).
 *
 * Aléatoire plutôt que signé : il n'encode rien et ne peut donc rien révéler,
 * sa seule propriété utile est d'être imprévisible. Un jeton altéré d'un
 * caractère ne correspond à aucune ligne et produit un 404.
 */
export function newVerificationToken(): string {
  return randomBytes(16).toString('hex');
}

export function isVerificationTokenShape(token: string): boolean {
  return /^[0-9a-f]{32}$/.test(token);
}

/** URL imprimée dans le QR et envoyée par SMS : `{PUBLIC_WEB_BASE_URL}/verifier/{token}`. */
export function verificationUrlOf(publicWebBaseUrl: string, token: string): string {
  return `${publicWebBaseUrl.replace(/\/+$/, '')}/verifier/${token}`;
}

export interface ReceiptContent {
  receiptNumber: string;
  organizationId: string;
  tenantId: string;
  paymentId: string;
  invoiceId: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  rentAmount: bigint;
  chargesAmount: bigint;
  penaltyAmount: bigint;
  totalAmount: bigint;
}

/**
 * Empreinte des données quittancées (`receipts.content_hash`), verrouillée
 * par `guard_financial_row` : un ordre de clés figé et des montants en
 * chaîne, pour qu'un recalcul donne toujours le même résultat.
 */
export function receiptContentHash(content: ReceiptContent): string {
  const canonical = JSON.stringify([
    content.receiptNumber,
    content.organizationId,
    content.tenantId,
    content.paymentId,
    content.invoiceId,
    content.periodStart,
    content.periodEnd,
    content.rentAmount.toString(),
    content.chargesAmount.toString(),
    content.penaltyAmount.toString(),
    content.totalAmount.toString(),
  ]);
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}
