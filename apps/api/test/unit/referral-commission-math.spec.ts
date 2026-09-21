import {
  computeCommissionAmount,
  computeReferralExpiry,
  periodMonthOf,
  splitByMonthlyCap,
} from '../../src/modules/referral/domain/commission-math';
import {
  generatePartnerCode,
  PARTNER_CODE_PATTERN,
} from '../../src/modules/referral/domain/referral-partner-code';

/**
 * Tests unitaires purs (`jest.unit.config.js`, aucun accès base) : calculs
 * de commission (docs/api/phase10-contract.md, § Apport d'affaires,
 * arbitrages 6 et 7) et génération du code partenaire.
 */
describe('computeCommissionAmount', () => {
  it('applique le taux en points de base, arrondi à l’unité XAF inférieure', () => {
    expect(computeCommissionAmount(10_000n, 2000)).toBe(2000n);
    // 12345 * 2000 / 10000 = 2469.0 -> 2469
    expect(computeCommissionAmount(12_345n, 2000)).toBe(2469n);
    // 12349 * 2000 / 10000 = 2469.8 -> arrondi INFÉRIEUR -> 2469
    expect(computeCommissionAmount(12_349n, 2000)).toBe(2469n);
  });

  it('rejette un montant négatif ou un taux hors bornes', () => {
    expect(() => computeCommissionAmount(-1n, 2000)).toThrow(RangeError);
    expect(() => computeCommissionAmount(1000n, -1)).toThrow(RangeError);
    expect(() => computeCommissionAmount(1000n, 10_001)).toThrow(RangeError);
  });
});

describe('computeReferralExpiry', () => {
  it('ajoute duration_months à qualified_at', () => {
    const qualifiedAt = new Date('2026-09-20T10:00:00.000Z');
    const expiry = computeReferralExpiry(qualifiedAt, 12);
    expect(expiry.toISOString()).toBe('2027-09-20T10:00:00.000Z');
  });
});

describe('periodMonthOf', () => {
  it('renvoie le premier jour du mois (UTC)', () => {
    expect(periodMonthOf(new Date('2026-09-20T23:59:00.000Z')).toISOString()).toBe(
      '2026-09-01T00:00:00.000Z',
    );
  });
});

describe('splitByMonthlyCap (arbitrage 6 : l’excédent reste ACCRUED, se reporte)', () => {
  it('sans plafond (null), tout est approuvable', () => {
    expect(splitByMonthlyCap(5000n, 0n, null)).toEqual({ approvable: 5000n, heldByCap: 0n });
  });

  it('tient entièrement dans le plafond restant', () => {
    expect(splitByMonthlyCap(3000n, 5000n, 10_000n)).toEqual({ approvable: 3000n, heldByCap: 0n });
  });

  it('dépasse totalement le plafond déjà atteint : tout retenu', () => {
    expect(splitByMonthlyCap(3000n, 10_000n, 10_000n)).toEqual({
      approvable: 0n,
      heldByCap: 3000n,
    });
  });

  it('dépasse partiellement : approuve le reliquat, retient l’excédent', () => {
    expect(splitByMonthlyCap(5000n, 8000n, 10_000n)).toEqual({
      approvable: 2000n,
      heldByCap: 3000n,
    });
  });
});

describe('generatePartnerCode', () => {
  it('respecte le format `IMD-XXXXXX` imposé par referral_partners_code_chk', () => {
    for (let i = 0; i < 50; i += 1) {
      expect(generatePartnerCode()).toMatch(PARTNER_CODE_PATTERN);
    }
  });

  it('exclut les caractères ambigus (0, O, 1, I, L)', () => {
    for (let i = 0; i < 50; i += 1) {
      const code = generatePartnerCode();
      expect(code.slice(4)).not.toMatch(/[01IOL]/);
    }
  });
});
