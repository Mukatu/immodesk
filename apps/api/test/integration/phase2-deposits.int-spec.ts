import { LeaseDailyService } from '../../src/modules/leases/application/lease-daily.service';
import {
  api,
  cleanupUser,
  login,
  startTestApp,
  stopTestApp,
  uniquePhone,
  type TestContext,
} from './helpers';

function isoDate(days = 0): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days))
    .toISOString()
    .slice(0, 10);
}

/** Premier jour du mois décalé de `months` : les révisions s'y rattachent. */
function firstOfMonth(months: number): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + months, 1))
    .toISOString()
    .slice(0, 10);
}

describe('Phase 2 — dépôts de garantie, révisions de loyer et cron quotidien', () => {
  let ctx: TestContext;
  const ownerPhone = uniquePhone();

  let owner: { accessToken: string; userId: string };
  let organizationId: string;
  const units = new Map<string, string>();
  const tenants: string[] = [];
  let leaseId: string;

  beforeAll(async () => {
    ctx = await startTestApp();
    owner = await login(ctx, ownerPhone);

    const organization = await api(ctx, 'POST', '/organizations', {
      accessToken: owner.accessToken,
      body: {
        type: 'AGENCY',
        legalName: 'Agence Dépôts Intégration SARL',
        city: 'Brazzaville',
        district: 'Mpila',
        contactPhone: ownerPhone,
      },
    });
    organizationId = organization.body.id;

    const landlord = await api(ctx, 'POST', '/landlords', {
      accessToken: owner.accessToken,
      organizationId,
      body: { partyType: 'COMPANY', companyName: 'SCI Caution', primaryPhone: uniquePhone() },
    });

    const property = await api(ctx, 'POST', '/properties', {
      accessToken: owner.accessToken,
      organizationId,
      body: {
        landlordId: landlord.body.id,
        name: 'Résidence Caution',
        addressLine: '1, avenue du Fleuve',
        district: 'Mpila',
      },
    });

    const bulk = await api(ctx, 'POST', `/properties/${property.body.id}/units/bulk`, {
      accessToken: owner.accessToken,
      organizationId,
      body: {
        prefix: 'D',
        from: 1,
        to: 6,
        template: { unitType: 'APARTMENT', baseRentAmount: 150000, depositMonths: 2 },
      },
    });
    for (const unit of bulk.body.created) units.set(unit.code, unit.id);

    for (let i = 0; i < 3; i += 1) {
      const tenant = await api(ctx, 'POST', '/tenants', {
        accessToken: owner.accessToken,
        organizationId,
        body: {
          partyType: 'INDIVIDUAL',
          firstName: 'Locataire',
          lastName: `Caution ${i}`,
          primaryPhone: uniquePhone(),
        },
      });
      tenants.push(tenant.body.id);
    }
  }, 120_000);

  afterAll(async () => {
    await cleanupUser(ctx, ownerPhone);
    await stopTestApp(ctx);
  });

  const asOwner = () => ({ accessToken: owner.accessToken, organizationId });

  const activateLease = async (unitCode: string, tenantIndex: number, overrides = {}) => {
    const created = await api(ctx, 'POST', '/leases', {
      ...asOwner(),
      body: {
        unitId: units.get(unitCode),
        primaryTenantId: tenants[tenantIndex],
        startDate: isoDate(-60),
        endDate: isoDate(305),
        rentAmount: 150000,
        chargesAmount: 10000,
        depositAmount: 300000,
        ...overrides,
      },
    });
    await api(ctx, 'POST', `/leases/${created.body.id}/activate`, { ...asOwner(), body: {} });
    return created.body.id as string;
  };

  const movement = (id: string, body: Record<string, unknown>) =>
    api(ctx, 'POST', `/leases/${id}/deposit/movements`, { ...asOwner(), body });

  // -------------------------------------------------------------------------
  // Scénario Gherkin : retenue de 45 000 puis restitution de 255 000
  // -------------------------------------------------------------------------
  it('encaisse 300 000, retient 45 000 après résiliation, restitue 255 000', async () => {
    leaseId = await activateLease('D1', 0);

    const collected = await movement(leaseId, {
      movementType: 'COLLECTION',
      amount: 300000,
      reason: 'Caution versée en espèces',
    });
    expect(collected.status).toBe(201);
    expect(collected.body).toMatchObject({
      status: 'HELD',
      collectedAmount: 300000,
      heldAmount: 300000,
    });
    expect(collected.body.fullyCollectedAt).not.toBeNull();

    // Une restitution est refusée tant que le bail court.
    const tooEarly = await movement(leaseId, { movementType: 'REFUND', amount: 100000 });
    expect(tooEarly.status).toBe(409);
    expect(tooEarly.body.code).toBe('DEPOSITS.LEASE_NOT_CLOSED');

    const terminated = await api(ctx, 'POST', `/leases/${leaseId}/terminate`, {
      ...asOwner(),
      body: { effectiveDate: isoDate(0), reason: 'Départ du locataire' },
    });
    expect(terminated.status).toBe(200);
    expect(terminated.body.status).toBe('TERMINATED');
    expect(terminated.body.deposit.refundDueDate).toBe(isoDate(30));

    const deducted = await movement(leaseId, {
      movementType: 'DEDUCTION',
      amount: 45000,
      reason: 'Dégradations constatées à la sortie',
    });
    expect(deducted.status).toBe(201);
    // Solde restituable calculé : 300 000 − 45 000 = 255 000.
    expect(deducted.body).toMatchObject({ deductedAmount: 45000, heldAmount: 255000 });

    const tooMuch = await movement(leaseId, { movementType: 'REFUND', amount: 255001 });
    expect(tooMuch.status).toBe(409);
    expect(tooMuch.body.code).toBe('DEPOSITS.INSUFFICIENT_BALANCE');

    const refunded = await movement(leaseId, {
      movementType: 'REFUND',
      amount: 255000,
      reason: 'Restitution par Mobile Money',
    });
    expect(refunded.status).toBe(201);
    expect(refunded.body).toMatchObject({
      status: 'REFUNDED',
      refundedAmount: 255000,
      heldAmount: 0,
    });
    expect(refunded.body.refundedAt).not.toBeNull();
    expect(refunded.body.movements).toHaveLength(3);

    // Append-only : aucune ligne n'a été modifiée ni supprimée. Un mouvement
    // corrigé porterait `updated_at > created_at`.
    const rows = await ctx.admin.deposit_movements.findMany({
      where: { lease_id: leaseId },
      orderBy: { created_at: 'asc' },
    });
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.movement_type)).toEqual(['COLLECTION', 'DEDUCTION', 'REFUND']);
    for (const row of rows) {
      expect(row.updated_at.getTime()).toBe(row.created_at.getTime());
    }
  }, 120_000);

  it('le lot est libéré à la résiliation immédiate', async () => {
    const unit = await api(ctx, 'GET', `/units/${units.get('D1')}`, asOwner());
    expect(unit.body.status).toBe('AVAILABLE');
  });

  it('résume les dépôts de l’organisation', async () => {
    const partial = await activateLease('D2', 1);
    await movement(partial, { movementType: 'COLLECTION', amount: 100000 });

    const summary = await api(ctx, 'GET', '/deposits/summary', asOwner());
    expect(summary.status).toBe(200);
    expect(summary.body.heldTotal).toBe(100000);
    expect(summary.body.pendingTotal).toBe(200000);
    expect(summary.body.byStatus).toMatchObject({ REFUNDED: 1, PARTIALLY_PAID: 1 });

    const list = await api(ctx, 'GET', '/deposits?status=PARTIALLY_PAID', asOwner());
    expect(list.status).toBe(200);
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0]).toMatchObject({ status: 'PARTIALLY_PAID', heldAmount: 100000 });
    expect(list.body.items[0].leaseReference).toMatch(/^BAIL-/);
  }, 120_000);

  it('une contre-passation annule un mouvement sans l’effacer', async () => {
    const lease = await activateLease('D3', 2);
    const collected = await movement(lease, { movementType: 'COLLECTION', amount: 300000 });
    const movementId = collected.body.movements[0].id;

    const reversed = await movement(lease, {
      movementType: 'COLLECTION',
      amount: 300000,
      reversalOfId: movementId,
      reason: 'Chèque revenu impayé',
    });
    expect(reversed.status).toBe(201);
    expect(reversed.body).toMatchObject({ collectedAmount: 0, heldAmount: 0, status: 'PENDING' });
    // Les DEUX écritures restent visibles : c'est la règle append-only.
    expect(reversed.body.movements).toHaveLength(2);
  }, 120_000);

  // -------------------------------------------------------------------------
  // Révisions de loyer et cron quotidien
  // -------------------------------------------------------------------------
  it('applique une révision datée du jour et diffère celle du mois prochain', async () => {
    const lease = await activateLease('D4', 0, { rentAmount: 150000, chargesAmount: 10000 });

    const now = await api(ctx, 'POST', `/leases/${lease}/rent-revisions`, {
      ...asOwner(),
      body: {
        effectiveDate: firstOfMonth(0),
        newRentAmount: 165000,
        newChargesAmount: 12000,
        reason: 'Révision annuelle',
      },
    });
    expect(now.status).toBe(201);
    expect(now.body).toMatchObject({
      previousRentAmount: 150000,
      newRentAmount: 165000,
      previousChargesAmount: 10000,
      newChargesAmount: 12000,
    });

    const applied = await api(ctx, 'GET', `/leases/${lease}`, asOwner());
    expect(applied.body.rentAmount).toBe(165000);

    const future = await api(ctx, 'POST', `/leases/${lease}/rent-revisions`, {
      ...asOwner(),
      body: { effectiveDate: firstOfMonth(6), newRentAmount: 180000 },
    });
    expect(future.status).toBe(201);

    // Le loyer courant ne bouge pas tant que la date d'effet n'est pas atteinte.
    const unchanged = await api(ctx, 'GET', `/leases/${lease}`, asOwner());
    expect(unchanged.body.rentAmount).toBe(165000);

    // Mais `rent-at` sait déjà répondre pour les deux périodes.
    const before = await api(
      ctx,
      'GET',
      `/leases/${lease}/rent-at?date=${firstOfMonth(-1)}`,
      asOwner(),
    );
    expect(before.body).toMatchObject({ rentAmount: 150000, source: 'INITIAL' });

    const after = await api(
      ctx,
      'GET',
      `/leases/${lease}/rent-at?date=${firstOfMonth(7)}`,
      asOwner(),
    );
    expect(after.body).toMatchObject({ rentAmount: 180000, source: 'REVISION' });

    const past = await api(ctx, 'POST', `/leases/${lease}/rent-revisions`, {
      ...asOwner(),
      body: { effectiveDate: firstOfMonth(-2), newRentAmount: 200000 },
    });
    expect(past.status).toBe(409);
    expect(past.body.code).toBe('LEASES.REVISION_DATE_INVALID');

    const history = await api(ctx, 'GET', `/leases/${lease}/rent-revisions`, asOwner());
    expect(history.body.items).toHaveLength(2);
  }, 120_000);

  it('le cron quotidien clôt les préavis échus, applique les révisions et est idempotent', async () => {
    const lease = await activateLease('D5', 1, { endDate: isoDate(400) });

    const notice = await api(ctx, 'POST', `/leases/${lease}/notice`, {
      ...asOwner(),
      body: { effectiveDate: isoDate(5), reason: 'Préavis de trois mois' },
    });
    expect(notice.status).toBe(200);
    expect(notice.body.status).toBe('NOTICE_GIVEN');

    // Le lot reste occupé tant que la date d'effet n'est pas atteinte.
    const stillOccupied = await api(ctx, 'GET', `/units/${units.get('D5')}`, asOwner());
    expect(stillOccupied.body.status).toBe('OCCUPIED');

    const daily = ctx.app.get(LeaseDailyService);

    // Le jour du préavis : bascule TERMINATED, lot libéré, dépôt daté.
    const report = await daily.runForOrganization(
      organizationId,
      new Date(`${isoDate(5)}T00:00:00.000Z`),
    );
    expect(report.noticesClosed).toBe(1);
    expect(report.unitsReleased).toBeGreaterThanOrEqual(1);

    const closed = await api(ctx, 'GET', `/leases/${lease}`, asOwner());
    expect(closed.body.status).toBe('TERMINATED');
    expect(closed.body.deposit.refundDueDate).toBe(isoDate(35));

    const released = await api(ctx, 'GET', `/units/${units.get('D5')}`, asOwner());
    expect(released.body.status).toBe('AVAILABLE');

    // IDEMPOTENCE : rejouer le même passage n'écrit plus rien.
    const replay = await daily.runForOrganization(
      organizationId,
      new Date(`${isoDate(5)}T00:00:00.000Z`),
    );
    expect(replay).toMatchObject({
      noticesClosed: 0,
      leasesExpired: 0,
      revisionsApplied: 0,
      unitsReleased: 0,
    });
  }, 180_000);

  it('le cron applique une révision future à sa date d’effet, puis ne la rejoue pas', async () => {
    const lease = await activateLease('D6', 2);
    const effectiveDate = firstOfMonth(3);

    await api(ctx, 'POST', `/leases/${lease}/rent-revisions`, {
      ...asOwner(),
      body: { effectiveDate, newRentAmount: 175000, newChargesAmount: 12000 },
    });

    const before = await api(ctx, 'GET', `/leases/${lease}`, asOwner());
    expect(before.body.rentAmount).toBe(150000);

    const daily = ctx.app.get(LeaseDailyService);
    const first = await daily.runForOrganization(
      organizationId,
      new Date(`${effectiveDate}T00:00:00.000Z`),
    );
    expect(first.revisionsApplied).toBeGreaterThanOrEqual(1);

    const after = await api(ctx, 'GET', `/leases/${lease}`, asOwner());
    expect(after.body.rentAmount).toBe(175000);
    expect(after.body.chargesAmount).toBe(12000);

    const replay = await daily.runForOrganization(
      organizationId,
      new Date(`${effectiveDate}T00:00:00.000Z`),
    );
    expect(replay.revisionsApplied).toBe(0);
  }, 180_000);
});
