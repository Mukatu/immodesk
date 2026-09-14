import { v7 as uuidv7 } from 'uuid';
import { AppConfigService } from '../../src/shared/config/config.module';
import { signHmac } from '../../src/modules/mobile-money/domain/webhook-signature';
import { api, type TestContext } from './helpers';
import type { Agency } from './phase3-fixtures';

export interface SimulatorWebhookPayload {
  eventId: string;
  merchantReference: string;
  providerReference: string;
  status: 'SUCCEEDED' | 'FAILED';
  amount?: string;
  currency?: string;
}

/** Signe un corps de webhook simulateur avec le SECRET réellement chargé par l'API testée. */
export function signSimulatorWebhook(
  ctx: TestContext,
  payload: SimulatorWebhookPayload,
): { body: string; signature: string } {
  const secret = ctx.app.get(AppConfigService).get('MOMO_SIMULATOR_SECRET');
  const body = JSON.stringify(payload);
  return { body, signature: signHmac(body, secret) };
}

/** POST brut vers `/webhooks/mobile-money/simulator`, hors passerelle `api()` (corps déjà sérialisé). */
export async function postSimulatorWebhook(
  ctx: TestContext,
  body: string,
  signature: string | null,
): Promise<{ status: number }> {
  const response = await fetch(`${ctx.baseUrl}/webhooks/mobile-money/simulator`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(signature ? { 'x-simulator-signature': signature } : {}),
    },
    body,
  });
  return { status: response.status };
}

/** Numéro Mobile Money dont les deux derniers chiffres pilotent le simulateur. */
export function momoMsisdn(suffix: string): string {
  return `+2420661234${suffix}`;
}

/**
 * Active le mode agrégateur (drapeau plateforme GLOBAL + paramètre
 * d'organisation) pour que les tests du simulateur ne butent pas sur
 * `MOMO.AGGREGATOR_DISABLED`. Le drapeau est global : il n'est créé qu'une
 * fois (`findFirst` avant `create`), les suites peuvent tourner en parallèle
 * sans collision sur la clé `(organization_id, key)`.
 */
export async function enableAggregator(ctx: TestContext, agency: Agency): Promise<void> {
  const existing = await ctx.admin.feature_flags.findFirst({
    where: { organization_id: null, key: 'payments.mobile_money_aggregator' },
  });
  if (existing) {
    if (!existing.is_enabled) {
      await ctx.admin.feature_flags.update({
        where: { id: existing.id },
        data: { is_enabled: true },
      });
    }
  } else {
    await ctx.admin.feature_flags.create({
      data: {
        id: uuidv7(),
        organization_id: null,
        key: 'payments.mobile_money_aggregator',
        is_enabled: true,
      },
    });
  }

  const res = await api(ctx, 'PATCH', `/organizations/${agency.organizationId}/payment-methods`, {
    accessToken: agency.owner.accessToken,
    organizationId: agency.organizationId,
    body: { mobileMoneyAggregator: { enabled: true, provider: 'SIMULATOR', feeRateBps: 300 } },
  });
  if (res.status !== 200)
    throw new Error(`Activation agrégateur en échec : ${JSON.stringify(res.body)}`);
}

/**
 * Le simulateur Mobile Money s'appelle lui-même (`MOMO_WEBHOOK_BASE_URL`) —
 * or l'application de test écoute un PORT ÉPHÉMÈRE, connu seulement après
 * `app.listen(0, ...)`. `AppConfigService.all` renvoie l'objet de
 * configuration VALIDÉ AU DÉMARRAGE, mutable en mémoire : le retyper ici
 * pointe le simulateur vers l'application réellement testée, sans toucher
 * `.env` ni relancer le processus. Artifice RÉSERVÉ AUX TESTS.
 */
export function pointSimulatorAtTestApp(ctx: TestContext): void {
  const config = ctx.app.get(AppConfigService).all as Record<string, unknown>;
  config.MOMO_WEBHOOK_BASE_URL = ctx.baseUrl.replace(/\/v1$/, '');
}

/** Compte de règlement `holder_type = ORGANIZATION`, pour les virements déclarés. */
export async function ensureOrgBankAccount(
  ctx: TestContext,
  organizationId: string,
): Promise<string> {
  const existing = await ctx.admin.bank_accounts.findFirst({
    where: { organization_id: organizationId, holder_type: 'ORGANIZATION' },
    select: { id: true },
  });
  if (existing) return existing.id;
  const id = uuidv7();
  await ctx.admin.bank_accounts.create({
    data: {
      id,
      organization_id: organizationId,
      holder_type: 'ORGANIZATION',
      label: 'Compte agence (test)',
      bank_code: 'BGFI',
      bank_name: 'BGFIBank Congo',
      account_holder_name: 'Agence test',
      account_number: `3001${Math.floor(Math.random() * 1_000_000_000)}`,
    },
  });
  return id;
}

/** Enregistre un document de preuve (checksum donné) directement en base. */
export async function createProofDocument(
  ctx: TestContext,
  organizationId: string,
  checksum: string,
): Promise<string> {
  const id = uuidv7();
  await ctx.admin.documents.create({
    data: {
      id,
      organization_id: organizationId,
      kind: 'OTHER',
      storage_provider: 'R2',
      bucket: 'immodesk-test',
      object_key: `org/${organizationId}/proofs/${id}.jpg`,
      file_name: 'preuve.jpg',
      mime_type: 'image/jpeg',
      size_bytes: 10_240n,
      checksum_sha256: checksum,
    },
  });
  return id;
}
