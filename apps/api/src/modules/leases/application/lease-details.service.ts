import { Inject, Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { PrismaService, type TenantClient } from '../../../shared/prisma/prisma.service';
import { toLandlordSummary } from '../../parties/application/party-views';
import { toTenantView } from '../../parties/application/tenant-views';
import { displayNameOf, type PartyType } from '../../parties/domain/party-rules';
import { toPropertySummary, toUnitView } from '../../portfolio/application/portfolio-views';
import { PropertiesService } from '../../portfolio/application/properties.service';
import { UnitsService } from '../../portfolio/application/units.service';
import type { LeaseContractData, LeaseContractSource } from '../../pdf/domain/ports';
import { isCommercialUnit } from '../domain/lease-rules';
import { toLeaseView, publicReference, type LeaseView } from './lease-views';
import { LeaseDocumentsService } from './lease-documents.service';
import { LeasePartiesService } from './lease-parties.service';
import { LeasesService } from './leases.service';
import { RentRevisionsService } from './rent-revisions.service';
import { toRentRevisionView } from './lease-views';
import { DEPOSIT_WRITER, type DepositWriter } from '../domain/ports';

export interface LeaseDetailView extends LeaseView {
  unit: unknown;
  property: unknown;
  landlord: unknown;
  primaryTenant: unknown;
  parties: unknown[];
  rentRevisions: unknown[];
  deposit: unknown | null;
  documents: unknown[];
}

/**
 * Fiche complète d'un bail, composée en UNE transaction.
 *
 * La composition réutilise les services propriétaires de chaque table
 * (`portfolio` pour le lot et l'immeuble, `parties` pour les tiers,
 * `deposits` pour le dépôt) : `leases` ne lit jamais ces tables pour son
 * propre compte, sauf par ces services. Le jour où l'une d'elles change de
 * forme, un seul module est à corriger.
 */
@Injectable()
export class LeaseDetailsService implements LeaseContractSource {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leases: LeasesService,
    private readonly parties: LeasePartiesService,
    private readonly revisions: RentRevisionsService,
    private readonly documents: LeaseDocumentsService,
    private readonly properties: PropertiesService,
    private readonly units: UnitsService,
    @Inject(DEPOSIT_WRITER) private readonly deposits: DepositWriter,
  ) {}

  async detail(organizationId: string, userId: string, leaseId: string): Promise<LeaseDetailView> {
    return this.prisma.withTenant(organizationId, userId, (tx) => this.compose(tx, leaseId));
  }

  /** Compose la fiche dans une transaction DÉJÀ ouverte (activation, ...). */
  async compose(tx: TenantClient, leaseId: string): Promise<LeaseDetailView> {
    const lease = await this.leases.require(tx, leaseId);
    const unit = await this.units.require(tx, lease.unit_id);
    const tenant = await tx.tenants.findFirst({ where: { id: lease.primary_tenant_id } });
    if (!tenant) {
      throw new DomainError('PARTIES.TENANT_NOT_FOUND', { tenantId: lease.primary_tenant_id });
    }
    const landlord = await this.landlordSummary(tx, lease.landlord_id);

    return {
      ...toLeaseView(lease),
      unit: toUnitView(unit),
      property: await this.propertySummary(tx, lease.property_id),
      landlord,
      primaryTenant: toTenantView(tenant as never),
      parties: await this.parties.listFor(tx, leaseId),
      rentRevisions: (await this.revisions.rowsFor(tx, leaseId)).map(toRentRevisionView),
      deposit: await this.deposits.findDetail(tx, leaseId),
      documents: (await this.documents.rowsFor(tx, leaseId)).map((row) => ({
        id: row.id,
        leaseId: row.lease_id,
        kind: row.kind,
        documentId: row.document_id,
        version: row.version,
        title: row.title,
        isSigned: row.is_signed,
        signatureHash: row.signature_hash,
        generatedByJob: row.generated_by_job,
        createdAt: row.created_at.toISOString(),
      })),
    };
  }

  /**
   * Implémentation du port `LEASE_CONTRACT_SOURCE` : jeu de données du
   * contrat PDF. Les montants restent en BigInt — le gabarit les formate
   * lui-même en francs CFA, sans jamais passer par un flottant.
   */
  async loadContractData(tx: TenantClient, leaseId: string): Promise<LeaseContractData> {
    const lease = await this.leases.require(tx, leaseId);
    const unit = await this.units.require(tx, lease.unit_id);
    const property = await this.properties.require(tx, lease.property_id);
    const organization = await tx.organizations.findFirst({
      where: { id: lease.organization_id },
      select: { legal_name: true, trade_name: true, city: true, rccm_number: true },
    });
    const tenant = await tx.tenants.findFirst({ where: { id: lease.primary_tenant_id } });
    const landlord = await tx.landlords.findFirst({ where: { id: lease.landlord_id } });
    if (!tenant || !landlord || !organization) {
      throw new DomainError('LEASES.NOT_FOUND', { leaseId });
    }

    return {
      lease: {
        id: lease.id,
        reference: publicReference(lease.reference),
        status: lease.status,
        startDate: lease.start_date.toISOString().slice(0, 10),
        endDate: lease.end_date ? lease.end_date.toISOString().slice(0, 10) : null,
        moveInDate: lease.move_in_date ? lease.move_in_date.toISOString().slice(0, 10) : null,
        rentPeriod: lease.rent_period,
        rentAmount: lease.rent_amount,
        chargesAmount: lease.charges_amount,
        chargesAreProvisional: lease.charges_are_provisional,
        depositAmount: lease.deposit_amount,
        agencyFeeAmount: lease.agency_fee_amount,
        advanceMonths: lease.advance_months,
        paymentDueDay: lease.payment_due_day,
        graceDays: lease.grace_days,
        noticeDays: lease.notice_days,
        preferredPaymentMethod: lease.preferred_payment_method,
        notes: lease.notes,
      },
      organization: {
        legalName: organization.legal_name,
        tradeName: organization.trade_name,
        city: organization.city,
        rccmNumber: organization.rccm_number,
      },
      landlord: {
        displayName: displayNameOf({
          partyType: landlord.party_type as PartyType,
          firstName: landlord.first_name,
          lastName: landlord.last_name,
          companyName: landlord.company_name,
        }),
        primaryPhone: landlord.primary_phone,
        addressLine: landlord.address_line,
      },
      tenant: {
        displayName: displayNameOf({
          partyType: tenant.party_type as PartyType,
          firstName: tenant.first_name,
          lastName: tenant.last_name,
          companyName: tenant.company_name,
        }),
        primaryPhone: tenant.primary_phone,
        idDocumentNumber: tenant.id_document_number,
      },
      property: {
        name: property.name,
        addressLine: property.address_line,
        district: property.district,
        city: property.city,
      },
      unit: {
        code: unit.code,
        label: unit.label,
        unitType: unit.unit_type,
        roomsCount: unit.rooms_count,
      },
      parties: (await this.parties.listFor(tx, leaseId)).map((p) => ({
        role: p.role,
        displayName: p.displayName,
        shareBps: p.shareBps,
        isSolidary: p.isSolidary,
      })),
      isCommercial: isCommercialUnit(unit.unit_type),
    };
  }

  private async propertySummary(tx: TenantClient, propertyId: string): Promise<unknown> {
    const row = await this.properties.require(tx, propertyId);
    const landlord = await tx.landlords.findFirst({ where: { id: row.landlord_id } });
    if (!landlord) {
      throw new DomainError('PARTIES.LANDLORD_NOT_FOUND', { landlordId: row.landlord_id });
    }
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
      await this.properties.occupancyOf(tx, propertyId),
    );
  }

  private async landlordSummary(tx: TenantClient, landlordId: string): Promise<unknown> {
    const landlord = await tx.landlords.findFirst({ where: { id: landlordId } });
    if (!landlord) throw new DomainError('PARTIES.LANDLORD_NOT_FOUND', { landlordId });
    return toLandlordSummary(landlord as never);
  }
}
