import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/errors/domain-error';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantDirectoryService } from '../../../shared/prisma/tenant-directory.service';
import type { MemberRole } from '../../../shared/tenant/tenant-context';

export interface UserView {
  id: string;
  phone: string;
  fullName: string;
  email: string | null;
  locale: string;
  timezone: string;
  createdAt: string;
}

export interface OrganizationView {
  id: string;
  type: 'AGENCY' | 'INDEPENDENT_LANDLORD' | 'INDEPENDENT_MANAGER';
  legalName: string;
  tradeName: string | null;
  slug: string;
  city: string;
  district: string | null;
  contactPhone: string;
  contactEmail: string | null;
  logoUrl: string | null;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
}

export interface MembershipView {
  organization: OrganizationView;
  role: MemberRole;
  joinedAt: string;
}

export const DEFAULT_TIMEZONE = 'Africa/Brazzaville';

export interface UpdateProfileInput {
  fullName?: string;
  email?: string | null;
  locale?: string;
}

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly directory: TenantDirectoryService,
  ) {}

  async getUser(userId: string): Promise<UserView> {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone_e164: true,
        display_name: true,
        first_name: true,
        last_name: true,
        email: true,
        locale: true,
        created_at: true,
      },
    });
    if (!user) throw new DomainError('IAM.UNAUTHENTICATED');

    return {
      id: user.id,
      phone: user.phone_e164,
      fullName:
        user.display_name ?? [user.first_name, user.last_name].filter(Boolean).join(' ').trim(),
      email: user.email,
      locale: user.locale,
      // `users` ne porte pas de fuseau : celui de l'organisation principale
      // fait foi (voir README, section « Profil utilisateur »).
      timezone: await this.resolveTimezone(userId),
      createdAt: user.created_at.toISOString(),
    };
  }

  /** Adhésions actives de l'utilisateur, avec l'organisation complète. */
  async listMemberships(userId: string): Promise<MembershipView[]> {
    const memberships = await this.directory.listActiveMemberships(userId);
    const views: MembershipView[] = [];

    for (const membership of memberships) {
      // Chaque organisation est relue SOUS SON PROPRE contexte RLS : même
      // l'annuaire ne court-circuite pas l'isolation pour les données
      // métier, il ne fait que fournir la liste des identifiants.
      const organization = await this.prisma.withTenant(membership.organizationId, userId, (tx) =>
        tx.organizations.findUnique({
          where: { id: membership.organizationId },
          select: {
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
          },
        }),
      );
      if (!organization) continue;
      views.push({
        organization: toOrganizationView(organization),
        role: membership.role,
        joinedAt: membership.joinedAt.toISOString(),
      });
    }
    return views;
  }

  async updateUser(userId: string, input: UpdateProfileInput): Promise<UserView> {
    const trimmedName = input.fullName?.trim();
    const [firstName, ...rest] = (trimmedName ?? '').split(/\s+/).filter(Boolean);

    await this.prisma.users.update({
      where: { id: userId },
      data: {
        ...(trimmedName !== undefined
          ? {
              display_name: trimmedName,
              first_name: firstName ?? null,
              last_name: rest.length > 0 ? rest.join(' ') : null,
            }
          : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.locale !== undefined ? { locale: input.locale } : {}),
        updated_at: new Date(),
      },
    });
    return this.getUser(userId);
  }

  private async resolveTimezone(userId: string): Promise<string> {
    const organizationId = await this.directory.findPrimaryOrganizationId(userId);
    if (!organizationId) return DEFAULT_TIMEZONE;
    const settings = await this.prisma.withTenant(organizationId, userId, (tx) =>
      tx.organization_settings.findUnique({
        where: { organization_id: organizationId },
        select: { timezone: true },
      }),
    );
    return settings?.timezone ?? DEFAULT_TIMEZONE;
  }
}

/** Mappe une ligne `organizations` vers la vue publique du contrat. */
export function toOrganizationView(row: {
  id: string;
  type: string;
  status: string;
  legal_name: string;
  trade_name: string | null;
  slug: string;
  city: string;
  district: string | null;
  contact_phone: string;
  contact_email: string | null;
  created_at: Date;
}): OrganizationView {
  return {
    id: row.id,
    type: row.type as OrganizationView['type'],
    legalName: row.legal_name,
    tradeName: row.trade_name,
    slug: row.slug,
    city: row.city,
    district: row.district,
    contactPhone: row.contact_phone,
    contactEmail: row.contact_email,
    // `documents` n'existe qu'à partir de la phase 1 : pas d'URL signée en phase 0.
    logoUrl: null,
    status: row.status === 'ACTIVE' ? 'ACTIVE' : 'SUSPENDED',
    createdAt: row.created_at.toISOString(),
  };
}
