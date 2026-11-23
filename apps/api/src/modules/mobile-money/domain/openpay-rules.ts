import type { ParsedTrigger, ProviderStatus, ProviderStatusExpectation } from './ports';
import { isRecord } from './webhook-signature';

/**
 * Règles pures d'OpenPay (documentation officielle : accept-payments,
 * payment-status, scheduled-cashout, callback). Aucune dépendance Nest.
 */

/** Taille maximale d'un corps de callback ; au-delà, il est ignoré sans analyse. */
export const OPENPAY_CALLBACK_MAX_BYTES = 4096;
/** Identifiant de l'application cliente transmis aux retraits programmés. */
export const OPENPAY_ORIGIN_APP = 'Immodesk';

/** Référence de paiement OpenPay (`PTXN26042237B99A5D9`) : préfixe, puis 4 à 40 alphanumériques. */
const PAYMENT_REFERENCE = /^PTXN[0-9A-Za-z]{4,40}$/;
/** Référence d'un retrait programmé : l'UUID fourni à la création. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** UUID v4 exigé par la doc OpenPay pour la `reference` d'un retrait programmé. */
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isOpenPayPaymentReference(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 44 && PAYMENT_REFERENCE.test(value);
}

export function isOpenPayUuid(value: unknown): value is string {
  return typeof value === 'string' && value.length === 36 && UUID.test(value);
}

/** Référence de retrait programmé : UUID v4 (la doc l'exige ; un UUID v7 n'est pas accepté). */
export function isOpenPayCashoutReference(value: unknown): value is string {
  return typeof value === 'string' && value.length === 36 && UUID_V4.test(value);
}

/**
 * Seuls `reference` et `type` sont lus (plus `metadata.external_reference`,
 * simple indice de recherche). Statut, montant, client et le reste du corps
 * sont ignorés : le callback n'est pas signé, il ne prouve rien.
 */
export function parseOpenPayTrigger(body: unknown): ParsedTrigger | null {
  if (!isRecord(body)) return null;
  const { reference, type } = body;
  let parsed: ParsedTrigger;
  if (type === 'payment' && isOpenPayPaymentReference(reference)) {
    parsed = { reference, type };
  } else if (type === 'scheduled_cashout' && isOpenPayCashoutReference(reference)) {
    parsed = { reference: reference.toLowerCase(), type };
  } else {
    return null;
  }
  const metadata = body.metadata;
  if (isRecord(metadata) && isOpenPayUuid(metadata.external_reference)) {
    parsed.externalReferenceHint = metadata.external_reference.toLowerCase();
  }
  return parsed;
}

/** Montant XAF entier : « 1000 », « 50000.00 » ou un nombre entier ; toute fraction non nulle est refusée. */
export function parseOpenPayAmount(value: unknown): bigint | null {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value >= 0 ? BigInt(value) : null;
  }
  if (typeof value !== 'string') return null;
  const match = /^(\d{1,12})(?:\.0{1,2})?$/.exec(value.trim());
  return match?.[1] ? BigInt(match[1]) : null;
}

/** `+242066203420` -> `242066203420` (format attendu par OpenPay). */
export function toOpenPayMsisdn(e164: string): string {
  return e164.replace(/^\+/, '');
}

/** Masque un numéro pour les journaux : `24206*****20`. */
export function maskMsisdns(text: string): string {
  return text.replace(
    /\+?\d{9,13}/g,
    (m) => `${m.slice(0, 5)}${'*'.repeat(m.length - 7)}${m.slice(-2)}`,
  );
}

export type OpenPayMatch = { ok: true; status: ProviderStatus } | { ok: false; reason: string };

/** Statuts de paiement documentés : `pending`, `success`, `failed`, `cancelled`. */
function mapPaymentStatus(status: unknown): ProviderStatus['state'] | null {
  if (status === 'success') return 'SUCCEEDED';
  if (status === 'pending') return 'PENDING';
  if (status === 'failed' || status === 'cancelled') return 'FAILED';
  return null;
}

/** Statuts de retrait documentés : `pending`, `approved`, `completed`, `cancelled`, `rejected`. */
function mapCashoutStatus(status: unknown): ProviderStatus['state'] | null {
  if (status === 'completed') return 'SUCCEEDED';
  if (status === 'pending' || status === 'approved') return 'PENDING';
  if (status === 'cancelled' || status === 'rejected') return 'FAILED';
  return null;
}

/**
 * Correspondance STRICTE de la réponse `GET /transaction/status/:ref` avec la
 * transaction attendue : référence, type `payment`, montant, devise XAF et
 * `metadata.external_reference`. Un seul champ discordant refuse la réponse ;
 * un statut inconnu aussi. Seul `success` confirme.
 */
export function matchPaymentResponse(
  response: unknown,
  queriedReference: string,
  expected: ProviderStatusExpectation,
): OpenPayMatch {
  if (!isRecord(response)) return { ok: false, reason: 'réponse non objet' };
  if (response.reference !== queriedReference) return { ok: false, reason: 'référence' };
  if (response.type !== 'payment') return { ok: false, reason: 'type' };
  if (parseOpenPayAmount(response.amount) !== expected.amount)
    return { ok: false, reason: 'montant' };
  if (response.currency !== 'XAF' || expected.currency.toUpperCase() !== 'XAF') {
    return { ok: false, reason: 'devise' };
  }
  const metadata = response.metadata;
  if (!isRecord(metadata) || metadata.external_reference !== expected.externalReference) {
    return { ok: false, reason: 'metadata' };
  }
  const state = mapPaymentStatus(response.status);
  if (!state) return { ok: false, reason: 'statut inconnu' };
  return {
    ok: true,
    status: {
      state,
      providerReference: queriedReference,
      amount: expected.amount,
      currency: 'XAF',
      matched: true,
      ...(state === 'FAILED'
        ? {
            failureCode: `openpay_${String(response.status)}`,
            failureMessage:
              typeof response.message === 'string' ? response.message.slice(0, 300) : undefined,
          }
        : {}),
      rawPayload: response,
    },
  };
}

/**
 * Correspondance stricte d'un retrait programmé (`GET /scheduled-cashout/:ref`
 * ou réponse d'`execute`, enveloppe `{ success, data }`) : UUID, montant,
 * bénéficiaire et application d'origine. La doc ne renvoie pas de devise
 * (XAF seul) : seule l'attente en XAF est vérifiée.
 */
export function matchCashoutResponse(
  response: unknown,
  queriedReference: string,
  expected: ProviderStatusExpectation,
): OpenPayMatch {
  const data = isRecord(response) ? response.data : null;
  if (!isRecord(data)) return { ok: false, reason: 'réponse sans data' };
  if (typeof data.reference !== 'string' || data.reference.toLowerCase() !== queriedReference) {
    return { ok: false, reason: 'référence' };
  }
  if (queriedReference !== expected.externalReference.toLowerCase()) {
    return { ok: false, reason: 'référence attendue' };
  }
  if (parseOpenPayAmount(data.amount) !== expected.amount) return { ok: false, reason: 'montant' };
  if (expected.currency.toUpperCase() !== 'XAF') return { ok: false, reason: 'devise' };
  if (!expected.msisdn || data.phone_number !== toOpenPayMsisdn(expected.msisdn)) {
    return { ok: false, reason: 'bénéficiaire' };
  }
  if (data.origin_app !== OPENPAY_ORIGIN_APP) return { ok: false, reason: 'origin_app' };
  const state = mapCashoutStatus(data.status);
  if (!state) return { ok: false, reason: 'statut inconnu' };
  return {
    ok: true,
    status: {
      state,
      providerReference: queriedReference,
      amount: expected.amount,
      currency: 'XAF',
      matched: true,
      cashoutStatus: data.status as NonNullable<ProviderStatus['cashoutStatus']>,
      ...(data.status === 'approved' ? { nextAction: 'EXECUTE' as const } : {}),
      ...(state === 'FAILED' ? { failureCode: `openpay_${String(data.status)}` } : {}),
      rawPayload: response,
    },
  };
}
