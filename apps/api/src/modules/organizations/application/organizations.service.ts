import { Inject, Injectable, Optional } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { newId } from '../../../shared/ids/uuid';
import { normalizePhoneE164 } from '../../../shared/phone/e164';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantDirectoryService } from '../../../shared/prisma/tenant-directory.service';
import { audit, AuditService } from '../../audit/application/audit.service';
import { AUDIT_OPERATIONS, toJsonState } from '../../audit/domain/audit-entry';
import {
  toOrganizationView,
  type OrganizationView,
} from '../../identity/application/profile.service';
import {
  ORGANIZATION_LIFECYCLE_LISTENERS,
  type OrganizationLifecycleListener,
} from '../domain/ports';
import { resolveUniqueSlug } from '../domain/slug';

const ORGANIZATION_SELECT = {
  id: true,
  type: true,
  status: true,
  legal_name: true,
  trade_name: true,
  slug: true,
  city: true,
  district: true,
  contact_phone: true,
  contact_email: true,
  created_at: true,
} as const;

export interface CreateOrganizationInput {
  type: 'AGENCY' | 'INDEPENDENT_LANDLORD' | 'INDEPENDENT_MANAGER';
  legalName: string;
  tradeName?: string | null;
  city: string;
  district?: string | null;
  contactPhone: string;
  contactEmail?: string | null;
}

export interface UpdateOrganizationInput {
  legalName?: string;
  tradeName?: string | null;
  city?: string;
  district?: string | null;
  contactPhone?: string;
  contactEmail?: string | null;
  logoDocumentId?: string | null;
}

export interface OrganizationSettingsView {
  defaultPaymentDueDay: number;
  timezone: string;
  currency: 'XAF';
  defaultGraceDays: number;
  receiptFooterText: string | null;
  whatsappEnabled: boolean;
  smsEnabled: boolean;
}

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly directory: TenantDirectoryService,
    private readonly auditService: AuditService,
    /**
     * Abonnés au cycle de vie de l'organisation. `parties` s'y branche pour
     * créer le bailleur « self » ; le module reste fonctionnel sans eux.
     */
    @Optional()
    @Inject(ORGANIZATION_LIFECYCLE_LISTENERS)
    private readonly lifecycleListeners: OrganizationLifecycleListener[] | null = null,
  ) {}

  /**
   * Crée une organisation et son créateur comme OWNER, dans une seule
   * transaction.
   *
   * Subtilité RLS : la policy de `organizations` est `id =
   * app.current_organization_id`. L'identifiant est donc généré côté
   * application (UUID v7) et positionné dans le contexte AVANT l'INSERT,
   * faute de quoi la clause `WITH CHECK` rejetterait la ligne.
   */
  async create(userId: string, input: CreateOrganizationInput): Promise<OrganizationView> {
    const organizationId = newId();
    const contactPhone = normalizePhoneE164(input.contactPhone);
    const slug = await resolveUniqueSlug(input.tradeName || input.legalName, (candidate) =>
      this.directory.isSlugTaken(candidate),
    );

    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const organization = await tx.organizations.create({
        data: {
          id: organizationId,
          type: input.type,
          status: 'ACTIVE',
          legal_name: input.legalName.trim(),
          trade_name: input.tradeName?.trim() || null,
          slug,
          contact_phone: contactPhone,
          contact_email: input.contactEmail?.trim() || null,
          district: input.district?.trim() || null,
          city: input.city.trim(),
          country_code: 'CG',
          currency: 'XAF',
        },
        select: ORGANIZATION_SELECT,
      });

      // Paramétrage par défaut : échéance au 5, Africa/Brazzaville, XAF.
      await tx.organization_settings.create({
        data: { id: newId(), organization_id: organizationId },
      });

      const membership = await tx.organization_members.create({
        data: {
          id: newId(),
          organization_id: organizationId,
          user_id: userId,
          role: 'OWNER',
          status: 'ACTIVE',
        },
        select: { id: true },
      });

      await this.auditService.record(tx, {
        organizationId,
        action: 'CREATE',
        operation: AUDIT_OPERATIONS.ORGANIZATION_CREATED,
        entityType: 'organizations',
        entityId: organizationId,
        actorUserId: userId,
        actorRole: 'OWNER',
        newState: toJsonState({ type: input.type, legalName: input.legalName, slug }),
      });
      await this.auditService.record(tx, {
        organizationId,
        action: 'CREATE',
        operation: AUDIT_OPERATIONS.MEMBER_JOINED,
        entityType: 'organization_members',
        entityId: membership.id,
        actorUserId: userId,
        actorRole: 'OWNER',
        newState: toJsonState({ userId, role: 'OWNER', reason: 'ORGANIZATION_CREATOR' }),
      });

      // Événement de domaine, émis DANS la transaction : un abonné en échec
      // annule la création plutôt que de laisser une organisation à moitié
      // provisionnée (cf. bailleur « self » du contrat de phase 1).
      for (const listener of this.lifecycleListeners ?? []) {
        await listener.onOrganizationCreated(tx, {
          organizationId,
          type: input.type,
          legalName: input.legalName.trim(),
          tradeName: input.tradeName?.trim() || null,
          contactPhone,
          city: input.city.trim(),
          district: input.district?.trim() || null,
          actorUserId: userId,
        });
      }

      return toOrganizationView(organization);
    });
  }

  /** Détail de l'organisation courante. */
  async get(organizationId: string, userId: string): Promise<OrganizationView> {
    const organization = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.organizations.findUnique({ where: { id: organizationId }, select: ORGANIZATION_SELECT }),
    );
    if (!organization) throw new DomainError('ORG.NOT_FOUND', { organizationId });
    return toOrganizationView(organization);
  }

  async update(
    organizationId: string,
    userId: string,
    input: UpdateOrganizationInput,
  ): Promise<OrganizationView> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = await tx.organizations.findUnique({
        where: { id: organizationId },
        select: ORGANIZATION_SELECT,
      });
      if (!before) throw new DomainError('ORG.NOT_FOUND', { organizationId });

      const after = await tx.organizations.update({
        where: { id: organizationId },
        data: {
          ...(input.legalName !== undefined ? { legal_name: input.legalName.trim() } : {}),
          ...(input.tradeName !== undefined ? { trade_name: input.tradeName?.trim() || null } : {}),
          ...(input.city !== undefined ? { city: input.city.trim() } : {}),
          ...(input.district !== undefined ? { district: input.district?.trim() || null } : {}),
          ...(input.contactPhone !== undefined
            ? { contact_phone: normalizePhoneE164(input.contactPhone) }
            : {}),
          ...(input.contactEmail !== undefined
            ? { contact_email: input.contactEmail?.trim() || null }
            : {}),
          ...(input.logoDocumentId !== undefined ? { logo_document_id: input.logoDocumentId } : {}),
          updated_at: new Date(),
        },
        select: ORGANIZATION_SELECT,
      });

      await audit(this.auditService, tx, {
        action: 'UPDATE',
        operation: AUDIT_OPERATIONS.ORGANIZATION_UPDATED,
        entityType: 'organizations',
        entityId: organizationId,
        previousState: toJsonState(toOrganizationView(before)),
        newState: toJsonState(toOrganizationView(after)),
      });

      return toOrganizationView(after);
    });
  }

  async getSettings(organizationId: string, userId: string): Promise<OrganizationSettingsView> {
    const settings = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.organization_settings.findUnique({ where: { organization_id: organizationId } }),
    );
    if (!settings) throw new DomainError('ORG.SETTINGS_NOT_FOUND', { organizationId });
    return toSettingsView(settings);
  }

  async updateSettings(
    organizationId: string,
    userId: string,
    input: Partial<OrganizationSettingsView>,
  ): Promise<OrganizationSettingsView> {
    return this.prisma.withTenant(organizationId, userId, async (tx) => {
      const before = await tx.organization_settings.findUnique({
        where: { organization_id: organizationId },
      });
      if (!before) throw new DomainError('ORG.SETTINGS_NOT_FOUND', { organizationId });

      const after = await tx.organization_settings.update({
        where: { organization_id: organizationId },
        data: {
          ...(input.defaultPaymentDueDay !== undefined
            ? { default_payment_due_day: input.defaultPaymentDueDay }
            : {}),
          ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
          ...(input.defaultGraceDays !== undefined
            ? { default_grace_days: input.defaultGraceDays }
            : {}),
          ...(input.receiptFooterText !== undefined
            ? { receipt_verification_base_url: input.receiptFooterText }
            : {}),
          ...(input.whatsappEnabled !== undefined
            ? { whatsapp_enabled: input.whatsappEnabled }
            : {}),
          ...(input.smsEnabled !== undefined ? { sms_fallback_enabled: input.smsEnabled } : {}),
          updated_at: new Date(),
        },
      });

      await audit(this.auditService, tx, {
        action: 'UPDATE',
        operation: AUDIT_OPERATIONS.ORGANIZATION_SETTINGS_UPDATED,
        entityType: 'organization_settings',
        entityId: after.id,
        previousState: toJsonState(toSettingsView(before)),
        newState: toJsonState(toSettingsView(after)),
      });

      return toSettingsView(after);
    });
  }
}

/**
 * `organization_settings` ne porte pas de colonne `receipt_footer_text` :
 * le contrat expose `receiptFooterText`, adossé en phase 0 à
 * `receipt_verification_base_url` (texte libre de pied de quittance).
 * La devise est verrouillée à XAF par contrainte SQL.
 */
function toSettingsView(row: {
  default_payment_due_day: number;
  timezone: string;
  default_grace_days: number;
  receipt_verification_base_url: string | null;
  whatsapp_enabled: boolean;
  sms_fallback_enabled: boolean;
}): OrganizationSettingsView {
  return {
    defaultPaymentDueDay: row.default_payment_due_day,
    timezone: row.timezone,
    currency: 'XAF',
    defaultGraceDays: row.default_grace_days,
    receiptFooterText: row.receipt_verification_base_url,
    whatsappEnabled: row.whatsapp_enabled,
    smsEnabled: row.sms_fallback_enabled,
  };
}
