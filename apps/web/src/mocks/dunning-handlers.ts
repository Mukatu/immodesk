import { http, HttpResponse } from 'msw';

/**
 * Mock MSW — Phase 9 (relances), routes conformes à docs/api/phase9-contract.md.
 * Même principe que penalty-rules-handlers.ts / maintenance-handlers.ts : Maps
 * de tiers/patrimoine/facturation importées des autres modules, API_BASE
 * propre. Le moteur de scan (`triggerScan`) sélectionne la règle dont le
 * palier correspond EXACTEMENT au décalage de la facture (égalité stricte au
 * jour près), conformément au contrat. Il s'appuie sur `DUNNING_REFERENCE_TODAY`
 * (dunning-seed.ts) plutôt que l'horloge réelle : une égalité stricte contre
 * `new Date()` ne se déclencherait jamais de façon fiable pour des factures de
 * démonstration à échéance fixe, dont l'écart avec la date du jour grandit
 * indéfiniment. Voir le commentaire de `DUNNING_REFERENCE_TODAY`.
 */
import { API_BASE } from './api-base';
import {
  conflict,
  nextId,
  notFound,
  orgIdFromRequest,
  organizations,
  paginate,
  serializeTenant,
  tenants,
  unauthorizedOrg,
  type MockTenant,
} from './handlers';
import {
  invoices,
  computeInvoiceTotals,
  recalcInvoiceStatus,
  type MockInvoiceLine,
} from './billing-seed';
import { computePenalty, penaltyRules } from './penalty-rules-seed';
import {
  DUNNING_REFERENCE_TODAY,
  dunningPenaltyApplied,
  dunningRules,
  dunningRuns,
  seedDunningDemoData,
  type DunningTriggerMock,
  type MockDunningRule,
  type MockDunningRun,
  type NotificationChannelMock,
} from './dunning-seed';

export { seedDunningDemoData };

function serializeRule(rule: MockDunningRule) {
  const { organizationId: _organizationId, ...rest } = rule;
  return rest;
}

function serializeRun(run: MockDunningRun) {
  const { organizationId: _organizationId, tenantId, tenantDisplayName, ...rest } = run;
  return {
    ...rest,
    invoice: run.invoiceId ? { id: run.invoiceId, invoiceNumber: run.invoiceNumber } : null,
    tenant: { id: tenantId, displayName: tenantDisplayName },
  };
}

interface DunningRuleBody {
  name: string;
  stepOrder: number;
  triggerType?: DunningTriggerMock;
  offsetDays: number;
  channel?: NotificationChannelMock;
  fallbackChannel?: NotificationChannelMock;
  templateId?: string;
  minBalanceAmount?: number;
  notifyLandlord?: boolean;
  notifyCollector?: boolean;
  applyPenalty?: boolean;
  penaltyRuleId?: string;
  escalateToLegal?: boolean;
  sendHourLocal?: number;
  skipWeekends?: boolean;
  isActive?: boolean;
}

function stepOrderTaken(organizationId: string, stepOrder: number, excludeId?: string): boolean {
  return [...dunningRules.values()].some(
    (r) => r.organizationId === organizationId && r.stepOrder === stepOrder && r.id !== excludeId,
  );
}

export const dunningRuleHandlers = [
  http.get(`${API_BASE}/dunning-rules`, ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const items = [...dunningRules.values()]
      .filter((r) => r.organizationId === organizationId)
      .sort((a, b) => a.stepOrder - b.stepOrder)
      .map(serializeRule);
    return HttpResponse.json({ items });
  }),

  http.post(`${API_BASE}/dunning-rules`, async ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const body = (await request.json()) as DunningRuleBody;
    if (stepOrderTaken(organizationId, body.stepOrder)) {
      return conflict('DUNNING.STEP_ORDER_TAKEN', 'Ce rang de palier est déjà utilisé.');
    }
    const now = new Date().toISOString();
    const rule: MockDunningRule = {
      id: nextId('dunningrule'),
      organizationId,
      name: body.name,
      stepOrder: body.stepOrder,
      triggerType: body.triggerType ?? 'DAYS_AFTER_DUE',
      offsetDays: body.offsetDays,
      channel: body.channel ?? 'WHATSAPP',
      fallbackChannel: body.fallbackChannel,
      templateId: body.templateId,
      minBalanceAmount: body.minBalanceAmount ?? 0,
      notifyLandlord: body.notifyLandlord ?? false,
      notifyCollector: body.notifyCollector ?? false,
      applyPenalty: body.applyPenalty ?? false,
      penaltyRuleId: body.penaltyRuleId,
      escalateToLegal: body.escalateToLegal ?? false,
      sendHourLocal: body.sendHourLocal ?? 9,
      skipWeekends: body.skipWeekends ?? true,
      isActive: body.isActive ?? true,
      currency: 'XAF',
      createdAt: now,
      updatedAt: now,
    };
    dunningRules.set(rule.id, rule);
    return HttpResponse.json(serializeRule(rule), { status: 201 });
  }),

  http.patch(`${API_BASE}/dunning-rules/:id`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const rule = dunningRules.get(String(params.id));
    if (!rule || rule.organizationId !== organizationId) {
      return notFound('DUNNING.RULE_NOT_FOUND');
    }
    const body = (await request.json()) as Partial<DunningRuleBody>;
    if (body.stepOrder !== undefined && stepOrderTaken(organizationId, body.stepOrder, rule.id)) {
      return conflict('DUNNING.STEP_ORDER_TAKEN', 'Ce rang de palier est déjà utilisé.');
    }
    Object.assign(rule, body, { updatedAt: new Date().toISOString() });
    return HttpResponse.json(serializeRule(rule));
  }),

  // Un palier ne se supprime jamais : il se désactive (arbitrage 3 du contrat).
  http.post(`${API_BASE}/dunning-rules/:id/activate`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const rule = dunningRules.get(String(params.id));
    if (!rule || rule.organizationId !== organizationId) {
      return notFound('DUNNING.RULE_NOT_FOUND');
    }
    const body = (await request.json()) as { isActive: boolean };
    rule.isActive = body.isActive;
    rule.updatedAt = new Date().toISOString();
    return HttpResponse.json(serializeRule(rule));
  }),
];

export const dunningRunHandlers = [
  http.get(`${API_BASE}/dunning-runs`, ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const url = new URL(request.url);
    const ruleId = url.searchParams.get('ruleId');
    const invoiceId = url.searchParams.get('invoiceId');
    const tenantId = url.searchParams.get('tenantId');
    const status = url.searchParams.get('status');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const items = [...dunningRuns.values()]
      .filter((r) => r.organizationId === organizationId)
      .filter((r) => !ruleId || r.ruleId === ruleId)
      .filter((r) => !invoiceId || r.invoiceId === invoiceId)
      .filter((r) => !tenantId || r.tenantId === tenantId)
      .filter((r) => !status || r.status === status)
      .filter((r) => !from || r.runDate >= from)
      .filter((r) => !to || r.runDate <= to)
      .sort((a, b) => b.runDate.localeCompare(a.runDate) || b.createdAt.localeCompare(a.createdAt))
      .map(serializeRun);
    return HttpResponse.json(paginate(items));
  }),

  http.get(`${API_BASE}/dunning-runs/:id`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const run = dunningRuns.get(String(params.id));
    if (!run || run.organizationId !== organizationId) return notFound('DUNNING.RUN_NOT_FOUND');
    return HttpResponse.json(serializeRun(run));
  }),
];

function tenantChannelAvailable(tenant: MockTenant, channel: NotificationChannelMock): boolean {
  if (channel === 'WHATSAPP') return Boolean(tenant.whatsappPhone || tenant.primaryPhone);
  if (channel === 'SMS') return Boolean(tenant.primaryPhone);
  if (channel === 'EMAIL') return Boolean(tenant.email);
  return true;
}

function matchingRule(
  rules: MockDunningRule[],
  daysOverdue: number,
  invoiceStatus: string,
  issueDate: string,
  todayStr: string,
): MockDunningRule | null {
  // Égalité stricte au jour près (contrat : « la règle dont le palier
  // correspond exactement au décalage »), jamais une comparaison « au moins ».
  const matching = rules
    .filter((rule) => {
      if (rule.triggerType === 'DAYS_AFTER_DUE') return daysOverdue === rule.offsetDays;
      if (rule.triggerType === 'ON_OVERDUE') return invoiceStatus === 'OVERDUE';
      if (rule.triggerType === 'DAYS_BEFORE_DUE') return daysOverdue === -rule.offsetDays;
      return issueDate === todayStr; // ON_ISSUE
    })
    .sort((a, b) => b.stepOrder - a.stepOrder);
  return matching[0] ?? null;
}

/**
 * Rejoue le scan quotidien à la demande (`dryRun` : compte sans écrire).
 * Égalité stricte au jour près entre le retard et le décalage du palier, voir
 * l'en-tête du fichier. L'idempotence par jour (arbitrage 2) est respectée :
 * une facture ayant déjà reçu ce palier aujourd'hui est ignorée.
 */
function triggerScan(organizationId: string, dryRun: boolean) {
  const today = DUNNING_REFERENCE_TODAY;
  const todayStr = today.toISOString().slice(0, 10);
  let scanned = 0;
  let created = 0;
  let skipped = 0;
  const failed = 0;

  const activeRules = [...dunningRules.values()].filter(
    (r) => r.organizationId === organizationId && r.isActive,
  );
  const candidates = [...invoices.values()].filter(
    (inv) =>
      inv.organizationId === organizationId &&
      (inv.status === 'ISSUED' || inv.status === 'PARTIALLY_PAID' || inv.status === 'OVERDUE'),
  );

  for (const invoice of candidates) {
    scanned += 1;
    const totals = computeInvoiceTotals(invoice);
    if (totals.balanceAmount <= 0) continue; // Facture soldée : arrêt automatique.

    const daysOverdue = Math.floor(
      (today.getTime() - new Date(invoice.dueDate).getTime()) / 86_400_000,
    );
    const rule = matchingRule(
      activeRules,
      daysOverdue,
      invoice.status,
      invoice.issueDate,
      todayStr,
    );
    if (!rule) continue;

    const alreadyRunToday = [...dunningRuns.values()].some(
      (r) =>
        r.organizationId === organizationId &&
        r.ruleId === rule.id &&
        r.invoiceId === invoice.id &&
        r.runDate === todayStr &&
        r.status !== 'CANCELLED',
    );
    if (alreadyRunToday) {
      skipped += 1;
      continue;
    }

    const tenant = tenants.get(invoice.tenantId);
    const makeSkipped = (reason: string) => {
      skipped += 1;
      if (dryRun) return;
      const run: MockDunningRun = {
        id: nextId('dunningrun'),
        organizationId,
        ruleId: rule.id,
        ruleName: rule.name,
        stepOrder: rule.stepOrder,
        status: 'SKIPPED',
        runDate: todayStr,
        scheduledAt: today.toISOString(),
        executedAt: today.toISOString(),
        daysOverdue,
        balanceAmount: totals.balanceAmount,
        channel: rule.channel,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        tenantId: invoice.tenantId,
        tenantDisplayName: tenant ? serializeTenant(tenant).displayName : 'Locataire inconnu',
        notificationId: null,
        messageLogId: null,
        messageStatus: null,
        guarantorNotified: false,
        penaltyApplied: false,
        penaltyAmount: 0,
        penaltyInvoiceLineId: null,
        skipReason: reason,
        errorMessage: null,
        createdAt: today.toISOString(),
      };
      dunningRuns.set(run.id, run);
    };

    if (totals.balanceAmount < rule.minBalanceAmount) {
      makeSkipped('Solde sous le seuil minimum de la règle.');
      continue;
    }
    if (!tenant) {
      makeSkipped('Locataire introuvable.');
      continue;
    }
    const effectiveChannel = tenantChannelAvailable(tenant, rule.channel)
      ? rule.channel
      : rule.fallbackChannel && tenantChannelAvailable(tenant, rule.fallbackChannel)
        ? rule.fallbackChannel
        : null;
    if (!effectiveChannel) {
      makeSkipped('Aucun canal de contact disponible pour ce locataire.');
      continue;
    }

    if (dryRun) {
      created += 1;
      continue;
    }

    let penaltyApplied = false;
    let penaltyAmount = 0;
    let penaltyInvoiceLineId: string | null = null;
    if (rule.applyPenalty && rule.penaltyRuleId) {
      const penaltyKey = `${invoice.id}:${rule.penaltyRuleId}`;
      const penaltyRule = penaltyRules.get(rule.penaltyRuleId);
      if (penaltyRule && !dunningPenaltyApplied.has(penaltyKey)) {
        const calc = computePenalty(penaltyRule, totals.balanceAmount, Math.max(0, daysOverdue));
        if (calc.penaltyAmount > 0) {
          const line: MockInvoiceLine = {
            id: nextId('invoiceline'),
            invoiceId: invoice.id,
            lineType: 'PENALTY',
            label: `Pénalité de retard — ${rule.name}`,
            unitPriceAmount: calc.penaltyAmount,
            amount: calc.penaltyAmount,
            vatRateBps: 0,
            vatAmount: 0,
            isCredit: false,
            position: invoice.lines.length,
          };
          invoice.lines.push(line);
          recalcInvoiceStatus(invoice);
          dunningPenaltyApplied.add(penaltyKey);
          penaltyApplied = true;
          penaltyAmount = calc.penaltyAmount;
          penaltyInvoiceLineId = line.id;
        }
      }
    }

    const run: MockDunningRun = {
      id: nextId('dunningrun'),
      organizationId,
      ruleId: rule.id,
      ruleName: rule.name,
      stepOrder: rule.stepOrder,
      status: 'SENT',
      runDate: todayStr,
      scheduledAt: today.toISOString(),
      executedAt: today.toISOString(),
      daysOverdue,
      balanceAmount: totals.balanceAmount,
      channel: effectiveChannel,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      tenantId: invoice.tenantId,
      tenantDisplayName: serializeTenant(tenant).displayName,
      notificationId: nextId('notif'),
      messageLogId: nextId('msglog'),
      messageStatus: 'SENT',
      guarantorNotified: rule.escalateToLegal,
      penaltyApplied,
      penaltyAmount,
      penaltyInvoiceLineId,
      skipReason: null,
      errorMessage: null,
      createdAt: today.toISOString(),
    };
    dunningRuns.set(run.id, run);
    created += 1;
  }

  // Arrêt automatique : une facture désormais soldée annule ses relances en attente.
  for (const run of dunningRuns.values()) {
    if (run.organizationId !== organizationId || run.status !== 'PENDING' || !run.invoiceId)
      continue;
    const invoice = invoices.get(run.invoiceId);
    if (invoice && computeInvoiceTotals(invoice).balanceAmount <= 0) run.status = 'CANCELLED';
  }

  return { scanned, created, skipped, failed, dryRun };
}

export const dunningTriggerHandlers = [
  http.post(`${API_BASE}/organizations/:id/dunning-runs/trigger`, async ({ params, request }) => {
    const organizationId = String(params.id);
    if (!organizations.has(organizationId)) return notFound('ORG.NOT_FOUND');
    const body = (await request.json().catch(() => ({}))) as { dryRun?: boolean };
    const report = triggerScan(organizationId, Boolean(body.dryRun));
    return HttpResponse.json(report, { status: 202 });
  }),
];

export const dunningHandlers = [
  ...dunningRuleHandlers,
  ...dunningRunHandlers,
  ...dunningTriggerHandlers,
];
