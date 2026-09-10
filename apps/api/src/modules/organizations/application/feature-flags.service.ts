import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class FeatureFlagsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Drapeaux applicables à l'organisation courante.
   *
   * `feature_flags.organization_id` est NULLABLE : la policy laisse donc
   * passer les drapeaux GLOBAUX (organisation nulle) en plus de ceux du
   * tenant. Un drapeau propre à l'organisation l'emporte sur le drapeau
   * global de même clé.
   */
  async listForOrganization(
    organizationId: string,
    userId: string,
  ): Promise<Record<string, boolean>> {
    const now = new Date();
    const rows = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.feature_flags.findMany({
        select: {
          key: true,
          is_enabled: true,
          organization_id: true,
          starts_at: true,
          ends_at: true,
        },
      }),
    );

    const flags: Record<string, boolean> = {};
    // Les drapeaux globaux d'abord, pour que ceux du tenant les écrasent.
    for (const row of [...rows].sort((a, b) =>
      Number(a.organization_id !== null) - Number(b.organization_id !== null),
    )) {
      if (row.starts_at && row.starts_at > now) continue;
      if (row.ends_at && row.ends_at <= now) continue;
      flags[row.key] = row.is_enabled;
    }
    return flags;
  }
}
