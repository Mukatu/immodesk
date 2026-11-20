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
  method: 'GET' | 'POST';
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
    } catch (error) {
      this.logger.error(
        `OpenPay ${req.method} ${this.loggablePath(req.path)} indisponible : ${maskMsisdns(String(error))}`,
      );
      throw new DomainError('MOMO.PROVIDER_UNAVAILABLE', { path: this.loggablePath(req.path) });
    } finally {
      clearTimeout(timeout);
    }
    const body = await response.json().catch(() => null);
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
