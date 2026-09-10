import type { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';
import { createApp } from '../../src/bootstrap';
import { FakeSmsProvider } from '../../src/modules/notifications/infrastructure/fake-sms.provider';
import { RedisThrottlerStorage } from '../../src/shared/throttler/redis-throttler.storage';

export interface TestContext {
  app: INestApplication;
  admin: PrismaClient;
  sms: FakeSmsProvider;
  throttler: RedisThrottlerStorage;
  baseUrl: string;
}

/** Démarre l'API sur un port éphémère et ouvre une connexion d'administration. */
export async function startTestApp(): Promise<TestContext> {
  const app = await createApp();
  await app.listen(0, '127.0.0.1');

  const address = app.getHttpServer().address() as { port: number };
  const admin = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_ADMIN_URL as string } },
    log: ['error'],
  });
  await admin.$connect();

  return {
    app,
    admin,
    sms: app.get(FakeSmsProvider),
    throttler: app.get(RedisThrottlerStorage),
    baseUrl: `http://127.0.0.1:${address.port}/v1`,
  };
}

export async function stopTestApp(ctx: TestContext): Promise<void> {
  await ctx.admin.$disconnect();
  await ctx.app.close();
}

export interface ApiResponse<T = any> {
  status: number;
  body: T;
}

/** Appel HTTP minimal : évite une dépendance de test supplémentaire. */
export async function api<T = any>(
  ctx: TestContext,
  method: string,
  path: string,
  options: {
    body?: unknown;
    accessToken?: string;
    organizationId?: string;
    headers?: Record<string, string>;
  } = {},
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (options.accessToken) headers.Authorization = `Bearer ${options.accessToken}`;
  if (options.organizationId) headers['X-Organization-Id'] = options.organizationId;

  const response = await fetch(`${ctx.baseUrl}${path}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const text = await response.text();
  let body: any = null;
  if (text.length > 0) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { status: response.status, body };
}

/** Numéro de téléphone unique, pour que les tests n'interfèrent pas. */
export function uniquePhone(): string {
  const suffix = String(Math.floor(Math.random() * 900_000_000) + 100_000_000).slice(0, 8);
  return `+2420${suffix}`;
}

/** Extrait le code du SMS simulé : le chemin de hachage réel est exercé. */
export function readOtpCodeFromSms(ctx: TestContext): string {
  const message = ctx.sms.peekLastMessage();
  if (!message) throw new Error("Aucun SMS simulé : l'envoi de l'OTP n'a pas eu lieu.");
  const match = message.body.match(/\b(\d{6})\b/);
  if (!match) throw new Error(`Code introuvable dans le SMS simulé : « ${message.body} »`);
  return match[1];
}

/**
 * Remet à zéro les compteurs de limitation de débit et le délai de renvoi
 * pour un numéro : les tests enchaînent plusieurs demandes d'OTP, ce qui
 * dépasserait sinon le quota de 3 / 10 min.
 */
export async function resetOtpLimits(ctx: TestContext, phone: string): Promise<void> {
  // Le quota par IP (20 / h) est commun à toute la suite : il faut purger
  // l'ensemble des compteurs, pas seulement ceux du numéro courant.
  await ctx.throttler.resetAll();
  await ctx.admin.otp_codes.deleteMany({ where: { phone_e164: phone } });
}

/** Cycle complet demande + vérification, renvoyant les jetons émis. */
export async function login(
  ctx: TestContext,
  phone: string,
): Promise<{ accessToken: string; refreshToken: string; userId: string }> {
  await resetOtpLimits(ctx, phone);

  const requested = await api(ctx, 'POST', '/auth/otp/request', { body: { phone } });
  if (requested.status !== 201) {
    throw new Error(`Demande d'OTP en échec : ${JSON.stringify(requested.body)}`);
  }

  const code = readOtpCodeFromSms(ctx);
  const verified = await api(ctx, 'POST', '/auth/otp/verify', {
    body: { phone, code, deviceName: 'Test intégration' },
  });
  if (verified.status !== 200) {
    throw new Error(`Vérification d'OTP en échec : ${JSON.stringify(verified.body)}`);
  }

  return {
    accessToken: verified.body.accessToken,
    refreshToken: verified.body.refreshToken,
    userId: verified.body.user.id,
  };
}

/**
 * Exécute un nettoyage avec les déclencheurs d'`audit_logs` désactivés.
 *
 * `audit_logs` est strictement append-only : un déclencheur y interdit
 * UPDATE et DELETE. Or supprimer un utilisateur déclenche un
 * `ON DELETE SET NULL` sur `audit_logs.actor_user_id`, donc un UPDATE, donc
 * un refus. Cette désactivation temporaire est un artifice RÉSERVÉ AUX
 * TESTS : elle n'existe nulle part dans le code applicatif, où la règle
 * append-only doit rester absolue.
 */
export async function withAuditTriggersDisabled(
  admin: PrismaClient,
  work: () => Promise<void>,
): Promise<void> {
  await admin.$executeRawUnsafe('ALTER TABLE audit_logs DISABLE TRIGGER USER');
  try {
    await work();
  } finally {
    await admin.$executeRawUnsafe('ALTER TABLE audit_logs ENABLE TRIGGER USER');
  }
}

/** Supprime les traces d'un utilisateur de test et ses organisations. */
export async function cleanupUser(ctx: TestContext, phone: string): Promise<void> {
  const user = await ctx.admin.users.findUnique({
    where: { phone_e164: phone },
    select: { id: true },
  });
  if (!user) return;

  const memberships = await ctx.admin.organization_members.findMany({
    where: { user_id: user.id },
    select: { organization_id: true },
  });

  await withAuditTriggersDisabled(ctx.admin, async () => {
    await ctx.admin.users.delete({ where: { id: user.id } }).catch(() => undefined);

    for (const { organization_id } of memberships) {
      const remaining = await ctx.admin.organization_members.count({
        where: { organization_id },
      });
      if (remaining === 0) {
        await ctx.admin.organizations
          .delete({ where: { id: organization_id } })
          .catch(() => undefined);
      }
    }
  });
}

export function newUuid(): string {
  return uuidv7();
}
