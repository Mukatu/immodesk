import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { businessToday } from '../../../shared/time/business-date';
import { daysBetween, parseIsoDate, toIsoDate } from '../../leases/domain/calendar';
import { toBps } from '../domain/bps';
import { averageVacancyDays } from '../domain/vacancy';

export interface VacancyFilters {
  asOf?: string;
  propertyId?: string;
}

export interface VacancyDashboardView {
  asOf: string;
  unitsCount: number;
  occupiedCount: number;
  vacantCount: number;
  vacancyRateBps: number;
  averageVacancyDays: number;
  byProperty: Array<{
    propertyId: string;
    name: string;
    unitsCount: number;
    vacantCount: number;
    vacancyRateBps: number;
  }>;
}

interface UnitRow {
  unit_id: string;
  property_id: string;
  property_name: string;
  status: string;
  last_end_date: Date | null;
}

/**
 * Tableau de bord de la vacance (`GET /v1/dashboards/vacancy`, contrat
 * phase 9). Aucune vue existante ne couvre l'occupation par lot (les vues de
 * pilotage du DDL portent sur la facturation et l'encaisse) : ce service
 * interroge directement `units` et `leases`.
 *
 * Un lot est « occupé » au statut `unit_status = 'OCCUPIED'`, tout autre
 * statut actif (`AVAILABLE`, `RESERVED`, `UNDER_MAINTENANCE`, `UNAVAILABLE`)
 * comptant comme vacant. La durée de vacance se lit depuis la fin du DERNIER
 * bail clos du lot (`TERMINATED`, `EXPIRED` ou `CANCELLED`), `move_out_date`
 * primant sur `end_date` quand il est renseigné (départ réel du locataire) ;
 * un lot jamais loué est exclu de la moyenne (`domain/vacancy.ts`), faute de
 * date de référence.
 */
@Injectable()
export class VacancyDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async get(
    organizationId: string,
    userId: string,
    filters: VacancyFilters,
  ): Promise<VacancyDashboardView> {
    const asOf = filters.asOf ? parseIsoDate(filters.asOf) : businessToday();
    const asOfIso = toIsoDate(asOf);

    const rows = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.$queryRawUnsafe<UnitRow[]>(
        `SELECT u.id AS unit_id, u.property_id, p.name AS property_name, u.status::text AS status,
                lz.last_end_date
           FROM units u
           JOIN properties p ON p.id = u.property_id
           LEFT JOIN LATERAL (
             SELECT max(coalesce(l.move_out_date, l.end_date)) AS last_end_date
               FROM leases l
              WHERE l.unit_id = u.id
                AND l.status IN ('TERMINATED', 'EXPIRED', 'CANCELLED')
           ) lz ON true
          WHERE u.organization_id = $1::uuid
            AND u.deleted_at IS NULL
            AND ($2::uuid IS NULL OR u.property_id = $2::uuid)`,
        organizationId,
        filters.propertyId ?? null,
      ),
    );

    const vacantDurations: number[] = [];
    const byProperty = new Map<string, { name: string; units: number; vacant: number }>();
    let occupiedCount = 0;
    let vacantCount = 0;

    for (const row of rows) {
      const isOccupied = row.status === 'OCCUPIED';
      if (isOccupied) occupiedCount += 1;
      else {
        vacantCount += 1;
        if (row.last_end_date) vacantDurations.push(daysBetween(row.last_end_date, asOf));
      }

      const entry = byProperty.get(row.property_id) ?? {
        name: row.property_name,
        units: 0,
        vacant: 0,
      };
      entry.units += 1;
      if (!isOccupied) entry.vacant += 1;
      byProperty.set(row.property_id, entry);
    }

    return {
      asOf: asOfIso,
      unitsCount: rows.length,
      occupiedCount,
      vacantCount,
      vacancyRateBps: toBps(BigInt(vacantCount), BigInt(rows.length)),
      averageVacancyDays: averageVacancyDays(vacantDurations),
      byProperty: [...byProperty.entries()]
        .map(([propertyId, entry]) => ({
          propertyId,
          name: entry.name,
          unitsCount: entry.units,
          vacantCount: entry.vacant,
          vacancyRateBps: toBps(BigInt(entry.vacant), BigInt(entry.units)),
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  }
}
