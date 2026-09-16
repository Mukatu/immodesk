/**
 * États des lieux, compteurs et maintenance de démonstration — phase 8.
 *
 * Idempotent : chaque ligne est retrouvée par sa clé métier (`client_ref`
 * pour l'état des lieux, les relevés et la demande ; `serial_number` pour le
 * compteur) avant toute création. Décor : le bail A1 (phase 2) et son
 * démarcheur (phase 0). Dates toutes relatives à l'exécution du seed, pour
 * rester valides quel que soit le jour où il tourne.
 */
import type { PrismaClient } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';

export interface Phase8Report {
  inspections: number;
  meterReadings: number;
  maintenanceRequests: number;
}

const now = new Date(Date.now() + 3_600_000);
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);
const ym = (d: Date) => `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

async function nextRef(
  prisma: PrismaClient,
  org: string,
  kind: string,
  period: string,
  prefix: string,
): Promise<string> {
  const rows = await prisma.$queryRawUnsafe<Array<{ number: string }>>(
    `WITH r AS (SELECT next_sequence($1::uuid, $2::text, $3::text) AS v)
     SELECT format_sequence_number($4::text, $3::text, r.v, 5::smallint) AS number FROM r`,
    org,
    kind,
    period,
    prefix,
  );
  return rows[0].number;
}

export async function seedPhase8(
  prisma: PrismaClient,
  organizationId: string,
): Promise<Phase8Report> {
  const a1 = await prisma.leases.findFirstOrThrow({
    where: { organization_id: organizationId, client_ref: 'seed-bail-a1' },
    select: { id: true, unit_id: true, property_id: true, primary_tenant_id: true },
  });
  const collector = await prisma.users.findUniqueOrThrow({
    where: { phone_e164: '+242066000002' },
  });

  const inspections = await seedInspection(prisma, organizationId, a1, collector.id);
  const meterReadings = await seedMeterReadings(prisma, organizationId, a1);
  const maintenanceRequests = await seedMaintenance(prisma, organizationId, a1);

  return { inspections, meterReadings, maintenanceRequests };
}

async function seedInspection(
  prisma: PrismaClient,
  organizationId: string,
  a1: { id: string; unit_id: string; property_id: string; primary_tenant_id: string },
  collectorId: string,
): Promise<number> {
  const existing = await prisma.inspections.findFirst({
    where: { organization_id: organizationId, client_ref: 'seed-edl-a1-movein' },
  });
  if (existing) return 0;

  const performedAt = daysAgo(360);
  const signature = await prisma.documents.create({
    data: {
      id: uuidv7(),
      organization_id: organizationId,
      kind: 'SIGNATURE',
      bucket: 'immodesk',
      object_key: `org/${organizationId}/signature/seed-edl-a1.png`,
      file_name: 'signature-edl-a1.png',
      mime_type: 'image/png',
      size_bytes: 1200,
      related_entity_type: 'inspection',
    },
  });

  const reference = await nextRef(prisma, organizationId, 'INSPECTION', ym(performedAt), 'EDL');
  const inspectionId = uuidv7();
  await prisma.inspections.create({
    data: {
      id: inspectionId,
      organization_id: organizationId,
      lease_id: a1.id,
      unit_id: a1.unit_id,
      property_id: a1.property_id,
      tenant_id: a1.primary_tenant_id,
      reference,
      inspection_type: 'MOVE_IN',
      status: 'SIGNED',
      scheduled_at: performedAt,
      performed_at: performedAt,
      performed_by_user_id: collectorId,
      tenant_present: true,
      landlord_present: false,
      overall_condition: 'GOOD',
      keys_handed_count: 2,
      tenant_signed_at: performedAt,
      agent_signed_at: performedAt,
      signature_document_id: signature.id,
      signature_hash: 'seed-signature-hash-edl-a1',
      client_ref: 'seed-edl-a1-movein',
      notes: 'Entrée dans les lieux, logement en bon état général.',
    },
  });

  await prisma.inspection_items.createMany({
    data: [
      {
        id: uuidv7(),
        organization_id: organizationId,
        inspection_id: inspectionId,
        room_label: 'Salon',
        element_label: 'Peinture murale',
        element_category: 'MUR',
        condition: 'GOOD',
        quantity: 1,
        is_damaged: false,
        charged_to: 'TENANT',
        position: 1,
      },
      {
        id: uuidv7(),
        organization_id: organizationId,
        inspection_id: inspectionId,
        room_label: 'Cuisine',
        element_label: 'Robinetterie',
        element_category: 'SANITAIRE',
        condition: 'GOOD',
        quantity: 1,
        is_damaged: false,
        charged_to: 'TENANT',
        position: 2,
      },
    ],
  });
  return 1;
}

async function seedMeterReadings(
  prisma: PrismaClient,
  organizationId: string,
  a1: { unit_id: string; property_id: string },
): Promise<number> {
  let meter = await prisma.meters.findFirst({
    where: { organization_id: organizationId, serial_number: 'SEED-EAU-A1' },
  });
  if (!meter) {
    meter = await prisma.meters.create({
      data: {
        id: uuidv7(),
        organization_id: organizationId,
        property_id: a1.property_id,
        unit_id: a1.unit_id,
        meter_type: 'WATER_LCDE',
        serial_number: 'SEED-EAU-A1',
        provider_name: 'LCDE',
        measurement_unit: 'm3',
        digits_count: 6,
        initial_index: '0.000',
      },
    });
  }

  const tariff = await prisma.utility_tariffs.findFirst({
    where: {
      organization_id: organizationId,
      property_id: a1.property_id,
      meter_type: 'WATER_LCDE',
    },
  });
  if (!tariff) {
    await prisma.utility_tariffs.create({
      data: {
        id: uuidv7(),
        organization_id: organizationId,
        property_id: a1.property_id,
        meter_type: 'WATER_LCDE',
        basis: 'PER_UNIT_CONSUMED',
        label: 'Eau LCDE — tarif résidentiel',
        unit_price_amount: 500n,
        measurement_unit: 'm3',
        invoice_line_type: 'WATER_CHARGE',
        effective_from: daysAgo(400),
      },
    });
  }

  let created = 0;
  const existing1 = await prisma.meter_readings.findFirst({
    where: { organization_id: organizationId, client_ref: 'seed-releve-a1-1' },
  });
  if (!existing1) {
    await prisma.meter_readings.create({
      data: {
        id: uuidv7(),
        organization_id: organizationId,
        meter_id: meter.id,
        unit_id: a1.unit_id,
        reading_date: daysAgo(35),
        previous_index: '0.000',
        current_index: '100.000',
        consumption: '100.000',
        client_ref: 'seed-releve-a1-1',
      },
    });
    created += 1;
  }
  const existing2 = await prisma.meter_readings.findFirst({
    where: { organization_id: organizationId, client_ref: 'seed-releve-a1-2' },
  });
  if (!existing2) {
    await prisma.meter_readings.create({
      data: {
        id: uuidv7(),
        organization_id: organizationId,
        meter_id: meter.id,
        unit_id: a1.unit_id,
        reading_date: daysAgo(5),
        previous_index: '100.000',
        current_index: '112.500',
        consumption: '12.500',
        client_ref: 'seed-releve-a1-2',
      },
    });
    created += 1;
  }
  return created;
}

async function seedMaintenance(
  prisma: PrismaClient,
  organizationId: string,
  a1: { unit_id: string; property_id: string; primary_tenant_id: string },
): Promise<number> {
  const existing = await prisma.maintenance_requests.findFirst({
    where: { organization_id: organizationId, client_ref: 'seed-mnt-a1-fuite' },
  });
  if (existing) return 0;

  const reportedAt = daysAgo(2);
  const reference = await nextRef(prisma, organizationId, 'MAINTENANCE', ym(reportedAt), 'MNT');
  await prisma.maintenance_requests.create({
    data: {
      id: uuidv7(),
      organization_id: organizationId,
      property_id: a1.property_id,
      unit_id: a1.unit_id,
      tenant_id: a1.primary_tenant_id,
      reference,
      status: 'OPEN',
      priority: 'NORMAL',
      reporter_type: 'TENANT',
      category: 'PLUMBING',
      title: 'Fuite au raccord de l’évier',
      description: 'Le locataire signale une fuite continue sous l’évier de la cuisine.',
      reported_at: reportedAt,
      sla_due_at: new Date(reportedAt.getTime() + 5 * 86_400_000),
      client_ref: 'seed-mnt-a1-fuite',
    },
  });
  return 1;
}
