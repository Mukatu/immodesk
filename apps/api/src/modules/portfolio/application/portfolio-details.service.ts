import { Inject, Injectable, Optional } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { toLandlordSummary } from '../../parties/application/party-views';
import { DOCUMENT_READER, type DocumentReader } from '../../parties/domain/read-ports';
import type { Occupancy } from '../domain/occupancy';
import {
  toPropertySummary,
  toPropertyView,
  type PropertySummaryView,
  type PropertyView,
  type UnitView,
} from './portfolio-views';
import { PropertiesService } from './properties.service';
import { UnitsService } from './units.service';

export interface PropertyDetailView extends PropertyView {
  summary: PropertySummaryView;
  units: UnitView[];
  occupancy: Occupancy;
}

export interface UnitDetailView extends UnitView {
  property: PropertySummaryView;
  documents: unknown[];
}

/**
 * Fiches détaillées du patrimoine, composées en UNE transaction.
 *
 * Les pièces jointes viennent du module `documents` par le port
 * `DOCUMENT_READER` : `portfolio` ne lit jamais la table `documents`.
 */
@Injectable()
export class PortfolioDetailsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly properties: PropertiesService,
    private readonly units: UnitsService,
    @Optional() @Inject(DOCUMENT_READER) private readonly documents: DocumentReader | null = null,
  ) {}

  async propertyDetail(
    organizationId: string,
    userId: string,
    id: string,
  ): Promise<PropertyDetailView> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const row = await this.properties.require(tx, id);
      const [units, occupancy, summary] = await Promise.all([
        this.units.listForProperty(tx, id),
        this.properties.occupancyOf(tx, id),
        this.summaryOf(tx, id),
      ]);
      return { ...toPropertyView(row), summary, units, occupancy };
    });
  }

  async unitDetail(organizationId: string, userId: string, id: string): Promise<UnitDetailView> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const row = await this.units.require(tx, id);
      const [property, documents] = await Promise.all([
        this.summaryOf(tx, row.property_id),
        this.documents ? this.documents.listFor(tx, 'unit', id) : Promise.resolve([]),
      ]);
      const units = await this.units.listForProperty(tx, row.property_id);
      const unit = units.find((u) => u.id === id);
      if (!unit) throw new DomainError('PORTFOLIO.UNIT_NOT_FOUND', { unitId: id });
      return { ...unit, property, documents };
    });
  }

  /** Résumé d'un bien : bailleur + occupation, pour les fiches imbriquées. */
  private async summaryOf(tx: TenantClient, propertyId: string): Promise<PropertySummaryView> {
    const row = await this.properties.require(tx, propertyId);
    const landlord = await tx.landlords.findFirst({
      where: { id: row.landlord_id },
      select: {
        id: true,
        party_type: true,
        first_name: true,
        last_name: true,
        company_name: true,
        primary_phone: true,
        is_self: true,
      },
    });
    if (!landlord) {
      throw new DomainError('PARTIES.LANDLORD_NOT_FOUND', { landlordId: row.landlord_id });
    }
    const occupancy = await this.properties.occupancyOf(tx, propertyId);

    return toPropertySummary(
      {
        ...row,
        landlord_party_type: landlord.party_type,
        landlord_first_name: landlord.first_name,
        landlord_last_name: landlord.last_name,
        landlord_company_name: landlord.company_name,
        landlord_primary_phone: landlord.primary_phone,
        landlord_is_self: landlord.is_self,
      },
      occupancy,
    );
  }
}

/** Réexport : le résumé de bailleur est produit par le module `parties`. */
export { toLandlordSummary };
