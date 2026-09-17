import { DomainError } from '../../src/shared/errors/domain-error';
import { monthBounds } from '../../src/shared/time/business-date';
import {
  assertCancellable,
  assertIssuable,
  assertPayable,
  assertSendable,
  computeCollectionRateBps,
  computeNetPayable,
  previousMonthPeriod,
} from '../../src/modules/owner-statements/domain/owner-statement-rules';

describe('Solde net à reverser (netPayableAmount)', () => {
  it('= loyers + charges encaissés − commission − TVA commission − dépenses, sans report', () => {
    // 500 000 loyers + 20 000 charges − 50 000 commission − 9 625 TVA − 30 000 dépenses.
    const net = computeNetPayable(500_000n, 20_000n, 50_000n, 9_625n, 30_000n, 0n);
    expect(net).toBe(430_375n);
  });

  it('peut devenir négatif quand les dépenses dépassent l’encaissé : le solde se reporte', () => {
    // 100 000 encaissés, 0 charges, 15 000 commission, 0 TVA, 200 000 de dépenses.
    const net = computeNetPayable(100_000n, 0n, 15_000n, 0n, 200_000n, 0n);
    expect(net).toBe(-115_000n);
    // Ce solde négatif est le `carry_forward_amount` de la PROCHAINE période
    // (contrat, arbitrage n°5) : déjà signé négatif, jamais stocké positif.
    expect(net < 0n).toBe(true);
  });

  it('un report négatif du mois précédent s’ajoute en déduction du net courant', () => {
    // Le mois précédent a laissé -115 000 à reporter ; ce mois-ci, 300 000
    // encaissés, 30 000 de commission, 5 775 de TVA, 0 dépense.
    const carryForwardAmount = -115_000n;
    const net = computeNetPayable(300_000n, 0n, 30_000n, 5_775n, 0n, carryForwardAmount);
    // 300 000 − 30 000 − 5 775 + (−115 000) = 149 225.
    expect(net).toBe(149_225n);
    // Vérifie que le report a bien été RETRANCHÉ, pas ignoré ni ajouté positivement.
    const withoutCarryForward = computeNetPayable(300_000n, 0n, 30_000n, 5_775n, 0n, 0n);
    expect(net).toBe(withoutCarryForward + carryForwardAmount);
  });

  it('un report positif ne se produit jamais : le report reste toujours ≤ 0 en entrée', () => {
    // La fonction elle-même est agnostique du signe, mais le contrat n'utilise
    // jamais un report positif (uniquement un solde négatif reporté).
    const net = computeNetPayable(0n, 0n, 0n, 0n, 0n, -1n);
    expect(net).toBe(-1n);
  });
});

describe('Taux de recouvrement (encaissé / appelé)', () => {
  it('calcule le ratio en points de base', () => {
    expect(computeCollectionRateBps(750_000n, 1_000_000n)).toBe(7_500);
  });

  it('plafonne à 10 000 bps quand l’encaissé dépasse le dû (avance, régularisation)', () => {
    expect(computeCollectionRateBps(1_200_000n, 1_000_000n)).toBe(10_000);
  });

  it('renvoie null quand rien n’était dû', () => {
    expect(computeCollectionRateBps(0n, 0n)).toBeNull();
    expect(computeCollectionRateBps(50_000n, -1n)).toBeNull();
  });
});

describe('Bornes du mois civil précédent', () => {
  // `previousMonthPeriod` reçoit la date métier en paramètre (elle ne lit pas
  // l'horloge) : la date du jour ne sert ici qu'à fabriquer le jeu d'essai,
  // elle est donc ancrée sur une date fixe et arbitraire (15 juin 2026, en
  // milieu de mois, hors bascule d'année ou de mois court).
  it('renvoie le mois civil qui précède la date métier fournie', () => {
    const today = new Date(Date.UTC(2026, 5, 15));
    const expectedBounds = monthBounds('2026-05');

    const bounds = previousMonthPeriod(today);
    expect(bounds.start.toISOString()).toBe(expectedBounds?.start.toISOString());
    expect(bounds.end.toISOString()).toBe(expectedBounds?.end.toISOString());
  });

  it('bascule correctement l’année quand la date métier est en janvier', () => {
    const today = new Date(Date.UTC(2026, 0, 10));
    const expectedBounds = monthBounds('2025-12');

    const bounds = previousMonthPeriod(today);
    expect(bounds.start.toISOString()).toBe(expectedBounds?.start.toISOString());
    expect(bounds.end.toISOString()).toBe(expectedBounds?.end.toISOString());
  });
});

describe('Machine à états du relevé de gérance', () => {
  it('seul un relevé DRAFT peut être émis (ISSUED)', () => {
    expect(() => assertIssuable('DRAFT')).not.toThrow();
    expect(() => assertIssuable('ISSUED')).toThrow(DomainError);
  });

  it('l’annulation exige DRAFT ou ISSUED, et un motif', () => {
    expect(() => assertCancellable('DRAFT', undefined)).toThrow(DomainError);
    expect(() => assertCancellable('SENT', 'motif')).toThrow(DomainError);
    expect(() => assertCancellable('ISSUED', 'Erreur de saisie')).not.toThrow();
  });

  it('l’envoi n’est possible que depuis ISSUED (ou déjà SENT, idempotent)', () => {
    expect(() => assertSendable('ISSUED')).not.toThrow();
    expect(() => assertSendable('SENT')).not.toThrow();
    expect(() => assertSendable('DRAFT')).toThrow(DomainError);
  });

  it('le passage à PAID est idempotent et n’est possible que depuis ISSUED ou SENT', () => {
    expect(() => assertPayable('ISSUED')).not.toThrow();
    expect(() => assertPayable('SENT')).not.toThrow();
    expect(() => assertPayable('PAID')).not.toThrow();
    expect(() => assertPayable('DRAFT')).toThrow(DomainError);
  });
});
