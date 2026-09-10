import { Inject, Injectable, Logger } from '@nestjs/common';
import { APP_CONFIG } from '../../../shared/config/config.module';
import type { AppConfig } from '../../../shared/config/config.schema';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { RedisService } from '../../../shared/redis/redis.module';

export type CheckStatus = 'up' | 'down' | 'skipped';

export interface HealthCheck {
  status: CheckStatus;
  latencyMs?: number;
  detail?: string;
}

export interface HealthReport {
  status: 'ok' | 'degraded';
  checks: {
    database: HealthCheck;
    redis: HealthCheck;
    storage: HealthCheck;
  };
}

const PROBE_TIMEOUT_MS = 3000;

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async check(): Promise<HealthReport> {
    const [database, redis, storage] = await Promise.all([
      this.timed(() => this.checkDatabase()),
      this.timed(() => this.checkRedis()),
      this.timed(() => this.checkStorage()),
    ]);

    const degraded = [database, redis, storage].some((c) => c.status === 'down');
    return { status: degraded ? 'degraded' : 'ok', checks: { database, redis, storage } };
  }

  private async checkDatabase(): Promise<HealthCheck> {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'up' };
  }

  private async checkRedis(): Promise<HealthCheck> {
    const alive = await this.redis.ping();
    return alive ? { status: 'up' } : { status: 'down', detail: 'PING sans réponse.' };
  }

  /**
   * Stockage objet : une sonde HTTP sur l'endpoint S3/MinIO suffit à
   * détecter une panne. Aucun accès authentifié n'est tenté ici, la sonde
   * doit rester rapide et sans effet de bord.
   */
  private async checkStorage(): Promise<HealthCheck> {
    const endpoint = this.config.S3_ENDPOINT;
    if (!endpoint) {
      return { status: 'skipped', detail: 'S3_ENDPOINT non configuré.' };
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    try {
      const response = await fetch(`${endpoint.replace(/\/+$/, '')}/minio/health/live`, {
        method: 'GET',
        signal: controller.signal,
      });
      // MinIO répond 200 ; un S3 générique répond 403/404 mais est joignable.
      return response.status < 500
        ? { status: 'up' }
        : { status: 'down', detail: `HTTP ${response.status}` };
    } finally {
      clearTimeout(timer);
    }
  }

  private async timed(probe: () => Promise<HealthCheck>): Promise<HealthCheck> {
    const started = Date.now();
    try {
      const result = await probe();
      return { ...result, latencyMs: Date.now() - started };
    } catch (error) {
      this.logger.warn(`Sonde en échec : ${(error as Error).message}`);
      return {
        status: 'down',
        latencyMs: Date.now() - started,
        detail: (error as Error).message,
      };
    }
  }
}
