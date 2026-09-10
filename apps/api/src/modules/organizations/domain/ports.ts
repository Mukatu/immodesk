import type { TenantClient } from '../../../shared/prisma/prisma.service';

/**
 * Événement de domaine : une organisation vient d'être créée.
 *
 * Il est émis DANS la transaction de création. Tout abonné qui échoue annule
 * donc la création elle-même : une organisation `INDEPENDENT_LANDLORD` sans
 * son bailleur « self » serait un état incohérent, pas une dégradation
 * acceptable.
 */
export interface OrganizationCreatedEvent {
  organizationId: string;
  type: 'AGENCY' | 'INDEPENDENT_LANDLORD' | 'INDEPENDENT_MANAGER';
  legalName: string;
  tradeName: string | null;
  contactPhone: string;
  city: string;
  district: string | null;
  actorUserId: string;
}

/**
 * Port d'abonnement au cycle de vie d'une organisation.
 *
 * Le module `organizations` ne connaît que cette interface : c'est le module
 * `parties` qui l'implémente pour créer le bailleur « self ». On garde ainsi
 * le sens de dépendance de la Clean Architecture (`organizations` n'importe
 * rien de `parties`) et la règle du contrat reste testable isolément.
 *
 * Même mécanisme que `ACCESS_TOKEN_VERIFIER` et `SMS_PROVIDER` : un jeton
 * `Symbol` résolu par Nest, injecté en `@Optional()` pour que le module
 * fonctionne seul (tests unitaires, contexte réduit).
 */
export const ORGANIZATION_LIFECYCLE_LISTENERS = Symbol('ORGANIZATION_LIFECYCLE_LISTENERS');

export interface OrganizationLifecycleListener {
  onOrganizationCreated(tx: TenantClient, event: OrganizationCreatedEvent): Promise<void>;
}
