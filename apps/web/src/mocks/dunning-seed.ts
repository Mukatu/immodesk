/**
 * Mock MSW — Phase 9 (relances), état en mémoire et données de démonstration,
 * conformes à docs/api/phase9-contract.md. Suit le principe de
 * penalty-rules-seed.ts : Maps exportées, seed appelé une fois par
 * handlers.ts. Les six statuts sont exactement ceux du contrat : il n'existe
 * pas de statut DELIVERED (la remise se lit dans le journal des messages).
 *
 * `DUNNING_REFERENCE_TODAY` : date de référence FIXE du scan simulé
 * (dunning-handlers.ts) — jamais l'horloge réelle pour calculer un retard.
 * Une facture de démonstration à échéance fixe vue depuis `new Date()` aurait
 * un écart qui grandit indéfiniment avec le temps, si bien qu'une
 * correspondance exacte au jour avec le décalage d'un palier ne se
 * déclencherait jamais : c'est exactement le défaut corrigé ici. Les factures
 * de démonstration de ce fichier portent donc une échéance dérivée de cette
 * constante (`isoDateOffsetDays`), jamais de la date du jour.
 */
import { invoices, nextInvoiceNumber, type MockInvoice } from './billing-seed';

export const DUNNING_REFERENCE_TODAY = new Date('2024-03-01T00:00:00.000Z');

function isoDateOffsetDays(days: number): string {
  return new Date(DUNNING_REFERENCE_TODAY.getTime() + days * 86_400_000).toISOString().slice(0, 10);
}

export type DunningTriggerMock = 'DAYS_BEFORE_DUE' | 'DAYS_AFTER_DUE' | 'ON_ISSUE' | 'ON_OVERDUE';

export type DunningStepStatusMock =
  'PENDING' | 'RUNNING' | 'SENT' | 'SKIPPED' | 'FAILED' | 'CANCELLED';

export type NotificationChannelMock = 'WHATSAPP' | 'SMS' | 'EMAIL' | 'PUSH' | 'IN_APP';
export type MessageStatusMock =
  'QUEUED' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'REJECTED' | 'EXPIRED';

export interface MockDunningRule {
  id: string;
  organizationId: string;
  name: string;
  stepOrder: number;
  triggerType: DunningTriggerMock;
  offsetDays: number;
  channel: NotificationChannelMock;
  fallbackChannel?: NotificationChannelMock;
  templateId?: string;
  minBalanceAmount: number;
  notifyLandlord: boolean;
  notifyCollector: boolean;
  applyPenalty: boolean;
  penaltyRuleId?: string;
  escalateToLegal: boolean;
  sendHourLocal: number;
  skipWeekends: boolean;
  isActive: boolean;
  currency: 'XAF';
  createdAt: string;
  updatedAt: string;
}

export interface MockDunningRun {
  id: string;
  organizationId: string;
  ruleId: string;
  ruleName: string;
  stepOrder: number;
  status: DunningStepStatusMock;
  runDate: string;
  scheduledAt: string;
  executedAt: string | null;
  daysOverdue: number;
  balanceAmount: number;
  channel: NotificationChannelMock;
  invoiceId: string | null;
  invoiceNumber: string | null;
  tenantId: string;
  tenantDisplayName: string;
  notificationId: string | null;
  messageLogId: string | null;
  messageStatus: MessageStatusMock | null;
  guarantorNotified: boolean;
  penaltyApplied: boolean;
  penaltyAmount: number;
  penaltyInvoiceLineId: string | null;
  skipReason: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export const dunningRules = new Map<string, MockDunningRule>();
export const dunningRuns = new Map<string, MockDunningRun>();

/** Empêche une pénalité d'être calculée deux fois pour un couple facture/règle (arbitrage 6). */
export const dunningPenaltyApplied = new Set<string>();

export interface SeedDunningDeps {
  DEMO_ORG_ID: string;
  nextId: (prefix: string) => string;
  defaultPenaltyRuleId?: string;
  tenantId?: string;
  tenantDisplayName?: string;
  /** Bail/lot/bien de démonstration porteurs des deux factures ci-dessous, si disponibles. */
  leaseId?: string;
  unitId?: string;
  propertyId?: string;
}

/**
 * Seed de trois paliers de démonstration (rappel avant échéance, relance avec
 * pénalité, escalade au garant) et d'un historique varié couvrant les six
 * statuts, pour que l'écran Relances ait un contenu représentatif même avant
 * tout déclenchement du scan.
 */
export function seedDunningDemoData(deps: SeedDunningDeps): void {
  const {
    DEMO_ORG_ID,
    nextId,
    defaultPenaltyRuleId,
    tenantId,
    tenantDisplayName,
    leaseId,
    unitId,
    propertyId,
  } = deps;
  const now = new Date().toISOString();

  const reminder: MockDunningRule = {
    id: nextId('dunningrule'),
    organizationId: DEMO_ORG_ID,
    name: 'Rappel avant échéance',
    stepOrder: 1,
    triggerType: 'DAYS_BEFORE_DUE',
    offsetDays: 3,
    channel: 'WHATSAPP',
    fallbackChannel: 'SMS',
    minBalanceAmount: 1000,
    notifyLandlord: false,
    notifyCollector: false,
    applyPenalty: false,
    escalateToLegal: false,
    sendHourLocal: 9,
    skipWeekends: true,
    isActive: true,
    currency: 'XAF',
    createdAt: now,
    updatedAt: now,
  };

  const penaltyStep: MockDunningRule = {
    id: nextId('dunningrule'),
    organizationId: DEMO_ORG_ID,
    name: 'Relance avec pénalité',
    stepOrder: 2,
    triggerType: 'DAYS_AFTER_DUE',
    offsetDays: 5,
    channel: 'WHATSAPP',
    fallbackChannel: 'SMS',
    minBalanceAmount: 5000,
    notifyLandlord: true,
    notifyCollector: false,
    applyPenalty: true,
    penaltyRuleId: defaultPenaltyRuleId,
    escalateToLegal: false,
    sendHourLocal: 10,
    skipWeekends: true,
    isActive: true,
    currency: 'XAF',
    createdAt: now,
    updatedAt: now,
  };

  const escalation: MockDunningRule = {
    id: nextId('dunningrule'),
    organizationId: DEMO_ORG_ID,
    name: 'Escalade garant',
    stepOrder: 3,
    triggerType: 'DAYS_AFTER_DUE',
    offsetDays: 15,
    channel: 'SMS',
    fallbackChannel: 'EMAIL',
    minBalanceAmount: 5000,
    notifyLandlord: true,
    notifyCollector: true,
    applyPenalty: false,
    escalateToLegal: true,
    sendHourLocal: 8,
    skipWeekends: false,
    isActive: true,
    currency: 'XAF',
    createdAt: now,
    updatedAt: now,
  };

  dunningRules.set(reminder.id, reminder);
  dunningRules.set(penaltyStep.id, penaltyStep);
  dunningRules.set(escalation.id, escalation);

  const demoTenantId = tenantId ?? 'tenant-demo';
  const demoTenantName = tenantDisplayName ?? 'Locataire de démonstration';
  const today = DUNNING_REFERENCE_TODAY.toISOString().slice(0, 10);

  const historyEntries: Array<[MockDunningRule, DunningStepStatusMock]> = [
    [reminder, 'SENT'],
    [penaltyStep, 'SKIPPED'],
    [escalation, 'FAILED'],
    [penaltyStep, 'CANCELLED'],
    [reminder, 'PENDING'],
    [penaltyStep, 'RUNNING'],
  ];

  historyEntries.forEach(([rule, status], index) => {
    const run: MockDunningRun = {
      id: nextId('dunningrun'),
      organizationId: DEMO_ORG_ID,
      ruleId: rule.id,
      ruleName: rule.name,
      stepOrder: rule.stepOrder,
      status,
      runDate: today,
      scheduledAt: now,
      executedAt: status === 'PENDING' || status === 'RUNNING' ? null : now,
      daysOverdue: rule.triggerType === 'DAYS_BEFORE_DUE' ? -rule.offsetDays : rule.offsetDays,
      balanceAmount: 45_000 + index * 5_000,
      channel: rule.channel,
      invoiceId: null,
      invoiceNumber: null,
      tenantId: demoTenantId,
      tenantDisplayName: demoTenantName,
      notificationId: status === 'SENT' ? nextId('notif') : null,
      messageLogId: status === 'SENT' ? nextId('msglog') : null,
      messageStatus: status === 'SENT' ? 'DELIVERED' : null,
      guarantorNotified: rule.escalateToLegal && status === 'FAILED',
      penaltyApplied: false,
      penaltyAmount: 0,
      penaltyInvoiceLineId: null,
      skipReason: status === 'SKIPPED' ? 'Solde sous le seuil minimum.' : null,
      errorMessage: status === 'FAILED' ? 'Échec technique : canal indisponible.' : null,
      createdAt: now,
    };
    dunningRuns.set(run.id, run);
  });

  // Deux factures de démonstration à échéance dérivée de DUNNING_REFERENCE_TODAY,
  // pour qu'un scan lancé sur DEMO_ORG_ID reste parlant : l'une déclenche
  // exactement le palier "Relance avec pénalité" (5 jours de retard pile),
  // l'autre correspond exactement au palier "Rappel avant échéance" (3 jours
  // avant l'échéance pile) mais est ignorée, son solde étant sous le seuil.
  if (leaseId && unitId && propertyId) {
    const triggeringInvoiceId = nextId('invoice');
    const triggeringInvoice: MockInvoice = {
      id: triggeringInvoiceId,
      organizationId: DEMO_ORG_ID,
      invoiceNumber: nextInvoiceNumber('2024-02'),
      status: 'OVERDUE',
      leaseId,
      tenantId: demoTenantId,
      unitId,
      propertyId,
      periodStart: '2024-02-01',
      periodEnd: '2024-02-29',
      dueDate: isoDateOffsetDays(-5),
      graceUntilDate: null,
      issueDate: '2024-02-01',
      issuedAt: '2024-02-01T08:00:00.000Z',
      paidAt: null,
      cancelledAt: null,
      cancellationReason: null,
      notes: null,
      documentId: null,
      receiptId: null,
      createdAt: now,
      updatedAt: now,
      lines: [
        {
          id: nextId('invoiceline'),
          invoiceId: triggeringInvoiceId,
          lineType: 'RENT',
          label: 'Loyer de démonstration (déclenche une relance)',
          unitPriceAmount: 100_000,
          amount: 100_000,
          vatRateBps: 0,
          vatAmount: 0,
          isCredit: false,
          position: 0,
        },
      ],
      allocations: [],
    };
    invoices.set(triggeringInvoice.id, triggeringInvoice);

    const ignoredInvoiceId = nextId('invoice');
    const ignoredInvoice: MockInvoice = {
      id: ignoredInvoiceId,
      organizationId: DEMO_ORG_ID,
      invoiceNumber: nextInvoiceNumber('2024-03'),
      status: 'ISSUED',
      leaseId,
      tenantId: demoTenantId,
      unitId,
      propertyId,
      periodStart: '2024-03-01',
      periodEnd: '2024-03-31',
      dueDate: isoDateOffsetDays(3),
      graceUntilDate: null,
      issueDate: '2024-03-01',
      issuedAt: '2024-03-01T08:00:00.000Z',
      paidAt: null,
      cancelledAt: null,
      cancellationReason: null,
      notes: null,
      documentId: null,
      receiptId: null,
      createdAt: now,
      updatedAt: now,
      lines: [
        {
          id: nextId('invoiceline'),
          invoiceId: ignoredInvoiceId,
          lineType: 'RENT',
          label: 'Loyer de démonstration (sous le seuil de relance)',
          unitPriceAmount: 500,
          amount: 500,
          vatRateBps: 0,
          vatAmount: 0,
          isCredit: false,
          position: 0,
        },
      ],
      allocations: [],
    };
    invoices.set(ignoredInvoice.id, ignoredInvoice);
  }
}
