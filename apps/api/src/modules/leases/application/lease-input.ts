import { toAmount } from '../../../shared/money/amount';
import { parseIsoDate } from '../domain/calendar';

/**
 * Entrée du contrat (`LeaseInput`), telle que la reçoit la couche
 * `application/`. Les montants arrivent en entiers JSON et repartent en
 * BigInt ; les dates arrivent en `AAAA-MM-JJ` et repartent en `Date` UTC.
 */
export interface LeaseInput {
  unitId?: string;
  primaryTenantId?: string;
  startDate?: string;
  endDate?: string | null;
  moveInDate?: string | null;
  rentPeriod?: string;
  rentAmount?: number | string;
  chargesAmount?: number | string;
  chargesAreProvisional?: boolean;
  depositAmount?: number | string;
  agencyFeeAmount?: number | string;
  advanceMonths?: number;
  paymentDueDay?: number;
  graceDays?: number;
  preferredPaymentMethod?: string;
  collectorUserId?: string | null;
  noticeDays?: number;
  autoRenew?: boolean;
  indexationRateBps?: number | null;
  nextIndexationDate?: string | null;
  notes?: string | null;
  clientRef?: string | null;
}

/**
 * Entrée de CRÉATION : quatre champs y sont obligatoires, là où `LeaseInput`
 * les rend tous facultatifs pour servir aussi la modification partielle.
 */
export interface CreateLeaseInput extends LeaseInput {
  unitId: string;
  primaryTenantId: string;
  startDate: string;
  rentAmount: number | string;
}

/** `null` et chaîne vide valent « pas de valeur ». */
function trimOrNull(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed.length > 0 ? trimmed : null;
}

function dateOrNull(value: string | null | undefined): Date | null {
  return value ? parseIsoDate(value) : null;
}

/**
 * Colonnes SQL d'un `LeaseInput`.
 *
 * `rentAmount`, `depositAmount`, `paymentDueDay`, `graceDays` et l'identité
 * du lot en sont volontairement ABSENTS : ils exigent un contexte (valeurs
 * par défaut de l'organisation, `deposit_months` du lot, résolution de
 * l'immeuble) que seul le service possède. Les recopier ici ferait croire
 * que ce mappeur suffit.
 */
export function leaseColumns(input: LeaseInput): Record<string, unknown> {
  return {
    ...(input.primaryTenantId !== undefined ? { primary_tenant_id: input.primaryTenantId } : {}),
    ...(input.startDate !== undefined ? { start_date: parseIsoDate(input.startDate) } : {}),
    ...(input.endDate !== undefined ? { end_date: dateOrNull(input.endDate) } : {}),
    ...(input.moveInDate !== undefined ? { move_in_date: dateOrNull(input.moveInDate) } : {}),
    ...(input.rentPeriod !== undefined ? { rent_period: input.rentPeriod } : {}),
    ...(input.chargesAmount !== undefined ? { charges_amount: toAmount(input.chargesAmount) } : {}),
    ...(input.chargesAreProvisional !== undefined
      ? { charges_are_provisional: input.chargesAreProvisional }
      : {}),
    ...(input.agencyFeeAmount !== undefined
      ? { agency_fee_amount: toAmount(input.agencyFeeAmount) }
      : {}),
    ...(input.advanceMonths !== undefined ? { advance_months: input.advanceMonths } : {}),
    ...(input.preferredPaymentMethod !== undefined
      ? { preferred_payment_method: input.preferredPaymentMethod }
      : {}),
    ...(input.collectorUserId !== undefined
      ? { collector_user_id: input.collectorUserId || null }
      : {}),
    ...(input.noticeDays !== undefined ? { notice_days: input.noticeDays } : {}),
    ...(input.autoRenew !== undefined ? { auto_renew: input.autoRenew } : {}),
    ...(input.indexationRateBps !== undefined
      ? { indexation_rate_bps: input.indexationRateBps }
      : {}),
    ...(input.nextIndexationDate !== undefined
      ? { next_indexation_date: dateOrNull(input.nextIndexationDate) }
      : {}),
    ...(input.notes !== undefined ? { notes: trimOrNull(input.notes) } : {}),
    ...(input.clientRef !== undefined ? { client_ref: trimOrNull(input.clientRef) } : {}),
  };
}
