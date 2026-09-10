/**
 * Suite du portefeuille de démonstration : lots, locataires, garants,
 * canaux de contact et comptes de règlement.
 */
import type { PrismaClient } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';

/** 4 lots occupés sur 12 : taux d'occupation de 3333 bps (33,33 %). */
const OCCUPIED_UNITS = new Set(['A1', 'A2', 'A5', 'A9']);

/** Série A1..A12 : 4 studios au rez-de-chaussée, 8 appartements aux étages. */
export async function upsertUnits(
  prisma: PrismaClient,
  organizationId: string,
  propertyId: string,
): Promise<number> {
  for (let n = 1; n <= 12; n += 1) {
    const code = `A${n}`;
    const existing = await prisma.units.findFirst({
      where: { organization_id: organizationId, property_id: propertyId, code },
      select: { id: true },
    });
    if (existing) continue;

    const isStudio = n <= 4;
    await prisma.units.create({
      data: {
        id: uuidv7(),
        organization_id: organizationId,
        property_id: propertyId,
        code,
        label: isStudio ? `Studio ${code}` : `Appartement ${code}`,
        unit_type: isStudio ? 'STUDIO' : 'APARTMENT',
        status: OCCUPIED_UNITS.has(code) ? 'OCCUPIED' : 'AVAILABLE',
        floor_number: Math.floor((n - 1) / 4),
        rooms_count: isStudio ? 1 : 3,
        bedrooms_count: isStudio ? 1 : 2,
        bathrooms_count: 1,
        area_sqm: isStudio ? 28 : 62,
        is_furnished: false,
        has_private_meter: true,
        // Montants XAF entiers : le franc CFA n'a pas de sous-unité.
        base_rent_amount: isStudio ? 75_000n : 150_000n,
        base_charges_amount: isStudio ? 10_000n : 15_000n,
        deposit_months: 2,
        currency: 'XAF',
        amenities: { climatisation: !isStudio, cour: 'partagée', groupeElectrogene: true },
      },
    });
  }

  await prisma.properties.update({
    where: { id: propertyId },
    data: { units_count: 12, updated_at: new Date() },
  });
  return 12;
}

interface TenantSeed {
  firstName: string;
  lastName: string;
  primaryPhone: string;
  whatsappPhone: string;
  email: string;
  district: string;
  profession: string;
  employerName: string;
  monthlyIncome: bigint;
  guarantor: {
    firstName: string;
    lastName: string;
    relationship: string;
    primaryPhone: string;
    profession: string;
    guaranteeAmount: bigint;
  };
}

const TENANTS: TenantSeed[] = [
  {
    firstName: 'Bernadette',
    lastName: 'Loemba',
    primaryPhone: '+242066200001',
    whatsappPhone: '+242066200001',
    email: 'bernadette.loemba@example.cg',
    district: 'Poto-Poto',
    profession: 'Institutrice',
    employerName: 'École primaire de Poto-Poto',
    monthlyIncome: 280_000n,
    guarantor: {
      firstName: 'Aristide',
      lastName: 'Loemba',
      relationship: 'Frère aîné',
      primaryPhone: '+242066300001',
      profession: 'Comptable',
      guaranteeAmount: 900_000n,
    },
  },
  {
    firstName: 'Serge',
    lastName: 'Makaya',
    primaryPhone: '+242066200002',
    whatsappPhone: '+242066200002',
    email: 'serge.makaya@example.cg',
    district: 'Bacongo',
    profession: 'Chauffeur poids lourd',
    employerName: 'Transports Congo Fret',
    monthlyIncome: 320_000n,
    guarantor: {
      firstName: 'Pauline',
      lastName: 'Makaya',
      relationship: 'Épouse',
      primaryPhone: '+242066300002',
      profession: 'Commerçante au marché Total',
      guaranteeAmount: 1_200_000n,
    },
  },
  {
    firstName: 'Chancelle',
    lastName: 'Obami',
    primaryPhone: '+242066200003',
    whatsappPhone: '+242066200003',
    email: 'chancelle.obami@example.cg',
    district: 'Makélékélé',
    profession: 'Infirmière',
    employerName: 'CHU de Brazzaville',
    monthlyIncome: 410_000n,
    guarantor: {
      firstName: 'Landry',
      lastName: 'Obami',
      relationship: 'Père',
      primaryPhone: '+242066300003',
      profession: 'Fonctionnaire retraité',
      guaranteeAmount: 1_500_000n,
    },
  },
];

export async function upsertTenants(prisma: PrismaClient, organizationId: string): Promise<number> {
  for (const seed of TENANTS) {
    let tenant = await prisma.tenants.findFirst({
      where: { organization_id: organizationId, primary_phone: seed.primaryPhone },
      select: { id: true },
    });

    if (!tenant) {
      tenant = await prisma.tenants.create({
        data: {
          id: uuidv7(),
          organization_id: organizationId,
          party_type: 'INDIVIDUAL',
          first_name: seed.firstName,
          last_name: seed.lastName,
          gender: seed.firstName.endsWith('e') ? 'FEMALE' : 'MALE',
          nationality: 'CG',
          id_document_type: 'CNI',
          profession: seed.profession,
          employer_name: seed.employerName,
          monthly_income: seed.monthlyIncome,
          currency: 'XAF',
          primary_phone: seed.primaryPhone,
          whatsapp_phone: seed.whatsappPhone,
          email: seed.email,
          district: seed.district,
          city: 'Brazzaville',
          country_code: 'CG',
        },
        select: { id: true },
      });
    }

    await upsertGuarantor(prisma, organizationId, tenant.id, seed);
    await upsertChannels(prisma, organizationId, tenant.id, seed);
  }
  return TENANTS.length;
}

async function upsertGuarantor(
  prisma: PrismaClient,
  organizationId: string,
  tenantId: string,
  seed: TenantSeed,
): Promise<void> {
  const existing = await prisma.guarantors.findFirst({
    where: { organization_id: organizationId, primary_phone: seed.guarantor.primaryPhone },
    select: { id: true },
  });
  if (existing) return;

  await prisma.guarantors.create({
    data: {
      id: uuidv7(),
      organization_id: organizationId,
      tenant_id: tenantId,
      party_type: 'INDIVIDUAL',
      first_name: seed.guarantor.firstName,
      last_name: seed.guarantor.lastName,
      relationship: seed.guarantor.relationship,
      profession: seed.guarantor.profession,
      guarantee_amount: seed.guarantor.guaranteeAmount,
      currency: 'XAF',
      primary_phone: seed.guarantor.primaryPhone,
      district: seed.district,
      city: 'Brazzaville',
      country_code: 'CG',
    },
  });
}

/** Un canal MOBILE principal et un canal WHATSAPP par locataire. */
async function upsertChannels(
  prisma: PrismaClient,
  organizationId: string,
  tenantId: string,
  seed: TenantSeed,
): Promise<void> {
  const channels = [
    { channel_type: 'MOBILE' as const, value: seed.primaryPhone, label: 'Ligne principale' },
    { channel_type: 'WHATSAPP' as const, value: seed.whatsappPhone, label: 'WhatsApp' },
    { channel_type: 'EMAIL' as const, value: seed.email, label: 'Courriel' },
  ];

  for (const channel of channels) {
    const existing = await prisma.contact_channels.findFirst({
      where: {
        organization_id: organizationId,
        owner_type: 'TENANT',
        owner_id: tenantId,
        channel_type: channel.channel_type,
        value: channel.value,
      },
      select: { id: true },
    });
    if (existing) continue;

    await prisma.contact_channels.create({
      data: {
        id: uuidv7(),
        organization_id: organizationId,
        owner_type: 'TENANT',
        owner_id: tenantId,
        channel_type: channel.channel_type,
        value: channel.value,
        label: channel.label,
        is_primary: true,
        opt_in: true,
      },
    });
  }
}

/** Un compte bancaire d'agence (BGFI) et un portefeuille MTN du bailleur. */
export async function upsertBankAccounts(
  prisma: PrismaClient,
  organizationId: string,
  landlordId: string,
): Promise<number> {
  const accounts = [
    {
      holder_type: 'ORGANIZATION' as const,
      landlord_id: null,
      label: 'Compte courant agence',
      bank_code: 'BGFI',
      bank_name: 'BGFIBank Congo',
      branch_name: 'Agence Centre-ville',
      account_holder_name: 'Agence Mpila Immo SARL',
      account_number: '30011000012345678901',
      rib_key: '76',
      momo_provider: null,
      momo_msisdn: null,
    },
    {
      holder_type: 'LANDLORD' as const,
      landlord_id: landlordId,
      label: 'MTN Mobile Money — SCI Les Manguiers',
      bank_code: 'MTN_MOMO',
      bank_name: 'MTN Mobile Money',
      branch_name: null,
      account_holder_name: 'SCI Les Manguiers',
      account_number: null,
      rib_key: null,
      momo_provider: 'MTN_MOMO' as const,
      momo_msisdn: '+242066100002',
    },
  ];

  for (const account of accounts) {
    const existing = await prisma.bank_accounts.findFirst({
      where: { organization_id: organizationId, label: account.label },
      select: { id: true },
    });
    if (existing) continue;

    await prisma.bank_accounts.create({
      data: {
        id: uuidv7(),
        organization_id: organizationId,
        ...account,
        currency: 'XAF',
        is_default: true,
        is_active: true,
      },
    });
  }
  return accounts.length;
}
