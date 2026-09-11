import { DomainError } from '../../src/shared/errors/domain-error';
import { parseIsoDate } from '../../src/modules/leases/domain/calendar';
import {
  assertAllocationInvariant,
  planAutoAllocation,
  planExplicitAllocation,
  type AllocationPlan,
  type OpenInvoice,
} from '../../src/modules/payments/domain/allocation-engine';
import {
  assertPaymentTransition,
  creditStatusOf,
  initialPaymentStatus,
  netAmountOf,
} from '../../src/modules/payments/domain/payment-rules';

const d = parseIsoDate;

const invoices: OpenInvoice[] = [
  { id: 'inv-oct', dueDate: d('2026-10-05'), periodStart: d('2026-10-01'), balance: 160_000n },
  { id: 'inv-aug', dueDate: d('2026-08-05'), periodStart: d('2026-08-01'), balance: 60_000n },
  { id: 'inv-sep', dueDate: d('2026-09-05'), periodStart: d('2026-09-01'), balance: 160_000n },
];

function sumOf(plan: AllocationPlan): bigint {
  return plan.allocations.reduce((total, a) => total + a.amount, 0n);
}

describe('Moteur d’imputation — plus ancienne facture d’abord', () => {
  it('paiement partiel : solde la plus ancienne, entame la suivante', () => {
    const plan = planAutoAllocation(100_000n, invoices);
    expect(plan.allocations).toEqual([
      { invoiceId: 'inv-aug', amount: 60_000n, order: 1 },
      { invoiceId: 'inv-sep', amount: 40_000n, order: 2 },
    ]);
    expect(plan.creditAmount).toBe(0n);
    assertAllocationInvariant(100_000n, plan);
  });

  it('paiement groupé : solde plusieurs factures dans l’ordre des échéances', () => {
    const plan = planAutoAllocation(380_000n, invoices);
    expect(plan.allocations.map((a) => a.invoiceId)).toEqual(['inv-aug', 'inv-sep', 'inv-oct']);
    expect(sumOf(plan)).toBe(380_000n);
    expect(plan.creditAmount).toBe(0n);
  });

  it('trop-perçu : le reliquat devient un avoir', () => {
    const plan = planAutoAllocation(200_000n, [invoices[2]]);
    expect(plan.allocations).toEqual([{ invoiceId: 'inv-sep', amount: 160_000n, order: 1 }]);
    expect(plan.creditAmount).toBe(40_000n);
    assertAllocationInvariant(200_000n, plan);
  });

  it('respecte l’invariant somme + avoir = montant sur des montants variés', () => {
    for (const amount of [0n, 1n, 59_999n, 60_000n, 220_001n, 380_000n, 1_000_000n]) {
      const plan = planAutoAllocation(amount, invoices);
      expect(sumOf(plan) + plan.creditAmount).toBe(amount);
      expect(() => assertAllocationInvariant(amount, plan)).not.toThrow();
    }
    expect(() =>
      assertAllocationInvariant(10n, { allocations: [], creditAmount: 9n, unallocatedAmount: 0n }),
    ).toThrow();
  });

  it('imputation explicite : bornée par le reste dû et le disponible', () => {
    const plan = planExplicitAllocation(
      200_000n,
      [{ invoiceId: 'inv-sep', amount: 160_000n }],
      invoices,
      true,
    );
    expect(plan.creditAmount).toBe(40_000n);
    const manual = planExplicitAllocation(
      200_000n,
      [
        { invoiceId: 'inv-sep', amount: 100_000n },
        { invoiceId: 'inv-aug', amount: 60_000n },
      ],
      invoices,
      false,
    );
    expect(manual.allocations.map((a) => [a.invoiceId, a.order])).toEqual([
      ['inv-aug', 1],
      ['inv-sep', 2],
    ]);
    expect(manual.unallocatedAmount).toBe(40_000n);
    expect(manual.creditAmount).toBe(0n);

    const over = () =>
      planExplicitAllocation(50_000n, [{ invoiceId: 'inv-aug', amount: 60_000n }], invoices, true);
    expect(over).toThrow(DomainError);
    const aboveBalance = () =>
      planExplicitAllocation(500_000n, [{ invoiceId: 'inv-aug', amount: 60_001n }], invoices, true);
    expect(aboveBalance).toThrow(DomainError);
    const closed = () =>
      planExplicitAllocation(500_000n, [{ invoiceId: 'inconnue', amount: 1n }], invoices, true);
    expect(closed).toThrow(DomainError);
  });
});

describe('Règles de paiement', () => {
  it('espèces confirmées d’office ; virement confirmé seulement par un gestionnaire', () => {
    expect(initialPaymentStatus('CASH', 'COLLECTOR', undefined)).toBe('CONFIRMED');
    expect(initialPaymentStatus('BANK_TRANSFER', 'ACCOUNTANT', true)).toBe('CONFIRMED');
    expect(initialPaymentStatus('BANK_TRANSFER', 'COLLECTOR', true)).toBe('PENDING_VERIFICATION');
    expect(initialPaymentStatus('MOBILE_MONEY', 'MANAGER', false)).toBe('PENDING_VERIFICATION');
  });

  it('transitions terminales et montants nets', () => {
    expect(() => assertPaymentTransition('PENDING_VERIFICATION', 'CONFIRMED')).not.toThrow();
    expect(() => assertPaymentTransition('CONFIRMED', 'REJECTED')).toThrow(DomainError);
    expect(() => assertPaymentTransition('REJECTED', 'CONFIRMED')).toThrow(DomainError);
    expect(netAmountOf(100_000n, 1_500n, 'TENANT')).toBe(100_000n);
    expect(netAmountOf(100_000n, 1_500n, 'ORGANIZATION')).toBe(98_500n);
    expect(creditStatusOf(40_000n, 0n)).toBe('OPEN');
    expect(creditStatusOf(40_000n, 10_000n)).toBe('PARTIALLY_USED');
    expect(creditStatusOf(40_000n, 40_000n)).toBe('USED');
  });
});
