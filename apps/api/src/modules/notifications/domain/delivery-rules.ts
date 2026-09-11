/**
 * Règles d'acheminement des messages, domaine pur.
 *
 * WhatsApp d'abord, SMS en repli (décisions communes, § « Messagerie ») : le
 * pipeline essaie les canaux DANS L'ORDRE et s'arrête au premier accepté.
 */
export type DeliveryChannel = 'WHATSAPP' | 'SMS';

const SUPPORTED: readonly DeliveryChannel[] = ['WHATSAPP', 'SMS'];

/**
 * Canaux à essayer, sans doublon, en partant de `from` si fourni (reprise
 * après un échec signalé par webhook ou relance manuelle d'un canal).
 */
export function channelSequence(
  order: readonly string[],
  from?: DeliveryChannel | null,
): DeliveryChannel[] {
  const unique = [...new Set(order)].filter((c): c is DeliveryChannel =>
    SUPPORTED.includes(c as DeliveryChannel),
  );
  const sequence = unique.length > 0 ? unique : [...SUPPORTED];
  if (!from) return sequence;
  const index = sequence.indexOf(from);
  return index >= 0 ? sequence.slice(index) : [from];
}

/** Un envoi accepté par le fournisseur arrête le repli (SENT, ou QUEUED côté passerelle). */
export function isAccepted(status: 'SENT' | 'QUEUED' | 'FAILED'): boolean {
  return status !== 'FAILED';
}

/**
 * Repli déclenché par un webhook : un WhatsApp signalé FAILED après
 * acceptation bascule sur le SMS, s'il reste dans l'ordre des canaux et n'a
 * pas déjà été tenté pour cette notification. Jamais de SMS en doublon d'un
 * WhatsApp délivré.
 */
export function needsWebhookFallback(input: {
  eventStatus: string;
  channel: string;
  order: readonly string[];
  smsAlreadyAttempted: boolean;
}): boolean {
  return (
    input.eventStatus === 'FAILED' &&
    input.channel === 'WHATSAPP' &&
    !input.smsAlreadyAttempted &&
    channelSequence(input.order, 'WHATSAPP').includes('SMS')
  );
}

/** Rang des statuts : un webhook plus ancien que l'état connu est ignoré (ils arrivent hors ordre). */
export const MESSAGE_STATUS_RANK: Readonly<Record<string, number>> = {
  QUEUED: 0,
  SENT: 1,
  DELIVERED: 2,
  READ: 3,
};

export function nextMessageStatus(current: string, incoming: string): string | null {
  if (incoming === 'FAILED') {
    return current === 'DELIVERED' || current === 'READ' || current === 'FAILED' ? null : 'FAILED';
  }
  if (current === 'FAILED' || current === 'REJECTED' || current === 'EXPIRED') {
    // Un « delivered » tardif fait foi : le message est bien arrivé.
    return incoming in MESSAGE_STATUS_RANK && incoming !== 'QUEUED' ? incoming : null;
  }
  const from = MESSAGE_STATUS_RANK[current] ?? -1;
  const to = MESSAGE_STATUS_RANK[incoming];
  return to !== undefined && to > from ? incoming : null;
}

/**
 * Caractères construits par code point : des espaces insécables ou des
 * diacritiques combinants écrits en clair sont invisibles dans un éditeur et
 * se perdent au copier-coller (même convention que `search-text.ts`).
 */
const cp = (...points: number[]): string => points.map((p) => String.fromCharCode(p)).join('');
const COMBINING_MARKS = new RegExp(`[${cp(0x0300)}-${cp(0x036f)}]`, 'g');

const GSM_REPLACEMENTS: ReadonlyArray<[RegExp, string]> = [
  [new RegExp(`[${cp(0x00a0, 0x2007, 0x2009, 0x202f)}]`, 'g'), ' '],
  [new RegExp(`[${cp(0x2018, 0x2019, 0x201a, 0x2032)}]`, 'g'), "'"],
  [new RegExp(`[${cp(0x201c, 0x201d, 0x201e, 0x00ab, 0x00bb)}]`, 'g'), '"'],
  [new RegExp(`[${cp(0x2013, 0x2014)}]`, 'g'), '-'],
  [new RegExp(cp(0x2026), 'g'), '...'],
  [new RegExp(cp(0x0153), 'g'), 'oe'],
  [new RegExp(cp(0x0152), 'g'), 'OE'],
  [new RegExp(cp(0x00e6), 'g'), 'ae'],
];

/**
 * Translittération GSM-7 : accents retirés, espaces fines remplacées. Le
 * montant formaté « 120 000 FCFA » porte des espaces fines insécables qui,
 * sinon, feraient passer tout le SMS en UCS-2 et doubleraient son coût.
 */
export function toGsm7(text: string): string {
  let result = text;
  for (const [pattern, replacement] of GSM_REPLACEMENTS)
    result = result.replace(pattern, replacement);
  result = result.normalize('NFD').replace(COMBINING_MARKS, '');
  return result
    .replace(/[^\x20-\x7e\n\r]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/** Segments facturés : 160 caractères en un seul, 153 par segment au-delà (en-tête de concaténation). */
export function smsSegments(text: string): number {
  if (text.length <= 160) return 1;
  return Math.ceil(text.length / 153);
}

/** Paramètres positionnels d'un modèle Meta, dans l'ordre déclaré. */
export function orderedParameters(
  variables: Record<string, string>,
  names: readonly string[],
): string[] {
  return names.map((name) => variables[name] ?? '');
}

/** Coût estimé d'un envoi en XAF (conversation « utility » Meta ; SMS au forfait illimité). */
export function estimatedCost(provider: string): bigint {
  if (provider === 'meta-whatsapp') return 25n;
  return 0n;
}
