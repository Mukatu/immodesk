import { randomBytes } from 'node:crypto';

/**
 * Identifiants applicatifs : UUID v7 (RFC 9562) généré côté application.
 * Le SQL conserve `gen_random_uuid()` en valeur par défaut (v4) pour les
 * insertions faites hors application (seed SQL, back-office).
 *
 * Implémentation locale : le paquet `uuid` est ESM seul depuis la v12 et ne se
 * charge pas sous la build CommonJS ni sous Jest.
 */
const UUID_REGEX =
  /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|0{8}-0{4}-0{4}-0{4}-0{12}|f{8}-f{4}-f{4}-f{4}-f{12})$/i;

let lastMs = -1;
let lastSeq = 0;

export function newId(): string {
  let ms = Date.now();
  // Compteur de 12 bits (rand_a) : garantit l'ordre croissant au sein d'une même milliseconde.
  if (ms > lastMs) {
    lastMs = ms;
    lastSeq = randomBytes(2).readUInt16BE(0) & 0x7ff;
  } else {
    lastSeq += 1;
    if (lastSeq > 0xfff) {
      lastMs += 1;
      lastSeq = 0;
    }
    ms = lastMs;
  }

  const b = randomBytes(16);
  b.writeUIntBE(ms, 0, 6);
  b[6] = 0x70 | (lastSeq >> 8);
  b[7] = lastSeq & 0xff;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const h = b.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

/** Vrai si la valeur est un UUID quelconque ; la version n'est pas contrainte. */
export function uuidVersionOf(value: string): number | null {
  return isUuid(value) ? parseInt(value[14]!, 16) : null;
}

/**
 * Génère un jeton opaque cryptographiquement sûr, encodé en base64url.
 * Utilisé pour les refresh tokens et les jetons d'invitation.
 */
export function newOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}
