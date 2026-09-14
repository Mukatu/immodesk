import type { SyncOperationType, SyncReader } from './sync-types';

/** Verdict d'un gestionnaire d'opération sur une erreur métier rencontrée. */
export interface SyncErrorVerdict {
  outcome: 'REJECTED' | 'CONFLICT';
  code: string;
  message: string;
  /** Toujours faux pour un conflit ou un rejet définitif (contrat § enveloppe). */
  retryable: boolean;
}

export interface SyncApplyResult {
  /** `true` si l'appel a été rejoué depuis un `clientRef` déjà connu. */
  replayed: boolean;
  resourceId: string;
}

/**
 * Contrat d'un gestionnaire de type d'opération de synchronisation.
 *
 * Chaque gestionnaire réutilise le cas d'usage EN LIGNE existant (le même
 * service, le même `clientRef`) : c'est cette réutilisation qui garantit
 * l'unicité `(organization_id, client_ref)` et l'idempotence du rejeu.
 * Enregistrer un type en phase 8 se limite à fournir une implémentation de
 * cette interface et à l'ajouter au registre (`SYNC_OPERATION_HANDLERS`) :
 * ni la route, ni le tri par dépendances, ni le moteur ne changent.
 */
export interface SyncOperationHandler<TPayload = unknown> {
  readonly type: SyncOperationType;
  /** Nom de table exposé dans `SyncOperationResult.resourceType`. */
  readonly resourceType: string;

  /**
   * Applique l'opération dans SA PROPRE transaction (ouverte par le cas
   * d'usage réutilisé lui-même) et renvoie l'identifiant de la ressource.
   * Lève une `DomainError` métier en cas d'échec : c'est `classify` qui la
   * traduit en `REJECTED` ou `CONFLICT`.
   */
  apply(
    organizationId: string,
    reader: SyncReader,
    payload: TPayload,
    context: { clientRef: string; syncBatchId: string },
  ): Promise<SyncApplyResult>;

  /**
   * Traduit une erreur en verdict `REJECTED` / `CONFLICT`. Renvoie `null`
   * pour une erreur non reconnue : le moteur la traite alors comme un échec
   * technique (`REJECTED`, `SYNC.OPERATION_FAILED`, `retryable: true`) sans
   * jamais faire échouer le reste du lot.
   */
  classify(error: unknown): SyncErrorVerdict | null;
}

/** Jeton d'injection du registre multi-provider des gestionnaires. */
export const SYNC_OPERATION_HANDLERS = Symbol('SYNC_OPERATION_HANDLERS');
