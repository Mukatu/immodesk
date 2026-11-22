import {
  MAX_THROTTLE_REQUEUES,
  MomoVerifyQueue,
  type VerifyStatusJobData,
} from '../../src/modules/mobile-money/infrastructure/momo-verify.queue';

/**
 * Remises en file d'un callback freiné (revue PR #62, N6) : BullMQ ignore SILENCIEUSEMENT un `add`
 * dont le jobId existe encore (job actif ou en attente). Un jobId fixe rendait donc la deuxième
 * remise en file (demandée par le job `verify-retry-<id>` encore actif) inopérante.
 */
describe('MomoVerifyQueue.requeueThrottled', () => {
  const data: VerifyStatusJobData = { organizationId: 'org-1', transactionId: 'tx-1' };

  function build() {
    const live = new Set<string>();
    const added: Array<{ jobId: string; requeues: number | undefined }> = [];
    const queue = {
      // Comportement de BullMQ : jobId déjà vivant = ajout ignoré, sans erreur.
      add: jest.fn((_name: string, payload: VerifyStatusJobData, opts: { jobId: string }) => {
        if (live.has(opts.jobId)) return Promise.resolve();
        live.add(opts.jobId);
        added.push({ jobId: opts.jobId, requeues: payload.requeues });
        return Promise.resolve();
      }),
    };
    const service = new MomoVerifyQueue({ get: jest.fn(), isProduction: false } as never);
    (service as unknown as { queue: unknown }).queue = queue;
    return { service, added, queue };
  }

  it('plus d’une remise en file : chaque rang a son propre jobId, même si le précédent est encore actif', async () => {
    const { service, added } = build();
    // Chaque job de la chaîne est encore actif (ses identifiants restent vivants) quand il redemande.
    await service.requeueThrottled({ ...data }, 1_000);
    await service.requeueThrottled({ ...data, requeues: 1 }, 1_000);
    await service.requeueThrottled({ ...data, requeues: 2 }, 1_000);
    expect(added.map((a) => a.jobId)).toEqual([
      'verify-retry-tx-1-1',
      'verify-retry-tx-1-2',
      'verify-retry-tx-1-3',
    ]);
    expect(added.map((a) => a.requeues)).toEqual([1, 2, 3]);
  });

  it('borné : au-delà de MAX_THROTTLE_REQUEUES, plus aucune remise en file (le rattrapage prend le relais)', async () => {
    const { service, queue } = build();
    await service.requeueThrottled({ ...data, requeues: MAX_THROTTLE_REQUEUES }, 1_000);
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('le jobId ne dépend que de la transaction et du rang : deux transactions ne se bloquent pas', async () => {
    const { service, added } = build();
    await service.requeueThrottled({ ...data }, 0);
    await service.requeueThrottled({ ...data, transactionId: 'tx-2' }, 0);
    expect(added.map((a) => a.jobId)).toEqual(['verify-retry-tx-1-1', 'verify-retry-tx-2-1']);
  });
});
