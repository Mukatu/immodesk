/**
 * Bascule en lecture seule (docs/api/phase11-contract.md, § 11.C, arbitrage
 * 12 et 14).
 *
 * L'état est porté par le drapeau GLOBAL `read_only_mode` de `feature_flags`
 * (`organization_id IS NULL`) : `is_enabled` est le booléen, `payload` porte
 * `reason` et `incidentRef`, les colonnes existantes `starts_at`/`ends_at`
 * portent respectivement le début du gel et `expectedEndAt`. Aucune table
 * n'est ajoutée.
 *
 * Logique pure, sans accès base : la lecture/écriture du drapeau vit dans
 * `application/read-only-mode.service.ts`.
 */

export interface ReadOnlyState {
  enabled: boolean;
  reason: string | null;
  since: string | null;
  expectedEndAt: string | null;
  incidentRef: string | null;
}

/**
 * « C'est une bascule, pas un compteur » : réactiver un état déjà en cours
 * (actif → actif, ou inactif → inactif) est un conflit, dans les deux sens.
 */
export class ReadOnlyAlreadySetError extends Error {
  constructor(public readonly requested: boolean) {
    super(
      requested
        ? 'Le mode lecture seule est déjà actif.'
        : 'Le mode lecture seule est déjà inactif.',
    );
    this.name = 'ReadOnlyAlreadySetError';
  }
}

/** Lève `ReadOnlyAlreadySetError` si la bascule demandée ne change rien. */
export function assertReadOnlyTransition(currentEnabled: boolean, requestedEnabled: boolean): void {
  if (currentEnabled === requestedEnabled) {
    throw new ReadOnlyAlreadySetError(requestedEnabled);
  }
}

/**
 * `reason` est obligatoire à l'ACTIVATION (contrat, § 11.C) ; facultatif à
 * la désactivation, où il n'a plus de sens.
 */
export function assertReasonRequiredOnEnable(
  requestedEnabled: boolean,
  reason?: string | null,
): void {
  if (requestedEnabled && (!reason || reason.trim().length === 0)) {
    throw new RangeError('Le motif (`reason`) est obligatoire pour activer le mode lecture seule.');
  }
}
