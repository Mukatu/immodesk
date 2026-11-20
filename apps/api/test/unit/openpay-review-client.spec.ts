import {
  isOpenPayCashoutReference,
  parseOpenPayTrigger,
} from '../../src/modules/mobile-money/domain/openpay-rules';
import { OpenPayClient } from '../../src/modules/mobile-money/infrastructure/openpay.client';
import { OpenPayProvider } from '../../src/modules/mobile-money/infrastructure/openpay.provider';

/** Correctifs de la revue PR #62 : client HTTP (délai du corps), annulation, références UUID v4. */

const UUID_V4 = '550e8400-e29b-41d4-a716-446655440000';
const UUID_V7 = '0197a1b2-c3d4-7e5f-8a6b-1c2d3e4f5a6b';
const config = {
  get: (k: string) =>
    ({ OPENPAY_API_KEY: 'cle', OPENPAY_BASE_URL: 'https://api.openpay-cg.com/v1' })[k],
};

describe('OpenPayClient : délai appliqué aussi à la lecture du corps (F1)', () => {
  it('un corps qui ne vient jamais est coupé par le délai : MOMO.PROVIDER_UNAVAILABLE', async () => {
    const client = new OpenPayClient(config as never);
    client.fetchFn = ((_url: string, init: RequestInit) =>
      Promise.resolve({
        status: 200,
        headers: new Headers(),
        // En-têtes reçus, corps jamais livré : seule l'annulation du délai le débloque.
        text: () =>
          new Promise<string>((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
          }),
      })) as unknown as typeof fetch;
    await expect(
      client.request({ method: 'GET', path: '/transaction/status/PTXN1234ABCD', timeoutMs: 50 }),
    ).rejects.toMatchObject({ code: 'MOMO.PROVIDER_UNAVAILABLE' });
  });

  it('corps non JSON : réponse rendue avec un corps null, sans exception', async () => {
    const client = new OpenPayClient(config as never);
    client.fetchFn = (() =>
      Promise.resolve(new Response('<html>', { status: 400 }))) as unknown as typeof fetch;
    await expect(client.request({ method: 'GET', path: '/x' })).resolves.toMatchObject({
      status: 400,
      body: null,
    });
  });
});

describe('OpenPayProvider : annulation d’un retrait programmé et UUID v4 (E3, M5)', () => {
  const build = (status: number, body: unknown) => {
    const client = new OpenPayClient(config as never);
    const calls: Array<{ url: string; method?: string }> = [];
    client.fetchFn = ((url: string, init: RequestInit) => {
      calls.push({ url, method: init.method });
      return Promise.resolve(new Response(JSON.stringify(body), { status }));
    }) as typeof fetch;
    return { provider: new OpenPayProvider(client, {} as never), calls };
  };

  it('DELETE /scheduled-cashout/:reference, annulé seulement sur { success: true }', async () => {
    const { provider, calls } = build(200, { success: true, message: 'Retrait annulé' });
    await expect(provider.cancelPayout(UUID_V4.toUpperCase())).resolves.toBe('CANCELLED');
    expect(calls).toEqual([
      { url: `https://api.openpay-cg.com/v1/scheduled-cashout/${UUID_V4}`, method: 'DELETE' },
    ]);
  });

  it.each([
    [400, { success: false, message: 'Le retrait n’est plus en attente' }],
    [404, { error: 'introuvable' }],
    [200, { success: false }],
  ])('HTTP %s sans succès : non annulable (jamais d’expiration à tort)', async (status, body) => {
    const { provider } = build(status, body);
    await expect(provider.cancelPayout(UUID_V4)).resolves.toBe('NOT_CANCELLABLE');
  });

  it('erreur technique (5xx) propagée, annulation d’une référence non UUID v4 refusée', async () => {
    await expect(build(503, {}).provider.cancelPayout(UUID_V4)).rejects.toMatchObject({
      code: 'MOMO.PROVIDER_UNAVAILABLE',
    });
    await expect(build(200, {}).provider.cancelPayout(UUID_V7)).rejects.toMatchObject({
      code: 'PLATFORM.INTERNAL_ERROR',
    });
  });

  it('newPayoutReference : UUID v4, différent à chaque appel', () => {
    const { provider } = build(200, {});
    const [a, b] = [provider.newPayoutReference(), provider.newPayoutReference()];
    expect(isOpenPayCashoutReference(a)).toBe(true);
    expect(a).not.toBe(b);
  });

  it('un UUID v7 n’est pas une référence de retrait valide (initiation, déclencheur)', async () => {
    expect(isOpenPayCashoutReference(UUID_V7)).toBe(false);
    expect(isOpenPayCashoutReference(UUID_V4)).toBe(true);
    expect(parseOpenPayTrigger({ reference: UUID_V7, type: 'scheduled_cashout' })).toBeNull();
    expect(parseOpenPayTrigger({ reference: UUID_V4, type: 'scheduled_cashout' })).toMatchObject({
      reference: UUID_V4,
    });
    const { provider, calls } = build(201, {});
    await expect(
      provider.initiate({
        kind: 'PAYOUT',
        amount: 1000n,
        currency: 'XAF',
        payerMsisdn: '+242066203420',
        operator: 'MTN',
        externalReference: UUID_V7,
        description: '',
        callbackUrl: '',
      }),
    ).rejects.toMatchObject({ code: 'PLATFORM.INTERNAL_ERROR' });
    expect(calls).toHaveLength(0);
  });
});
