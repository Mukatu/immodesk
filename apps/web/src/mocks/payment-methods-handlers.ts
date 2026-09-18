import { http, HttpResponse } from 'msw';

/**
 * Mock MSW — Phase 4, paramètres de méthodes de paiement et instructions de
 * paiement, conformes à docs/api/phase4-contract.md. Même principe que
 * payments-handlers.ts : Maps importées depuis leur module de seed, API_BASE
 * depuis son propre module. Aucun contrôle de rôle : suit la convention déjà
 * en place (organizations/:id/settings, payments-handlers.ts, etc.) où seule
 * l'appartenance à l'organisation est vérifiée, jamais le rôle du membre.
 */
import { API_BASE } from './api-base';
import {
  bankAccounts,
  notFound,
  orgIdFromRequest,
  organizations,
  unauthorizedOrg,
} from './handlers';
import { computeInvoiceTotals, invoices } from './billing-seed';
import { leases } from './leases-seed';
import {
  getOrInitPaymentMethodsSettings,
  paymentMethodsSettings,
  platformFlags,
  type MockPaymentMethodsSettings,
} from './payments-phase4-seed';

export { seedPaymentsPhase4DemoData } from './payments-phase4-seed';

const OPEN_INVOICE_STATUSES = ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'];

function serializeSettings(settings: MockPaymentMethodsSettings) {
  return { ...settings, aggregatorAvailable: platformFlags.mobileMoneyAggregatorEnabled };
}

/** Comptes actifs du bailleur du bail si disponibles, sinon ceux de l'organisation. */
function bankAccountsFor(organizationId: string, landlordId: string | null) {
  const active = [...bankAccounts.values()].filter(
    (a) => a.organizationId === organizationId && a.isActive,
  );
  const landlordAccounts = landlordId
    ? active.filter((a) => a.holderType === 'LANDLORD' && a.landlordId === landlordId)
    : [];
  return landlordAccounts.length > 0
    ? landlordAccounts
    : active.filter((a) => a.holderType === 'ORGANIZATION');
}

/** Exporté pour tenant-portal-handlers.ts (résolution sans `orgIdFromRequest`, voir écart signalé). */
export function buildPaymentInstructions(params: {
  organizationId: string;
  landlordId: string | null;
  transferReference: string | null;
  invoice: { id: string; invoiceNumber: string | null; balanceAmount: number } | null;
}) {
  const { organizationId, landlordId, transferReference, invoice } = params;
  const accounts = bankAccountsFor(organizationId, landlordId);
  const settings = getOrInitPaymentMethodsSettings(organizationId);
  return {
    transferReference,
    invoice,
    bankAccounts: accounts
      .filter((a) => a.accountNumber || a.iban)
      .map((a) => ({
        id: a.id,
        bankName: a.bankName,
        accountHolderName: a.accountHolderName,
        accountNumber: a.accountNumber ?? null,
        ribKey: a.ribKey ?? null,
        iban: a.iban ?? null,
      })),
    mobileMoneyNumbers: accounts
      .filter((a) => a.momoProvider && a.momoMsisdn)
      .map((a) => ({
        bankAccountId: a.id,
        provider: a.momoProvider!,
        msisdn: a.momoMsisdn!,
        holderName: a.accountHolderName,
      })),
    aggregatorAvailable:
      platformFlags.mobileMoneyAggregatorEnabled && settings.mobileMoneyAggregator.enabled,
  };
}

export const paymentMethodsHandlers = [
  http.get(`${API_BASE}/organizations/:id/payment-methods`, ({ params }) => {
    const orgId = String(params.id);
    if (!organizations.has(orgId)) return notFound('ORG.NOT_FOUND');
    return HttpResponse.json(serializeSettings(getOrInitPaymentMethodsSettings(orgId)));
  }),

  http.patch(`${API_BASE}/organizations/:id/payment-methods`, async ({ params, request }) => {
    const orgId = String(params.id);
    if (!organizations.has(orgId)) return notFound('ORG.NOT_FOUND');
    const current = getOrInitPaymentMethodsSettings(orgId);
    const body = (await request.json()) as Partial<MockPaymentMethodsSettings>;
    const updated: MockPaymentMethodsSettings = {
      ...current,
      ...body,
      mobileMoneyDeclared: { ...current.mobileMoneyDeclared, ...(body.mobileMoneyDeclared ?? {}) },
      mobileMoneyAggregator: {
        ...current.mobileMoneyAggregator,
        ...(body.mobileMoneyAggregator ?? {}),
      },
      bankTransfer: { ...current.bankTransfer, ...(body.bankTransfer ?? {}) },
    };
    paymentMethodsSettings.set(orgId, updated);
    return HttpResponse.json(serializeSettings(updated));
  }),

  http.get(`${API_BASE}/invoices/:id/payment-instructions`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const invoice = invoices.get(String(params.id));
    if (!invoice || invoice.organizationId !== organizationId) {
      return notFound('BILLING.INVOICE_NOT_FOUND');
    }
    const lease = leases.get(invoice.leaseId);
    const totals = computeInvoiceTotals(invoice);
    return HttpResponse.json(
      buildPaymentInstructions({
        organizationId,
        landlordId: lease?.landlordId ?? null,
        transferReference: invoice.invoiceNumber,
        invoice: {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          balanceAmount: totals.balanceAmount,
        },
      }),
    );
  }),

  http.get(`${API_BASE}/leases/:id/payment-instructions`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const lease = leases.get(String(params.id));
    if (!lease || lease.organizationId !== organizationId) {
      return notFound('LEASES.NOT_FOUND');
    }
    const openInvoice = [...invoices.values()]
      .filter((i) => i.leaseId === lease.id && OPEN_INVOICE_STATUSES.includes(i.status))
      .sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0))[0];
    const totals = openInvoice ? computeInvoiceTotals(openInvoice) : null;
    return HttpResponse.json(
      buildPaymentInstructions({
        organizationId,
        landlordId: lease.landlordId,
        transferReference: openInvoice?.invoiceNumber ?? null,
        invoice: openInvoice
          ? {
              id: openInvoice.id,
              invoiceNumber: openInvoice.invoiceNumber,
              balanceAmount: totals!.balanceAmount,
            }
          : null,
      }),
    );
  }),
];
