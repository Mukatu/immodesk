/**
 * Faux OpenPay des tests d'intégration, STRICT : il applique les règles de la doc officielle et
 * consigne toute entorse dans `violations` (clé API absente ou fausse, chemin de statut inexact,
 * référence de retrait non UUID v4, date d'exécution < 24 h...). Chaque spec doit finir par
 * `expect(fake.violations).toEqual([])`. Aucun appel à la vraie API.
 */
export interface FakePayment {
  amount: string;
  phone: string;
  metadata: Record<string, unknown> | null;
  status: string;
  tamper?: Record<string, unknown>;
}

export interface FakeCashout {
  reference: string;
  amount: string;
  phone: string;
  status: 'pending' | 'approved' | 'completed' | 'cancelled' | 'rejected';
  executeCount: number;
}

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATUS_PATH = /^\/transaction\/status\/(PTXN[0-9A-Za-z]+)$/;
const CASHOUT_PATH = /^\/scheduled-cashout\/([^/]+)(\/execute)?$/;
const BASE = 'https://api.openpay-cg.com/v1';

export function createFakeOpenPay(runTag: string, apiKey = 'cle-api-de-test') {
  const payments = new Map<string, FakePayment>();
  const cashouts = new Map<string, FakeCashout>();
  const byIdempotencyKey = new Map<string, { reference: string; params: string }>();
  const calls: string[] = [];
  const violations: string[] = [];
  const control = {
    /** Les N prochaines réponses d'initiation sont perdues (503) alors que le paiement EST créé. */
    losePaymentResponses: 0,
    /** Les N prochaines initiations n'atteignent JAMAIS OpenPay (connexion refusée) : rien n'est créé. */
    dropPaymentRequests: 0,
    /** Les N prochaines réponses d'initiation sont perdues par un DÉLAI DÉPASSÉ (paiement créé). */
    timeoutPaymentResponses: 0,
    executeDelayMs: 0,
    /** Les N prochains `execute` sont refusés en 400 (solde insuffisant) : AUCUN virement. */
    rejectExecute: 0,
    /** Les N prochains `execute` émettent le virement puis la réponse est perdue (réseau coupé). */
    executeLostAfterTransfer: 0,
    /** Les N prochains `execute` échouent (réseau) AVANT d'émettre un virement. */
    executeLostBeforeTransfer: 0,
  };
  let seq = 0;

  const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), { status, headers });
  const cashoutData = (c: FakeCashout) => ({
    reference: c.reference,
    amount: c.amount,
    phone_number: c.phone,
    provider: 'MTN',
    status: c.status,
    execution_date: new Date(Date.now() + 25 * 3_600_000).toISOString(),
    origin_app: 'Immodesk',
  });

  const fetchFn = (async (url: string, init: RequestInit) => {
    const path = String(url).replace(BASE, '');
    const method = init.method ?? 'GET';
    calls.push(`${method} ${path}`);
    const headers = (init.headers ?? {}) as Record<string, string>;
    if (headers['XO-API-KEY'] !== apiKey) {
      violations.push(`${method} ${path} : XO-API-KEY absent ou faux`);
      return json(401, { error: 'Clé API invalide' });
    }
    if (method === 'POST' && path === '/transaction/payment') {
      if (control.dropPaymentRequests > 0) {
        control.dropPaymentRequests -= 1;
        throw new Error('connect ECONNREFUSED 127.0.0.1:443');
      }
      const body = JSON.parse(init.body as string);
      const key = headers['Idempotency-Key'];
      const params = JSON.stringify([body.amount, body.payment_phone_number, body.provider]);
      if (/^\+/.test(String(body.payment_phone_number))) violations.push('numéro avec +');
      const known = key ? byIdempotencyKey.get(key) : undefined;
      if (known && known.params !== params) return json(422, { error: 'Clé d’idempotence' });
      let reference = known?.reference;
      if (!reference) {
        reference = `PTXN${runTag}${String(++seq).padStart(4, '0')}`;
        payments.set(reference, {
          amount: String(body.amount),
          phone: body.payment_phone_number,
          metadata: body.metadata ?? null,
          status: 'pending',
        });
        if (key) byIdempotencyKey.set(key, { reference, params });
      }
      if (control.timeoutPaymentResponses > 0) {
        control.timeoutPaymentResponses -= 1;
        throw new DOMException('The operation was aborted', 'AbortError');
      }
      if (control.losePaymentResponses > 0) {
        control.losePaymentResponses -= 1;
        return json(503, { error: 'indisponible' });
      }
      const created = payments.get(reference) as FakePayment;
      return json(
        200,
        { reference, status: 'pending', type: 'payment', metadata: created.metadata },
        known ? { 'Idempotent-Replayed': 'true' } : {},
      );
    }
    if (method === 'GET' && path.startsWith('/transaction/')) {
      const match = STATUS_PATH.exec(path);
      if (!match) {
        violations.push(`GET ${path} : chemin de statut inexact`);
        return json(404, { error: 'Not found' });
      }
      const reference = match[1] as string;
      const row = payments.get(reference);
      if (!row) return json(404, { error: 'Transaction introuvable' });
      return json(200, {
        reference,
        amount: row.amount,
        currency: 'XAF',
        paymentPhoneNumber: row.phone,
        provider: 'MTN',
        type: 'payment',
        status: row.status,
        metadata: row.metadata,
        ...row.tamper,
      });
    }
    if (path === '/scheduled-cashout' && method === 'POST') {
      const body = JSON.parse(init.body as string);
      if (!UUID_V4.test(String(body.reference))) violations.push(`retrait : référence non UUID v4`);
      if (new Date(body.execution_date).getTime() < Date.now() + 24 * 3_600_000) {
        return json(400, { error: 'execution_date doit être >= 24 h' });
      }
      if (cashouts.has(body.reference)) return json(409, { error: 'reference déjà utilisée' });
      const created: FakeCashout = {
        reference: body.reference,
        amount: `${body.amount}.00`,
        phone: body.phone_number,
        status: 'pending',
        executeCount: 0,
      };
      cashouts.set(created.reference, created);
      return json(201, { success: true, data: cashoutData(created) });
    }
    const cashoutMatch = CASHOUT_PATH.exec(path);
    if (cashoutMatch) {
      const cashout = cashouts.get(String(cashoutMatch[1]).toLowerCase());
      if (!cashout) return json(404, { error: 'Retrait introuvable' });
      if (method === 'GET') return json(200, { success: true, data: cashoutData(cashout) });
      if (method === 'DELETE') {
        if (cashout.status !== 'pending')
          return json(400, { error: 'Le retrait n’est plus en attente' });
        cashout.status = 'cancelled';
        return json(200, { success: true, message: 'Retrait annulé' });
      }
      if (method === 'POST' && cashoutMatch[2]) {
        if (cashout.status !== 'approved')
          return json(400, { error: 'Le retrait doit être approuvé' });
        if (control.rejectExecute > 0) {
          control.rejectExecute -= 1;
          return json(400, { error: 'Solde plateforme insuffisant' });
        }
        if (control.executeLostBeforeTransfer > 0) {
          control.executeLostBeforeTransfer -= 1;
          throw new Error('socket hang up');
        }
        if (control.executeDelayMs > 0)
          await new Promise((r) => setTimeout(r, control.executeDelayMs));
        cashout.executeCount += 1;
        cashout.status = 'completed';
        if (control.executeLostAfterTransfer > 0) {
          control.executeLostAfterTransfer -= 1;
          throw new Error('socket hang up');
        }
        return json(200, {
          success: true,
          message: 'Retrait effectué',
          data: cashoutData(cashout),
        });
      }
    }
    violations.push(`${method} ${path} : endpoint inconnu`);
    return json(404, { error: 'Not found' });
  }) as typeof fetch;

  return { fetchFn, payments, cashouts, calls, violations, control };
}
