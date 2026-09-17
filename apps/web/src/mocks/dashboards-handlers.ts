import { http, HttpResponse } from 'msw';

/**
 * Mock MSW — Phase 9 (tableaux de bord), routes conformes à
 * docs/api/phase9-contract.md. Quatre agrégats en lecture seule, calculés à
 * la volée sur les Maps en mémoire existantes (aucune nouvelle table), sur le
 * modèle du tableau de bord de facturation (`billing-handlers.ts`).
 */
import { API_BASE } from './api-base';
import {
  orgIdFromRequest,
  properties,
  serializeTenant,
  tenants,
  unauthorizedOrg,
  units,
} from './handlers';
import { computeInvoiceTotals, invoices } from './billing-seed';
import { leases } from './leases-seed';

function propertyIdsForFilter(
  organizationId: string,
  propertyId: string | null,
  landlordId: string | null,
): Set<string> | null {
  if (!propertyId && !landlordId) return null;
  const ids = [...properties.values()]
    .filter((p) => p.organizationId === organizationId)
    .filter((p) => !propertyId || p.id === propertyId)
    .filter((p) => !landlordId || p.landlordId === landlordId)
    .map((p) => p.id);
  return new Set(ids);
}

function dayOfMonth(date: string): string {
  return date.slice(0, 7);
}

export const dashboardsHandlers = [
  http.get(`${API_BASE}/dashboards/collection-rate`, ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const url = new URL(request.url);
    const from = url.searchParams.get('from') ?? '1970-01-01';
    const to = url.searchParams.get('to') ?? '2999-12-31';
    const propertyIds = propertyIdsForFilter(
      organizationId,
      url.searchParams.get('propertyId'),
      url.searchParams.get('landlordId'),
    );

    const scoped = [...invoices.values()].filter(
      (inv) =>
        inv.organizationId === organizationId &&
        inv.status !== 'CANCELLED' &&
        inv.status !== 'DRAFT' &&
        inv.periodStart >= from &&
        inv.periodStart <= to &&
        (!propertyIds || propertyIds.has(inv.propertyId)),
    );

    let dueAmount = 0;
    let collectedAmount = 0;
    const byMonth = new Map<string, { dueAmount: number; collectedAmount: number }>();
    const byProperty = new Map<
      string,
      { propertyId: string; name: string; dueAmount: number; collectedAmount: number }
    >();

    for (const invoice of scoped) {
      const totals = computeInvoiceTotals(invoice);
      dueAmount += totals.totalAmount;
      collectedAmount += totals.paidAmount;

      const month = dayOfMonth(invoice.periodStart);
      const monthEntry = byMonth.get(month) ?? { dueAmount: 0, collectedAmount: 0 };
      monthEntry.dueAmount += totals.totalAmount;
      monthEntry.collectedAmount += totals.paidAmount;
      byMonth.set(month, monthEntry);

      const property = properties.get(invoice.propertyId);
      const propEntry = byProperty.get(invoice.propertyId) ?? {
        propertyId: invoice.propertyId,
        name: property?.name ?? '—',
        dueAmount: 0,
        collectedAmount: 0,
      };
      propEntry.dueAmount += totals.totalAmount;
      propEntry.collectedAmount += totals.paidAmount;
      byProperty.set(invoice.propertyId, propEntry);
    }

    const rateBps = (due: number, collected: number) =>
      due > 0 ? Math.round((collected / due) * 10_000) : 0;

    return HttpResponse.json({
      from,
      to,
      dueAmount,
      collectedAmount,
      outstandingAmount: dueAmount - collectedAmount,
      collectionRateBps: rateBps(dueAmount, collectedAmount),
      series: [...byMonth.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([period, v]) => ({
          period,
          dueAmount: v.dueAmount,
          collectedAmount: v.collectedAmount,
          collectionRateBps: rateBps(v.dueAmount, v.collectedAmount),
        })),
      byProperty: [...byProperty.values()].map((p) => ({
        ...p,
        collectionRateBps: rateBps(p.dueAmount, p.collectedAmount),
      })),
    });
  }),

  http.get(`${API_BASE}/dashboards/arrears`, ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const url = new URL(request.url);
    const asOf = url.searchParams.get('asOf') ?? new Date().toISOString().slice(0, 10);
    const propertyIds = propertyIdsForFilter(
      organizationId,
      url.searchParams.get('propertyId'),
      url.searchParams.get('landlordId'),
    );
    const asOfDate = new Date(asOf);

    const overdue = [...invoices.values()]
      .filter(
        (inv) =>
          inv.organizationId === organizationId &&
          (inv.status === 'OVERDUE' ||
            inv.status === 'PARTIALLY_PAID' ||
            inv.status === 'ISSUED') &&
          inv.dueDate <= asOf &&
          (!propertyIds || propertyIds.has(inv.propertyId)),
      )
      .map((inv) => ({ inv, balance: computeInvoiceTotals(inv).balanceAmount }))
      .filter(({ balance }) => balance > 0);

    let totalAmount = 0;
    const buckets: Record<
      '0-30' | '31-60' | '61-90' | '90+',
      { amount: number; invoicesCount: number }
    > = {
      '0-30': { amount: 0, invoicesCount: 0 },
      '31-60': { amount: 0, invoicesCount: 0 },
      '61-90': { amount: 0, invoicesCount: 0 },
      '90+': { amount: 0, invoicesCount: 0 },
    };
    const byTenant = new Map<
      string,
      { amount: number; oldestDueDate: string; daysOverdue: number }
    >();

    for (const { inv, balance } of overdue) {
      totalAmount += balance;
      const daysOverdue = Math.floor(
        (asOfDate.getTime() - new Date(inv.dueDate).getTime()) / 86_400_000,
      );
      const label =
        daysOverdue <= 30
          ? '0-30'
          : daysOverdue <= 60
            ? '31-60'
            : daysOverdue <= 90
              ? '61-90'
              : '90+';
      buckets[label].amount += balance;
      buckets[label].invoicesCount += 1;

      const entry = byTenant.get(inv.tenantId) ?? {
        amount: 0,
        oldestDueDate: inv.dueDate,
        daysOverdue,
      };
      entry.amount += balance;
      if (inv.dueDate < entry.oldestDueDate) {
        entry.oldestDueDate = inv.dueDate;
        entry.daysOverdue = daysOverdue;
      }
      byTenant.set(inv.tenantId, entry);
    }

    const topDebtors = [...byTenant.entries()]
      .sort(([, a], [, b]) => b.amount - a.amount)
      .slice(0, 10)
      .map(([tenantId, entry]) => {
        const tenant = tenants.get(tenantId);
        return {
          tenantId,
          displayName: tenant ? serializeTenant(tenant).displayName : '—',
          phone: tenant?.primaryPhone ?? '—',
          amount: entry.amount,
          oldestDueDate: entry.oldestDueDate,
          daysOverdue: entry.daysOverdue,
        };
      });

    return HttpResponse.json({
      asOf,
      totalAmount,
      invoicesCount: overdue.length,
      buckets: (['0-30', '31-60', '61-90', '90+'] as const).map((label) => ({
        label,
        amount: buckets[label].amount,
        invoicesCount: buckets[label].invoicesCount,
      })),
      topDebtors,
    });
  }),

  http.get(`${API_BASE}/dashboards/vacancy`, ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const url = new URL(request.url);
    const asOf = url.searchParams.get('asOf') ?? new Date().toISOString().slice(0, 10);
    const propertyId = url.searchParams.get('propertyId');
    const asOfDate = new Date(asOf);

    const scopedUnits = [...units.values()].filter(
      (u) =>
        u.organizationId === organizationId &&
        !u.deletedAt &&
        (!propertyId || u.propertyId === propertyId),
    );

    const vacancyDaysFor = (unitId: string): number | null => {
      const lastEnded = [...leases.values()]
        .filter((l) => l.unitId === unitId && (l.moveOutDate || l.endDate))
        .map((l) => l.moveOutDate ?? l.endDate!)
        .sort()
        .pop();
      if (!lastEnded) return null;
      return Math.max(
        0,
        Math.floor((asOfDate.getTime() - new Date(lastEnded).getTime()) / 86_400_000),
      );
    };

    const byProperty = new Map<
      string,
      { propertyId: string; name: string; unitsCount: number; vacantCount: number }
    >();
    let occupiedCount = 0;
    const vacancyDurations: number[] = [];

    for (const unit of scopedUnits) {
      const isOccupied = unit.status === 'OCCUPIED';
      if (isOccupied) occupiedCount += 1;
      else {
        const days = vacancyDaysFor(unit.id);
        if (days !== null) vacancyDurations.push(days);
      }
      const property = properties.get(unit.propertyId);
      const entry = byProperty.get(unit.propertyId) ?? {
        propertyId: unit.propertyId,
        name: property?.name ?? '—',
        unitsCount: 0,
        vacantCount: 0,
      };
      entry.unitsCount += 1;
      if (!isOccupied) entry.vacantCount += 1;
      byProperty.set(unit.propertyId, entry);
    }

    const unitsCount = scopedUnits.length;
    const vacantCount = unitsCount - occupiedCount;
    const vacancyRateBps = unitsCount > 0 ? Math.round((vacantCount / unitsCount) * 10_000) : 0;
    const averageVacancyDays =
      vacancyDurations.length > 0
        ? Math.round(vacancyDurations.reduce((s, d) => s + d, 0) / vacancyDurations.length)
        : 0;

    return HttpResponse.json({
      asOf,
      unitsCount,
      occupiedCount,
      vacantCount,
      vacancyRateBps,
      averageVacancyDays,
      byProperty: [...byProperty.values()].map((p) => ({
        ...p,
        vacancyRateBps: p.unitsCount > 0 ? Math.round((p.vacantCount / p.unitsCount) * 10_000) : 0,
      })),
    });
  }),

  http.get(`${API_BASE}/dashboards/payment-methods`, ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const url = new URL(request.url);
    const from = url.searchParams.get('from') ?? '1970-01-01';
    const to = url.searchParams.get('to') ?? '2999-12-31';
    const propertyIds = propertyIdsForFilter(
      organizationId,
      url.searchParams.get('propertyId'),
      null,
    );

    const byMethod = new Map<string, { amount: number; count: number }>();
    let totalAmount = 0;

    for (const invoice of invoices.values()) {
      if (invoice.organizationId !== organizationId) continue;
      if (propertyIds && !propertyIds.has(invoice.propertyId)) continue;
      for (const allocation of invoice.allocations) {
        if (allocation.isReversal) continue;
        if (allocation.allocationDate < from || allocation.allocationDate > to) continue;
        const entry = byMethod.get(allocation.method) ?? { amount: 0, count: 0 };
        entry.amount += allocation.amount;
        entry.count += 1;
        byMethod.set(allocation.method, entry);
        totalAmount += allocation.amount;
      }
    }

    return HttpResponse.json({
      from,
      to,
      totalAmount,
      byMethod: [...byMethod.entries()].map(([method, v]) => ({
        method,
        amount: v.amount,
        count: v.count,
        shareBps: totalAmount > 0 ? Math.round((v.amount / totalAmount) * 10_000) : 0,
      })),
    });
  }),
];
