import { randomBytes } from 'node:crypto';
import { startTestApp, stopTestApp, type TestContext } from './helpers';

describe('Limite de débit des webhooks publics', () => {
  let ctx: TestContext;
  const limit = 3;
  const previous = {
    limit: process.env.RATE_LIMIT_WEBHOOK_PER_MINUTE,
    hops: process.env.TRUST_PROXY_HOPS,
  };

  beforeAll(async () => {
    process.env.RATE_LIMIT_WEBHOOK_PER_MINUTE = String(limit);
    // Un proxy de confiance : l'IP du compteur vient de X-Forwarded-For, ce
    // qui isole ce test des autres specs (tous sur 127.0.0.1).
    process.env.TRUST_PROXY_HOPS = '1';
    ctx = await startTestApp();
  });

  afterAll(async () => {
    await stopTestApp(ctx);
    for (const [name, value] of [
      ['RATE_LIMIT_WEBHOOK_PER_MINUTE', previous.limit],
      ['TRUST_PROXY_HOPS', previous.hops],
    ] as const) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });

  const fakeIp = (): string => `10.${randomBytes(1)[0]}.${randomBytes(1)[0]}.${randomBytes(1)[0]}`;

  function post(path: string, ip: string): Promise<Response> {
    return fetch(`${ctx.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
      body: '{}',
    });
  }

  it('répond 429 IAM.RATE_LIMITED au-delà de la limite, compteur commun aux routes webhook', async () => {
    const ip = fakeIp();
    const paths = [
      '/webhooks/mobile-money/simulator',
      '/webhooks/mobile-money/subscription',
      '/webhooks/sms',
    ];
    for (const path of paths) {
      const res = await post(path, ip);
      expect(res.status).not.toBe(429);
    }

    const blocked = await post('/webhooks/mobile-money/simulator', ip);
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0);
    const body = (await blocked.json()) as {
      code: string;
      details: { retryAfterSeconds: number };
    };
    expect(body.code).toBe('IAM.RATE_LIMITED');
    expect(body.details.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('compte par IP cliente : une autre IP reste servie', async () => {
    const ip = fakeIp();
    for (let i = 0; i < limit; i += 1) await post('/webhooks/mobile-money/simulator', ip);
    expect((await post('/webhooks/mobile-money/simulator', ip)).status).toBe(429);

    const other = await post('/webhooks/mobile-money/simulator', fakeIp());
    expect(other.status).not.toBe(429);
  });
});
