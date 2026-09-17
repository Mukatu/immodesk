import { extractInvoiceReferences } from '../../src/modules/reconciliation/domain/reference-parser';
import { labelSimilarity, scoreCandidate } from '../../src/modules/reconciliation/domain/scoring';

/**
 * `scoreCandidate` compare deux dates FOURNIES par l'appelant (elle ne lit
 * jamais l'horloge) : seul l'écart entre elles compte pour le barème, jamais
 * leur position par rapport à aujourd'hui. Les dates de test sont donc de
 * simples données fabriquées à partir d'une ancre fixe et arbitraire.
 */
const REFERENCE_DATE = new Date(Date.UTC(2026, 0, 15));

function dateOffset(days: number): Date {
  const d = new Date(REFERENCE_DATE);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

describe('reconciliation — labelSimilarity', () => {
  it('vaut 1 pour deux libellés identiques', () => {
    expect(labelSimilarity('JEAN MABIALA', 'JEAN MABIALA')).toBe(1);
  });

  it('vaut 1 pour deux chaînes vides', () => {
    expect(labelSimilarity('', '')).toBe(1);
  });

  it('est élevée pour deux libellés proches (mots inversés)', () => {
    const score = labelSimilarity('JEAN MABIALA', 'MABIALA JEAN');
    expect(score).toBeGreaterThan(0.5);
    expect(score).toBeLessThan(1);
  });

  it('est basse pour deux libellés très différents', () => {
    const score = labelSimilarity('JEAN MABIALA', 'ARMAND KOUMBA');
    expect(score).toBeLessThan(0.3);
  });

  it('vaut 0 entre une chaîne vide et une chaîne non vide', () => {
    expect(labelSimilarity('', 'JEAN MABIALA')).toBe(0);
  });
});

describe('reconciliation — scoreCandidate (barème)', () => {
  const base = {
    lineAmount: 100_000n,
    targetAmount: 100_000n,
    amountTolerancePercent: 2,
    lineDate: dateOffset(0),
    targetDate: dateOffset(0),
    normalizedLineLabel: 'JEAN MABIALA',
    normalizedTargetLabel: 'JEAN MABIALA',
    targetType: 'PAYMENT' as const,
    hasPendingDeclarationSameAmount: false,
  };

  it('montant identique : 50 points', () => {
    const breakdown = scoreCandidate(base);
    expect(breakdown?.amount).toBe(50);
  });

  it('écart de montant ≤ tolérance : 35 points', () => {
    // 1 500 F d'écart sur 100 000 F, tolérance 2 % = 2 000 F : dans la tolérance.
    const breakdown = scoreCandidate({ ...base, targetAmount: 98_500n });
    expect(breakdown?.amount).toBe(35);
  });

  it('écart de montant > tolérance : candidat écarté (null)', () => {
    // 3 000 F d'écart, tolérance 2 % = 2 000 F : hors tolérance.
    const breakdown = scoreCandidate({ ...base, targetAmount: 97_000n });
    expect(breakdown).toBeNull();
  });

  it('écart de date < 3 jours : 20 points', () => {
    const breakdown = scoreCandidate({ ...base, targetDate: dateOffset(-2) });
    expect(breakdown?.date).toBe(20);
  });

  it('écart de date < 10 jours : 10 points', () => {
    const breakdown = scoreCandidate({ ...base, targetDate: dateOffset(5) });
    expect(breakdown?.date).toBe(10);
  });

  it('écart de date ≥ 10 jours : 0 point', () => {
    const breakdown = scoreCandidate({ ...base, targetDate: dateOffset(15) });
    expect(breakdown?.date).toBe(0);
  });

  it('libellé : round(similarité × 20)', () => {
    const breakdown = scoreCandidate({
      ...base,
      normalizedTargetLabel: 'ARMAND KOUMBA',
    });
    expect(breakdown?.label).toBe(
      Math.round(labelSimilarity('JEAN MABIALA', 'ARMAND KOUMBA') * 20),
    );
    expect(breakdown?.label).toBeLessThan(10);
  });

  it('bonus déclaration en attente de même montant : +10, hors cible DECLARATION', () => {
    const breakdown = scoreCandidate({ ...base, hasPendingDeclarationSameAmount: true });
    expect(breakdown?.declaration).toBe(10);
  });

  it('pas de bonus déclaration si la cible évaluée EST la déclaration', () => {
    const breakdown = scoreCandidate({
      ...base,
      targetType: 'DECLARATION',
      hasPendingDeclarationSameAmount: true,
    });
    expect(breakdown?.declaration).toBe(0);
  });

  it('total plafonné à 100 malgré une somme supérieure', () => {
    const breakdown = scoreCandidate({ ...base, hasPendingDeclarationSameAmount: true });
    const total =
      (breakdown?.amount ?? 0) +
      (breakdown?.date ?? 0) +
      (breakdown?.label ?? 0) +
      (breakdown?.declaration ?? 0);
    expect(total).toBe(100);
  });
});

describe('reconciliation — extractInvoiceReferences', () => {
  it('forme longue avec tirets', () => {
    expect(extractInvoiceReferences('Virement LOY-202609-00042 loyer septembre')).toEqual([
      'LOY-202609-00042',
    ]);
  });

  it('forme compacte sans tirets', () => {
    expect(extractInvoiceReferences('REF LOY20260900042 VIR')).toEqual(['LOY-202609-00042']);
  });

  it('casse mélangée, insensible à la casse', () => {
    expect(extractInvoiceReferences('loy-202609-00042')).toEqual(['LOY-202609-00042']);
  });

  it('compteur de plus de 5 chiffres : jamais tronqué', () => {
    expect(extractInvoiceReferences('LOY-202609-123456')).toEqual(['LOY-202609-123456']);
  });

  it('aucune référence : renvoie un tableau vide', () => {
    expect(extractInvoiceReferences('Virement ordinaire sans reference')).toEqual([]);
  });

  it('texte absent (null/undefined) : renvoie un tableau vide', () => {
    expect(extractInvoiceReferences(null)).toEqual([]);
    expect(extractInvoiceReferences(undefined)).toEqual([]);
  });

  it('faux positif : "LOYER" seul, sans chiffres, ne matche pas', () => {
    expect(extractInvoiceReferences('Loyer du mois de septembre, paiement en especes')).toEqual([]);
  });

  it('deux références distinctes, sans doublon', () => {
    expect(
      extractInvoiceReferences('LOY-202609-00042 puis LOY-202609-00042 encore et LOY-202610-00007'),
    ).toEqual(['LOY-202609-00042', 'LOY-202610-00007']);
  });
});
