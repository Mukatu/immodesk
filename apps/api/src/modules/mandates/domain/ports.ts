/**
 * Port d'invitation du bailleur au portail (contrat, § « Portail bailleur »,
 * route `POST /v1/management-mandates/{id}/landlord-invitation`).
 *
 * DÉCISION : le module `landlord-portal` (activation par OTP, création du
 * compte `users` lié à `landlords.user_id`) n'existe pas encore — un autre
 * agent le construit. Plutôt que de laisser la route inachevée, `mandates`
 * implémente lui-même l'envoi (voir `MandatesService.sendLandlordInvitation`)
 * en réutilisant `NOTIFICATION_ENQUEUER` : un message WhatsApp (repli SMS,
 * pipeline existant) portant le lien `${PORTAL_BASE_URL}/activer?tel=...`,
 * tracé automatiquement dans `message_logs` (modèle `LANDLORD_PORTAL_INVITE`,
 * `apps/api/src/modules/notifications/domain/template-codes.ts`).
 *
 * Le port reste déclaré et exporté (à l'image de `DEPOSIT_WRITER` /
 * `LEASE_READER`) pour que `landlord-portal` puisse plus tard rebrancher le
 * jeton `MANDATE_LANDLORD_INVITER` sur sa propre implémentation (envoi d'un
 * lien signé plutôt qu'un simple numéro, par exemple) sans toucher au
 * contrôleur de `mandates`, qui ne connaît que cette interface.
 */
export const MANDATE_LANDLORD_INVITER = Symbol('MANDATE_LANDLORD_INVITER');

export interface LandlordInvitationResult {
  notificationId: string;
  invitationStatus: 'SENT';
}

export interface MandateLandlordInviter {
  sendInvitation(
    organizationId: string,
    userId: string,
    mandateId: string,
  ): Promise<LandlordInvitationResult>;
}
