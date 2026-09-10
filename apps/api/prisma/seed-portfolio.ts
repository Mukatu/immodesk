/**
 * Portefeuille de démonstration — phase 1.
 *
 * Déterministe et idempotent : chaque ligne est retrouvée par sa clé
 * naturelle (code de bien, code de lot, téléphone normalisé) avant d'être
 * créée. Relancer le seed ne duplique rien.
 *
 * Les quartiers et les arrondissements sont ceux de Brazzaville, les loyers
 * des ordres de grandeur réels du marché local (studio 60 000 à 90 000 FCFA,
 * appartement 120 000 à 180 000 FCFA par mois).
 */
import type { PrismaClient } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';
import { upsertBankAccounts, upsertTenants, upsertUnits } from './seed-portfolio-parties';

export interface PortfolioReport {
  landlords: number;
  units: number;
  tenants: number;
  bankAccounts: number;
}

const PROPERTY_CODE = 'RES-MPILA';

export async function seedPortfolio(
  prisma: PrismaClient,
  organizationId: string,
): Promise<PortfolioReport> {
  const nkodia = await upsertLandlord(prisma, organizationId, {
    partyType: 'INDIVIDUAL',
    firstName: 'Célestin',
    lastName: 'Nkodia',
    primaryPhone: '+242066100001',
    email: 'celestin.nkodia@example.cg',
    addressLine: '15, rue Mbochis',
    district: 'Moungali',
    rccmNumber: null,
    payoutMethod: 'MOBILE_MONEY',
  });

  const sci = await upsertLandlord(prisma, organizationId, {
    partyType: 'COMPANY',
    firstName: null,
    lastName: null,
    companyName: 'SCI Les Manguiers',
    primaryPhone: '+242066100002',
    email: 'gestion@lesmanguiers.cg',
    addressLine: '8, avenue de la Corniche',
    district: 'Mpila',
    rccmNumber: 'CG-BZV-01-2019-B12-00045',
    payoutMethod: 'BANK_TRANSFER',
  });

  const propertyId = await upsertProperty(prisma, organizationId, sci);
  const units = await upsertUnits(prisma, organizationId, propertyId);
  const tenants = await upsertTenants(prisma, organizationId);
  const bankAccounts = await upsertBankAccounts(prisma, organizationId, sci);

  // `landlords_self_uk` interdirait un second bailleur « self » : l'agence
  // n'en a pas, ses bailleurs sont des tiers sous mandat.
  void nkodia;

  return { landlords: 2, units, tenants, bankAccounts };
}

interface LandlordSeed {
  partyType: 'INDIVIDUAL' | 'COMPANY';
  firstName: string | null;
  lastName: string | null;
  companyName?: string | null;
  primaryPhone: string;
  email: string;
  addressLine: string;
  district: string;
  rccmNumber: string | null;
  payoutMethod: 'MOBILE_MONEY' | 'BANK_TRANSFER';
}

async function upsertLandlord(
  prisma: PrismaClient,
  organizationId: string,
  seed: LandlordSeed,
): Promise<string> {
  const existing = await prisma.landlords.findFirst({
    where: { organization_id: organizationId, primary_phone: seed.primaryPhone },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.landlords.create({
    data: {
      id: uuidv7(),
      organization_id: organizationId,
      party_type: seed.partyType,
      first_name: seed.firstName,
      last_name: seed.lastName,
      company_name: seed.companyName ?? null,
      primary_phone: seed.primaryPhone,
      email: seed.email,
      address_line: seed.addressLine,
      district: seed.district,
      city: 'Brazzaville',
      country_code: 'CG',
      rccm_number: seed.rccmNumber,
      payout_method: seed.payoutMethod,
    },
    select: { id: true },
  });
  return created.id;
}

async function upsertProperty(
  prisma: PrismaClient,
  organizationId: string,
  landlordId: string,
): Promise<string> {
  const existing = await prisma.properties.findFirst({
    where: { organization_id: organizationId, code: PROPERTY_CODE },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.properties.create({
    data: {
      id: uuidv7(),
      organization_id: organizationId,
      landlord_id: landlordId,
      code: PROPERTY_CODE,
      name: 'Résidence Mpila',
      property_type: 'APARTMENT_BUILDING',
      address_line: '45, avenue de la Corniche',
      district: 'Mpila',
      arrondissement: '6e arrondissement Talangaï',
      landmark: "Derrière l'école Nganga Édouard, face au fleuve",
      city: 'Brazzaville',
      country_code: 'CG',
      built_year: 2014,
      floors_count: 3,
      total_area_sqm: 860,
      has_water: true,
      has_electricity: true,
      has_borehole: true,
      caretaker_name: 'Papa Célestin',
      caretaker_phone: '+242066100009',
      notes: 'Immeuble de rapport, 12 lots sur 3 niveaux, groupe électrogène commun.',
    },
    select: { id: true },
  });
  return created.id;
}
