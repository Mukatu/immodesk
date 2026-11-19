import type { ArgumentsHost } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { DomainError } from '../../src/shared/errors/domain-error';
import { DomainExceptionFilter } from '../../src/shared/errors/domain-exception.filter';

/** Tests unitaires purs : enveloppe d'erreur, masquage des details 5xx. */

function run(exception: unknown) {
  const headers: Record<string, string> = {};
  let status = 0;
  let body: { code: string; message: string; details: Record<string, unknown> } | undefined;
  const response = {
    setHeader: (k: string, v: string) => {
      headers[k] = v;
    },
    status: (s: number) => {
      status = s;
      return { json: (b: typeof body) => (body = b) };
    },
  };
  const request = { method: 'POST', url: '/v1/x', headers: { 'x-request-id': 'req-1' } };
  const host = {
    switchToHttp: () => ({ getResponse: () => response, getRequest: () => request }),
  } as unknown as ArgumentsHost;
  new DomainExceptionFilter().catch(exception, host);
  return { status, body: body!, headers };
}

describe('DomainExceptionFilter - details', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('5xx : details absents de la reponse, journalises cote serveur', () => {
    const spy = jest.spyOn(Logger.prototype, 'error');
    const { status, body } = run(
      new DomainError('PLATFORM.INTERNAL_ERROR', { reason: 'CINETPAY_SECRET_KEY absent' }),
    );
    expect(status).toBe(500);
    expect(body.code).toBe('PLATFORM.INTERNAL_ERROR');
    expect(JSON.stringify(body)).not.toContain('CINETPAY_SECRET_KEY');
    expect(body.details).toEqual({ requestId: 'req-1' });
    expect(String(spy.mock.calls[0]?.[0])).toContain('CINETPAY_SECRET_KEY absent');
  });

  it('exception inconnue : 500 sans details', () => {
    const { status, body } = run(new Error('boom'));
    expect(status).toBe(500);
    expect(body.details).toEqual({ requestId: 'req-1' });
  });

  it('503 : details masques mais Retry-After conserve', () => {
    const { status, body, headers } = run(
      new DomainError('PLATFORM.READ_ONLY', { reason: 'interne', retryAfterSeconds: 300 }),
    );
    expect(status).toBe(503);
    expect(body.details).toEqual({ requestId: 'req-1' });
    expect(headers['Retry-After']).toBe('300');
  });

  it('4xx : details conserves', () => {
    const { status, body } = run(
      new DomainError('VALIDATION.INVALID_PAYLOAD', { fields: [{ path: 'phone' }] }),
    );
    expect(status).toBe(422);
    expect(body.details).toEqual({ fields: [{ path: 'phone' }], requestId: 'req-1' });
  });
});
