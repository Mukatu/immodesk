import { InspectionSubmitOperationHandler } from '../../src/modules/mobile-sync/application/inspection-submit-operation.handler';

/**
 * Tests unitaires purs (`jest.unit.config.js`, aucun accès base ni Redis) du
 * dépôt COMPOSITE d'un état des lieux réalisé hors ligne.
 */

const UNIT_ID = '11111111-1111-4111-8111-111111111111';
const DOC_A = '22222222-2222-4222-8222-222222222222';
const DOC_B = '33333333-3333-4333-8333-333333333333';
const SIG_TENANT = '44444444-4444-4444-8444-444444444444';
const SIG_AGENT = '55555555-5555-4555-8555-555555555555';

const READER = { userId: 'u-1', role: 'COLLECTOR' as const };
const CONTEXT = { clientRef: 'cr-1', syncBatchId: 'b-1' };

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    unitId: UNIT_ID,
    inspectionType: 'MOVE_OUT',
    tenantPresent: true,
    items: [
      {
        roomLabel: 'Salon',
        elementLabel: 'Murs et peinture',
        condition: 'DAMAGED',
        isDamaged: true,
        damageDescription: 'Fissure sur le mur nord',
        repairAmount: 25000,
        chargedTo: 'TENANT',
        photoDocumentIds: [DOC_A, DOC_B],
      },
    ],
    tenantSignatureDocumentId: SIG_TENANT,
    agentSignatureDocumentId: SIG_AGENT,
    ...overrides,
  };
}

function makeHandler(options: { replayed?: boolean; status?: string; itemCount?: number } = {}) {
  const { replayed = false, status = 'DRAFT', itemCount = 0 } = options;

  const inspections = {
    create: jest.fn().mockResolvedValue({ inspection: { id: 'i-1', status }, replayed }),
    addItem: jest.fn().mockResolvedValue({ id: 'it-1' }),
    addPhoto: jest.fn().mockResolvedValue({ id: 'ph-1' }),
    sign: jest.fn().mockResolvedValue({ id: 'i-1', status: 'SIGNED' }),
  };
  const count = jest.fn().mockResolvedValue(itemCount);
  const prisma = {
    withTenant: jest.fn((_org: string, _user: string, fn: (tx: unknown) => unknown) =>
      fn({ inspection_items: { count } }),
    ),
  };

  const handler = new InspectionSubmitOperationHandler(inspections as never, prisma as never);
  return { handler, inspections, count };
}

describe('Dépôt composite d’un état des lieux hors ligne', () => {
  it('enchaîne création, postes, photos puis signature', async () => {
    const { handler, inspections } = makeHandler();
    const result = await handler.apply('org-1', READER, validPayload(), CONTEXT);

    expect(inspections.create).toHaveBeenCalledTimes(1);
    expect(inspections.addItem).toHaveBeenCalledTimes(1);
    expect(inspections.addPhoto).toHaveBeenCalledTimes(2);
    expect(inspections.sign).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ replayed: false, resourceId: 'i-1' });
  });

  it('reprend le clientRef de l’enveloppe, jamais celui du corps', async () => {
    const { handler, inspections } = makeHandler();
    await handler.apply('org-1', READER, validPayload({ clientRef: 'usurpe' }), CONTEXT);
    expect(inspections.create.mock.calls[0][2]).toMatchObject({ clientRef: 'cr-1' });
  });

  it('rattache chaque photo à SON poste', async () => {
    const { handler, inspections } = makeHandler();
    await handler.apply('org-1', READER, validPayload(), CONTEXT);
    for (const call of inspections.addPhoto.mock.calls) {
      expect(call[3]).toMatchObject({ inspectionItemId: 'it-1' });
    }
  });

  it('transmet les deux signatures et le motif d’absence', async () => {
    const { handler, inspections } = makeHandler();
    await handler.apply(
      'org-1',
      READER,
      validPayload({ tenantPresent: false, absenceReason: 'Locataire injoignable' }),
      CONTEXT,
    );
    expect(inspections.sign.mock.calls[0][3]).toEqual({
      tenantPresent: false,
      absenceReason: 'Locataire injoignable',
      tenantSignatureDocumentId: SIG_TENANT,
      agentSignatureDocumentId: SIG_AGENT,
    });
  });

  it('ignore un identifiant de photo resté nul sans refuser le constat', async () => {
    const { handler, inspections } = makeHandler();
    const payload = validPayload();
    (payload.items[0] as { photoDocumentIds: unknown[] }).photoDocumentIds = [DOC_A, null];
    await handler.apply('org-1', READER, payload, CONTEXT);
    expect(inspections.addPhoto).toHaveBeenCalledTimes(1);
  });

  it('s’arrête sur un rejeu dont le constat est déjà signé', async () => {
    const { handler, inspections } = makeHandler({ replayed: true, status: 'SIGNED' });
    const result = await handler.apply('org-1', READER, validPayload(), CONTEXT);
    expect(result).toEqual({ replayed: true, resourceId: 'i-1' });
    expect(inspections.addItem).not.toHaveBeenCalled();
    expect(inspections.sign).not.toHaveBeenCalled();
  });

  it('ne duplique pas les postes d’un dépôt interrompu puis rejoué', async () => {
    const { handler, inspections, count } = makeHandler({ replayed: true, itemCount: 3 });
    const result = await handler.apply('org-1', READER, validPayload(), CONTEXT);
    expect(count).toHaveBeenCalled();
    expect(result.replayed).toBe(true);
    expect(inspections.addItem).not.toHaveBeenCalled();
  });

  it('reprend un en-tête rejoué resté vide', async () => {
    const { handler, inspections } = makeHandler({ replayed: true, itemCount: 0 });
    await handler.apply('org-1', READER, validPayload(), CONTEXT);
    expect(inspections.addItem).toHaveBeenCalledTimes(1);
    expect(inspections.sign).toHaveBeenCalledTimes(1);
  });

  it('refuse une charge utile sans aucun poste', async () => {
    const { handler } = makeHandler();
    await expect(
      handler.apply('org-1', READER, validPayload({ items: [] }), CONTEXT),
    ).rejects.toMatchObject({ code: 'VALIDATION.INVALID_PAYLOAD' });
  });

  it('refuse une condition hors de l’échelle', async () => {
    const { handler } = makeHandler();
    const payload = validPayload();
    (payload.items[0] as { condition: string }).condition = 'USURE';
    await expect(handler.apply('org-1', READER, payload, CONTEXT)).rejects.toMatchObject({
      code: 'VALIDATION.INVALID_PAYLOAD',
    });
  });
});
