/**
 * Données de démonstration Immodesk — phase 0.
 *
 * Déterministe et idempotent : relancer le seed ne duplique rien.
 * Le seed s'exécute avec le rôle d'administration (`DATABASE_ADMIN_URL`,
 * BYPASSRLS) car il crée des lignes dans plusieurs organisations et ne peut
 * donc pas se placer dans un unique contexte de tenant.
 */
import { PrismaClient } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';
import { seedBilling } from './seed-billing';
import { seedLeases } from './seed-leases';
import { seedPortfolio } from './seed-portfolio';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env.DATABASE_ADMIN_URL ??
        process.env.DATABASE_URL ??
        'postgresql://immodesk:immodesk@localhost:5440/immodesk',
    },
  },
});

const ORGANIZATION_SLUG = 'agence-mpila-immo';
const OWNER_PHONE = '+242066000001';
const COLLECTOR_PHONE = '+242066000002';

async function main(): Promise<void> {
  console.info('Seed Immodesk — début.');

  const organizationId = await upsertOrganization();
  await upsertSettings(organizationId);

  const ownerId = await upsertUser(OWNER_PHONE, 'Jean Mabiala', 'jean.mabiala@mpila-immo.cg');
  const collectorId = await upsertUser(COLLECTOR_PHONE, 'Alphonse Ngoma', null);

  await upsertMember(organizationId, ownerId, 'OWNER', 'Gérant');
  await upsertMember(organizationId, collectorId, 'COLLECTOR', 'Démarcheur', 'Mpila / Poto-Poto');

  await upsertTemplates(organizationId);
  await upsertFeatureFlag(organizationId);

  // --- Phase 1 : portefeuille de démonstration -------------------------
  const portfolio = await seedPortfolio(prisma, organizationId);

  // --- Phase 2 : baux, dépôts et gabarit de contrat ---------------------
  const leases = await seedLeases(prisma, organizationId);

  // --- Phase 3 : facturation, espèces, quittances, modèles de messages --
  const billing = await seedBilling(prisma, organizationId);

  console.info('Seed Immodesk — terminé.');
  console.info(`  Organisation : Agence Mpila Immo (${organizationId})`);
  console.info(`  OWNER        : ${OWNER_PHONE}`);
  console.info(`  COLLECTOR    : ${COLLECTOR_PHONE}`);
  console.info(`  Bailleurs    : ${portfolio.landlords} (dont 1 SCI)`);
  console.info(`  Immeuble     : Résidence Mpila — ${portfolio.units} lots A1..A12`);
  console.info(`  Locataires   : ${portfolio.tenants} (garants et canaux de contact inclus)`);
  console.info(`  Comptes      : ${portfolio.bankAccounts} (BGFI + MTN Mobile Money)`);
  console.info(
    `  Baux         : ${leases.activeLeases} actifs (A1, A2) + ${leases.draftLeases} brouillon`,
  );
  console.info(
    `  Dépôts       : ${leases.deposits} partiellement encaissés, ${leases.revisions} révision future`,
  );
  console.info('  Contrat      : gabarit par défaut « bail à usage d’habitation » enregistré');
  console.info(
    `  Facturation  : ${billing.invoices} factures créées (A1 émise, A2 partiellement réglée, A1 du mois précédent réglée)`,
  );
  console.info(
    `  Espèces      : ${billing.cashReceipts} reçu de 100 000 FCFA (démarcheur), ${billing.remittances} remise SOUMISE`,
  );
  console.info(
    `  Quittances   : ${billing.receipts} émise ; règle de pénalité par défaut ; ${billing.templates} modèles système`,
  );
  console.info('  Connexion    : POST /v1/auth/otp/request puis /v1/auth/otp/verify');
  console.info('                 avec OTP_DEV_CODE (000000 par défaut) en développement.');
}

async function upsertOrganization(): Promise<string> {
  const existing = await prisma.organizations.findUnique({
    where: { slug: ORGANIZATION_SLUG },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.organizations.create({
    data: {
      id: uuidv7(),
      type: 'AGENCY',
      status: 'ACTIVE',
      legal_name: 'Agence Mpila Immo SARL',
      trade_name: 'Agence Mpila Immo',
      slug: ORGANIZATION_SLUG,
      contact_phone: OWNER_PHONE,
      contact_email: 'contact@mpila-immo.cg',
      address_line: '12, avenue de la Corniche',
      district: 'Mpila',
      city: 'Brazzaville',
      country_code: 'CG',
      currency: 'XAF',
    },
    select: { id: true },
  });
  return created.id;
}

async function upsertSettings(organizationId: string): Promise<void> {
  await prisma.organization_settings.upsert({
    where: { organization_id: organizationId },
    update: {},
    create: {
      id: uuidv7(),
      organization_id: organizationId,
      // Valeurs par défaut de la phase 0 : échéance au 5, Africa/Brazzaville, XAF.
      timezone: 'Africa/Brazzaville',
      locale: 'fr-CG',
      currency: 'XAF',
      default_payment_due_day: 5,
      default_grace_days: 5,
      default_commission_rate_bps: 1000,
      whatsapp_enabled: true,
      sms_fallback_enabled: true,
    },
  });
}

async function upsertUser(phone: string, fullName: string, email: string | null): Promise<string> {
  const [firstName, ...rest] = fullName.split(' ');
  const existing = await prisma.users.findUnique({
    where: { phone_e164: phone },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.users.create({
    data: {
      id: uuidv7(),
      phone_e164: phone,
      phone_verified_at: new Date(),
      email,
      first_name: firstName,
      last_name: rest.join(' ') || null,
      display_name: fullName,
      locale: 'fr-CG',
      status: 'ACTIVE',
    },
    select: { id: true },
  });
  return created.id;
}

async function upsertMember(
  organizationId: string,
  userId: string,
  role: 'OWNER' | 'COLLECTOR',
  jobTitle: string,
  collectorZone?: string,
): Promise<void> {
  await prisma.organization_members.upsert({
    where: { organization_id_user_id: { organization_id: organizationId, user_id: userId } },
    update: { role, status: 'ACTIVE' },
    create: {
      id: uuidv7(),
      organization_id: organizationId,
      user_id: userId,
      role,
      status: 'ACTIVE',
      job_title: jobTitle,
      collector_zone: collectorZone ?? null,
      currency: 'XAF',
    },
  });
}

/** Trois modèles système : code de connexion, invitation, bienvenue. */
async function upsertTemplates(organizationId: string): Promise<void> {
  const templates = [
    {
      code: 'auth.otp_login',
      name: 'Code de connexion',
      body:
        'Immodesk : votre code de connexion est {{code}}. Il expire dans {{minutes}} minutes. ' +
        'Ne le communiquez à personne.',
      variables: ['code', 'minutes'],
    },
    {
      code: 'org.invitation',
      name: "Invitation d'un collaborateur",
      body:
        'Immodesk : {{organization}} vous invite à rejoindre son équipe en tant que {{role}}. ' +
        'Acceptez ici : {{link}}',
      variables: ['organization', 'role', 'link'],
    },
    {
      code: 'user.welcome',
      name: 'Message de bienvenue',
      body:
        'Bienvenue sur Immodesk, {{fullName}} ! Vous gérez désormais {{organization}} ' +
        'depuis votre téléphone. Bonne tournée.',
      variables: ['fullName', 'organization'],
    },
  ];

  for (const template of templates) {
    await prisma.notification_templates.upsert({
      where: {
        organization_id_code_channel_locale: {
          organization_id: organizationId,
          code: template.code,
          channel: 'SMS',
          locale: 'fr-CG',
        },
      },
      update: { body: template.body, name: template.name, is_active: true },
      create: {
        id: uuidv7(),
        organization_id: organizationId,
        code: template.code,
        channel: 'SMS',
        locale: 'fr-CG',
        name: template.name,
        body: template.body,
        variables: template.variables,
        is_active: true,
        is_system: true,
      },
    });
  }
}

async function upsertFeatureFlag(organizationId: string): Promise<void> {
  const existing = await prisma.feature_flags.findFirst({
    where: { organization_id: organizationId, key: 'demo.banner' },
    select: { id: true },
  });
  if (existing) return;

  await prisma.feature_flags.create({
    data: {
      id: uuidv7(),
      organization_id: organizationId,
      key: 'demo.banner',
      description:
        "Affiche la bannière de démonstration dans le dashboard web et l'application mobile.",
      is_enabled: true,
      rollout_percentage: 100,
      payload: { message: 'Environnement de démonstration Immodesk.' },
    },
  });
}

main()
  .catch((error) => {
    console.error('Seed en échec :', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
