import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

/** Comparaison en temps constant de deux chaînes (signatures, jetons). */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Clé d'idempotence par défaut d'un webhook sans `event_id` fourni : SHA-256 du corps brut. */
export function webhookBodyHash(rawBody: Buffer): string {
  return createHash('sha256').update(rawBody).digest('hex');
}

/** Signature HMAC-SHA256 simple du corps brut, comparaison en temps constant. */
export function signHmac(rawBody: Buffer | string, secret: string): string {
  return createHmac('sha256', secret).update(rawBody).digest('hex');
}

export function verifyHmacSignature(
  rawBody: Buffer,
  header: string | undefined,
  secret: string,
): boolean {
  if (!header) return false;
  const candidate = header.startsWith('sha256=') ? header.slice('sha256='.length) : header;
  return safeEqual(candidate, signHmac(rawBody, secret));
}
