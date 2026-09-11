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

export interface OperationalSettings {
  billing: BillingSettings;
  cash: CashSettings;
  messaging: MessagingSettings;
}

export type OperationalSettingsPatch = {
  billing?: Partial<BillingSettings>;
  cash?: Partial<CashSettings>;
  messaging?: Partial<MessagingSettings>;
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

function channels(value: unknown, fallback: MessagingChannel[]): MessagingChannel[] {
  if (!Array.isArray(value)) return [...fallback];
  const picked = value.filter((v): v is MessagingChannel => CHANNELS.includes(v));
  const unique = [...new Set(picked)];
  return unique.length > 0 ? unique : [...fallback];
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
  return root;
}
