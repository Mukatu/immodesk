import {
  api,
  cleanupUser,
  login,
  startTestApp,
  stopTestApp,
  uniquePhone,
  type TestContext,
} from './helpers';

describe('Phase 1 — tiers : bailleurs, locataires, garants, canaux', () => {
  let ctx: TestContext;
  const ownerPhone = uniquePhone();
  const soloPhone = uniquePhone();

  let owner: { accessToken: string; userId: string };
  let solo: { accessToken: string; userId: string };
  let organizationId: string;
  let landlordId: string;

  beforeAll(async () => {
    ctx = await startTestApp();
    owner = await login(ctx, ownerPhone);

    const created = await api(ctx, 'POST', '/organizations', {
      accessToken: owner.accessToken,
      body: {
        type: 'AGENCY',
        legalName: 'Agence Tiers Intégration SARL',
        city: 'Brazzaville',
        district: 'Poto-Poto',
        contactPhone: ownerPhone,
      },
    });
    expect(created.status).toBe(201);
    organizationId = created.body.id;
  }, 60_000);

  afterAll(async () => {
    for (const phone of [ownerPhone, soloPhone]) await cleanupUser(ctx, phone);
    await stopTestApp(ctx);
  });

  const asOwner = () => ({ accessToken: owner.accessToken, organizationId });

  it('crée un bailleur personne morale et normalise son téléphone', async () => {
    const created = await api(ctx, 'POST', '/landlords', {
      ...asOwner(),
      body: {
        partyType: 'COMPANY',
        companyName: 'SCI Les Manguiers',
        rccmNumber: 'CG-BZV-01-2019-B12-00045',
        // Saisie nationale sans indicatif : doit ressortir en E.164.
        primaryPhone: '066 100 002',
        district: 'Mpila',
        payoutMethod: 'BANK_TRANSFER',
      },
    });

    expect(created.status).toBe(201);
    expect(created.body.primaryPhone).toBe('+242066100002');
    expect(created.body.displayName).toBe('SCI Les Manguiers');
    expect(created.body.isSelf).toBe(false);
    landlordId = created.body.id;

    const audit = await ctx.admin.audit_logs.findMany({
      where: { organization_id: organizationId, entity_id: landlordId },
      select: { reason: true, action: true },
    });
    expect(audit).toEqual([{ reason: 'LANDLORD_CREATED', action: 'CREATE' }]);
  });

  it('refuse une personne morale sans raison sociale', async () => {
    const refused = await api(ctx, 'POST', '/landlords', {
      ...asOwner(),
      body: { partyType: 'COMPANY', lastName: 'Nkodia', primaryPhone: uniquePhone() },
    });
    expect(refused.status).toBe(422);
    expect(refused.body.code).toBe('PARTIES.NAME_REQUIRED');
  });

  it('recherche un bailleur sans tenir compte des accents ni de la casse', async () => {
    await api(ctx, 'POST', '/landlords', {
      ...asOwner(),
      body: { lastName: 'Békélé', firstName: 'Célestin', primaryPhone: uniquePhone() },
    });

    // « bekele » sans accent doit ramener « Békélé » : c'est exactement ce
    // que le pliage par translate() sert à garantir, unaccent étant absent.
    const found = await api(ctx, 'GET', '/landlords?q=bekele', asOwner());
    expect(found.status).toBe(200);
    expect(found.body.items.map((l: { lastName: string }) => l.lastName)).toContain('Békélé');

    const upper = await api(ctx, 'GET', '/landlords?q=BÉKÉLÉ', asOwner());
    expect(upper.body.items.length).toBeGreaterThan(0);
  });

  it('avertit d’un doublon de téléphone locataire puis accepte la confirmation', async () => {
    const phone = '066 555 111';
    const first = await api(ctx, 'POST', '/tenants', {
      ...asOwner(),
      body: { lastName: 'Loemba', firstName: 'Bernadette', primaryPhone: phone },
    });
    expect(first.status).toBe(201);
    const firstId = first.body.id;

    // Second locataire, même numéro : AVERTISSEMENT, pas blocage.
    const warned = await api(ctx, 'POST', '/tenants', {
      ...asOwner(),
      body: { lastName: 'Loemba', firstName: 'Aristide', primaryPhone: phone },
    });
    expect(warned.status).toBe(409);
    expect(warned.body.code).toBe('PARTIES.PHONE_ALREADY_USED');
    expect(warned.body.details.existingTenantId).toBe(firstId);

    // Rien n'a été écrit : l'avertissement ne crée pas de ligne.
    const countAfterWarning = await ctx.admin.tenants.count({
      where: { organization_id: organizationId, primary_phone: '+242066555111' },
    });
    expect(countAfterWarning).toBe(1);

    // Confirmation explicite du gestionnaire : un foyer partage un téléphone.
    const confirmed = await api(ctx, 'POST', '/tenants', {
      ...asOwner(),
      body: {
        lastName: 'Loemba',
        firstName: 'Aristide',
        primaryPhone: phone,
        confirmDuplicatePhone: true,
      },
    });
    expect(confirmed.status).toBe(201);
    expect(confirmed.body.id).not.toBe(firstId);

    const countAfterConfirmation = await ctx.admin.tenants.count({
      where: { organization_id: organizationId, primary_phone: '+242066555111' },
    });
    expect(countAfterConfirmation).toBe(2);
  });

  it('rattache un garant et des canaux de contact, puis compose la fiche', async () => {
    const tenant = await api(ctx, 'POST', '/tenants', {
      ...asOwner(),
      body: { lastName: 'Obami', firstName: 'Chancelle', primaryPhone: uniquePhone() },
    });
    expect(tenant.status).toBe(201);
    const tenantId = tenant.body.id;

    const guarantor = await api(ctx, 'POST', `/tenants/${tenantId}/guarantors`, {
      ...asOwner(),
      body: {
        lastName: 'Obami',
        firstName: 'Landry',
        relationship: 'Père',
        primaryPhone: uniquePhone(),
        guaranteeAmount: 1_500_000,
      },
    });
    expect(guarantor.status).toBe(201);
    // Montant XAF : BigInt en base, entier JSON en sortie.
    expect(guarantor.body.guaranteeAmount).toBe(1500000);
    expect(typeof guarantor.body.guaranteeAmount).toBe('number');

    const channel = await api(ctx, 'POST', `/parties/tenants/${tenantId}/contact-channels`, {
      ...asOwner(),
      body: { channelType: 'WHATSAPP', value: '066 777 888', isPrimary: true },
    });
    expect(channel.status).toBe(201);
    expect(channel.body.value).toBe('+242066777888');

    const duplicate = await api(ctx, 'POST', `/parties/tenants/${tenantId}/contact-channels`, {
      ...asOwner(),
      body: { channelType: 'WHATSAPP', value: '+242066777888' },
    });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.code).toBe('PARTIES.CHANNEL_DUPLICATE');

    const detail = await api(ctx, 'GET', `/tenants/${tenantId}`, asOwner());
    expect(detail.status).toBe(200);
    expect(detail.body.guarantors).toHaveLength(1);
    expect(detail.body.contactChannels).toHaveLength(1);
    expect(detail.body.documents).toEqual([]);
  });

  it('crée automatiquement le bailleur « self » d’un bailleur indépendant', async () => {
    solo = await login(ctx, soloPhone);
    const created = await api(ctx, 'POST', '/organizations', {
      accessToken: solo.accessToken,
      body: {
        type: 'INDEPENDENT_LANDLORD',
        legalName: 'Monsieur Célestin Nkodia',
        city: 'Brazzaville',
        district: 'Moungali',
        contactPhone: soloPhone,
      },
    });
    expect(created.status).toBe(201);
    const soloOrgId = created.body.id;

    const self = await ctx.admin.landlords.findFirst({
      where: { organization_id: soloOrgId, is_self: true },
    });
    expect(self).not.toBeNull();
    expect(self?.company_name).toBe('Monsieur Célestin Nkodia');
    expect(self?.primary_phone).toBe(soloPhone);

    // L'organisation pointe sur lui : toute création de bien le présélectionne.
    const organization = await ctx.admin.organizations.findUnique({ where: { id: soloOrgId } });
    expect(organization?.default_landlord_id).toBe(self?.id);

    // Et il est protégé contre la suppression.
    const refused = await api(ctx, 'DELETE', `/landlords/${self?.id}`, {
      accessToken: solo.accessToken,
      organizationId: soloOrgId,
    });
    expect(refused.status).toBe(409);
    expect(refused.body.code).toBe('PARTIES.SELF_LANDLORD_PROTECTED');

    const audit = await ctx.admin.audit_logs.findMany({
      where: { organization_id: soloOrgId, reason: 'SELF_LANDLORD_PROVISIONED' },
    });
    expect(audit).toHaveLength(1);
  });

  it('ne crée pas de bailleur « self » pour une agence', async () => {
    const selfLandlords = await ctx.admin.landlords.count({
      where: { organization_id: organizationId, is_self: true },
    });
    expect(selfLandlords).toBe(0);
  });

  it('supprime logiquement un bailleur sans bien, jamais physiquement', async () => {
    const removed = await api(ctx, 'DELETE', `/landlords/${landlordId}`, asOwner());
    expect(removed.status).toBe(204);

    const row = await ctx.admin.landlords.findUnique({ where: { id: landlordId } });
    expect(row).not.toBeNull();
    expect(row?.deleted_at).not.toBeNull();

    // Et il disparaît des lectures.
    const gone = await api(ctx, 'GET', `/landlords/${landlordId}`, asOwner());
    expect(gone.status).toBe(404);
    expect(gone.body.code).toBe('PARTIES.LANDLORD_NOT_FOUND');
  });
});
