import { Inject, Injectable, Logger } from '@nestjs/common';
import { APP_CONFIG } from '../config/config.module';
import type { AppConfig } from '../config/config.schema';
import { PrismaService } from '../prisma/prisma.service';

/** Forme exposée par `GET /v1/status` (contrat de la phase 11). */
export interface ReadOnlyState {
  enabled: boolean;
  reason: string | null;
  since: string | null;
  expectedEndAt: string | null;
  incidentRef: string | null;
}

const DISABLED: ReadOnlyState = {
  enabled: false,
  reason: null,
  since: null,
  expectedEndAt: null,
  incidentRef: null,
};

/** Clé du drapeau GLOBAL portant le gel (arbitrage 14 : une seule ligne). */
export const READ_ONLY_FLAG_KEY = 'read_only_mode';

/**
 * Durée de mise en cache de l'état du gel, en millisecondes.
 *
 * Le garde consulte cet état sur CHAQUE écriture : une requête SQL par
 * requête HTTP serait un coût permanent payé pour un drapeau qui ne bouge
 * qu'en incident. Cinq secondes bornent le retard à l'activation comme à la
 * levée — un gel met donc au plus cinq secondes à prendre effet, ce qui est
 * sans commune mesure avec la durée d'un incident.
 */
const CACHE_TTL_MS = 5_000;

/**
 * Lecture de l'état « lecture seule » de la plateforme.
 *
 * La lecture reste sur le rôle applicatif `immodesk_app` : l'arbitrage 2 du
 * contrat réserve `immodesk_admin` aux ÉCRITURES de drapeaux globaux et aux
 * routes `/v1/admin/*`, mais précise que « toutes les lectures de drapeaux »
 * restent sur le rôle applicatif. La policy laisse passer un drapeau global
 * (`organization_id IS NULL`) même sans `app.current_organization_id`, d'où
 * `withGlobal`.
 */
@Injectable()
export class ReadOnlyService {
  private readonly logger = new Logger(ReadOnlyService.name);
  private cache?: { at: number; state: ReadOnlyState };

  constructor(
    private readonly prisma: PrismaService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /** Vide le cache : appelé après une bascule pour la rendre immédiate. */
  invalidate(): void {
    this.cache = undefined;
  }

  async current(): Promise<ReadOnlyState> {
    const now = Date.now();
    if (this.cache && now - this.cache.at < CACHE_TTL_MS) return this.cache.state;

    const state = await this.read();
    this.cache = { at: now, state };
    return state;
  }

  private async read(): Promise<ReadOnlyState> {
    // Démarrage forcé en lecture seule : utilisé pendant une restauration,
    // avant même que la base ne soit fiable. Il prime sur le drapeau.
    if (this.config.READ_ONLY_MODE_BOOTSTRAP) {
      return {
        enabled: true,
        reason: 'Démarrage en lecture seule (READ_ONLY_MODE_BOOTSTRAP).',
        since: null,
        expectedEndAt: null,
        incidentRef: null,
      };
    }

    try {
      const row = await this.prisma.withGlobal((tx) =>
        tx.feature_flags.findFirst({
          where: { organization_id: null, key: READ_ONLY_FLAG_KEY },
          select: { is_enabled: true, payload: true, starts_at: true, updated_at: true },
        }),
      );
      if (!row?.is_enabled) return DISABLED;

      const payload = (row.payload ?? {}) as Record<string, unknown>;
      const text = (key: string): string | null =>
        typeof payload[key] === 'string' ? (payload[key] as string) : null;

      return {
        enabled: true,
        reason: text('reason'),
        since: (row.starts_at ?? row.updated_at)?.toISOString() ?? null,
        expectedEndAt: text('expectedEndAt'),
        incidentRef: text('incidentRef'),
      };
    } catch (error) {
      // Choix délibéré : on laisse PASSER quand l'état est illisible. Un gel
      // sert à protéger pendant un incident ; si la base ne répond pas, les
      // écritures échoueront d'elles-mêmes. Refuser par défaut transformerait
      // le moindre hoquet de base en panne totale, y compris sur les routes
      // qui n'écrivent rien.
      this.logger.warn(`État de lecture seule illisible, écritures autorisées : ${String(error)}`);
      return DISABLED;
    }
  }
}
