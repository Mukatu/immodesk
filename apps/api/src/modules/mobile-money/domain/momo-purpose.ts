/** Usages d'une transaction Mobile Money (`mobile_money_transactions.purpose`, migration 10). */
export const MOMO_PURPOSES = ['RENT_COLLECTION', 'SUBSCRIPTION', 'OWNER_PAYOUT'] as const;

export type MomoPurpose = (typeof MOMO_PURPOSES)[number];
