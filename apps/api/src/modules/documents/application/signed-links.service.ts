import { Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { AppConfigService } from '../../../shared/config/config.module';

const UUID_HEX = /^[0-9a-f]{32}$/;

function uuidToBytes(uuid: string): Buffer {
  return Buffer.from(uuid.replace(/-/g, ''), 'hex');
}

function bytesToUuid(bytes: Buffer): string {
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Liens COURTS et signés vers un document, pour les SMS de repli.
 *
 * Une URL signée S3 dépasse 500 caractères : impossible de la glisser dans
 * un SMS de deux segments. Le lien court porte l'organisation, le document
 * et une échéance (36 octets), signés HMAC-SHA256 tronqué à 96 bits ; il
 * pointe vers l'API, qui vérifie puis redirige vers une URL signée de dix
 * minutes. Le bucket reste privé, et la révocation reste possible côté API.
 *
 * Ce lien est distinct du jeton de vérification publique : scanner le QR
 * d'une quittance atteste, il ne donne jamais accès au PDF.
 */
@Injectable()
export class SignedLinksService {
  constructor(private readonly config: AppConfigService) {}

  shortLink(organizationId: string, documentId: string, ttlSeconds?: number): string {
    const ttl = ttlSeconds ?? this.config.get('DOCUMENT_LINK_TTL_SECONDS');
    const expiry = Buffer.alloc(4);
    expiry.writeUInt32BE(Math.floor(Date.now() / 1000) + ttl);
    const payload = Buffer.concat([
      uuidToBytes(organizationId),
      uuidToBytes(documentId),
      expiry,
    ]).toString('base64url');
    const base = this.config.get('PUBLIC_API_BASE_URL').replace(/\/+$/, '');
    return `${base}/${this.config.get('API_GLOBAL_PREFIX')}/public/d/${payload}.${this.sign(payload)}`;
  }

  verify(
    token: string,
    now: Date = new Date(),
  ): { organizationId: string; documentId: string } | null {
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return null;
    const expected = Buffer.from(this.sign(payload));
    const given = Buffer.from(signature);
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
    const bytes = Buffer.from(payload, 'base64url');
    if (bytes.length !== 36) return null;
    if (bytes.readUInt32BE(32) * 1000 < now.getTime()) return null;
    const organizationId = bytesToUuid(bytes.subarray(0, 16));
    const documentId = bytesToUuid(bytes.subarray(16, 32));
    if (
      !UUID_HEX.test(organizationId.replace(/-/g, '')) ||
      !UUID_HEX.test(documentId.replace(/-/g, ''))
    )
      return null;
    return { organizationId, documentId };
  }

  private sign(payload: string): string {
    return createHmac('sha256', this.config.get('LINK_SIGNING_SECRET'))
      .update(payload)
      .digest()
      .subarray(0, 12)
      .toString('base64url');
  }
}
