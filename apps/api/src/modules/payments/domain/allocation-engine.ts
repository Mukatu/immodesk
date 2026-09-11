import { DomainError } from '../../../shared/errors/domain-error';
import { compareDates } from '../../leases/domain/calendar';

/** Facture ouverte, réduite à ce dont l'imputation a besoin. */
export interface OpenInvoice {
  id: string;
  dueDate: Date;
  periodStart: Date;
  createdAt?: Date;
  balance: bigint;
}

export interface AllocationRequest {
  invoiceId: string;
  amount: bigint;
}

export interface PlannedAllocation {
  invoiceId: string;
  amount: bigint;
  /** Rang d'apurement (1 = facture la plus ancienne), purement informatif. */
  order: number;
}

export interface AllocationPlan {
  allocations: PlannedAllocation[];
  /** Reliquat versé en avoir locataire (`tenant_credits`, origine OVERPAYMENT). */
  creditAmount: bigint;
  /** Reste non imputé et non crédité (imputation manuelle partielle). */
  unallocatedAmount: bigint;
}

/**
 * Règle figée du contrat : la plus ancienne facture non soldée d'abord, par
 * échéance croissante (puis début de période, puis ancienneté de création
 * pour départager).
 */
export function sortOldestFirst<T extends OpenInvoice>(invoices: readonly T[]): T[] {
  return [...invoices].sort(
    (a, b) =>
      compareDates(a.dueDate, b.dueDate) ||
      compareDates(a.periodStart, b.periodStart) ||
      (a.createdAt && b.createdAt ? a.createdAt.getTime() - b.createdAt.getTime() : 0) ||
      a.id.localeCompare(b.id),
  );
}

/**
 * Imputation AUTOMATIQUE : on solde les factures de la plus ancienne à la
 * plus récente, et le reliquat devient un avoir.
 */
export function planAutoAllocation(
  available: bigint,
  openInvoices: readonly OpenInvoice[],
): AllocationPlan {
  if (available < 0n) throw new RangeError('Montant disponible négatif.');
  let remaining = available;
  const allocations: PlannedAllocation[] = [];
  for (const invoice of sortOldestFirst(openInvoices)) {
    if (remaining === 0n) break;
    if (invoice.balance <= 0n) continue;
    const take = remaining < invoice.balance ? remaining : invoice.balance;
    allocations.push({ invoiceId: invoice.id, amount: take, order: allocations.length + 1 });
    remaining -= take;
  }
  return { allocations, creditAmount: remaining, unallocatedAmount: 0n };
}

/**
 * Imputation EXPLICITE : chaque montant est borné par le reste dû de sa
 * facture, le total par le disponible du paiement.
 *
 * `settleRemainder` : à la création d'un paiement, le reliquat devient un
 * avoir (le paiement est entièrement soldé) ; lors d'une imputation manuelle
 * ultérieure (`POST /payments/{id}/allocations`), il reste disponible.
 */
export function planExplicitAllocation(
  available: bigint,
  requests: readonly AllocationRequest[],
  openInvoices: readonly OpenInvoice[],
  settleRemainder: boolean,
): AllocationPlan {
  const open = new Map(openInvoices.map((i) => [i.id, i]));
  const merged = new Map<string, bigint>();
  for (const request of requests) {
    if (request.amount <= 0n) {
      throw new DomainError('VALIDATION.INVALID_PAYLOAD', {
        allocations: 'Chaque imputation porte un montant strictement positif.',
      });
    }
    merged.set(request.invoiceId, (merged.get(request.invoiceId) ?? 0n) + request.amount);
  }

  let total = 0n;
  for (const [invoiceId, amount] of merged) {
    const invoice = open.get(invoiceId);
    if (!invoice) throw new DomainError('PAYMENTS.INVOICE_NOT_OPEN', { invoiceId });
    if (amount > invoice.balance) {
      throw new DomainError('PAYMENTS.OVER_ALLOCATED', {
        invoiceId,
        balanceAmount: invoice.balance.toString(),
        requested: amount.toString(),
      });
    }
    total += amount;
  }
  if (total > available) {
    throw new DomainError('PAYMENTS.OVER_ALLOCATED', {
      availableAmount: available.toString(),
      requested: total.toString(),
    });
  }

  const ordered = sortOldestFirst(openInvoices.filter((i) => merged.has(i.id)));
  const allocations = ordered.map((invoice, index) => ({
    invoiceId: invoice.id,
    amount: merged.get(invoice.id) as bigint,
    order: index + 1,
  }));
  const remainder = available - total;
  return settleRemainder
    ? { allocations, creditAmount: remainder, unallocatedAmount: 0n }
    : { allocations, creditAmount: 0n, unallocatedAmount: remainder };
}

/**
 * Invariant financier testé : imputations + avoir + reste = disponible.
 * Une violation est un DÉFAUT DE PROGRAMMATION, jamais une erreur métier :
 * on lève pour annuler la transaction plutôt que d'écrire un montant faux.
 */
export function assertAllocationInvariant(available: bigint, plan: AllocationPlan): void {
  const sum = plan.allocations.reduce((total, a) => total + a.amount, 0n);
  if (sum + plan.creditAmount + plan.unallocatedAmount !== available || plan.creditAmount < 0n) {
    throw new Error(
      `Invariant d'imputation violé : ${sum} + ${plan.creditAmount} + ${plan.unallocatedAmount} ≠ ${available}.`,
    );
  }
}
