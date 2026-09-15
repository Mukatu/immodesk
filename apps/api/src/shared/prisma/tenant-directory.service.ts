import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { APP_CONFIG } from '../config/config.module';
import type { AppConfig } from '../config/config.schema';
import type { MemberRole } from '../tenant/tenant-context';

export interface MembershipRow {
  membershipId: string;
  organizationId: string;
  role: MemberRole;
  joinedAt: Date;
}

export interface LandlordLinkRow {
  landlordId: string;
  organizationId: string;
  organizationName: string;
}

export interface InvitationLookupRow {
  id: string;
  organizationId: string;
  phoneE164: string | null;
  role: MemberRole;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
  expiresAt: Date;
  organizationName: string;
}

/**
 * Annuaire multi-tenant : répond aux SEULES questions qui sont, par nature,
 * transverses aux organisations et donc insolubles sous la RLS.
 *
 * La policy `org_isolation` filtre sur `app.current_organization_id`. Or
 * « à quelles organisations cet utilisateur appartient-il ? » et « à quelle
 * organisation ce jeton d'invitation se rapporte-t-il ? » sont précisément
 * les questions posées AVANT de connaître l'organisation. Elles ne peuvent
 * pas être servies par le rôle applicatif.
 *
 * Ce service est donc le SEUL point du code qui se connecte avec le rôle
 * d'administration (`DATABASE_ADMIN_URL`, BYPASSRLS). Sa surface est
 * volontairement réduite à trois lectures, toutes filtrées par un
 * identifiant appartenant déjà à l'appelant (son `user_id`) ou par un secret
 * qu'il détient (le condensat du jeton d'invitation). Aucune écriture, aucun
 * accès générique : toute autre opération passe par `PrismaService.withTenant`.
 *
 * En l'absence de `DATABASE_ADMIN_URL`, le service se rabat sur la connexion
 * applicative : les lectures transverses renvoient alors des listes vides.
 */
@Injectable()
export class TenantDirectoryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TenantDirectoryService.name);
  private readonly client: PrismaClient;
  private readonly privileged: boolean;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    const url = config.DATABASE_ADMIN_URL ?? config.DATABASE_URL;
    this.privileged = Boolean(config.DATABASE_ADMIN_URL);
    this.client = new PrismaClient({ datasources: { db: { url } }, log: ['error'] });
  }

  async onModuleInit(): Promise<void> {
    await this.client.$connect();
    if (!this.privileged) {
      this.logger.warn(
        "DATABASE_ADMIN_URL absent : l'annuaire multi-tenant est dégradé (liste d'organisations vide).",
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }

  /** Adhésions actives d'un utilisateur, toutes organisations confondues. */
  async listActiveMemberships(userId: string): Promise<MembershipRow[]> {
    const rows = await this.client.organization_members.findMany({
      where: { user_id: userId, status: 'ACTIVE' },
      select: { id: true, organization_id: true, role: true, joined_at: true },
      orderBy: { joined_at: 'asc' },
    });
    return rows.map((r) => ({
      membershipId: r.id,
      organizationId: r.organization_id,
      role: r.role as MemberRole,
      joinedAt: r.joined_at,
    }));
  }

  /** Première organisation active d'un utilisateur, ou `null`. */
  async findPrimaryOrganizationId(userId: string): Promise<string | null> {
    const rows = await this.listActiveMemberships(userId);
    return rows[0]?.organizationId ?? null;
  }

  /**
   * Résout une invitation à partir du condensat de son jeton.
   * Le jeton est un secret de 32 octets : le connaître vaut autorisation de
   * lire l'entête de l'invitation (nom de l'organisation, rôle, expiration).
   */
  async findInvitationByTokenHash(tokenHash: string): Promise<InvitationLookupRow | null> {
    const invitation = await this.client.invitations.findUnique({
      where: { token_hash: tokenHash },
      select: {
        id: true,
        organization_id: true,
        phone_e164: true,
        role: true,
        status: true,
        expires_at: true,
      },
    });
    if (!invitation) return null;

    const organization = await this.client.organizations.findUnique({
      where: { id: invitation.organization_id },
      select: { trade_name: true, legal_name: true },
    });

    return {
      id: invitation.id,
      organizationId: invitation.organization_id,
      phoneE164: invitation.phone_e164,
      role: invitation.role as MemberRole,
      status: invitation.status,
      expiresAt: invitation.expires_at,
      organizationName: organization?.trade_name ?? organization?.legal_name ?? '',
    };
  }

  /**
   * Organisations où `userId` est lié comme bailleur (`landlords.user_id`),
   * toutes organisations confondues — portail bailleur (phase 7). Un même
   * numéro de téléphone peut être invité par plusieurs agences ; le compte
   * `users` reste unique, `landlords.user_id` porte le lien par organisation.
   */
  async listLandlordLinks(userId: string): Promise<LandlordLinkRow[]> {
    const rows = await this.client.landlords.findMany({
      where: { user_id: userId, deleted_at: null },
      select: { id: true, organization_id: true },
    });
    if (rows.length === 0) return [];
    const organizations = await this.client.organizations.findMany({
      where: { id: { in: rows.map((r) => r.organization_id) } },
      select: { id: true, trade_name: true, legal_name: true },
    });
    const names = new Map(organizations.map((o) => [o.id, o.trade_name ?? o.legal_name ?? '']));
    return rows.map((r) => ({
      landlordId: r.id,
      organizationId: r.organization_id,
      organizationName: names.get(r.organization_id) ?? '',
    }));
  }

  /**
   * Bailleurs non encore activés (`user_id IS NULL`) pour ce numéro de
   * téléphone, toutes organisations confondues — portail bailleur : seule
   * lecture qui autorise l'activation d'un compte AVANT authentification.
   * Un même numéro peut être invité par plusieurs agences ; l'activation lie
   * TOUTES les fiches en attente au même compte `users`, en une seule fois.
   */
  async findPendingLandlordsByPhone(phoneE164: string): Promise<LandlordLinkRow[]> {
    const rows = await this.client.landlords.findMany({
      where: { primary_phone: phoneE164, user_id: null, deleted_at: null },
      select: { id: true, organization_id: true },
      orderBy: { created_at: 'asc' },
    });
    if (rows.length === 0) return [];
    const organizations = await this.client.organizations.findMany({
      where: { id: { in: rows.map((r) => r.organization_id) } },
      select: { id: true, trade_name: true, legal_name: true },
    });
    const names = new Map(organizations.map((o) => [o.id, o.trade_name ?? o.legal_name ?? '']));
    return rows.map((r) => ({
      landlordId: r.id,
      organizationId: r.organization_id,
      organizationName: names.get(r.organization_id) ?? '',
    }));
  }

  /** Vrai si le slug est déjà pris (contrainte d'unicité globale). */
  async isSlugTaken(slug: string): Promise<boolean> {
    const found = await this.client.organizations.findUnique({
      where: { slug },
      select: { id: true },
    });
    return found !== null;
  }
}
