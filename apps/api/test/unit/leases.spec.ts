import { DomainError } from '../../src/shared/errors/domain-error';
import {
  daysInMonth,
  isLeapYear,
  MAX_PAYMENT_DUE_DAY,
  parseIsoDate,
  resolvePaymentDueDate,
  toIsoDate,
} from '../../src/modules/leases/domain/calendar';
import {
  assertEditable,
  assertRevisionDate,
  isCommercialUnit,
  monthsEquivalent,
  refundDueDate,
} from '../../src/modules/leases/domain/lease-rules';
import {
  allowedTargets,
  assertTransition,
  canTransition,
  LEASE_STATUSES,
  LEASE_TRANSITIONS,
  TERMINAL_LEASE_STATUSES,
  type LeaseStatus,
} from '../../src/modules/leases/domain/lease-status';
import { entryProrata, exitProrata, prorata } from '../../src/modules/leases/domain/prorata';
import { rentAt } from '../../src/modules/leases/domain/rent-schedule';
import {
  formatSequenceNumber,
  sequencePeriod,
} from '../../src/modules/numbering/domain/sequence-kind';

const d = parseIsoDate;

describe('Machine à états du bail', () => {
  /**
   * Couverture EXHAUSTIVE : les 49 couples (from, to) sont éprouvés, pas
   * seulement les quelques-uns auxquels on pense. Une transition ajoutée par
   * mégarde à la table fait échouer ce test.
   */
  const EXPECTED_EDGES = new Set([
    'DRAFT>PENDING_SIGNATURE',
    'DRAFT>ACTIVE',
    'DRAFT>CANCELLED',
    'PENDING_SIGNATURE>ACTIVE',
    'PENDING_SIGNATURE>CANCELLED',
    'ACTIVE>NOTICE_GIVEN',
    'ACTIVE>TERMINATED',
    'ACTIVE>EXPIRED',
    'NOTICE_GIVEN>TERMINATED',
  ]);

  it('n’autorise que les neuf transitions de la table, et aucune autre', () => {
    const observed: string[] = [];
    for (const from of LEASE_STATUSES) {
      for (const to of LEASE_STATUSES) {
        const edge = `${from}>${to}`;
        expect(canTransition(from, to)).toBe(EXPECTED_EDGES.has(edge));
        if (canTransition(from, to)) observed.push(edge);
      }
    }
    expect(new Set(observed)).toEqual(EXPECTED_EDGES);
  });

  it('ne laisse aucune sortie aux états terminaux', () => {
    for (const status of TERMINAL_LEASE_STATUSES) {
      expect(allowedTargets(status)).toEqual([]);
    }
  });

  it('accepte chaque transition déclarée, avec son déclencheur', () => {
    for (const transition of LEASE_TRANSITIONS) {
      expect(assertTransition(transition.from, transition.trigger, transition.to)).toBe(transition);
    }
  });

  it.each([
    ['TERMINATED', 'ACTIVATE', 'ACTIVE'],
    ['EXPIRED', 'ACTIVATE', 'ACTIVE'],
    ['CANCELLED', 'ACTIVATE', 'ACTIVE'],
    ['ACTIVE', 'ACTIVATE', 'ACTIVE'],
    ['ACTIVE', 'CANCEL', 'CANCELLED'],
    ['DRAFT', 'TERMINATE', 'TERMINATED'],
    ['DRAFT', 'GIVE_NOTICE', 'NOTICE_GIVEN'],
    ['NOTICE_GIVEN', 'GIVE_NOTICE', 'NOTICE_GIVEN'],
    ['TERMINATED', 'TERMINATE', 'TERMINATED'],
  ] as const)('refuse %s --%s--> %s avec details.from et details.to', (from, trigger, to) => {
    try {
      assertTransition(from, trigger, to);
      throw new Error('La transition aurait dû être refusée.');
    } catch (error) {
      expect(error).toBeInstanceOf(DomainError);
      const domain = error as DomainError;
      expect(domain.code).toBe('LEASES.INVALID_TRANSITION');
      expect(domain.status).toBe(409);
      expect(domain.details).toMatchObject({ from, to });
    }
  });

  it('refuse une réactivation après résiliation (scénario Gherkin)', () => {
    expect(canTransition('TERMINATED' as LeaseStatus, 'ACTIVE')).toBe(false);
  });
});

describe('Prorata au jour calendaire sur le mois réel', () => {
  it('rend le loyer plein quand le mois entier est couvert', () => {
    expect(prorata(150_000n, d('2026-06-01'), d('2026-06-30'))).toBe(150_000n);
    expect(entryProrata(150_000n, d('2026-06-01'))).toBe(150_000n);
    expect(exitProrata(150_000n, d('2026-06-30'))).toBe(150_000n);
  });

  it('février 2028 est bissextile : la base est 29 jours, pas 28 ni 30', () => {
    expect(isLeapYear(2028)).toBe(true);
    expect(daysInMonth(2028, 2)).toBe(29);
    // 15 jours sur 29 : 100 000 × 15 / 29 = 51 724,14 → 51 724 FCFA.
    expect(entryProrata(100_000n, d('2028-02-15'))).toBe(51_724n);
    // Sortie le 15 : du 1er au 15 inclus, soit 15 jours également.
    expect(exitProrata(100_000n, d('2028-02-15'))).toBe(51_724n);
    expect(prorata(100_000n, d('2028-02-01'), d('2028-02-29'))).toBe(100_000n);
  });

  it('février 2027 n’est pas bissextile : la base est 28 jours', () => {
    expect(daysInMonth(2027, 2)).toBe(28);
    // 14 jours sur 28 : exactement la moitié.
    expect(entryProrata(100_000n, d('2027-02-15'))).toBe(50_000n);
    expect(prorata(100_000n, d('2027-02-01'), d('2027-02-28'))).toBe(100_000n);
  });

  it('proratise chaque mois sur SA propre longueur quand la période en chevauche deux', () => {
    // 12 jours de mai (31) + 10 jours de juin (30).
    expect(prorata(90_000n, d('2026-05-20'), d('2026-06-10'))).toBe(34_839n + 30_000n);
  });

  it('rend zéro pour une période vide et refuse un montant négatif', () => {
    expect(prorata(100_000n, d('2026-06-10'), d('2026-06-09'))).toBe(0n);
    expect(() => prorata(-1n, d('2026-06-01'), d('2026-06-30'))).toThrow(RangeError);
  });
});

describe('Jour d’échéance et mois courts', () => {
  it('le 28 existe dans tous les mois, y compris février non bissextile', () => {
    expect(MAX_PAYMENT_DUE_DAY).toBe(28);
    expect(toIsoDate(resolvePaymentDueDate(28, 2027, 2))).toBe('2027-02-28');
    expect(toIsoDate(resolvePaymentDueDate(28, 2028, 2))).toBe('2028-02-28');
    expect(toIsoDate(resolvePaymentDueDate(28, 2026, 4))).toBe('2026-04-28');
    expect(toIsoDate(resolvePaymentDueDate(28, 2026, 12))).toBe('2026-12-28');
  });

  it('replie une échéance au 31 sur le dernier jour des mois plus courts', () => {
    expect(toIsoDate(resolvePaymentDueDate(31, 2026, 4))).toBe('2026-04-30');
    expect(toIsoDate(resolvePaymentDueDate(31, 2027, 2))).toBe('2027-02-28');
    expect(toIsoDate(resolvePaymentDueDate(31, 2026, 1))).toBe('2026-01-31');
  });

  it('refuse une date civile inexistante plutôt que de la décaler', () => {
    expect(() => parseIsoDate('2027-02-30')).toThrow(RangeError);
    expect(() => parseIsoDate('01/06/2026')).toThrow(RangeError);
  });
});

describe('Loyer applicable à une date', () => {
  const initial = { rentAmount: 150_000n, chargesAmount: 10_000n };
  const revisions = [
    {
      id: 'rev-2',
      effectiveDate: d('2028-01-01'),
      newRentAmount: 180_000n,
      newChargesAmount: 15_000n,
    },
    {
      id: 'rev-1',
      effectiveDate: d('2027-01-01'),
      newRentAmount: 165_000n,
      newChargesAmount: 12_000n,
    },
  ];

  it('rend les conditions initiales avant toute révision', () => {
    expect(rentAt(initial, revisions, d('2026-12-31'))).toEqual({
      rentAmount: 150_000n,
      chargesAmount: 10_000n,
      source: 'INITIAL',
      revisionId: null,
    });
  });

  it('rend la dernière révision effective, quel que soit l’ordre de la liste', () => {
    expect(rentAt(initial, revisions, d('2027-06-15'))).toMatchObject({
      rentAmount: 165_000n,
      chargesAmount: 12_000n,
      source: 'REVISION',
      revisionId: 'rev-1',
    });
    expect(rentAt(initial, revisions, d('2028-01-01'))).toMatchObject({
      rentAmount: 180_000n,
      revisionId: 'rev-2',
    });
  });

  it('la révision prend effet le jour même, pas le lendemain', () => {
    expect(rentAt(initial, revisions, d('2026-12-31')).source).toBe('INITIAL');
    expect(rentAt(initial, revisions, d('2027-01-01')).source).toBe('REVISION');
  });

  it('rend les conditions initiales quand aucune révision n’existe', () => {
    expect(rentAt(initial, [], d('2030-01-01')).source).toBe('INITIAL');
  });
});

describe('Règles de bail', () => {
  const today = d('2026-06-15');

  it('n’ouvre que les champs de gestion après activation', () => {
    expect(() => assertEditable('DRAFT', ['rentAmount', 'unitId'])).not.toThrow();
    expect(() => assertEditable('PENDING_SIGNATURE', ['depositAmount'])).not.toThrow();
    expect(() => assertEditable('ACTIVE', ['notes', 'autoRenew', 'endDate'])).not.toThrow();
    expect(() => assertEditable('ACTIVE', ['rentAmount'])).toThrow(DomainError);
  });

  it('nomme les champs refusés pour que l’interface les grise', () => {
    try {
      assertEditable('ACTIVE', ['rentAmount', 'notes', 'unitId']);
      throw new Error('La modification aurait dû être refusée.');
    } catch (error) {
      const domain = error as DomainError;
      expect(domain.code).toBe('LEASES.NOT_EDITABLE');
      expect(domain.details?.rejectedFields).toEqual(['rentAmount', 'unitId']);
    }
  });

  it('refuse une révision antérieure à la dernière, au mois courant ou au début du bail', () => {
    const start = d('2026-01-01');
    expect(() => assertRevisionDate(d('2027-01-01'), start, d('2026-07-01'), today)).not.toThrow();
    expect(() => assertRevisionDate(d('2026-06-01'), start, d('2026-07-01'), today)).toThrow(
      DomainError,
    );
    expect(() => assertRevisionDate(d('2026-05-01'), start, null, today)).toThrow(DomainError);
    expect(() => assertRevisionDate(d('2026-07-01'), d('2026-08-01'), null, today)).toThrow(
      DomainError,
    );
  });

  it('fixe la restitution du dépôt à 30 jours après la date d’effet', () => {
    expect(toIsoDate(refundDueDate(d('2026-07-31')))).toBe('2026-08-30');
    expect(toIsoDate(refundDueDate(d('2028-02-01')))).toBe('2028-03-02');
  });

  it('arrondit le nombre de mois de dépôt au plus proche', () => {
    expect(monthsEquivalent(300_000n, 150_000n)).toBe(2);
    expect(monthsEquivalent(225_000n, 150_000n)).toBe(2);
    expect(monthsEquivalent(0n, 150_000n)).toBe(0);
    expect(monthsEquivalent(300_000n, 0n)).toBeNull();
  });

  it('déduit le caractère commercial du type de lot', () => {
    expect(isCommercialUnit('SHOP')).toBe(true);
    expect(isCommercialUnit('OFFICE')).toBe(true);
    expect(isCommercialUnit('WAREHOUSE')).toBe(true);
    expect(isCommercialUnit('STUDIO')).toBe(false);
    expect(isCommercialUnit('APARTMENT')).toBe(false);
  });
});

describe('Numérotation des baux', () => {
  it('compose BAIL-{AAAA}-{seq} comme format_sequence_number côté SQL', () => {
    expect(formatSequenceNumber('BAIL', '2026', 42n, 5)).toBe('BAIL-2026-00042');
    expect(formatSequenceNumber('LOY', '202603', 42n, 5)).toBe('LOY-202603-00042');
    expect(formatSequenceNumber('BAIL', '', 7n, 5)).toBe('BAIL-00007');
  });

  it('découpe la période selon la portée du compteur', () => {
    const date = new Date(Date.UTC(2026, 2, 9));
    expect(sequencePeriod('YEARLY', date)).toBe('2026');
    expect(sequencePeriod('MONTHLY', date)).toBe('202603');
    expect(sequencePeriod('CONTINUOUS', date)).toBe('');
  });
});
