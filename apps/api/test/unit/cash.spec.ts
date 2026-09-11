import { createHash } from 'node:crypto';
import { DomainError } from '../../src/shared/errors/domain-error';
import {
  assertRemittanceTransition,
  holdingCap,
  isOverCap,
  MAX_SIGNATURE_BYTES,
  parseSignatureDataUrl,
  REMITTANCE_STATUSES,
  REMITTANCE_TRANSITIONS,
  varianceOf,
} from '../../src/modules/cash/domain/cash-rules';

/** PNG 1×1 transparent, octets exacts. */
export const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

describe('Espèces — signature, remises, encours', () => {
  it('décode une signature PNG et calcule son empreinte SHA-256', () => {
    const parsed = parseSignatureDataUrl(`data:image/png;base64,${TINY_PNG_BASE64}`);
    const expected = createHash('sha256')
      .update(Buffer.from(TINY_PNG_BASE64, 'base64'))
      .digest('hex');
    expect(parsed.sha256).toBe(expected);
    expect(parsed.body.byteLength).toBeGreaterThan(8);
  });

  it('refuse un format, un contenu ou une taille non conformes', () => {
    expect(() => parseSignatureDataUrl('data:image/jpeg;base64,AAAA')).toThrow(DomainError);
    const notPng = Buffer.from('ceci n’est pas une image').toString('base64');
    expect(() => parseSignatureDataUrl(`data:image/png;base64,${notPng}`)).toThrow(DomainError);
    const tooBig = Buffer.alloc(MAX_SIGNATURE_BYTES + 1, 1).toString('base64');
    expect(() => parseSignatureDataUrl(`data:image/png;base64,${tooBig}`)).toThrow(DomainError);
  });

  it('éprouve les 36 couples de la machine à états des remises', () => {
    for (const from of REMITTANCE_STATUSES) {
      for (const to of REMITTANCE_STATUSES) {
        const allowed = REMITTANCE_TRANSITIONS[from].includes(to);
        if (allowed) expect(() => assertRemittanceTransition(from, to)).not.toThrow();
        else expect(() => assertRemittanceTransition(from, to)).toThrow(DomainError);
      }
    }
  });

  it('calcule l’écart et le dépassement de plafond', () => {
    expect(varianceOf(720_000n, 750_000n)).toBe(-30_000n);
    expect(varianceOf(760_000n, 750_000n)).toBe(10_000n);
    expect(holdingCap(0n, 500_000n)).toBe(500_000n);
    expect(holdingCap(200_000n, 500_000n)).toBe(200_000n);
    expect(isOverCap(500_001n, 500_000n)).toBe(true);
    expect(isOverCap(500_000n, 500_000n)).toBe(false);
    expect(isOverCap(9_999_999n, 0n)).toBe(false);
  });
});
