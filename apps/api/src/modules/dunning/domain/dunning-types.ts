/** Énumération SQL `dunning_trigger`. */
export const DUNNING_TRIGGERS = [
  'DAYS_BEFORE_DUE',
  'DAYS_AFTER_DUE',
  'ON_ISSUE',
  'ON_OVERDUE',
] as const;
export type DunningTrigger = (typeof DUNNING_TRIGGERS)[number];

/** Énumération SQL `dunning_step_status`. Aucun statut `DELIVERED` : la remise
 * effective se lit dans `message_logs` (contrat phase 9, énumérations). */
export const DUNNING_STEP_STATUSES = [
  'PENDING',
  'RUNNING',
  'SENT',
  'SKIPPED',
  'FAILED',
  'CANCELLED',
] as const;
export type DunningStepStatus = (typeof DUNNING_STEP_STATUSES)[number];

/** Statuts de facture concernés par le balayage de relance. */
export const DUNNABLE_INVOICE_STATUSES = ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] as const;

/**
 * Termes d'une règle de relance, tels que nécessaires au moteur de
 * sélection de palier. Domaine pur : aucune dépendance Prisma.
 */
export interface DunningRuleTerms {
  id: string;
  stepOrder: number;
  triggerType: DunningTrigger;
  offsetDays: number;
  minBalanceAmount: bigint;
  sendHourLocal: number;
  skipWeekends: boolean;
}

/** État de la facture nécessaire au calcul du décalage et de la sélection. */
export interface DunningInvoiceState {
  dueDate: Date;
  issueDate: Date;
  graceUntilDate: Date | null;
  balanceAmount: bigint;
}

/** Motifs de non-envoi, en français, repris tels quels dans `skip_reason`. */
export const DUNNING_SKIP_REASONS = {
  INVOICE_SETTLED: 'Facture soldée : aucune relance nécessaire.',
  BELOW_MINIMUM: 'Solde sous le minimum de relance de cette règle.',
  NO_CONTACT_CHANNEL: 'Locataire sans canal de contact valide.',
  ALREADY_SENT_TODAY: 'Relance déjà émise le jour même pour ce couple facture/règle.',
} as const;
