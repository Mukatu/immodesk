import { http, HttpResponse } from 'msw';

/**
 * Mock MSW — Phase 8 (compteurs, relevés, grilles tarifaires, campagnes de
 * refacturation), routes conformes à docs/api/phase8-contract.md. Suit le
 * principe d'agency-handlers.ts : API_BASE depuis son propre module, helpers
 * et Maps de tiers/patrimoine/baux/facturation importés des autres modules.
 */
import { API_BASE } from './api-base';
import {
  badRequest,
  conflict,
  nextId,
  notFound,
  orgIdFromRequest,
  paginate,
  unauthorizedOrg,
  units,
} from './handlers';
import { leases } from './leases-seed';
import { invoices, type MockInvoiceLine } from './billing-seed';
import {
  invoiceLineTypeForMeterType,
  meterReadings,
  meters,
  utilityRuns,
  utilityTariffs,
  type MeterTypeMock,
  type MockMeter,
  type MockMeterReading,
  type MockUtilityTariff,
  type TariffBasisMock,
} from './facilities-seed';

function unprocessable(code: string, message: string) {
  return HttpResponse.json({ code, message }, { status: 422 });
}

function findLastReading(meterId: string): MockMeterReading | null {
  return (
    [...meterReadings.values()]
      .filter((r) => r.meterId === meterId)
      .sort((a, b) => b.readingDate.localeCompare(a.readingDate))[0] ?? null
  );
}

function meterView(meter: MockMeter) {
  const { organizationId: _organizationId, ...rest } = meter;
  const last = findLastReading(meter.id);
  return {
    ...rest,
    lastReading: last ? { readingDate: last.readingDate, currentIndex: last.currentIndex } : null,
  };
}

function readingView(reading: MockMeterReading) {
  const { organizationId: _organizationId, ...rest } = reading;
  return rest;
}

function tariffView(tariff: MockUtilityTariff) {
  const { organizationId: _organizationId, ...rest } = tariff;
  return { ...rest, currency: 'XAF' as const };
}

/** Le tarif applicable est celui du compteur, sinon la grille active du bien à la date du relevé. */
function findApplicableTariff(
  meter: MockMeter,
  atDate: string,
  organizationId: string,
): MockUtilityTariff | null {
  if (meter.tariffId) {
    const direct = utilityTariffs.get(meter.tariffId);
    if (direct) return direct;
  }
  const candidates = [...utilityTariffs.values()]
    .filter((t) => t.organizationId === organizationId && t.meterType === meter.meterType)
    .filter((t) => !t.propertyId || t.propertyId === meter.propertyId)
    .filter((t) => t.effectiveFrom <= atDate && (!t.effectiveTo || t.effectiveTo >= atDate))
    .sort((a, b) => (a.propertyId ? 0 : 1) - (b.propertyId ? 0 : 1));
  return candidates[0] ?? null;
}

function computeReadingAmount(
  meter: MockMeter,
  tariff: MockUtilityTariff | null,
  consumption: number,
): { unitPriceAmount: number; computedAmount: number } {
  if (!tariff) return { unitPriceAmount: 0, computedAmount: 0 };
  let base: number;
  switch (tariff.basis as TariffBasisMock) {
    case 'PER_UNIT_CONSUMED':
      base = consumption * tariff.unitPriceAmount;
      break;
    case 'PER_SQUARE_METER': {
      const unit = meter.unitId ? units.get(meter.unitId) : undefined;
      base = (unit?.areaSqm ?? 0) * tariff.unitPriceAmount;
      break;
    }
    case 'SHARED_PRORATA':
      base = (consumption * tariff.unitPriceAmount * (meter.sharedRatioBps ?? 10_000)) / 10_000;
      break;
    case 'FLAT_MONTHLY':
    case 'PER_OCCUPANT':
    default:
      base = tariff.flatAmount;
      break;
  }
  const total = Math.max(base + tariff.standingChargeAmount, tariff.minimumAmount);
  return { unitPriceAmount: tariff.unitPriceAmount, computedAmount: Math.ceil(total) };
}

export const metersHandlers = [
  http.post(`${API_BASE}/meters`, async ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const body = (await request.json()) as {
      propertyId: string;
      unitId?: string;
      meterType: MeterTypeMock;
      serialNumber: string;
      subscriberNumber?: string;
      providerName?: string;
      isPrepaid?: boolean;
      isShared?: boolean;
      sharedRatioBps?: number;
      measurementUnit?: string;
      digitsCount?: number;
      initialIndex?: number;
      tariffId?: string;
      installedAt?: string;
    };
    const taken = [...meters.values()].find(
      (m) => m.organizationId === organizationId && m.serialNumber === body.serialNumber,
    );
    if (taken) return conflict('METERS.SERIAL_TAKEN', 'Numéro de série déjà enregistré.');
    const meter: MockMeter = {
      id: nextId('meter'),
      organizationId,
      propertyId: body.propertyId,
      unitId: body.unitId,
      meterType: body.meterType,
      serialNumber: body.serialNumber,
      subscriberNumber: body.subscriberNumber,
      providerName: body.providerName,
      isPrepaid: body.isPrepaid ?? false,
      isShared: body.isShared ?? false,
      sharedRatioBps: body.sharedRatioBps,
      measurementUnit: body.measurementUnit,
      digitsCount: body.digitsCount ?? 5,
      initialIndex: body.initialIndex ?? 0,
      tariffId: body.tariffId,
      installedAt: body.installedAt,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    meters.set(meter.id, meter);
    return HttpResponse.json(meterView(meter), { status: 201 });
  }),

  http.get(`${API_BASE}/meters`, ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const url = new URL(request.url);
    const propertyId = url.searchParams.get('propertyId');
    const unitId = url.searchParams.get('unitId');
    const type = url.searchParams.get('type');
    const items = [...meters.values()]
      .filter((m) => m.organizationId === organizationId)
      .filter((m) => !propertyId || m.propertyId === propertyId)
      .filter((m) => !unitId || m.unitId === unitId)
      .filter((m) => !type || m.meterType === type)
      .map(meterView);
    return HttpResponse.json(paginate(items));
  }),

  http.patch(`${API_BASE}/meters/:id`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const meter = meters.get(String(params.id));
    if (!meter || meter.organizationId !== organizationId) return notFound('METERS.NOT_FOUND');
    const body = (await request.json()) as Partial<Omit<MockMeter, 'id' | 'organizationId'>>;
    Object.assign(meter, body);
    return HttpResponse.json(meterView(meter));
  }),

  http.post(`${API_BASE}/meters/:id/readings`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const meter = meters.get(String(params.id));
    if (!meter || meter.organizationId !== organizationId) return notFound('METERS.NOT_FOUND');
    const body = (await request.json()) as {
      readingDate: string;
      currentIndex: number;
      periodStart?: string;
      periodEnd?: string;
      rolloverApplied?: boolean;
      isEstimated?: boolean;
      photoDocumentId?: string;
      notes?: string;
      clientRef: string;
    };
    const existingByClientRef = [...meterReadings.values()].find(
      (r) => r.meterId === meter.id && r.clientRef === body.clientRef,
    );
    if (existingByClientRef) return HttpResponse.json(readingView(existingByClientRef));
    const duplicateDate = [...meterReadings.values()].find(
      (r) => r.meterId === meter.id && r.readingDate === body.readingDate,
    );
    if (duplicateDate) {
      return conflict(
        'METERS.READING_DUPLICATE_DATE',
        'Un relevé existe déjà à cette date pour ce compteur.',
      );
    }
    const last = findLastReading(meter.id);
    const previousIndex = last ? last.currentIndex : meter.initialIndex;
    let consumption: number;
    if (body.currentIndex < previousIndex) {
      if (!body.rolloverApplied) {
        return unprocessable(
          'METERS.INDEX_REGRESSION',
          "L'index saisi est inférieur au précédent : cochez le passage par zéro ou corrigez la saisie.",
        );
      }
      const capacity = 10 ** meter.digitsCount;
      consumption = capacity - previousIndex + body.currentIndex;
    } else {
      consumption = body.currentIndex - previousIndex;
    }
    const tariff = meter.isPrepaid
      ? null
      : findApplicableTariff(meter, body.readingDate, organizationId);
    const { unitPriceAmount, computedAmount } = computeReadingAmount(meter, tariff, consumption);
    const activeLease = meter.unitId
      ? [...leases.values()].find((l) => l.unitId === meter.unitId && l.status === 'ACTIVE')
      : undefined;
    const reading: MockMeterReading = {
      id: nextId('meterreading'),
      organizationId,
      meterId: meter.id,
      unitId: meter.unitId ?? null,
      leaseId: activeLease?.id ?? null,
      readingDate: body.readingDate,
      currentIndex: body.currentIndex,
      previousIndex,
      consumption,
      periodStart: body.periodStart,
      periodEnd: body.periodEnd,
      rolloverApplied: body.rolloverApplied ?? false,
      isEstimated: body.isEstimated ?? false,
      photoDocumentId: body.photoDocumentId,
      notes: body.notes,
      clientRef: body.clientRef,
      tariffId: tariff?.id ?? null,
      unitPriceAmount,
      computedAmount,
      isInvoiced: false,
      invoiceLineId: null,
      recordedByUserId: null,
      createdAt: new Date().toISOString(),
    };
    meterReadings.set(reading.id, reading);
    return HttpResponse.json(readingView(reading), { status: 201 });
  }),

  http.get(`${API_BASE}/meters/:id/readings`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const meter = meters.get(String(params.id));
    if (!meter || meter.organizationId !== organizationId) return notFound('METERS.NOT_FOUND');
    const url = new URL(request.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const items = [...meterReadings.values()]
      .filter((r) => r.meterId === meter.id)
      .filter((r) => !from || r.readingDate >= from)
      .filter((r) => !to || r.readingDate <= to)
      .sort((a, b) => a.readingDate.localeCompare(b.readingDate));
    return HttpResponse.json({
      ...paginate(items.map(readingView)),
      consumptionSeries: items.map((r) => ({
        readingDate: r.readingDate,
        consumption: r.consumption,
        computedAmount: r.computedAmount,
      })),
    });
  }),

  http.patch(`${API_BASE}/meter-readings/:id`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const reading = meterReadings.get(String(params.id));
    if (!reading || reading.organizationId !== organizationId) {
      return notFound('METERS.READING_NOT_FOUND');
    }
    if (reading.isInvoiced) {
      return badRequest('METERS.READING_ALREADY_INVOICED', 'Ce relevé est déjà facturé.');
    }
    const body = (await request.json()) as { isEstimated: false; notes?: string };
    reading.isEstimated = body.isEstimated;
    if (body.notes !== undefined) reading.notes = body.notes;
    return HttpResponse.json(readingView(reading));
  }),
];

export const utilityTariffsHandlers = [
  http.get(`${API_BASE}/utility-tariffs`, ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const url = new URL(request.url);
    const propertyId = url.searchParams.get('propertyId');
    const meterType = url.searchParams.get('meterType');
    const activeOnly = url.searchParams.get('activeOnly') === 'true';
    const items = [...utilityTariffs.values()]
      .filter((t) => t.organizationId === organizationId)
      .filter((t) => !propertyId || t.propertyId === propertyId)
      .filter((t) => !meterType || t.meterType === meterType)
      .filter((t) => !activeOnly || t.isActive)
      .map(tariffView);
    return HttpResponse.json({ items });
  }),

  http.post(`${API_BASE}/utility-tariffs`, async ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const body = (await request.json()) as {
      propertyId?: string;
      meterType: MeterTypeMock;
      basis?: TariffBasisMock;
      label: string;
      unitPriceAmount?: number;
      flatAmount?: number;
      standingChargeAmount?: number;
      minimumAmount?: number;
      measurementUnit?: string;
      invoiceLineType?: 'WATER_CHARGE' | 'ELECTRICITY_CHARGE';
      effectiveFrom: string;
      effectiveTo?: string;
    };
    const tariff: MockUtilityTariff = {
      id: nextId('tariff'),
      organizationId,
      propertyId: body.propertyId,
      meterType: body.meterType,
      basis: body.basis ?? 'PER_UNIT_CONSUMED',
      label: body.label,
      unitPriceAmount: body.unitPriceAmount ?? 0,
      flatAmount: body.flatAmount ?? 0,
      standingChargeAmount: body.standingChargeAmount ?? 0,
      minimumAmount: body.minimumAmount ?? 0,
      measurementUnit: body.measurementUnit,
      invoiceLineType: body.invoiceLineType ?? invoiceLineTypeForMeterType(body.meterType),
      effectiveFrom: body.effectiveFrom,
      effectiveTo: body.effectiveTo,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    utilityTariffs.set(tariff.id, tariff);
    return HttpResponse.json(tariffView(tariff), { status: 201 });
  }),

  http.patch(`${API_BASE}/utility-tariffs/:id`, async ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const tariff = utilityTariffs.get(String(params.id));
    if (!tariff || tariff.organizationId !== organizationId) {
      return notFound('TARIFFS.NOT_FOUND');
    }
    const body = (await request.json()) as Partial<
      Omit<MockUtilityTariff, 'id' | 'organizationId'>
    >;
    Object.assign(tariff, body);
    return HttpResponse.json(tariffView(tariff));
  }),
];

/**
 * Valorise tous les relevés non facturés de la période et crée une ligne
 * WATER_CHARGE/ELECTRICITY_CHARGE dans la facture ouverte du bail concerné.
 * Simplification assumée pour ce mock (pas de backend réel) : si aucune
 * facture ouverte (DRAFT/ISSUED/PARTIALLY_PAID/OVERDUE) n'existe pour le bail,
 * le relevé est reporté en erreur plutôt que de créer une facture ad hoc —
 * le contrat prévoit « la prochaine facture à émettre », hors périmètre de
 * cette tranche de fondations.
 */
export const utilityRunsHandlers = [
  http.post(`${API_BASE}/billing/utility-runs`, async ({ request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const body = (await request.json()) as {
      periodStart: string;
      periodEnd: string;
      meterType?: MeterTypeMock;
      propertyId?: string;
      dryRun?: boolean;
    };
    const created: string[] = [];
    const skipped: { unitId: string; propertyId: string; reason: string }[] = [];
    const errors: { meterId?: string; unitId?: string; reason: string }[] = [];
    const candidateMeters = [...meters.values()].filter(
      (m) =>
        m.organizationId === organizationId &&
        !m.isPrepaid &&
        (!body.meterType || m.meterType === body.meterType) &&
        (!body.propertyId || m.propertyId === body.propertyId),
    );
    for (const meter of candidateMeters) {
      const pending = [...meterReadings.values()].filter(
        (r) =>
          r.meterId === meter.id &&
          !r.isInvoiced &&
          !r.isEstimated &&
          r.readingDate >= body.periodStart &&
          r.readingDate <= body.periodEnd,
      );
      if (pending.length === 0) {
        skipped.push({
          unitId: meter.unitId ?? '',
          propertyId: meter.propertyId,
          reason: 'Aucun relevé exploitable sur la période.',
        });
        continue;
      }
      for (const reading of pending) {
        if (!reading.leaseId) {
          errors.push({ meterId: meter.id, reason: 'Aucun bail actif pour ce lot.' });
          continue;
        }
        const openInvoice = [...invoices.values()]
          .filter(
            (inv) =>
              inv.leaseId === reading.leaseId &&
              (inv.status === 'DRAFT' ||
                inv.status === 'ISSUED' ||
                inv.status === 'PARTIALLY_PAID' ||
                inv.status === 'OVERDUE'),
          )
          .sort((a, b) => b.periodStart.localeCompare(a.periodStart))[0];
        if (!openInvoice) {
          errors.push({ meterId: meter.id, reason: 'Aucune facture ouverte pour ce bail.' });
          continue;
        }
        if (!body.dryRun) {
          const line: MockInvoiceLine = {
            id: nextId('invline'),
            invoiceId: openInvoice.id,
            lineType: invoiceLineTypeForMeterType(meter.meterType),
            label: `Consommation ${meter.meterType} — ${reading.readingDate}`,
            quantity: reading.consumption,
            unitPriceAmount: reading.unitPriceAmount,
            amount: reading.computedAmount,
            vatRateBps: 0,
            vatAmount: 0,
            isCredit: false,
            position: openInvoice.lines.length,
          };
          openInvoice.lines.push(line);
          reading.isInvoiced = true;
          reading.invoiceLineId = line.id;
        }
        created.push(reading.id);
      }
    }
    const run = {
      id: nextId('utilrun'),
      organizationId,
      status: 'DONE' as const,
      created: created.length,
      skipped,
      errors,
      createdAt: new Date().toISOString(),
    };
    utilityRuns.set(run.id, run);
    return HttpResponse.json({ runId: run.id }, { status: 202 });
  }),

  http.get(`${API_BASE}/billing/utility-runs/:runId`, ({ params, request }) => {
    const organizationId = orgIdFromRequest(request);
    if (!organizationId) return unauthorizedOrg();
    const run = utilityRuns.get(String(params.runId));
    if (!run || run.organizationId !== organizationId) return notFound('BILLING.RUN_NOT_FOUND');
    return HttpResponse.json({
      runId: run.id,
      status: run.status,
      created: run.created,
      skipped: run.skipped,
      errors: run.errors,
    });
  }),
];
