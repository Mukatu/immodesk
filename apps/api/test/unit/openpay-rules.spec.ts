import {
  matchCashoutResponse,
  matchPaymentResponse,
  maskMsisdns,
  parseOpenPayAmount,
  parseOpenPayTrigger,
} from '../../src/modules/mobile-money/domain/openpay-rules';
import {
  isCheckThrottled,
  isInitiatedExpired,
} from '../../src/modules/mobile-money/domain/reconcile-rules';
import type { ProviderStatusExpectation } from '../../src/modules/mobile-money/domain/ports';

const TX = '0197a1b2-c3d4-7e5f-8a6b-1c2d3e4f5a6b';
const REF = 'PTXN26042237B99A5D9';
const UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('parseOpenPayTrigger : seuls reference et type, format strict', () => {
  it('accepte le callback de la doc et ignore statut, montant, client', () => {
    const body = {
      reference: REF,
      amount: '5000',
      status: 'success',
      type: 'payment',
      customer: { name: 'x', phone: '242066203420' },
      metadata: { external_reference: TX, order_id: '1' },
    };
    expect(parseOpenPayTrigger(body)).toEqual({
      reference: REF,
      type: 'payment',
      externalReferenceHint: TX,
    });
  });

  it('retrait approuvé : référence = UUID', () => {
    expect(parseOpenPayTrigger({ reference: UUID, type: 'scheduled_cashout' })).toEqual({
      reference: UUID,
      type: 'scheduled_cashout',
    });
  });

  it.each([
    ['null', null],
    ['tableau', []],
    ['scalaire', 'x'],
    ['sans type', { reference: REF }],
    ['type inconnu', { reference: REF, type: 'refund' }],
    ['référence payment non PTXN', { reference: 'ABC123456', type: 'payment' }],
    ['PTXN trop courte', { reference: 'PTXN1', type: 'payment' }],
    ['PTXN trop longue', { reference: `PTXN${'A'.repeat(41)}`, type: 'payment' }],
    ['PTXN avec caractères interdits', { reference: 'PTXN12/../34', type: 'payment' }],
    ['référence non chaîne', { reference: 123456, type: 'payment' }],
    ['cashout avec PTXN', { reference: REF, type: 'scheduled_cashout' }],
    ['payment avec UUID', { reference: UUID, type: 'payment' }],
  ])('refuse : %s', (_label, body) => {
    expect(parseOpenPayTrigger(body)).toBeNull();
  });

  it("l'indice metadata mal formé est simplement ignoré", () => {
    expect(
      parseOpenPayTrigger({
        reference: REF,
        type: 'payment',
        metadata: { external_reference: 'x' },
      }),
    ).toEqual({ reference: REF, type: 'payment' });
  });
});

describe('parseOpenPayAmount', () => {
  it.each([
    ['1000', 1000n],
    ['50000.00', 50_000n],
    [5000, 5000n],
  ])('%p -> %p', (input, out) => expect(parseOpenPayAmount(input)).toBe(out));
  it.each(['1000.50', '-1', 'abc', '', null, 1.5, undefined])('refuse %p', (input) =>
    expect(parseOpenPayAmount(input)).toBeNull(),
  );
});

describe('correspondance stricte du statut de paiement', () => {
  const expected: ProviderStatusExpectation = {
    kind: 'COLLECTION',
    externalReference: TX,
    amount: 10_000n,
    currency: 'XAF',
  };
  const ok = {
    reference: REF,
    amount: '10000',
    currency: 'XAF',
    paymentPhoneNumber: '242066203420',
    provider: 'MTN',
    type: 'payment',
    status: 'success',
    metadata: { external_reference: TX },
  };

  it('conforme et success : SUCCEEDED', () => {
    const r = matchPaymentResponse(ok, REF, expected);
    expect(r.ok && r.status.state).toBe('SUCCEEDED');
    expect(r.ok && r.status.matched).toBe(true);
  });

  it.each([
    ['référence', { reference: 'PTXN26042237B99A5E0' }],
    ['type', { type: 'scheduled_cashout' }],
    ['montant', { amount: '9999' }],
    ['montant décimal', { amount: '10000.50' }],
    ['devise', { currency: 'EUR' }],
    ['devise absente', { currency: undefined }],
    ['metadata absente', { metadata: null }],
    ['metadata autre transaction', { metadata: { external_reference: UUID } }],
    ['statut inconnu', { status: 'weird' }],
  ])('un champ discordant est refusé : %s', (_label, patch) => {
    expect(matchPaymentResponse({ ...ok, ...patch }, REF, expected).ok).toBe(false);
  });

  it('le statut échec ne passe pas non plus si un champ discorde', () => {
    expect(matchPaymentResponse({ ...ok, status: 'failed', amount: '1' }, REF, expected).ok).toBe(
      false,
    );
  });

  it.each([
    ['pending', 'PENDING'],
    ['failed', 'FAILED'],
    ['cancelled', 'FAILED'],
  ])('statut %s -> %s', (status, state) => {
    const r = matchPaymentResponse({ ...ok, status }, REF, expected);
    expect(r.ok && r.status.state).toBe(state);
  });
});

describe('correspondance stricte du retrait programmé', () => {
  const expected: ProviderStatusExpectation = {
    kind: 'PAYOUT',
    externalReference: UUID,
    amount: 50_000n,
    currency: 'XAF',
    msisdn: '+242066203420',
  };
  const data = {
    reference: UUID,
    status: 'approved',
    amount: '50000.00',
    phone_number: '242066203420',
    provider: 'MTN',
    origin_app: 'Immodesk',
  };

  it('approved : PENDING avec action EXECUTE', () => {
    const r = matchCashoutResponse({ success: true, data }, UUID, expected);
    expect(r.ok && r.status.state).toBe('PENDING');
    expect(r.ok && r.status.nextAction).toBe('EXECUTE');
  });

  it('completed : SUCCEEDED ; rejected : FAILED', () => {
    const done = matchCashoutResponse({ data: { ...data, status: 'completed' } }, UUID, expected);
    expect(done.ok && done.status.state).toBe('SUCCEEDED');
    const rej = matchCashoutResponse({ data: { ...data, status: 'rejected' } }, UUID, expected);
    expect(rej.ok && rej.status.state).toBe('FAILED');
  });

  it.each([
    ['référence', { reference: '550e8400-e29b-41d4-a716-446655440001' }],
    ['montant', { amount: '50001.00' }],
    ['bénéficiaire', { phone_number: '242066203421' }],
    ['origin_app', { origin_app: 'Autre' }],
    ['statut', { status: 'unknown' }],
  ])('discordance refusée : %s', (_l, patch) => {
    expect(matchCashoutResponse({ data: { ...data, ...patch } }, UUID, expected).ok).toBe(false);
  });
});

describe('anti-abus et masquage', () => {
  const limits = { minIntervalSeconds: 5 };
  const now = new Date('2026-09-10T10:00:10Z');
  it('intervalle minimal', () => {
    expect(
      isCheckThrottled({ status_checked_at: new Date('2026-09-10T10:00:08Z') }, limits, now),
    ).toBe(true);
    expect(
      isCheckThrottled({ status_checked_at: new Date('2026-09-10T10:00:04Z') }, limits, now),
    ).toBe(false);
    expect(isCheckThrottled({ status_checked_at: null }, limits, now)).toBe(false);
  });
  it('aucun plafond à vie : un grand nombre de vérifications passées ne bloque jamais', () => {
    // Le plafond des callbacks est une fenêtre glissante (OpenPayApiLimiter), pas un total.
    expect(isCheckThrottled({ status_checked_at: null }, limits, now)).toBe(false);
  });
  it('expiration des INITIATED', () => {
    const t0 = new Date('2026-09-10T08:00:00Z');
    expect(isInitiatedExpired(t0, new Date('2026-09-10T08:59:00Z'), 60)).toBe(false);
    expect(isInitiatedExpired(t0, new Date('2026-09-10T09:00:00Z'), 60)).toBe(true);
  });
  it('masque les numéros', () => {
    expect(maskMsisdns('echec 242066203420 et +242056203420')).not.toMatch(/\d{9,}/);
  });
});
