import { Inject, Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import {
  BANK_ACCOUNT_READER,
  DOCUMENT_READER,
  PROPERTY_READER,
  type BankAccountReader,
  type DocumentReader,
  type PropertyReader,
} from '../domain/read-ports';
import { ContactChannelsService } from './contact-channels.service';
import { GuarantorsService } from './guarantors.service';
import { LandlordsService } from './landlords.service';
import { toLandlordView, type ContactChannelView, type LandlordView } from './party-views';
import { TenantsService } from './tenants.service';
import { toTenantView, type GuarantorView, type TenantView } from './tenant-views';

export interface LandlordDetailView extends LandlordView {
  properties: unknown[];
  bankAccounts: unknown[];
  contactChannels: ContactChannelView[];
}

export interface TenantDetailView extends TenantView {
  guarantors: GuarantorView[];
  contactChannels: ContactChannelView[];
  documents: unknown[];
}

/**
 * Composition des fiches détaillées du contrat de phase 1.
 *
 * Tout est lu dans UNE seule transaction `withTenant` : la fiche est un
 * instantané cohérent, et la RLS ne s'ouvre qu'une fois. Les données des
 * autres modules arrivent par les ports de lecture (`read-ports.ts`), jamais
 * par un accès direct à leurs tables.
 */
@Injectable()
export class PartyDetailsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly landlords: LandlordsService,
    private readonly tenants: TenantsService,
    private readonly guarantors: GuarantorsService,
    private readonly contactChannels: ContactChannelsService,
    @Optional() @Inject(PROPERTY_READER) private readonly properties: PropertyReader | null = null,
    @Optional()
    @Inject(BANK_ACCOUNT_READER)
    private readonly bankAccounts: BankAccountReader | null = null,
    @Optional() @Inject(DOCUMENT_READER) private readonly documents: DocumentReader | null = null,
  ) {}

  /** Bailleur + ses biens + ses comptes bancaires + ses canaux de contact. */
  async landlordDetail(
    organizationId: string,
    userId: string,
    id: string,
  ): Promise<LandlordDetailView> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const row = await this.landlords.require(tx, id);
      const [properties, bankAccounts, contactChannels] = await Promise.all([
        this.properties ? this.properties.listSummariesForLandlord(tx, id) : Promise.resolve([]),
        this.bankAccounts ? this.bankAccounts.listForLandlord(tx, id) : Promise.resolve([]),
        this.contactChannels.listForOwner(tx, 'LANDLORD', id),
      ]);

      return {
        ...toLandlordView(row, properties.length),
        properties,
        bankAccounts,
        contactChannels,
      };
    });
  }

  /** Locataire + garants + canaux de contact + pièces jointes. */
  async tenantDetail(
    organizationId: string,
    userId: string,
    id: string,
  ): Promise<TenantDetailView> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const row = await this.tenants.require(tx, id);
      const [guarantors, contactChannels, documents] = await Promise.all([
        this.guarantors.listForTenant(tx, id),
        this.contactChannels.listForOwner(tx, 'TENANT', id),
        this.documents ? this.documents.listFor(tx, 'tenant', id) : Promise.resolve([]),
      ]);

      return { ...toTenantView(row), guarantors, contactChannels, documents };
    });
  }
}
