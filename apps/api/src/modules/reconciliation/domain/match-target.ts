import { DomainError } from '../../../shared/errors/domain-error';

export const MATCH_TARGET_TYPES = ['PAYMENT', 'DECLARATION', 'CHECK', 'REMITTANCE'] as const;
export type MatchTargetType = (typeof MATCH_TARGET_TYPES)[number];

export const MATCH_TARGET_COLUMNS: Readonly<Record<MatchTargetType, string>> = {
  PAYMENT: 'payment_id',
  DECLARATION: 'declaration_id',
  CHECK: 'bank_check_id',
  REMITTANCE: 'remittance_id',
};

export interface MatchTargetRef {
  targetType: MatchTargetType;
  targetId: string;
}

/** Exactement une des quatre colonnes doit être renseignée (la base tolère plus, num_nonnulls >= 1). */
export function resolveTarget(row: {
  payment_id: string | null;
  declaration_id: string | null;
  bank_check_id: string | null;
  remittance_id: string | null;
}): MatchTargetRef {
  const present: MatchTargetRef[] = [];
  if (row.payment_id) present.push({ targetType: 'PAYMENT', targetId: row.payment_id });
  if (row.declaration_id) present.push({ targetType: 'DECLARATION', targetId: row.declaration_id });
  if (row.bank_check_id) present.push({ targetType: 'CHECK', targetId: row.bank_check_id });
  if (row.remittance_id) present.push({ targetType: 'REMITTANCE', targetId: row.remittance_id });
  if (present.length !== 1) {
    throw new DomainError('BANK.MATCH_TARGET_REQUIRED', { count: present.length });
  }
  return present[0];
}
