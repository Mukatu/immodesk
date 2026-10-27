import { Inject, Injectable, Logger } from '@nestjs/common';
import { APP_CONFIG } from '../../../shared/config/config.module';
import type { AppConfig } from '../../../shared/config/config.schema';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { RedisService } from '../../../shared/redis/redis.module';
import type { CheckStatus, HealthCheck } from './health.service';

export interface ReadinessReport {
  status: 'ok' | 'degraded';
  checks: {
    database: HealthCheck;
    redis: HealthCheck;
    storage: HealthCheck;
    mobileMoney: HealthCheck;
  };
}

const PROBE_TIMEOUT_MS = 3000;

/**
 * `GET /v1/health/ready` (docs/api/phase11-contract.md, § 11.F, « Sondes ») :
 * sonde de DISPONIBILITÉ, distincte de `/v1/health` (vivacité, phase 0,
 * inchangée). Vérifie séparément la base, Redis, le stockage objet et
 * l'agrégateur Mobile Money ; répond `503` dès qu'une dépendance
 * indispensable manque — la traduction en code HTTP vit dans le contrôleur.
 * Publique, sans aucune donnée métier.
 */
@Injectable()
export class ReadinessService {
  private readonly logger = new Logger(ReadinessService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async check(): Promise<ReadinessReport> {
    const [database, redis, storage, mobileMoney] = await Promise.all([
      this.timed(() => this.checkDatabase()),
      this.timed(() => this.checkRedis()),
      this.timed(() => this.checkStorage()),
      this.timed(() => this.checkMobileMoney()),
    ]);
    const degraded = [database, redis, storage, mobileMoney].some((c) => c.status === 'down');
    return {
      status: degraded ? 'degraded' : 'ok',
      checks: { database, redis, storage, mobileMoney },
    };
  }

  private async checkDatabase(): Promise<HealthCheck> {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'up' };
  }

  private async checkRedis(): Promise<HealthCheck> {
    const alive = await this.redis.ping();
    return alive ? { status: 'up' } : { status: 'down', detail: 'PING sans réponse.' };
  }

  private async checkStorage(): Promise<HealthCheck> {
    const endpoint = this.config.S3_ENDPOINT;
    if (!endpoint) return { status: 'skipped', detail: 'S3_ENDPOINT non configuré.' };
    return this.probeHttp(`${endpoint.replace(/\/+$/, '')}/minio/health/live`);
  }

  /**
   * En mode `SIMULATOR` (défaut en développement), aucun agrégateur réel
   * n'existe : la sonde est `skipped`, pas `down` — un environnement de
   * développement ne doit jamais être signalé comme indisponible pour une
   * dépendance qu'il n'utilise pas.
   */
  private async checkMobileMoney(): Promise<HealthCheck> {
    if (this.config.MOMO_PROVIDER_DEFAULT !== 'CINETPAY') {
      return { status: 'skipped', detail: 'MOMO_PROVIDER_DEFAULT=SIMULATOR.' };
    }
    return this.probeHttp(this.config.CINETPAY_BASE_URL);
  }

  private async probeHttp(url: string): Promise<HealthCheck> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    try {
      const response = await fetch(url, { method: 'GET', signal: controller.signal });
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
      this.logger.warn(`Sonde de disponibilité en échec : ${(error as Error).message}`);
      return {
        status: 'down' as CheckStatus,
        latencyMs: Date.now() - started,
        detail: (error as Error).message,
      };
    }
  }
}
