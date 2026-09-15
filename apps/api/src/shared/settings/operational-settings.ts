/**
 * Paramètres opérationnels de la phase 3, portés par
 * `organization_settings.settings_json` (docs/api/phase3-contract.md,
 * § « Paramètres d'organisation »).
 *
 * Domaine pur : lecture tolérante (toute clé absente ou mal typée reprend sa
 * valeur par défaut) et fusion non destructive — `settings_json` porte aussi
 * le gabarit de contrat de la phase 2, qu'une mise à jour des paramètres de
 * facturation ne doit jamais effacer.
 */
export type MessagingChannel = 'WHATSAPP' | 'SMS';

export interface BillingSettings {
  generateDaysBefore: number;
  autoIssue: boolean;
  defaultPenaltyRuleId: string | null;
  applyPenalties: boolean;
}

export interface CashSettings {
  collectorHoldingCapAmount: number;
  requireTenantSignature: boolean;
  denominationsEnabled: boolean;
}

export interface MessagingSettings {
  receiptChannelOrder: MessagingChannel[];
  sendCashReceiptToTenant: boolean;
  sendInvoiceIssued: boolean;
}

/** `settings_json.paymentMethods` (phase 4, docs/api/phase4-contract.md). */
export type MomoAggregatorProvider = 'SIMULATOR' | 'CINETPAY';
export type FeeBearerChoice = 'TENANT' | 'ORGANIZATION';

export interface MobileMoneyDeclaredSettings {
  enabled: boolean;
}

export interface MobileMoneyAggregatorSettings {
  enabled: boolean;
  provider: MomoAggregatorProvider;
  feeBearer: FeeBearerChoice;
  feeRateBps: number;
  minAmount: number;
  maxAmount: number;
}

export interface BankTransferSettings {
  enabled: boolean;
  confirmOnApproval: boolean;
}

export interface PaymentMethodsSettings {
  mobileMoneyDeclared: MobileMoneyDeclaredSettings;
  mobileMoneyAggregator: MobileMoneyAggregatorSettings;
  bankTransfer: BankTransferSettings;
  pendingExpiryMinutes: number;
}

/** `settings_json.reconciliation` (phase 6, rapprochement bancaire/chèques). */
export interface ReconciliationSettings {
  suggestionThreshold: number;
  dateWindowDays: number;
  amountTolerancePercent: number;
  autoConfirmExact: boolean;
  checkClearingAlertDays: number;
  bounceFeeAmount: number;
}

export interface OperationalSettings {
  billing: BillingSettings;
  cash: CashSettings;
  messaging: MessagingSettings;
  paymentMethods: PaymentMethodsSettings;
  reconciliation: ReconciliationSettings;
}

export type OperationalSettingsPatch = {
  billing?: Partial<BillingSettings>;
  cash?: Partial<CashSettings>;
  messaging?: Partial<MessagingSettings>;
  paymentMethods?: {
    mobileMoneyDeclared?: Partial<MobileMoneyDeclaredSettings>;
    mobileMoneyAggregator?: Partial<MobileMoneyAggregatorSettings>;
    bankTransfer?: Partial<BankTransferSettings>;
    pendingExpiryMinutes?: number;
  };
  reconciliation?: Partial<ReconciliationSettings>;
};

export const DEFAULT_OPERATIONAL_SETTINGS: Readonly<OperationalSettings> =
  Object.freeze<OperationalSettings>({
    billing: {
      generateDaysBefore: 5,
      autoIssue: true,
      defaultPenaltyRuleId: null,
      applyPenalties: false,
    },
    cash: {
      collectorHoldingCapAmount: 500_000,
      requireTenantSignature: true,
      denominationsEnabled: false,
    },
    messaging: {
      receiptChannelOrder: ['WHATSAPP', 'SMS'],
      sendCashReceiptToTenant: true,
      sendInvoiceIssued: true,
    },
    paymentMethods: {
      mobileMoneyDeclared: { enabled: true },
      mobileMoneyAggregator: {
        enabled: false,
        provider: 'SIMULATOR',
        feeBearer: 'TENANT',
        feeRateBps: 300,
        minAmount: 500,
        maxAmount: 2_000_000,
      },
      bankTransfer: { enabled: true, confirmOnApproval: true },
      pendingExpiryMinutes: 120,
    },
    reconciliation: {
      suggestionThreshold: 75,
      dateWindowDays: 15,
      amountTolerancePercent: 2,
      autoConfirmExact: true,
      checkClearingAlertDays: 15,
      bounceFeeAmount: 0,
    },
  });

const CHANNELS: readonly MessagingChannel[] = ['WHATSAPP', 'SMS'];

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function int(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
    ? value
    : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function num(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
    ? value
    : fallback;
}

/** Comme `int`, mais borne (clamp) une valeur hors intervalle au lieu de la rejeter. */
function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function channels(value: unknown, fallback: MessagingChannel[]): MessagingChannel[] {
  if (!Array.isArray(value)) return [...fallback];
  const picked = value.filter((v): v is MessagingChannel => CHANNELS.includes(v));
  const unique = [...new Set(picked)];
  return unique.length > 0 ? unique : [...fallback];
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

const MOMO_PROVIDERS: readonly MomoAggregatorProvider[] = ['SIMULATOR', 'CINETPAY'];
const FEE_BEARER_CHOICES: readonly FeeBearerChoice[] = ['TENANT', 'ORGANIZATION'];

function readPaymentMethods(root: Record<string, unknown>): PaymentMethodsSettings {
  const section = asObject(root.paymentMethods);
  const declared = asObject(section.mobileMoneyDeclared);
  const aggregator = asObject(section.mobileMoneyAggregator);
  const transfer = asObject(section.bankTransfer);
  const d = DEFAULT_OPERATIONAL_SETTINGS.paymentMethods;
  return {
    mobileMoneyDeclared: { enabled: bool(declared.enabled, d.mobileMoneyDeclared.enabled) },
    mobileMoneyAggregator: {
      enabled: bool(aggregator.enabled, d.mobileMoneyAggregator.enabled),
      provider: oneOf(aggregator.provider, MOMO_PROVIDERS, d.mobileMoneyAggregator.provider),
      feeBearer: oneOf(aggregator.feeBearer, FEE_BEARER_CHOICES, d.mobileMoneyAggregator.feeBearer),
      feeRateBps: int(aggregator.feeRateBps, d.mobileMoneyAggregator.feeRateBps, 0, 10_000),
      minAmount: int(aggregator.minAmount, d.mobileMoneyAggregator.minAmount, 0, 100_000_000),
      maxAmount: int(aggregator.maxAmount, d.mobileMoneyAggregator.maxAmount, 0, 100_000_000),
    },
    bankTransfer: {
      enabled: bool(transfer.enabled, d.bankTransfer.enabled),
      confirmOnApproval: bool(transfer.confirmOnApproval, d.bankTransfer.confirmOnApproval),
    },
    pendingExpiryMinutes: int(section.pendingExpiryMinutes, d.pendingExpiryMinutes, 5, 10_080),
  };
}

function readReconciliation(root: Record<string, unknown>): ReconciliationSettings {
  const section = asObject(root.reconciliation);
  const d = DEFAULT_OPERATIONAL_SETTINGS.reconciliation;
  return {
    suggestionThreshold: clampInt(section.suggestionThreshold, d.suggestionThreshold, 50, 95),
    dateWindowDays: int(section.dateWindowDays, d.dateWindowDays, 0, 365),
    amountTolerancePercent: num(section.amountTolerancePercent, d.amountTolerancePercent, 0, 100),
    autoConfirmExact: bool(section.autoConfirmExact, d.autoConfirmExact),
    checkClearingAlertDays: int(section.checkClearingAlertDays, d.checkClearingAlertDays, 0, 365),
    bounceFeeAmount: int(section.bounceFeeAmount, d.bounceFeeAmount, 0, Number.MAX_SAFE_INTEGER),
  };
}

/**
 * Lit les paramètres opérationnels. `defaultPenaltyRuleId` vient de la
 * colonne `default_penalty_rule_id` quand elle est fournie : la clé
 * étrangère la tient à jour (ON DELETE SET NULL), là où le JSON garderait un
 * identifiant périmé.
 */
export function readOperationalSettings(
  settingsJson: unknown,
  defaultPenaltyRuleColumn?: string | null,
): OperationalSettings {
  const root = asObject(settingsJson);
  const billing = asObject(root.billing);
  const cash = asObject(root.cash);
  const messaging = asObject(root.messaging);
  const d = DEFAULT_OPERATIONAL_SETTINGS;

  return {
    billing: {
      generateDaysBefore: int(billing.generateDaysBefore, d.billing.generateDaysBefore, 0, 60),
      autoIssue: bool(billing.autoIssue, d.billing.autoIssue),
      defaultPenaltyRuleId:
        defaultPenaltyRuleColumn !== undefined
          ? defaultPenaltyRuleColumn
          : typeof billing.defaultPenaltyRuleId === 'string'
            ? billing.defaultPenaltyRuleId
            : null,
      applyPenalties: bool(billing.applyPenalties, d.billing.applyPenalties),
    },
    cash: {
      collectorHoldingCapAmount: int(
        cash.collectorHoldingCapAmount,
        d.cash.collectorHoldingCapAmount,
        0,
        Number.MAX_SAFE_INTEGER,
      ),
      requireTenantSignature: bool(cash.requireTenantSignature, d.cash.requireTenantSignature),
      denominationsEnabled: bool(cash.denominationsEnabled, d.cash.denominationsEnabled),
    },
    messaging: {
      receiptChannelOrder: channels(messaging.receiptChannelOrder, d.messaging.receiptChannelOrder),
      sendCashReceiptToTenant: bool(
        messaging.sendCashReceiptToTenant,
        d.messaging.sendCashReceiptToTenant,
      ),
      sendInvoiceIssued: bool(messaging.sendInvoiceIssued, d.messaging.sendInvoiceIssued),
    },
    paymentMethods: readPaymentMethods(root),
    reconciliation: readReconciliation(root),
  };
}

/**
 * Fusionne un correctif dans `settings_json` en conservant toutes les autres
 * clés (gabarit de contrat, réglages futurs). Rend un NOUVEL objet.
 */
export function mergeOperationalSettings(
  settingsJson: unknown,
  patch: OperationalSettingsPatch,
): Record<string, unknown> {
  const root = { ...asObject(settingsJson) };
  const current = readOperationalSettings(root);
  for (const section of ['billing', 'cash', 'messaging'] as const) {
    const changes = patch[section];
    if (!changes) continue;
    const defined = Object.fromEntries(
      Object.entries(changes).filter(([, value]) => value !== undefined),
    );
    root[section] = { ...current[section], ...defined };
  }
  const pm = patch.paymentMethods;
  if (pm) {
    root.paymentMethods = {
      mobileMoneyDeclared: {
        ...current.paymentMethods.mobileMoneyDeclared,
        ...pm.mobileMoneyDeclared,
      },
      mobileMoneyAggregator: {
        ...current.paymentMethods.mobileMoneyAggregator,
        ...pm.mobileMoneyAggregator,
      },
      bankTransfer: { ...current.paymentMethods.bankTransfer, ...pm.bankTransfer },
      pendingExpiryMinutes: pm.pendingExpiryMinutes ?? current.paymentMethods.pendingExpiryMinutes,
    };
  }
  const reconciliation = patch.reconciliation;
  if (reconciliation) {
    const defined = Object.fromEntries(
      Object.entries(reconciliation).filter(([, value]) => value !== undefined),
    );
    const merged = { ...current.reconciliation, ...defined };
    merged.suggestionThreshold = Math.min(95, Math.max(50, merged.suggestionThreshold));
    root.reconciliation = merged;
  }
  return root;
}
