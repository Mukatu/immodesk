import { DomainError } from '../../src/shared/errors/domain-error';
import {
  assertAmountInRange,
  assertMomoTransition,
  computeFee,
  detectOperator,
  MOMO_TRANSITIONS,
  normalizeOperatorReference,
  quoteMomo,
} from '../../src/modules/mobile-money/domain/momo-rules';
import { isDueForRecheck, isExpired } from '../../src/modules/mobile-money/domain/reconcile-rules';
import {
  signHmac,
  verifyHmacSignature,
  webhookBodyHash,
} from '../../src/modules/mobile-money/domain/webhook-signature';

describe('Détection de l’opérateur Mobile Money', () => {
  it('reconnaît MTN au préfixe national 06', () => {
    expect(detectOperator('+242066000001')).toBe('MTN');
  });

  it('reconnaît Airtel au préfixe national 05', () => {
    expect(detectOperator('+242055000001')).toBe('AIRTEL');
  });

  it('rejette tout autre préfixe', () => {
    expect(detectOperator('+242044000001')).toBeNull();
  });

  it('rejette un numéro hors Congo-Brazzaville', () => {
    expect(detectOperator('+33612345678')).toBeNull();
  });
});

describe('Calcul des frais Mobile Money selon le porteur', () => {
  it('arrondit les frais au plus proche entier XAF (round half up)', () => {
    expect(computeFee(100_000n, 300)).toBe(3_000n);
    expect(computeFee(333n, 300)).toBe(10n); // 9.99 -> 10
  });

  it('feeBearer TENANT : le locataire paie le loyer plus les frais, l’organisation reçoit le loyer', () => {
    const quote = quoteMomo(100_000n, 300, 'TENANT');
    expect(quote).toEqual({
      amount: 100_000n,
      feeAmount: 3_000n,
      totalDebited: 103_000n,
      netReceived: 100_000n,
      feeBearer: 'TENANT',
    });
  });

  it('feeBearer ORGANIZATION : le locataire ne paie que le loyer, l’organisation encaisse le net', () => {
    const quote = quoteMomo(100_000n, 300, 'ORGANIZATION');
    expect(quote).toEqual({
      amount: 100_000n,
      feeAmount: 3_000n,
      totalDebited: 100_000n,
      netReceived: 97_000n,
      feeBearer: 'ORGANIZATION',
    });
  });

  it('l’imputation porte toujours sur le montant du loyer, jamais sur le net', () => {
    const quote = quoteMomo(50_000n, 500, 'TENANT');
    expect(quote.amount).toBe(50_000n);
  });

  it('borne un montant hors plage autorisée', () => {
    expect(() => assertAmountInRange(400n, 500, 2_000_000)).toThrow(DomainError);
    expect(() => assertAmountInRange(3_000_000n, 500, 2_000_000)).toThrow(DomainError);
    expect(() => assertAmountInRange(500_000n, 500, 2_000_000)).not.toThrow();
  });

  it('normalise une référence opérateur (majuscules, espaces retirés)', () => {
    expect(normalizeOperatorReference(' mp260911.1234.a56789 ')).toBe('MP260911.1234.A56789');
  });
});

describe('Machine à états d’une transaction Mobile Money', () => {
  it('DECLARED peut aboutir à SUCCEEDED, REJECTED ou CANCELLED, jamais à INITIATED', () => {
    expect(() => assertMomoTransition('DECLARED', 'SUCCEEDED')).not.toThrow();
    expect(() => assertMomoTransition('DECLARED', 'REJECTED')).not.toThrow();
    expect(() => assertMomoTransition('DECLARED', 'CANCELLED')).not.toThrow();
    expect(() => assertMomoTransition('DECLARED', 'INITIATED')).toThrow(DomainError);
  });

  it('INITIATED (agrégateur) ne mène qu’à PENDING ou FAILED', () => {
    expect(() => assertMomoTransition('INITIATED', 'PENDING')).not.toThrow();
    expect(() => assertMomoTransition('INITIATED', 'FAILED')).not.toThrow();
    expect(() => assertMomoTransition('INITIATED', 'SUCCEEDED')).toThrow(DomainError);
  });

  it('PENDING mène à SUCCEEDED, FAILED ou EXPIRED', () => {
    expect(() => assertMomoTransition('PENDING', 'SUCCEEDED')).not.toThrow();
    expect(() => assertMomoTransition('PENDING', 'EXPIRED')).not.toThrow();
    expect(() => assertMomoTransition('PENDING', 'DECLARED')).toThrow(DomainError);
  });

  it('les statuts terminaux (hors SUCCEEDED) n’admettent aucune transition', () => {
    for (const terminal of ['FAILED', 'EXPIRED', 'CANCELLED', 'REJECTED', 'REFUNDED'] as const) {
      expect(MOMO_TRANSITIONS[terminal]).toEqual([]);
    }
  });
});

describe('Rattrapage des transactions en attente', () => {
  const initiated = new Date('2026-09-14T08:00:00Z');

  it('n’est pas due avant le premier palier (3 minutes)', () => {
    const now = new Date('2026-09-14T08:02:00Z');
    expect(isDueForRecheck(null, initiated, 0, now)).toBe(false);
  });

  it('est due une fois le palier atteint', () => {
    const now = new Date('2026-09-14T08:03:30Z');
    expect(isDueForRecheck(null, initiated, 0, now)).toBe(true);
  });

  it('respecte le repli croissant après plusieurs tentatives', () => {
    const lastChecked = new Date('2026-09-14T08:10:00Z');
    expect(isDueForRecheck(lastChecked, initiated, 2, new Date('2026-09-14T08:15:00Z'))).toBe(
      false,
    );
    expect(isDueForRecheck(lastChecked, initiated, 2, new Date('2026-09-14T08:20:00Z'))).toBe(true);
  });

  it('expire au-delà de la fenêtre paramétrée', () => {
    expect(isExpired(initiated, new Date('2026-09-14T09:00:00Z'), 120)).toBe(false);
    expect(isExpired(initiated, new Date('2026-09-14T10:30:00Z'), 120)).toBe(true);
  });
});

describe('Vérification de signature de webhook', () => {
  const secret = 'test-secret-momo';
  const body = Buffer.from(
    JSON.stringify({ merchantReference: 'MMA-202609-00001', status: 'SUCCEEDED' }),
  );

  it('accepte une signature HMAC valide', () => {
    const signature = signHmac(body, secret);
    expect(verifyHmacSignature(body, signature, secret)).toBe(true);
  });

  it('rejette une signature invalide', () => {
    expect(verifyHmacSignature(body, 'deadbeef', secret)).toBe(false);
  });

  it('rejette une signature absente', () => {
    expect(verifyHmacSignature(body, undefined, secret)).toBe(false);
  });

  it('rejette une signature calculée avec un autre secret', () => {
    const signature = signHmac(body, 'un-autre-secret');
    expect(verifyHmacSignature(body, signature, secret)).toBe(false);
  });

  it('accepte le préfixe sha256= (compatibilité webhooks signés à la Meta)', () => {
    const signature = signHmac(body, secret);
    expect(verifyHmacSignature(body, `sha256=${signature}`, secret)).toBe(true);
  });

  it('calcule une empreinte stable du corps brut (idempotence sans event_id fourni)', () => {
    expect(webhookBodyHash(body)).toBe(webhookBodyHash(Buffer.from(body)));
  });
});
