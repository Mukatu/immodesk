import { DomainError } from '../../src/shared/errors/domain-error';
import { MomoPurposeRouter } from '../../src/modules/mobile-money/application/momo-purpose-router';
import { MomoWebhookIngestService } from '../../src/modules/webhooks/application/momo-webhook-ingest.service';

/**
 * Ingestion unique des webhooks Mobile Money : signature en premier, routage
 * par `purpose` (jamais par l'URL), rejeu réservé aux événements signés.
 */
type Purpose = 'RENT_COLLECTION' | 'SUBSCRIPTION' | 'OWNER_PAYOUT';

function build(options: {
  signed?: boolean;
  purpose?: Purpose | null;
  aggregator?: string | null;
  parse?: () => unknown;
  duplicate?: boolean;
  rows?: unknown[];
  eventRow?: Record<string, unknown>;
}) {
  const provider = {
    code: 'SIMULATOR',
    webhookSource: 'OTHER',
    signatureHeader: 'x-simulator-signature',
    verifyWebhook: jest.fn().mockReturnValue(options.signed ?? true),
    parseWebhook: jest.fn(
      options.parse ?? (() => ({ externalReference: 'ext-1', state: 'SUCCEEDED', eventId: 'e1' })),
    ),
  };
  const registry = {
    forCode: jest.fn().mockReturnValue(provider),
    forWebhookSource: jest.fn().mockReturnValue(provider),
  };
  const events = {
    persist: jest.fn().mockResolvedValue({ id: 'evt-1', duplicate: options.duplicate ?? false }),
    persistUnsigned: jest.fn().mockResolvedValue(undefined),
    markStatus: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue({
      id: 'evt-1',
      source: 'OTHER',
      signature_valid: true,
      raw_payload: { merchantReference: 'ext-1' },
      ...options.eventRow,
    }),
  };
  const queryRawUnsafe = jest.fn().mockResolvedValue(
    options.rows ??
      (options.purpose === null
        ? []
        : [
            {
              id: 'tx-1',
              organization_id: 'org-1',
              purpose: options.purpose ?? 'RENT_COLLECTION',
              aggregator: options.aggregator === undefined ? 'SIMULATOR' : options.aggregator,
            },
          ]),
  );
  const tenantTx = {
    mobile_money_transactions: {
      findFirst: jest
        .fn()
        .mockResolvedValue({ id: 'tx-1', purpose: options.purpose ?? 'RENT_COLLECTION' }),
    },
  };
  const prisma = {
    adminClient: () => ({ $queryRawUnsafe: queryRawUnsafe }),
    withTenant: jest.fn((_o: string, _u: unknown, fn: (t: unknown) => unknown) => fn(tenantTx)),
  };
  const rentQueue = { enqueue: jest.fn().mockResolvedValue(undefined) };
  const router = new MomoPurposeRouter(rentQueue as never, { verifyStatus: jest.fn() } as never);
  const subscription = {
    enqueueVerify: jest.fn().mockResolvedValue(undefined),
    verifyNow: jest.fn(),
  };
  router.register('SUBSCRIPTION', subscription);
  const service = new MomoWebhookIngestService(
    prisma as never,
    events as never,
    registry as never,
    router,
  );
  return { service, provider, events, queryRawUnsafe, rentQueue, subscription, tenantTx };
}

const BODY = Buffer.from('{"merchantReference":"ext-1"}');
const ingest = (s: ReturnType<typeof build>['service']) =>
  s.ingest('simulator', BODY, { 'user-agent': 'x' }, '1.2.3.4', '/v1/webhooks/mobile-money/x');

describe('MomoWebhookIngestService.ingest', () => {
  it('non signé : persistUnsigned seul, sans organisation ni résolution ni analyse', async () => {
    const { service, provider, events, queryRawUnsafe, rentQueue, subscription } = build({
      signed: false,
    });
    await ingest(service);
    expect(events.persistUnsigned).toHaveBeenCalledTimes(1);
    const arg = events.persistUnsigned.mock.calls[0][0] as Record<string, unknown>;
    expect(arg).toMatchObject({ source: 'OTHER', bodyBytes: BODY.length });
    expect(arg).not.toHaveProperty('organizationId');
    expect(JSON.stringify(arg)).not.toContain('ext-1');
    expect(provider.parseWebhook).not.toHaveBeenCalled();
    expect(queryRawUnsafe).not.toHaveBeenCalled();
    expect(events.persist).not.toHaveBeenCalled();
    expect(events.markStatus).not.toHaveBeenCalled();
    expect(rentQueue.enqueue).not.toHaveBeenCalled();
    expect(subscription.enqueueVerify).not.toHaveBeenCalled();
  });

  it('signé loyer : organisation renseignée, file des loyers, PROCESSED', async () => {
    const { service, events, rentQueue, subscription } = build({});
    await ingest(service);
    expect(events.persist).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'org-1', eventType: 'momo.succeeded' }),
    );
    expect(rentQueue.enqueue).toHaveBeenCalledWith({
      organizationId: 'org-1',
      transactionId: 'tx-1',
      origin: 'CALLBACK',
    });
    expect(subscription.enqueueVerify).not.toHaveBeenCalled();
    expect(events.markStatus).toHaveBeenLastCalledWith('evt-1', 'PROCESSED', expect.anything());
  });

  it("webhook d'abonnement reçu sur la route générique : traitement ABONNEMENT, pas loyer", async () => {
    const { service, events, rentQueue, subscription } = build({ purpose: 'SUBSCRIPTION' });
    await ingest(service);
    expect(subscription.enqueueVerify).toHaveBeenCalledWith('org-1', 'tx-1');
    expect(rentQueue.enqueue).not.toHaveBeenCalled();
    expect(events.persist).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'subscription.momo.succeeded' }),
    );
  });

  it('reversement : routé vers la vérification des reversements (même file)', async () => {
    const { service, rentQueue, events } = build({ purpose: 'OWNER_PAYOUT' });
    await ingest(service);
    expect(rentQueue.enqueue).toHaveBeenCalledTimes(1);
    expect(events.markStatus).toHaveBeenLastCalledWith('evt-1', 'PROCESSED', expect.anything());
  });

  it('agrégateur différent du fournisseur : FAILED PROVIDER_MISMATCH, aucun routage', async () => {
    const { service, events, rentQueue } = build({ aggregator: 'CINETPAY' });
    await ingest(service);
    expect(events.markStatus).toHaveBeenCalledWith(
      'evt-1',
      'FAILED',
      expect.objectContaining({ errorMessage: 'MOMO.WEBHOOK_PROVIDER_MISMATCH' }),
    );
    expect(rentQueue.enqueue).not.toHaveBeenCalled();
  });

  it('mismatch de fournisseur : l’événement n’est PAS rattaché à l’organisation', async () => {
    const { service, events } = build({ aggregator: 'CINETPAY' });
    await ingest(service);
    expect(events.persist).toHaveBeenCalledWith(expect.objectContaining({ organizationId: null }));
  });

  it('échec de mise en file : FAILED ENQUEUE_FAILED (pas PROCESSING), journalisé', async () => {
    const { service, events, rentQueue } = build({});
    rentQueue.enqueue.mockRejectedValueOnce(new Error('redis down'));
    const errorSpy = jest
      .spyOn((service as unknown as { logger: { error: () => void } }).logger, 'error')
      .mockImplementation(() => undefined);
    await ingest(service);
    expect(events.markStatus).toHaveBeenNthCalledWith(1, 'evt-1', 'PROCESSING');
    expect(events.markStatus).toHaveBeenLastCalledWith(
      'evt-1',
      'FAILED',
      expect.objectContaining({ errorMessage: 'MOMO.WEBHOOK_ENQUEUE_FAILED' }),
    );
    expect(events.markStatus).not.toHaveBeenCalledWith('evt-1', 'PROCESSED', expect.anything());
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('redis down'));
  });

  it('signé mais illisible : FAILED PAYLOAD_INVALID, sans résolution', async () => {
    const { service, events, queryRawUnsafe } = build({
      parse: () => {
        throw new DomainError('VALIDATION.INVALID_PAYLOAD');
      },
    });
    await ingest(service);
    expect(queryRawUnsafe).not.toHaveBeenCalled();
    expect(events.persist).toHaveBeenCalledWith(expect.objectContaining({ organizationId: null }));
    expect(events.markStatus).toHaveBeenCalledWith(
      'evt-1',
      'FAILED',
      expect.objectContaining({ errorMessage: 'MOMO.WEBHOOK_PAYLOAD_INVALID' }),
    );
  });

  it('référence inconnue : FAILED UNRESOLVED, organisation nulle', async () => {
    const { service, events } = build({ purpose: null });
    await ingest(service);
    expect(events.persist).toHaveBeenCalledWith(expect.objectContaining({ organizationId: null }));
    expect(events.markStatus).toHaveBeenCalledWith(
      'evt-1',
      'FAILED',
      expect.objectContaining({ errorMessage: 'MOMO.WEBHOOK_REFERENCE_UNRESOLVED' }),
    );
  });

  it('doublon : aucun routage', async () => {
    const { service, rentQueue, events } = build({ duplicate: true });
    await ingest(service);
    expect(rentQueue.enqueue).not.toHaveBeenCalled();
    expect(events.markStatus).not.toHaveBeenCalled();
  });
});

describe('MomoWebhookIngestService.replay', () => {
  it('source sans parseur (OTHER/OPENPAY) : FAILED, aucun routage', async () => {
    const { service, events, rentQueue } = build({ eventRow: { source: 'OTHER' } });
    // Le registre réel lève pour OTHER : on le simule ici.
    (
      service as unknown as { registry: { forWebhookSource: jest.Mock } }
    ).registry.forWebhookSource = jest.fn(() => {
      throw new DomainError('PLATFORM.NOT_FOUND');
    });
    await service.replay('org-1', 'user-1', 'evt-1');
    expect(events.markStatus).toHaveBeenCalledWith(
      'evt-1',
      'FAILED',
      expect.objectContaining({ errorMessage: 'MOMO.WEBHOOK_PAYLOAD_INVALID' }),
    );
    expect(rentQueue.enqueue).not.toHaveBeenCalled();
  });

  it('événement non signé : REPLAY_NOT_ALLOWED, ni markStatus ni file', async () => {
    const { service, events, rentQueue } = build({ eventRow: { signature_valid: false } });
    await expect(service.replay('org-1', 'user-1', 'evt-1')).rejects.toMatchObject({
      code: 'WEBHOOKS.REPLAY_NOT_ALLOWED',
    });
    expect(events.markStatus).not.toHaveBeenCalled();
    expect(rentQueue.enqueue).not.toHaveBeenCalled();
  });

  it("rejeu d'un abonnement : traitement ABONNEMENT", async () => {
    const { service, subscription, rentQueue } = build({ purpose: 'SUBSCRIPTION' });
    await service.replay('org-1', 'user-1', 'evt-1');
    expect(subscription.enqueueVerify).toHaveBeenCalledWith('org-1', 'tx-1');
    expect(rentQueue.enqueue).not.toHaveBeenCalled();
  });

  it('corps illisible au rejeu : FAILED PAYLOAD_INVALID', async () => {
    const { service, events } = build({
      parse: () => {
        throw new DomainError('VALIDATION.INVALID_PAYLOAD');
      },
    });
    await service.replay('org-1', 'user-1', 'evt-1');
    expect(events.markStatus).toHaveBeenCalledWith(
      'evt-1',
      'FAILED',
      expect.objectContaining({ errorMessage: 'MOMO.WEBHOOK_PAYLOAD_INVALID' }),
    );
  });
});
