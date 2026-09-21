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

export interface TenantLinkRow {
  tenantId: string;
  organizationId: string;
  organizationName: string;
}

/** Bail actif rattaché à un locataire — périmètre exact du portail locataire. */
export interface TenantLeaseRow {
  leaseId: string;
  organizationId: string;
  tenantId: string;
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
 * volontairement réduite à des lectures filtrées par un identifiant
 * appartenant déjà à l'appelant (son `user_id`) ou par un secret qu'il
 * détient (le condensat du jeton d'invitation). Aucune écriture, aucun accès
 * générique : toute autre opération passe par `PrismaService.withTenant`.
 *
 * Phase 10 : `listTenantLinks`/`listActiveTenantLeases` reproduisent pour le
 * portail locataire le même besoin transverse que `listLandlordLinks` pour
 * le portail bailleur (un `tenants.user_id` peut exister dans plusieurs
 * organisations). `isPlatformAdmin` sert la garde `PlatformAdminGuard`
 * (routes `/v1/admin/*`) : lecture d'un seul booléen sur `users`, jamais mise
 * en cache, jamais portée par le jeton.
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

  /**
   * Organisations où `userId` est lié comme locataire (`tenants.user_id`),
   * toutes organisations confondues — portail locataire (phase 10). Même
   * principe que `listLandlordLinks` : un numéro peut être locataire dans
   * plusieurs agences, le compte `users` reste unique.
   */
  async listTenantLinks(userId: string): Promise<TenantLinkRow[]> {
    const rows = await this.client.tenants.findMany({
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
      tenantId: r.id,
      organizationId: r.organization_id,
      organizationName: names.get(r.organization_id) ?? '',
    }));
  }

  /**
   * Baux ACTIFS rattachés au compte locataire `userId`, toutes organisations
   * confondues — périmètre exact du portail locataire (arbitrage n°4 du
   * contrat phase 10) : locataire principal (`leases.primary_tenant_id`) ou
   * partie au bail (`lease_parties.tenant_id`, co-locataire ou occupant
   * déclaré), jamais un rôle stocké ni un jeton. Un bail apparaît une seule
   * fois même s'il est rattaché aux deux titres.
   */
  async listActiveTenantLeases(userId: string): Promise<TenantLeaseRow[]> {
    const links = await this.listTenantLinks(userId);
    if (links.length === 0) return [];
    const tenantIds = links.map((l) => l.tenantId);

    const [primaryLeases, partyLeases] = await Promise.all([
      this.client.leases.findMany({
        where: { primary_tenant_id: { in: tenantIds }, status: 'ACTIVE', deleted_at: null },
        select: { id: true, organization_id: true, primary_tenant_id: true },
      }),
      this.client.lease_parties.findMany({
        where: { tenant_id: { in: tenantIds } },
        select: {
          tenant_id: true,
          leases: {
            select: { id: true, organization_id: true, status: true, deleted_at: true },
          },
        },
      }),
    ]);

    const byLeaseId = new Map<string, TenantLeaseRow>();
    for (const lease of primaryLeases) {
      byLeaseId.set(lease.id, {
        leaseId: lease.id,
        organizationId: lease.organization_id,
        tenantId: lease.primary_tenant_id,
      });
    }
    for (const party of partyLeases) {
      const lease = party.leases;
      if (!lease || lease.status !== 'ACTIVE' || lease.deleted_at !== null) continue;
      if (party.tenant_id === null || byLeaseId.has(lease.id)) continue;
      byLeaseId.set(lease.id, {
        leaseId: lease.id,
        organizationId: lease.organization_id,
        tenantId: party.tenant_id,
      });
    }
    return Array.from(byLeaseId.values());
  }

  /**
   * Vrai si `userId` est administrateur de la plateforme Immodesk
   * (`users.is_platform_admin`, extension phase 10 — voir migration
   * `3_platform_admin`). Relu en base à chaque requête par
   * `PlatformAdminGuard`, jamais porté par le jeton d'accès.
   */
  async isPlatformAdmin(userId: string): Promise<boolean> {
    const user = await this.client.users.findUnique({
      where: { id: userId },
      select: { is_platform_admin: true },
    });
    return user?.is_platform_admin ?? false;
  }

  /**
   * Organisation dont le bailleur « self » (`landlords.is_self = true`,
   * provisionné automatiquement à la création d'une organisation
   * `INDEPENDENT_LANDLORD`/`INDEPENDENT_MANAGER`, voir
   * `parties/application/self-landlord.provisioner.ts`) porte ce numéro —
   * apport d'affaires (phase 10), route
   * `POST /v1/referral-partners/me/properties/{id}/confirm-otp` : le
   * partenaire ne connaît que le téléphone du bailleur rencontré sur le
   * terrain, jamais l'identifiant de son organisation (RLS). `null` si
   * aucune organisation ne correspond.
   */
  async findSelfLandlordOrganizationByPhone(phoneE164: string): Promise<string | null> {
    const landlord = await this.client.landlords.findFirst({
      where: { primary_phone: phoneE164, is_self: true, deleted_at: null },
      select: { organization_id: true },
      orderBy: { created_at: 'asc' },
    });
    return landlord?.organization_id ?? null;
  }

  /**
   * Abonnements en défaut de paiement, toutes organisations confondues —
   * apport d'affaires (phase 10), `GET /v1/admin/subscriptions/at-risk`.
   * `subscriptions` est sous RLS (`organization_id`) : lecture transverse
   * réservée à ce service, sur le même principe que le reste de l'annuaire.
   *
   * HYPOTHÈSE (module `subscriptions` pas encore livré au moment de cette
   * écriture) : « à risque » est approximé au statut `PAST_DUE` (déjà en
   * retard, pas encore `SUSPENDED`). Le critère précis de « proche de la
   * suspension » — comparaison à `grace_days` depuis l'échéance impayée —
   * appartient au module `subscriptions` et devra affiner ce filtre.
   */
  async listAtRiskSubscriptions(
    limit: number,
  ): Promise<Array<{ organizationId: string; organizationName: string; status: string }>> {
    const rows = await this.client.subscriptions.findMany({
      where: { status: 'PAST_DUE' },
      select: { organization_id: true, status: true },
      orderBy: { updated_at: 'desc' },
      take: limit,
    });
    if (rows.length === 0) return [];
    const organizations = await this.client.organizations.findMany({
      where: { id: { in: rows.map((r) => r.organization_id) } },
      select: { id: true, trade_name: true, legal_name: true },
    });
    const names = new Map(organizations.map((o) => [o.id, o.trade_name ?? o.legal_name ?? '']));
    return rows.map((r) => ({
      organizationId: r.organization_id,
      organizationName: names.get(r.organization_id) ?? '',
      status: r.status,
    }));
  }

  /**
   * Locataires (`tenants`) de ce numéro de téléphone AYANT AU MOINS UN BAIL
   * ACTIF, toutes organisations confondues — portail locataire (phase 10) :
   * seule lecture qui autorise `POST /v1/tenant-auth/otp/request` et
   * `.../verify` AVANT authentification, sur le modèle de
   * `findPendingLandlordsByPhone`. Différence assumée avec le portail
   * bailleur : un locataire n'est jamais « en attente » (`user_id IS NULL`
   * n'est pas un critère ici) — une fiche déjà liée à un compte reste
   * éligible à une reconnexion, le lien se refait alors sans effet
   * (`userId` renvoyé permet à l'appelant de sauter la liaison déjà faite).
   * Sans bail actif, la fiche existe peut-être mais ne donne accès à rien :
   * le contrat exige un refus AVANT tout envoi de code, jamais après.
   */
  async findTenantsWithActiveLeaseByPhone(
    phoneE164: string,
  ): Promise<Array<{ tenantId: string; organizationId: string; userId: string | null }>> {
    const tenants = await this.client.tenants.findMany({
      where: { primary_phone: phoneE164, deleted_at: null },
      select: { id: true, organization_id: true, user_id: true },
    });
    if (tenants.length === 0) return [];
    const tenantIds = tenants.map((t) => t.id);

    const [primaryLeases, partyLeases] = await Promise.all([
      this.client.leases.findMany({
        where: { primary_tenant_id: { in: tenantIds }, status: 'ACTIVE', deleted_at: null },
        select: { primary_tenant_id: true },
      }),
      this.client.lease_parties.findMany({
        where: { tenant_id: { in: tenantIds } },
        select: { tenant_id: true, leases: { select: { status: true, deleted_at: true } } },
      }),
    ]);

    const activeTenantIds = new Set<string>();
    for (const lease of primaryLeases) activeTenantIds.add(lease.primary_tenant_id);
    for (const party of partyLeases) {
      const lease = party.leases;
      if (!lease || lease.status !== 'ACTIVE' || lease.deleted_at !== null) continue;
      if (party.tenant_id) activeTenantIds.add(party.tenant_id);
    }

    return tenants
      .filter((t) => activeTenantIds.has(t.id))
      .map((t) => ({ tenantId: t.id, organizationId: t.organization_id, userId: t.user_id }));
  }
}
