import { Inject, Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import { AppConfigService } from '../../../shared/config/config.module';
import { DomainError } from '../../../shared/errors/domain-error';
import { REDIS_CLIENT } from '../../../shared/redis/redis.module';
import { maskMsisdns } from '../domain/openpay-rules';

/** Délais (ms) : lecture d'un statut courte ; initiation plus longue (le paiement peut durer, doc : 5 min). */
export const OPENPAY_STATUS_TIMEOUT_MS = 10_000;
export const OPENPAY_ACTION_TIMEOUT_MS = 20_000;

export interface OpenPayResponse {
  status: number;
  body: unknown;
  replayed: boolean;
}

export interface OpenPayRequest {
  method: 'GET' | 'POST' | 'DELETE';
  path: string;
  body?: Record<string, unknown>;
  idempotencyKey?: string;
  timeoutMs?: number;
}

/**
 * Client HTTP d'OpenPay (`https://api.openpay-cg.com/v1`). Aucune clé API ni
 * numéro complet dans les journaux. Codes d'erreur de la doc : 400, 404, 409 et
 * 422 sont rendus à l'appelant (réponse métier) ; 401, 403, 429, 5xx, délai
 * dépassé et réseau lèvent `MOMO.PROVIDER_UNAVAILABLE`.
 */
@Injectable()
export class OpenPayClient {
  private readonly logger = new Logger(OpenPayClient.name);
  /** Remplaçable en test : aucun test n'appelle la vraie API. */
  fetchFn: typeof fetch = (input, init) => fetch(input, init);

  constructor(private readonly config: AppConfigService) {}

  async request(req: OpenPayRequest): Promise<OpenPayResponse> {
    const apiKey = this.config.get('OPENPAY_API_KEY');
    if (!apiKey)
      throw new DomainError('PLATFORM.INTERNAL_ERROR', { reason: 'OPENPAY_API_KEY absent' });
    const baseUrl = this.config.get('OPENPAY_BASE_URL').replace(/\/+$/, '');
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      req.timeoutMs ?? OPENPAY_STATUS_TIMEOUT_MS,
    );
    let response: Response;
    let body: unknown;
    try {
      response = await this.fetchFn(`${baseUrl}${req.path}`, {
        method: req.method,
        headers: {
          'XO-API-KEY': apiKey,
          Accept: 'application/json',
          ...(req.body ? { 'Content-Type': 'application/json' } : {}),
          ...(req.idempotencyKey ? { 'Idempotency-Key': req.idempotencyKey } : {}),
        },
        body: req.body ? JSON.stringify(req.body) : undefined,
        signal: controller.signal,
      });
      // Le corps est lu AVANT d'annuler le délai : un serveur qui répond ses
      // en-têtes puis goutte-à-goutte son corps ne doit pas suspendre l'appelant
      // (l'annulation fait échouer `text()`, traité comme une indisponibilité).
      const text = await response.text();
      try {
        body = text.length > 0 ? JSON.parse(text) : null;
      } catch {
        body = null;
      }
    } catch (error) {
      this.logger.error(
        `OpenPay ${req.method} ${this.loggablePath(req.path)} indisponible : ${maskMsisdns(String(error))}`,
      );
      throw new DomainError('MOMO.PROVIDER_UNAVAILABLE', { path: this.loggablePath(req.path) });
    } finally {
      clearTimeout(timeout);
    }
    if ([200, 201, 400, 404, 409, 422].includes(response.status)) {
      return {
        status: response.status,
        body,
        replayed: response.headers.get('idempotent-replayed') === 'true',
      };
    }
    const reason = this.describe(response.status);
    this.logger.error(
      `OpenPay ${req.method} ${this.loggablePath(req.path)} : HTTP ${response.status} (${reason})`,
    );
    throw new DomainError('MOMO.PROVIDER_UNAVAILABLE', { status: response.status, reason });
  }

  private describe(status: number): string {
    if (status === 401) return 'clé API manquante ou invalide';
    if (status === 403) return 'accès interdit (IP non autorisée ou option non activée)';
    if (status === 429) return 'trop de requêtes';
    if (status >= 500) return 'erreur serveur OpenPay';
    return 'réponse inattendue';
  }

  /** Les références sont validées avant tout appel ; aucun numéro n'est jamais dans le chemin. */
  private loggablePath(path: string): string {
    return path.slice(0, 80);
  }
}

/**
 * Limite globale des appels de STATUT à l'API OpenPay (anti-amplification :
 * des callbacks forgés ne doivent pas se traduire en rafale d'appels
 * authentifiés). Fenêtre fixe d'une minute en Redis, même style que
 * `WebhookRateLimitGuard` ; Redis indisponible : l'appel passe (fail-open),
 * le plafond par transaction reste actif.
 */
@Injectable()
export class OpenPayApiLimiter {
  private readonly logger = new Logger(OpenPayApiLimiter.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly config: AppConfigService,
  ) {}

  /**
   * Plafond des vérifications DÉCLENCHÉES PAR CALLBACK pour une transaction : fenêtre
   * glissante d'une heure (compteurs Redis de l'heure courante et de la précédente), jamais
   * un total à vie : un paiement ou un retrait approuvé tardivement doit toujours pouvoir être
   * confirmé, alors qu'un callback forgé en rafale reste borné. Le polling du client et le
   * rattrapage ne passent pas par ici. Redis indisponible : fail-open.
   */
  async tryAcquireCallbackCheck(transactionId: string): Promise<boolean> {
    const max = this.config.get('OPENPAY_MAX_CHECKS_PER_TRANSACTION');
    const hour = Math.floor(Date.now() / 3_600_000);
    const base = `${this.config.get('QUEUE_PREFIX')}:rl:openpay-callback-check:${transactionId}`;
    try {
      const [previous, current] = await Promise.all([
        this.redis.get(`${base}:${hour - 1}`),
        this.redis.incr(`${base}:${hour}`),
      ]);
      if (current === 1) await this.redis.expire(`${base}:${hour}`, 7_300);
      return current + Number(previous ?? 0) <= max;
    } catch (error) {
      this.logger.warn(`Limiteur OpenPay indisponible : ${(error as Error).message}`);
      return true;
    }
  }

  /**
   * Limite propre à la route du callback, par IP et par minute. Au-delà, l'appel est ignoré
   * SANS erreur (la route répond toujours `200 {}`, un 429 ferait relancer OpenPay et révélerait
   * la limite à un tiers). Fail-open si Redis est indisponible.
   */
  async tryAcquireCallbackRequest(ip: string): Promise<boolean> {
    const window = Math.floor(Date.now() / 60_000);
    const key = `${this.config.get('QUEUE_PREFIX')}:rl:openpay-callback:${ip}:${window}`;
    try {
      const count = await this.redis.incr(key);
      if (count === 1) await this.redis.expire(key, 70);
      return count <= this.config.get('OPENPAY_CALLBACKS_PER_MINUTE');
    } catch (error) {
      this.logger.warn(`Limiteur OpenPay indisponible : ${(error as Error).message}`);
      return true;
    }
  }

  async tryAcquireStatusCall(): Promise<boolean> {
    const window = Math.floor(Date.now() / 60_000);
    const key = `${this.config.get('QUEUE_PREFIX')}:rl:openpay-status:${window}`;
    try {
      const count = await this.redis.incr(key);
      if (count === 1) await this.redis.expire(key, 70);
      return count <= this.config.get('OPENPAY_STATUS_CALLS_PER_MINUTE');
    } catch (error) {
      this.logger.warn(`Limiteur OpenPay indisponible : ${(error as Error).message}`);
      return true;
    }
  }
}
