import type { TenantClient } from '../prisma/prisma.service';
import type { NotificationEnqueuer } from '../../modules/notifications/domain/ports';

/**
 * Notifie les gestionnaires d'une organisation (OWNER et MANAGER actifs) —
 * utilisé par les déclarations Mobile Money et virement (phase 4), qui
 * doivent alerter « le gestionnaire » sans destinataire nommé à la
 * création. Best-effort : une erreur d'envoi n'annule jamais la
 * transaction métier (le port `NotificationEnqueuer` ne jette pas lui-même,
 * mais un import direct sans ce module resterait silencieux).
 */
export async function notifyManagers(
  tx: TenantClient,
  enqueuer: NotificationEnqueuer | null | undefined,
  organizationId: string,
  input: {
    templateCode: string;
    variables: Record<string, string>;
    relatedEntity: { type: string; id: string };
    dedupeKey?: string;
  },
): Promise<void> {
  if (!enqueuer) return;
  const managers = await tx.organization_members.findMany({
    where: {
      organization_id: organizationId,
      role: { in: ['OWNER', 'MANAGER'] },
      status: 'ACTIVE',
    },
    select: {
      user_id: true,
      users_organization_members_user_idTousers: {
        select: { phone_e164: true, display_name: true },
      },
    },
  });
  for (const member of managers) {
    const user = member.users_organization_members_user_idTousers;
    if (!user?.phone_e164) continue;
    await enqueuer.enqueue({
      organizationId,
      templateCode: input.templateCode,
      recipient: { phone: user.phone_e164, name: user.display_name, userId: member.user_id },
      variables: input.variables,
      relatedEntity: input.relatedEntity,
      dedupeKey: input.dedupeKey ? `${input.dedupeKey}:${member.user_id}` : null,
    });
  }
}
